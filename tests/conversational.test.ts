import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { executeOraRequest } from "../src/ora/oraProvider.ts";
import { ConversationalOraProvider } from "../src/ora/conversationalOraProvider.ts";
import { defaultPropertyContext } from "../src/ora/oraPropertyContext.ts";
import { OraSessionContext } from "../src/ora/oraTypes.ts";
import {
  evaluateSemanticDecision,
  validateOraDecision,
  executeServerOraConversation
} from "../server/oraConversationEngine.ts";

describe("Phase 5C: Natural Language Understanding & Semantic Equivalence", () => {
  const provider = new ConversationalOraProvider();
  const context = defaultPropertyContext;

  test("'Where would I sleep?' resolves to master_bedroom", async () => {
    const res = await executeOraRequest("Where would I sleep?", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal(res.action?.spaceId, "master_bedroom");
    assert.ok(res.spokenResponse.includes("master bedroom"));
  });

  test("'Where do I wake up?' resolves to master_bedroom", async () => {
    const res = await executeOraRequest("Where do I wake up?", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal(res.action?.spaceId, "master_bedroom");
  });

  test("'Where can I freshen up?' resolves to ensuite_bathroom", async () => {
    const res = await executeOraRequest("Where can I freshen up?", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal(res.action?.spaceId, "ensuite_bathroom");
    assert.ok(res.spokenResponse.includes("ensuite"));
  });

  test("'Is there somewhere to swim?' resolves to infinity_pool", async () => {
    const res = await executeOraRequest("Is there somewhere to swim?", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal(res.action?.spaceId, "infinity_pool");
    assert.ok(res.spokenResponse.includes("infinity pool"));
  });

  test("'Show me where we would cook' resolves to kitchen", async () => {
    const res = await executeOraRequest("Show me where we would cook", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal(res.action?.spaceId, "kitchen");
    assert.ok(res.spokenResponse.includes("kitchen"));
  });

  test("'Take me outside' resolves to exterior", async () => {
    const res = await executeOraRequest("Take me outside", provider, context);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal(res.action?.spaceId, "exterior");
    assert.ok(res.spokenResponse.includes("exterior"));
  });

  test("'What does it look like at sunset?' resolves to sunset ambiance", async () => {
    const res = await executeOraRequest("What does it look like at sunset?", provider, context);
    assert.equal(res.ambianceAction?.ambiance, "sunset");
    assert.equal(res.action, undefined);
    assert.ok(res.spokenResponse.includes("sunset"));
  });

  test("'Can we see the house after dark?' resolves to night ambiance", async () => {
    const res = await executeOraRequest("Can we see the house after dark?", provider, context);
    assert.equal(res.ambianceAction?.ambiance, "night");
    assert.equal(res.action, undefined);
    assert.ok(res.spokenResponse.includes("night"));
  });
});

describe("Phase 5C: Conversational Continuity & Multi-turn Context", () => {
  const provider = new ConversationalOraProvider();
  const context = defaultPropertyContext;

  test("resolves follow-ups across multiple turns: bedroom -> bathroom -> outside -> night", async () => {
    const session: OraSessionContext = { history: [] };

    // Turn 1: Show me the bedroom
    const r1 = await executeOraRequest("Show me the bedroom.", provider, context, session);
    assert.equal(r1.action?.type, "SHOW_SPACE");
    assert.equal((r1.action as any)?.spaceId, "master_bedroom");
    assert.equal(session.currentSpace, "master_bedroom");

    // Turn 2: What about the bathroom?
    const r2 = await executeOraRequest("What about the bathroom?", provider, context, session);
    assert.equal(r2.action?.type, "SHOW_SPACE");
    assert.equal((r2.action as any)?.spaceId, "ensuite_bathroom");
    assert.equal(session.currentSpace, "ensuite_bathroom");
    assert.equal(session.lastSpace, "master_bedroom");

    // Turn 3: And outside?
    const r3 = await executeOraRequest("And outside?", provider, context, session);
    assert.equal(r3.action?.type, "SHOW_SPACE");
    assert.equal((r3.action as any)?.spaceId, "exterior");
    assert.equal(session.currentSpace, "exterior");

    // Turn 4: Can I see it at night? (preserves exterior space and adds night ambiance)
    const r4 = await executeOraRequest("Can I see it at night?", provider, context, session);
    assert.equal(r4.action?.type, "SHOW_SPACE");
    assert.equal((r4.action as any)?.spaceId, "exterior");
    assert.equal(r4.ambianceAction?.ambiance, "night");
  });

  test("'Take me back' navigates back to previous space", async () => {
    const session: OraSessionContext = {
      history: [],
      currentSpace: "ensuite_bathroom",
      lastSpace: "master_bedroom"
    };

    const res = await executeOraRequest("Take me back", provider, context, session);
    assert.equal(res.action?.type, "SHOW_SPACE");
    assert.equal((res.action as any)?.spaceId, "master_bedroom");
  });

  test("'What was that room again?' identifies current space without moving camera", async () => {
    const session: OraSessionContext = {
      history: [],
      currentSpace: "kitchen"
    };

    const res = await executeOraRequest("What was that room again?", provider, context, session);
    assert.equal(res.action, undefined);
    assert.ok(res.spokenResponse.toLowerCase().includes("kitchen"));
  });
});

describe("Phase 5C: Conversation Without Camera Movement", () => {
  const provider = new ConversationalOraProvider();
  const context = defaultPropertyContext;

  test("'Wow, this is beautiful.' responds quietly without camera action", async () => {
    const res = await executeOraRequest("Wow, this is beautiful.", provider, context);
    assert.equal(res.action, undefined);
    assert.equal(res.ambianceAction, undefined);
    assert.ok(res.spokenResponse.length > 0);
  });

  test("'Hi Ora.' produces greeting without camera action", async () => {
    const res = await executeOraRequest("Hi Ora.", provider, context);
    assert.equal(res.action, undefined);
    assert.equal(res.ambianceAction, undefined);
    assert.equal(res.decision?.type, "GREETING");
    assert.ok(res.spokenResponse.includes("Aurelia"));
  });

  test("'What is this place?' answers with authoritative architecture overview", async () => {
    const res = await executeOraRequest("What is this place?", provider, context);
    assert.equal(res.action, undefined);
    assert.ok(res.spokenResponse.includes("Aurelia Sanctuary"));
  });

  test("'Tell me about this house.' answers without moving camera", async () => {
    const res = await executeOraRequest("Tell me about this house.", provider, context);
    assert.equal(res.action, undefined);
    assert.ok(res.spokenResponse.includes("modernist"));
  });
});

describe("Phase 5C: Property Authority, Stays & Booking Intent", () => {
  const provider = new ConversationalOraProvider();
  const context = defaultPropertyContext;

  test("'How much is it?' grounds response in inquiry status without inventing prices", async () => {
    const res = await executeOraRequest("How much is it?", provider, context);
    assert.equal(res.action, undefined);
    assert.ok(res.spokenResponse.includes("inquiry"));
    assert.equal(res.spokenResponse.includes("$"), false); // Does not hallucinate fake dollar amounts
  });

  test("'Can I stay here for three nights?' returns BOOKING_INTENT", async () => {
    const res = await executeOraRequest("Can I stay here for three nights?", provider, context);
    assert.equal(res.decision?.type, "BOOKING_INTENT");
    assert.ok(res.spokenResponse.includes("private stays"));
  });

  test("'How do I book?' returns BOOKING_INTENT without claiming fake reservation completion", async () => {
    const res = await executeOraRequest("How do I book?", provider, context);
    assert.equal(res.decision?.type, "BOOKING_INTENT");
    assert.ok(res.spokenResponse.includes("arranged directly") || res.spokenResponse.includes("inquiry"));
  });
});

describe("Phase 5C: Domain Boundary & Ambiguity Handling", () => {
  const provider = new ConversationalOraProvider();
  const context = defaultPropertyContext;

  test("'Explain quantum physics.' politely deflects back to Aurelia Sanctuary", async () => {
    const res = await executeOraRequest("Explain quantum physics.", provider, context);
    assert.equal(res.action, undefined);
    assert.equal(res.decision?.type, "OUT_OF_SCOPE");
    assert.ok(res.spokenResponse.includes("I'm here to help you explore Aurelia"));
  });

  test("'Show me the room.' asks for clarification between living room and bedroom", async () => {
    const res = await executeOraRequest("Show me the room.", provider, context);
    assert.equal(res.action, undefined);
    assert.equal(res.decision?.type, "CLARIFICATION");
    assert.ok(res.spokenResponse.includes("living lounge") || res.spokenResponse.includes("bedroom"));
  });

  test("'Show me the garage.' rejects unsupported amenity without hallucinating", async () => {
    const res = await executeOraRequest("Show me the garage.", provider, context);
    assert.equal(res.action, undefined);
    assert.ok(res.spokenResponse.includes("does not feature"));
  });
});

describe("Phase 5C: Decision Validation & Defensive Robustness", () => {
  test("validateOraDecision rejects invalid space IDs safely", () => {
    const invalid = { type: "SHOW_SPACE", spaceId: "garage", response: "Viewing garage." };
    const validated = validateOraDecision(invalid);
    assert.equal(validated.type, "PROPERTY_ANSWER");
  });

  test("validateOraDecision rejects invalid ambiance IDs safely", () => {
    const invalid = { type: "CHANGE_AMBIANCE", ambiance: "blizzard", response: "Snowing." };
    const validated = validateOraDecision(invalid);
    assert.equal(validated.type, "PROPERTY_ANSWER");
  });

  test("handles empty or whitespace-only utterances gracefully", async () => {
    const res = await executeServerOraConversation("   ", undefined, undefined, { mode: "deterministic-dev" });
    assert.equal(res.type, "CLARIFICATION");
  });
});

describe("Phase 5C.1: Engine Modes & No Silent Fallback", () => {
  test("conversational mode returns engineMode: 'error' when OPENROUTER_API_KEY is missing without silent fallback", async () => {
    // When in conversational mode without key, must return explicit error state, NOT fake conversational
    const res = await executeServerOraConversation("Where would I sleep?", undefined, undefined, {
      mode: "conversational",
      apiKey: "" // explicit empty key
    });
    assert.equal(res.engineMode, "error");
    assert.equal(res.fallback, false);
    assert.ok(res.response.includes("OPENROUTER_API_KEY"));
    assert.equal(res.response.includes("I'm here to assist"), false);
  });

  test("deterministic-dev mode returns explicit fallback: true and engineMode: 'deterministic-dev'", async () => {
    const res = await executeServerOraConversation("Where would I sleep?", undefined, undefined, {
      mode: "deterministic-dev"
    });
    assert.equal(res.engineMode, "deterministic-dev");
    assert.equal(res.fallback, true);
    assert.equal(res.type, "SHOW_SPACE");
  });
});

describe("Phase 5C.1: Elimination of Generic 'Assist' Cliches", () => {
  test("'Hi' produces natural greeting without canned assist phrases", () => {
    const res = evaluateSemanticDecision("Hi");
    assert.equal(res.type, "GREETING");
    assert.equal(res.response.includes("assist"), false);
    assert.ok(res.response.includes("Hello"));
  });

  test("'How are you?' produces natural greeting without assist phrases", () => {
    const res = evaluateSemanticDecision("How are you?");
    assert.equal(res.type, "GREETING");
    assert.equal(res.response.includes("assist"), false);
    assert.ok(res.response.includes("I'm well"));
  });

  test("'Show me the room.' produces specific clarification without generic assist filler", () => {
    const res = evaluateSemanticDecision("Show me the room.");
    assert.equal(res.type, "CLARIFICATION");
    assert.equal(res.response.includes("assist"), false);
    assert.ok(res.response.includes("living room or the master bedroom"));
  });

  test("Unmatched query default response directs to spaces without generic assist filler", () => {
    const res = evaluateSemanticDecision("What is the general layout?");
    assert.equal(res.response.includes("I'm here to assist your stay"), false);
    assert.equal(res.response.includes("How may I assist"), false);
  });
});

describe("Phase 5C.1: Conversational Barge-In & Priority", () => {
  test("speech cancellation resets speaking state immediately", () => {
    import("../src/voice/speechOutput.ts").then(({ speechOutput }) => {
      speechOutput.cancel();
      assert.equal(speechOutput.isSpeaking(), false);
    });
  });

  test("conversational topic transition: 'Actually, don't worry about the price. Show me the pool.' navigates to pool", () => {
    const res = evaluateSemanticDecision("Actually, don't worry about the price. Show me the pool.");
    assert.equal(res.type, "SHOW_SPACE");
    if (res.type === "SHOW_SPACE") {
      assert.equal(res.spaceId, "infinity_pool");
      assert.ok(res.response.includes("infinity pool"));
    }
  });
});

