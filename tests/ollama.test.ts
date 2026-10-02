import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildOllamaPayload,
  getOllamaModel,
  getOllamaBaseUrl,
  getLlmProvider,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_BASE_URL,
  executeServerOraConversation,
  extractJsonFromLlmResponse,
  validateOraDecision
} from "../server/oraConversationEngine.ts";

describe("Ollama Provider & Configuration", () => {
  test("request payload is properly constructed with format: json and system prompt", () => {
    const payload = buildOllamaPayload("Show me the pool", "llama3.2:1b");
    assert.equal(payload.model, "llama3.2:1b");
    assert.equal(payload.format, "json");
    assert.equal(payload.stream, false);
    assert.deepEqual(payload.options, { temperature: 0.2, num_predict: 150, num_ctx: 2048 });
    assert.ok(Array.isArray(payload.messages));
    assert.equal((payload.messages as any[])[0].role, "system");
    assert.ok((payload.messages as any[])[0].content.includes("Ora"));
    assert.equal((payload.messages as any[])[1].role, "user");
    assert.ok((payload.messages as any[])[1].content.includes("Show me the pool"));
  });

  test("provider resolution respects LLM_PROVIDER environment variable or defaults", () => {
    const original = process.env.LLM_PROVIDER;
    try {
      process.env.LLM_PROVIDER = "ollama";
      assert.equal(getLlmProvider(), "ollama");

      process.env.LLM_PROVIDER = "openrouter";
      assert.equal(getLlmProvider(), "openrouter");
    } finally {
      if (original) {
        process.env.LLM_PROVIDER = original;
      } else {
        delete process.env.LLM_PROVIDER;
      }
    }
  });

  test("base URL and model configuration respect environment variables or defaults", () => {
    const originalUrl = process.env.OLLAMA_BASE_URL;
    const originalModel = process.env.OLLAMA_MODEL;
    try {
      delete process.env.OLLAMA_BASE_URL;
      delete process.env.OLLAMA_MODEL;
      assert.equal(getOllamaBaseUrl(), DEFAULT_OLLAMA_BASE_URL);
      assert.equal(getOllamaModel(), DEFAULT_OLLAMA_MODEL);

      process.env.OLLAMA_BASE_URL = "http://192.168.1.100:11434";
      process.env.OLLAMA_MODEL = "llama3.2:3b";
      assert.equal(getOllamaBaseUrl(), "http://192.168.1.100:11434");
      assert.equal(getOllamaModel(), "llama3.2:3b");
    } finally {
      if (originalUrl) process.env.OLLAMA_BASE_URL = originalUrl;
      else delete process.env.OLLAMA_BASE_URL;
      if (originalModel) process.env.OLLAMA_MODEL = originalModel;
      else delete process.env.OLLAMA_MODEL;
    }
  });

  test("unreachable Ollama host produces explicit error engineMode without silent fallback", async () => {
    const res = await executeServerOraConversation("Where would I sleep?", undefined, undefined, {
      mode: "conversational",
      provider: "ollama",
      baseUrl: "http://127.0.0.1:59999", // Unused port
      timeoutMs: 1500
    });
    assert.equal(res.engineMode, "error");
    assert.equal(res.fallback, false);
    assert.ok(res.response.includes("Ollama service is not responding"));
    assert.equal(res.response.includes("I'm here to assist"), false);
  });

  test("parses structured decision from assistant message format", () => {
    const rawOllamaResponse = JSON.stringify({
      type: "SHOW_SPACE",
      spaceId: "infinity_pool",
      response: "The cantilevered infinity pool overlooks the canyon."
    });
    const parsed = extractJsonFromLlmResponse(rawOllamaResponse);
    const decision = validateOraDecision(parsed);
    assert.equal(decision.type, "SHOW_SPACE");
    if (decision.type === "SHOW_SPACE") {
      assert.equal(decision.spaceId, "infinity_pool");
      assert.ok(decision.response.includes("infinity pool"));
    }
  });
});
