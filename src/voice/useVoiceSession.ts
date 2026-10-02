import { useState, useRef, useEffect, useCallback } from "react";
import { VoiceSession } from "./voiceSession";
import { VoiceState, TranscriptHandler } from "./voiceTypes";

interface UseVoiceSessionOptions {
  tokenUrl?: string;
  token?: string;
  continuous?: boolean;
  onSpeechStarted?: () => void;
  onPartialUtterance?: (partial: string) => void;
  onFinalUtterance?: TranscriptHandler;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: Error) => void;
}

export function useVoiceSession(options: UseVoiceSessionOptions = {}) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [partialTranscript, setPartialTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<VoiceSession | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    sessionRef.current = new VoiceSession({
      tokenUrl: options.tokenUrl,
      token: options.token,
      continuous: options.continuous ?? true,
      onStateChange: (state) => {
        setVoiceState(state);
        optionsRef.current.onStateChange?.(state);
      },
      onSpeechStarted: () => {
        optionsRef.current.onSpeechStarted?.();
      },
      onPartialUtterance: (partial) => {
        setPartialTranscript(partial);
        optionsRef.current.onPartialUtterance?.(partial);
      },
      onFinalUtterance: (final) => {
        setTranscript(final);
        setPartialTranscript("");
        optionsRef.current.onFinalUtterance?.(final);
      },
      onError: (err) => {
        setError(err.message);
        optionsRef.current.onError?.(err);
      }
    });

    return () => {
      sessionRef.current?.cleanup();
      sessionRef.current = null;
    };
  }, [options.tokenUrl, options.token, options.continuous]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    setPartialTranscript("");
    if (sessionRef.current) {
      await sessionRef.current.start();
    }
  }, []);

  const resumeListening = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.resumeListening();
    }
  }, []);

  const pauseStreaming = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.pauseStreaming();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.stop();
    }
  }, []);

  return {
    voiceState,
    transcript,
    partialTranscript,
    error,
    isListening: voiceState === "listening",
    isProcessing: voiceState === "processing",
    startListening,
    resumeListening,
    pauseStreaming,
    stopListening
  };
}
