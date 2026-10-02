import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenRouterPayload,
  getOpenRouterModel,
  getOpenRouterApiKey,
  extractJsonFromLlmResponse,
  validateOraDecision,
  executeServerOraConversation,
  DEFAULT_OPENROUTER_MODEL,
  sendOpenRouterRequest
} from "../server/oraConversationEngine.ts";
import { executeOraRequest } from "../src/ora/oraProvider.ts";
import { ConversationalOraProvider } from "../src/ora/conversationalOraProvider.ts";
import { defaultPropertyContext } from "../src/ora/oraPropertyContext.ts";
import { OraSessionContext } from "../src/ora/oraTypes.ts";
import { speechOutput } from "../src/voice/speechOutput.ts";

describe("OpenRouter Provider & Configuration", () => {
  test("request payload is properly constructed with system prompt and JSON schema instructions", () => {
    const payload = buildOpenRouterPayload("Where would I sleep?", "liquid/lfm-2.5-2.6b:free");
    assert.equal(payload.model, "liquid/lfm-2.5-2.6b:free");
    assert.equal(payload.temperature, 0.2);
    assert.equal(payload.max_tokens, 600);
    assert.ok(Array.isArray(payload.messages));
    assert.equal((payload.messages as any[])[0].role, "system");
    assert.ok((payload.messages as any[])[0].content.includes("Ora"));
    assert.equal((payload.messages as any[])[1].role, "user");
    assert.ok((payload.messages as any[])[1].content.includes("Where would I sleep?"));
  });

  test("model configuration respects OPENROUTER_MODEL environment variable or defaults", () => {
    const original = process.env.OPENROUTER_MODEL;
    try {
      delete process.env.OPENROUTER_MODEL;
      assert.equal(getOpenRouterModel(), DEFAULT_OPENROUTER_MODEL);

      process.env.OPENROUTER_MODEL = "google/gemini-2.0-flash-exp:free";
      assert.equal(getOpenRouterModel(), "google/gemini-2.0-flash-exp:free");
    } finally {
      if (original) {
        process.env.OPENROUTER_MODEL = original;
      } else {
        delete process.env.OPENROUTER_MODEL;
      }
    }
  });

  test("missing OPENROUTER_API_KEY produces explicit error engineMode without silent fallback", async () => {
    const res = await executeServerOraConversation("Where would I sleep?", undefined, undefined, {
      mode: "conversational",
      apiKey: ""
    });
    assert.equal(res.engineMode, "error");
    assert.equal(res.fallback, false);
    assert.ok(res.response.includes("OPENROUTER_API_KEY"));
    assert.equal(res.response.includes("I'm here to assist"), false);
  });

  test("extractJsonFromLlmResponse parses raw JSON string", () => {
    const json = '{"type": "SHOW_SPACE", "spaceId": "master_bedroom", "response": "Here is the suite."}';
    const parsed = extractJsonFromLlmResponse(json) as any;
    assert.equal(parsed.type, "SHOW_SPACE");
    assert.equal(parsed.spaceId, "master_bedroom");
  });

  test("extractJsonFromLlmResponse parses markdown-wrapped code blocks", () => {
    const markdown = '```json\n{\n  "type": "CHANGE_AMBIANCE",\n  "ambiance": "sunset",\n  "response": "Sunset lighting."\n}\n```';
    const parsed = extractJsonFromLlmResponse(markdown) as any;
    assert.equal(parsed.type, "CHANGE_AMBIANCE");
    assert.equal(parsed.ambiance, "sunset");
  });

  test("extractJsonFromLlmResponse extracts JSON even with conversational preamble", () => {
    const text = 'Certainly, here is the decision:\n{"type": "GREETING", "response": "Hello."}\nEnjoy your tour.';
    const parsed = extractJsonFromLlmResponse(text) as any;
    assert.equal(parsed.type, "GREETING");
    assert.equal(parsed.response, "Hello.");
  });

  test("extractJsonFromLlmResponse throws cleanly on invalid non-JSON strings", () => {
    assert.throws(() => extractJsonFromLlmResponse("Not JSON at all"));
  });
});

