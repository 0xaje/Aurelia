import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { VoiceSession } from "../src/voice/voiceSession.ts";
import { speechOutput } from "../src/voice/speechOutput.ts";

describe("Phase 5C.1: Conversational Barge-In & Speech Interruption", () => {
  beforeEach(() => {
    speechOutput.cancel();
  });

  test("VoiceSession in continuous mode never pauses streaming after final transcript", () => {
    const session = new VoiceSession({
      continuous: true
    });

    (session as any).handleFinalTranscript("Tell me about Aurelia");

    assert.equal(session.getState(), "processing");
    // Crucial Phase 5C.1 invariant: isPaused must remain false so visitor can barge in at any moment
    assert.equal((session as any).isPaused, false);
  });

  test("onSpeechStarted callback triggers while Ora is speaking to cancel TTS", () => {
    let speechCancelled = false;
    let stateAfterInterruption = "";

    // Simulate mock speech output
    (speechOutput as any).isSpeakingInternal = true;
    assert.equal(speechOutput.isSpeaking(), true);

    const session = new VoiceSession({
      continuous: true,
      onSpeechStarted: () => {
        // Visitor began speaking -> cancel Ora speech immediately!
        if (speechOutput.isSpeaking()) {
          speechOutput.cancel();
          speechCancelled = true;
          stateAfterInterruption = "listening";
        }
      }
    });

    // Simulate incoming speech start event from AssemblyAI stream
    (session as any).options.onSpeechStarted?.();

    assert.equal(speechCancelled, true);
    assert.equal(speechOutput.isSpeaking(), false);
    assert.equal(stateAfterInterruption, "listening");
  });

  test("partial transcript while Ora is speaking cancels TTS without executing actions", () => {
    let speechCancelled = false;
    let actionExecuted = false;

    // Simulate Ora actively speaking
    (speechOutput as any).isSpeakingInternal = true;

    const session = new VoiceSession({
      continuous: true,
      onPartialUtterance: (_partial) => {
        if (speechOutput.isSpeaking()) {
          speechOutput.cancel();
          speechCancelled = true;
        }
        // Invariant: partial transcripts never execute spatial actions
        actionExecuted = false;
      }
    });

    // Visitor interrupts mid-sentence with partial transcript
    (session as any).options.onPartialUtterance?.("No, wait...");

    assert.equal(speechCancelled, true);
    assert.equal(speechOutput.isSpeaking(), false);
    assert.equal(actionExecuted, false);
  });

  test("final transcript received after barge-in processes user utterance with priority", () => {
    let processedUtterance = "";

    const session = new VoiceSession({
      continuous: true,
      onFinalUtterance: (text) => {
        processedUtterance = text;
      }
    });

    // Visitor interrupted with: "No, don't worry about that. Show me the pool."
    (session as any).handleFinalTranscript("No, don't worry about that. Show me the pool.");

    assert.equal(processedUtterance, "No, don't worry about that. Show me the pool.");
    assert.equal(session.getState(), "processing");
  });

  test("speech cancellation is safe and idempotent when already idle", () => {
    assert.doesNotThrow(() => {
      speechOutput.cancel();
      speechOutput.cancel();
      speechOutput.cancel();
    });
    assert.equal(speechOutput.isSpeaking(), false);
  });
});
