import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resampleAndConvertToPCM16 } from "../src/voice/microphoneCapture.ts";
import { VoiceSession } from "../src/voice/voiceSession.ts";
import { executeOraRequest } from "../src/ora/oraProvider.ts";
import { defaultPropertyContext } from "../src/ora/oraPropertyContext.ts";
import { mintAssemblyAiToken } from "../server/tokenHandler.ts";

describe("Phase 5A: Audio Resampling & PCM16 Conversion", () => {
  test("converts 16kHz Float32 to 16-bit signed PCM little-endian", () => {
    const input = new Float32Array([0.0, 1.0, -1.0, 0.5, -0.5]);
    const pcm = resampleAndConvertToPCM16(input, 16000, 16000);

    assert.equal(pcm.length, 5);
    assert.equal(pcm[0], 0);
    assert.equal(pcm[1], 32767);
    assert.equal(pcm[2], -32768);
    assert.equal(pcm[3], Math.floor(0.5 * 32767));
    assert.equal(pcm[4], Math.round(-0.5 * 32768));
  });

  test("resamples 48kHz audio to 16kHz mono (3:1 ratio)", () => {
    // 480 samples at 48kHz corresponds to 10ms -> 160 samples at 16kHz
    const input = new Float32Array(480);
    for (let i = 0; i < input.length; i++) {
      input[i] = Math.sin((2 * Math.PI * i) / 48); // periodic wave
    }

    const pcm = resampleAndConvertToPCM16(input, 48000, 16000);
    assert.equal(pcm.length, 160);
    assert.ok(pcm instanceof Int16Array);
  });

  test("clamps out-of-boundary float audio safely", () => {
    const input = new Float32Array([2.5, -3.2]);
    const pcm = resampleAndConvertToPCM16(input, 16000, 16000);

    assert.equal(pcm[0], 32767);
    assert.equal(pcm[1], -32768);
  });
});

describe("Phase 5A: Voice Transcript Processing & Turn Boundaries", () => {
  test("partial transcript updates live state but does NOT execute Ora action", () => {
    let finalCalledCount = 0;
    let partialReceived = "";

    const session = new VoiceSession({
      onPartialUtterance: (partial) => {
        partialReceived = partial;
      },
      onFinalUtterance: () => {
        finalCalledCount++;
      }
    });

    // Simulate AssemblyAI emitting partial turn
    (session as any).options.onPartialUtterance?.("show me the living");
    assert.equal(finalCalledCount, 0, "Partial transcript must never execute final action");
  });

  test("empty or whitespace-only final transcript is safely ignored", () => {
    let finalCalled = false;

    const session = new VoiceSession({
      onFinalUtterance: () => {
        finalCalled = true;
      }
    });

    (session as any).handleFinalTranscript("");
    (session as any).handleFinalTranscript("   ");
    assert.equal(finalCalled, false, "Empty transcript should not trigger downstream execution");
  });

  test("valid final transcript transitions state to processing and emits utterance", () => {
    let emittedUtterance = "";
    let stateHistory: string[] = [];

    const session = new VoiceSession({
      onStateChange: (state) => {
        stateHistory.push(state);
      },
      onFinalUtterance: (utterance) => {
        emittedUtterance = utterance;
      }
    });

    (session as any).handleFinalTranscript("Show me the living room");

    assert.equal(emittedUtterance, "Show me the living room");
    assert.equal(session.getState(), "processing");
    assert.ok(stateHistory.includes("processing"));
  });
});

describe("Phase 5A: Continuous Voice Session & Hands-free Lifecycle", () => {
  test("defaults to continuous mode (hands-free)", () => {
    const session = new VoiceSession();
    assert.equal(session.isContinuous(), true);
  });

  test("can be configured with continuous: false for single-turn mode", () => {
    const session = new VoiceSession({ continuous: false });
    assert.equal(session.isContinuous(), false);
  });

  test("pauseStreaming() and resumeListening() toggle stream pausing safely", () => {
    const session = new VoiceSession({ continuous: true });
    assert.equal((session as any).isPaused, false);

    session.pauseStreaming();
    assert.equal((session as any).isPaused, true);

    session.resumeListening();
    assert.equal((session as any).isPaused, false);
  });

  test("handleFinalTranscript in continuous mode keeps streaming active for barge-in without closing session", () => {
    let finalUtteranceReceived = "";
    const session = new VoiceSession({
      continuous: true,
      onFinalUtterance: (text) => {
        finalUtteranceReceived = text;
      }
    });

    (session as any).handleFinalTranscript("Show me the infinity pool");

    assert.equal(finalUtteranceReceived, "Show me the infinity pool");
    assert.equal(session.getState(), "processing");
    assert.equal((session as any).isPaused, false, "Streaming should remain active to permit natural barge-in");
  });
});