describe("OpenRouter Decision Validation & Defense", () => {
  test("validates valid SHOW_SPACE decision", () => {
    const raw = { type: "SHOW_SPACE", spaceId: "infinity_pool", response: "The cantilevered pool." };
    const validated = validateOraDecision(raw);
    assert.equal(validated.type, "SHOW_SPACE");
    assert.equal((validated as any).spaceId, "infinity_pool");
  });

  test("validates valid CHANGE_AMBIANCE decision", () => {
    const raw = { type: "CHANGE_AMBIANCE", ambiance: "sunset", response: "Sunset ambiance." };
    const validated = validateOraDecision(raw);
    assert.equal(validated.type, "CHANGE_AMBIANCE");
    assert.equal((validated as any).ambiance, "sunset");
  });

  test("validates valid combined SHOW_SPACE_AND_AMBIANCE decision", () => {
    const raw = { type: "SHOW_SPACE_AND_AMBIANCE", spaceId: "master_bedroom", ambiance: "night", response: "Bedroom at night." };
    const validated = validateOraDecision(raw);
    assert.equal(validated.type, "SHOW_SPACE_AND_AMBIANCE");
    assert.equal((validated as any).spaceId, "master_bedroom");
    assert.equal((validated as any).ambiance, "night");
  });

  test("promotes SHOW_SPACE to SHOW_SPACE_AND_AMBIANCE if model returned both spaceId and ambiance", () => {
    const raw = { type: "SHOW_SPACE", spaceId: "infinity_pool", ambiance: "sunset", response: "Pool at sunset." };
    const validated = validateOraDecision(raw);
    assert.equal(validated.type, "SHOW_SPACE_AND_AMBIANCE");
    assert.equal((validated as any).spaceId, "infinity_pool");
    assert.equal((validated as any).ambiance, "sunset");
  });

  test("promotes PROPERTY_ANSWER to SHOW_SPACE if valid spaceId is specified by LLM", () => {
    const raw = { type: "PROPERTY_ANSWER", spaceId: "master_bedroom", response: "You can sleep in the master bedroom." };
    const validated = validateOraDecision(raw);
    assert.equal(validated.type, "SHOW_SPACE");
    assert.equal((validated as any).spaceId, "master_bedroom");
  });

  test("rejects invalid spaceId and defaults safely to PROPERTY_ANSWER", () => {
    const raw = { type: "SHOW_SPACE", spaceId: "penthouse_suite", response: "Viewing penthouse." };
    const validated = validateOraDecision(raw);
    assert.equal(validated.type, "PROPERTY_ANSWER");
    assert.ok(validated.response.includes("Aurelia Sanctuary"));
  });

  test("rejects invalid ambiance and defaults safely to PROPERTY_ANSWER", () => {
    const raw = { type: "CHANGE_AMBIANCE", ambiance: "blizzard", response: "Blizzard lighting." };
    const validated = validateOraDecision(raw);
    assert.equal(validated.type, "PROPERTY_ANSWER");
    assert.ok(validated.response.includes("three authentic lighting tracks"));
  });

  test("rejects malformed null/empty payloads safely", () => {
    const validated = validateOraDecision(null);
    assert.equal(validated.type, "PROPERTY_ANSWER");
    assert.ok(validated.response.length > 0);
  });
});

describe("Natural Conversation & Multi-Turn Turns", () => {
  const provider = new ConversationalOraProvider();
  const context = defaultPropertyContext;

  test("'What is this place?' produces authoritative overview without camera movement", async () => {
    const res = await executeOraRequest("What is this place?", provider, context);
    assert.equal(res.action, undefined);
    assert.ok(res.spokenResponse.includes("Aurelia Sanctuary") || res.spokenResponse.includes("modernist"));
  });

  test("'Show me around.' starts at exterior estate approach", async () => {
    const res = await executeOraRequest("Show me around.", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal((res.action as any)?.spaceId, "exterior");
  });

  test("'Where would I sleep?' navigates to master_bedroom", async () => {
    const res = await executeOraRequest("Where would I sleep?", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal((res.action as any)?.spaceId, "master_bedroom");
  });

  test("multi-turn: 'Where would I sleep?' -> 'And the bathroom?'", async () => {
    const session: OraSessionContext = { history: [] };
    const r1 = await executeOraRequest("Where would I sleep?", provider, context, session);
    assert.equal((r1.action as any)?.spaceId, "master_bedroom");
    assert.equal(session.currentSpace, "master_bedroom");

    const r2 = await executeOraRequest("And the bathroom?", provider, context, session);
    assert.equal(r2.action?.type, "SHOW_SPACE");
    assert.equal((r2.action as any)?.spaceId, "ensuite_bathroom");
    assert.equal(session.currentSpace, "ensuite_bathroom");
  });

  test("'Show me the pool.' navigates to infinity_pool", async () => {
    const res = await executeOraRequest("Show me the pool.", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal((res.action as any)?.spaceId, "infinity_pool");
  });

  test("'Can I see it at sunset?' preserves pool space and applies sunset ambiance", async () => {
    const session: OraSessionContext = {
      history: [],
      currentSpace: "infinity_pool"
    };
    const res = await executeOraRequest("Can I see it at sunset?", provider, context, session);
    assert.equal((res.action as any)?.spaceId, "infinity_pool");
    assert.equal(res.ambianceAction?.ambiance, "sunset");
  });

  test("'How much is it?' answers inquiry pricing without fake numbers", async () => {
    const res = await executeOraRequest("How much is it?", provider, context);
    assert.equal(res.action, undefined);
    assert.ok(res.spokenResponse.toLowerCase().includes("inquiry"));
    assert.equal(res.spokenResponse.includes("$"), false);
  });

  test("'I want to book.' returns BOOKING_INTENT without fake reservation confirmation", async () => {
    const res = await executeOraRequest("I want to book.", provider, context);
    assert.equal(res.decision?.type, "BOOKING_INTENT");
    assert.equal(res.spokenResponse.toLowerCase().includes("confirmed"), false);
  });

  test("'Wow, I really like this.' responds politely without camera movement", async () => {
    const res = await executeOraRequest("Wow, I really like this.", provider, context);
    assert.equal(res.action, undefined);
    assert.equal(res.ambianceAction, undefined);
    assert.ok(res.spokenResponse.length > 0);
  });

  test("'Actually, take me somewhere quieter.' navigates to secluded master bedroom", async () => {
    const res = await executeOraRequest("Actually, take me somewhere quieter.", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal((res.action as any)?.spaceId, "master_bedroom");
  });

  test("'No, I meant the bedroom.' corrects destination to master_bedroom", async () => {
    const res = await executeOraRequest("No, I meant the bedroom.", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal((res.action as any)?.spaceId, "master_bedroom");
  });

  test("'What would it be like at night?' transitions ambiance to night", async () => {
    const session: OraSessionContext = {
      history: [],
      currentSpace: "exterior"
    };
    const res = await executeOraRequest("What would it be like at night?", provider, context, session);
    assert.equal(res.ambianceAction?.ambiance, "night");
  });

  test("'Forget that. Show me the pool.' navigates to infinity_pool", async () => {
    const res = await executeOraRequest("Forget that. Show me the pool.", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal((res.action as any)?.spaceId, "infinity_pool");
  });
});

describe("Hands-free Voice & Barge-In Turn Taking", () => {
  test("speech cancellation immediately clears speaking flag", () => {
    speechOutput.cancel();
    assert.equal(speechOutput.isSpeaking(), false);
  });
});