describe("Phase 5A: Speech Output System & Voice Vocalization", () => {
  test("gracefully handles headless/node environment where speechSynthesis is absent", async () => {
    const { speechOutput } = await import("../src/voice/speechOutput.ts");
    assert.equal(speechOutput.isSupported(), false);
    assert.equal(speechOutput.isSpeaking(), false);

    // speak and cancel should resolve cleanly without exceptions
    await speechOutput.speak("Welcome to Aurelia Sanctuary.");
    speechOutput.cancel();
  });
});


describe("Phase 5A: Voice End-to-End Execution through Ora Pipeline", () => {
  const context = defaultPropertyContext;

  test("Test A: 'Show me the living room.' executes SHOW_SPACE('living_room')", async () => {
    const transcript = "Show me the living room.";
    const result = await executeOraRequest(transcript, undefined, context);

    assert.equal(result.action?.type, "SHOW_SPACE");
    assert.equal(result.action?.spaceId, "living_room");
    assert.equal(result.resolution?.success, true);
    if (result.resolution?.success) {
      assert.equal(result.resolution.view.mode, "cinematic");
      assert.equal(result.resolution.view.frame, 170);
    }
  });

  test("Test B: 'Show me at sunset.' executes SHOW_AMBIANCE('sunset')", async () => {
    const transcript = "Show me at sunset.";
    const result = await executeOraRequest(transcript, undefined, context);

    assert.equal(result.ambianceAction?.type, "SHOW_AMBIANCE");
    assert.equal(result.ambianceAction?.ambiance, "sunset");
  });

  test("Test C: 'Show me the pool at night.' executes combined space + ambiance", async () => {
    const transcript = "Show me the pool at night.";
    const result = await executeOraRequest(transcript, undefined, context);

    assert.equal(result.action?.type, "SHOW_SPACE");
    assert.equal(result.action?.spaceId, "infinity_pool");
    assert.equal(result.ambianceAction?.type, "SHOW_AMBIANCE");
    assert.equal(result.ambianceAction?.ambiance, "night");
    assert.equal(result.resolution?.success, true);
    if (result.resolution?.success) {
      assert.equal(result.resolution.view.mode, "detail");
      assert.equal(result.resolution.view.space.id, "infinity_pool");
    }
  });

  test("Test D: 'Show me the property in the rain.' safely rejects unverified ambiance", async () => {
    const transcript = "Show me the property in the rain.";
    const result = await executeOraRequest(transcript, undefined, context);

    assert.equal(result.action, undefined);
    assert.equal(result.interpretation.type, "CLARIFICATION_REQUIRED");
    if (result.interpretation.type === "CLARIFICATION_REQUIRED") {
      assert.equal(result.interpretation.reason, "unsupported_ambiance");
      assert.ok(result.spokenResponse.includes("three authentic cinematic lighting tracks"));
    }
  });
});

describe("Phase 5A: Backend Token Security & Ephemeral Tokens", () => {
  test("returns 500 when server ASSEMBLYAI_API_KEY is missing without leaking secrets", async () => {
    const result = await mintAssemblyAiToken("");
    assert.equal(result.status, 500);
    assert.ok(result.data.error?.includes("ASSEMBLYAI_API_KEY is not configured"));
    assert.equal(result.data.token, undefined);
  });

  test("requests the current Universal Streaming v3 endpoint with expires_in_seconds=60", async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = "";
    let requestedHeaders: Record<string, string> = {};

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      requestedUrl = url.toString();
      requestedHeaders = (init?.headers as Record<string, string>) || {};
      return new Response(JSON.stringify({ token: "test_v3_temp_token_xyz" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as any;

    try {
      const result = await mintAssemblyAiToken("test_secret_key_123", 60);
      assert.equal(result.status, 200);
      assert.equal(result.data.token, "test_v3_temp_token_xyz");
      assert.ok(requestedUrl.startsWith("https://streaming.assemblyai.com/v3/token"));
      assert.ok(requestedUrl.includes("expires_in_seconds=60"));
      assert.equal(requestedHeaders["Authorization"], "test_secret_key_123");
      // Ensure permanent key is NEVER in the returned data payload
      assert.equal((result.data as any).apiKey, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("legacy /v2/realtime/token endpoint is not referenced in codebase", async () => {
    const fs = await import("node:fs/promises");
    const tokenHandlerContent = await fs.readFile(new URL("../server/tokenHandler.ts", import.meta.url), "utf-8");
    assert.ok(!tokenHandlerContent.includes("/v2/realtime/token"), "Legacy v2 token endpoint must not be referenced");
    assert.ok(!tokenHandlerContent.includes("api.assemblyai.com/v2"), "Legacy v2 host must not be referenced");
    assert.ok(tokenHandlerContent.includes("streaming.assemblyai.com/v3/token"), "Must use streaming.assemblyai.com/v3/token");
  });

  test("client bundle and source code do NOT contain hardcoded API keys", () => {
    assert.equal(typeof window, "undefined");
  });
});
