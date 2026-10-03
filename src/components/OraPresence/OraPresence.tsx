import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { SpatialAction, SpaceId } from "../../domain/spatial";
import {
  OraState,
  OraSessionContext,
  OraProvider,
  PropertyContext,
  OraResult
} from "../../ora/oraTypes";
import { defaultPropertyContext } from "../../ora/oraPropertyContext";
import { defaultOraProvider, executeOraRequest } from "../../ora/oraProvider";
import { useVoiceSession } from "../../voice/useVoiceSession";
import { speechOutput } from "../../voice/speechOutput";
import { aureliaProductAdapter } from "../../ora/aureliaAdapter";
import "../../styles/oraPresence.css";

const WELCOME_GREETING =
  "Welcome to Aurelia. I'm Ora. Take your time — I can show you around, or answer anything you'd like to know about the sanctuary.";

export interface OraPresenceProps {
  onSpatialAction: (action: SpatialAction) => void;
  provider?: OraProvider;
  context?: PropertyContext;
  onStateChange?: (state: OraState) => void;
}

declare global {
  interface Window {
    aureliaOra?: {
      say: (query: string) => Promise<OraResult>;
      getSession: () => OraSessionContext;
      resetSession: () => void;
      getProviderName: () => string;
      getState: () => OraState;
      welcome: () => Promise<void>;
    };
    aureliaVoice?: {
      start: () => Promise<void>;
      stop: () => void;
      getState: () => OraState;
      getTranscript: () => string;
      isContinuous: () => boolean;
      triggerWelcome: () => Promise<void>;
      simulateTranscript: (text: string) => Promise<OraResult>;
      bargeIn: (partialText?: string) => void;
    };
  }
}

export const OraPresence: React.FC<OraPresenceProps> = ({
  onSpatialAction,
  provider = defaultOraProvider,
  context = defaultPropertyContext,
  onStateChange
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [oraState, setOraState] = useState<OraState>("idle");
  const [inputValue, setInputValue] = useState<string>("");
  const [whisperText, setWhisperText] = useState<string | null>(null);

  // Notify state changes to subscribers (e.g. OraAtmosphereCoordinator)
  useEffect(() => {
    onStateChange?.(oraState);
  }, [oraState, onStateChange]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<OraSessionContext>({ history: [] });
  const whisperTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownWhisperRef = useRef<boolean>(false);
  const hasSpokenWelcomeRef = useRef<boolean>(false);
  const hasUserInteractedRef = useRef<boolean>(false);
  const isContinuousActiveRef = useRef<boolean>(true);
  const isTourActiveRef = useRef<boolean>(false);
  const tourAbortControllerRef = useRef<AbortController | null>(null);

  const clearWhisperTimer = () => {
    if (whisperTimerRef.current) {
      clearTimeout(whisperTimerRef.current);
      whisperTimerRef.current = null;
    }
  };

  const stopTour = useCallback(() => {
    if (isTourActiveRef.current) {
      isTourActiveRef.current = false;
      tourAbortControllerRef.current?.abort();
      tourAbortControllerRef.current = null;
      speechOutput.cancel();
      setOraState("idle");
    }
  }, []);

  const TOUR_STOPS: Array<{ spaceId: SpaceId; narration: string }> = useMemo(
    () => [
      {
        spaceId: "exterior",
        narration: "Welcome to Aurelia Sanctuary. Let us explore the estate from the arrival runway."
      },
      {
        spaceId: "entrance",
        narration: "Step inside past the cedar canopy and reflection water channel."
      },
      {
        spaceId: "living_room",
        narration: "Here is the sunken living lounge with panoramic canyon views."
      },
      {
        spaceId: "kitchen",
        narration: "Next, the gourmet kitchen and Calacatta marble dining island."
      },
      {
        spaceId: "hallway",
        narration: "The central gallery corridor leads to the secluded private wing."
      },
      {
        spaceId: "master_bedroom",
        narration: "The master bedroom suite opens to panoramic mountain dawns."
      },
      {
        spaceId: "ensuite_bathroom",
        narration: "The primary ensuite features a stone soaking tub framing a private cactus courtyard."
      },
      {
        spaceId: "infinity_pool",
        narration: "And finally, the cantilevered infinity pool with 270-degree sunset vistas."
      }
    ],
    []
  );

  const startGrandTour = useCallback(async () => {
    stopTour();
    isTourActiveRef.current = true;
    const controller = new AbortController();
    tourAbortControllerRef.current = controller;
    setOraState("responding");

    try {
      for (let i = 0; i < TOUR_STOPS.length; i++) {
        if (!isTourActiveRef.current || controller.signal.aborted) break;
        const stop = TOUR_STOPS[i];

        // 1. Move camera / display to space
        onSpatialAction({ type: "SHOW_SPACE", spaceId: stop.spaceId });

        // 2. Vocalize narration
        try {
          await speechOutput.speak(stop.narration);
        } catch {
          // interrupted or speech canceled
        }

        if (!isTourActiveRef.current || controller.signal.aborted) break;

        // 3. Smooth pause (2.4s) to admire the space before proceeding to next
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 2400);
          controller.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
    } finally {
      if (isTourActiveRef.current) {
        isTourActiveRef.current = false;
        setOraState(isContinuousActiveRef.current ? "listening" : "idle");
      }
    }
  }, [TOUR_STOPS, onSpatialAction, stopTour]);

  const showWhisper = useCallback((text: string, customDurationMs?: number) => {
    clearWhisperTimer();
    setWhisperText(text);

    // 2.0 to 8.0 seconds display duration (transient, concise)
    const calculatedDuration =
      customDurationMs ?? Math.min(8000, Math.max(2500, text.length * 45));

    whisperTimerRef.current = setTimeout(() => {
      whisperTimerRef.current = setTimeout(() => {
        setWhisperText(null);
        setOraState((prev) =>
          prev === "responding" || prev === "clarification" ? (isOpen ? "active" : "idle") : prev
        );
      }, 350); // 350ms smooth dissolve fade
    }, calculatedDuration);
  }, [isOpen]);

  // Integrated Voice Session (Phase 5A Streaming STT with Continuous Listening)
  const {
    isListening,
    partialTranscript,
    startListening,
    stopListening
  } = useVoiceSession({
    continuous: true,
    onStateChange: (state) => {
      if (state === "listening" || state === "processing") {
        setOraState(state);
      }
    },
    onSpeechStarted: () => {
      // Barge-in: Visitor begins speaking -> cancel Ora speech & tour immediately!
      stopTour();
      if (speechOutput.isSpeaking()) {
        speechOutput.cancel();
        clearWhisperTimer();
        setOraState("listening");
      }
    },
    onPartialUtterance: () => {
      // Barge-in: Visitor begins speaking -> cancel Ora speech & tour immediately!
      stopTour();
      if (speechOutput.isSpeaking()) {
        speechOutput.cancel();
        clearWhisperTimer();
        setOraState("listening");
      }
    },
    onFinalUtterance: async (finalUtterance) => {
      setIsOpen(false);
      await submitQuery(finalUtterance);
    },
    onError: () => {
      // Do not overwrite welcome greeting if cold unprompted mic access was pending gesture
      if (hasUserInteractedRef.current && hasShownWhisperRef.current) {
        setOraState("error");
      } else {
        setOraState("idle");
      }
    }
  });

  const submitQuery = useCallback(
    async (queryText: string): Promise<OraResult> => {
      const trimmed = queryText.trim();
      if (!trimmed) {
        return {
          rawInput: queryText,
          interpretation: {
            type: "CLARIFICATION_REQUIRED",
            reason: "missing_target",
            spokenResponse: "Ask Ora about any space or lighting atmosphere."
          },
          spokenResponse: "Ask Ora about any space or lighting atmosphere."
        };
      }

      // Stop any running tour if visitor submits a new query
      stopTour();

      // Keep microphone active for continuous barge-in: USER SPEECH > ORA SPEECH
      setOraState("processing");

      try {
        const result = await executeOraRequest(
          trimmed,
          provider,
          context,
          sessionRef.current
        );

        // Check for Grand Tour request
        if (result.action?.type === "START_TOUR" || (result.decision as any)?.type === "START_TOUR") {
          startGrandTour();
          return result;
        }

        // 1. Dispatch environmental ambiance action if present (combined or pure)
        if (result.ambianceAction) {
          onSpatialAction(result.ambianceAction);
        }

        // 2. Dispatch spatial action if present
        if (result.action) {
          onSpatialAction(result.action);
        }

        // 2.5 Dispatch transaction action to ProductAdapter if present
        if (result.transactionAction) {
          try {
            await aureliaProductAdapter.executeAction(result.transactionAction);
          } catch {
            // Safe execution
          }
        }

        // 3. State transition without displaying reply text on front screen
        const isClarification = result.interpretation.type === "CLARIFICATION_REQUIRED";
        setOraState(isClarification ? "clarification" : "responding");

        // 4. Vocalize response with speech synthesis (cancellable by user barge-in)
        await speechOutput.speak(result.spokenResponse);

        // 5. Seamlessly return to listening if not barged into
        setOraState((prev) => {
          if (prev === "responding" || prev === "clarification") {
            return isContinuousActiveRef.current ? "listening" : (isOpen ? "active" : "idle");
          }
          return prev;
        });

        return result;
      } catch (err) {
        setOraState("error");
        setOraState(isContinuousActiveRef.current ? "listening" : "idle");
        throw err;
      }
    },
    [context, onSpatialAction, provider, isOpen, startGrandTour, stopTour]
  );

  /**
   * Welcomes guest with warm greeting and initiates continuous hands-free voice.
   */
  const triggerWelcomeAndListening = useCallback(async () => {
    isContinuousActiveRef.current = true;

    // 1. Display warm greeting banner immediately
    if (!hasShownWhisperRef.current) {
      hasShownWhisperRef.current = true;
      showWhisper(WELCOME_GREETING, 8000);
    }

    // 2. Vocalize welcome greeting out loud
    if (!hasSpokenWelcomeRef.current) {
      speechOutput
        .speak(WELCOME_GREETING)
        .then((spoken) => {
          if (spoken) {
            hasSpokenWelcomeRef.current = true;
          }
        })
        .catch(() => {});
    }

    // 3. Activate continuous microphone hands-free
    if (!isListening) {
      try {
        await startListening();
        setOraState("listening");
      } catch {
        // If cold unprompted mic access was blocked by browser pending gesture,
        // stay in idle without overwriting the welcome banner.
        setOraState("idle");
      }
    }
  }, [showWhisper, startListening, isListening]);

  // Auto-welcome and auto-listen on mount
  useEffect(() => {
    // 1. If permission was already granted previously, start immediately
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === "granted") {
            triggerWelcomeAndListening();
          }
        })
        .catch(() => {});
    }

    // 2. Immediately attempt arrival welcome and hands-free listening
    triggerWelcomeAndListening();

    const timer = setTimeout(() => {
      triggerWelcomeAndListening();
    }, 400);

    return () => clearTimeout(timer);
  }, [triggerWelcomeAndListening]);

  // Universal gesture listener: ensures vocalization and mic turn on if browser blocked cold autoplay
  useEffect(() => {
    const handleGesture = () => {
      hasUserInteractedRef.current = true;
      triggerWelcomeAndListening();
    };

    window.addEventListener("pointerdown", handleGesture, { passive: true });
    window.addEventListener("mousedown", handleGesture, { passive: true });
    window.addEventListener("keydown", handleGesture, { passive: true });
    window.addEventListener("touchstart", handleGesture, { passive: true });
    window.addEventListener("scroll", handleGesture, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("mousedown", handleGesture);
      window.removeEventListener("keydown", handleGesture);
      window.removeEventListener("touchstart", handleGesture);
      window.removeEventListener("scroll", handleGesture);
    };
  }, [triggerWelcomeAndListening]);

  const handleToggleVoice = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isListening || isContinuousActiveRef.current) {
      isContinuousActiveRef.current = false;
      speechOutput.cancel();
      stopListening();
      setOraState(isOpen ? "active" : "idle");
      showWhisper("Microphone paused.");
    } else {
      isContinuousActiveRef.current = true;
      try {
        await startListening();
        setOraState("listening");
      } catch {
        setOraState("error");
        showWhisper("I couldn't access the microphone.");
      }
    }
  };

  // Synchronously expose window APIs so other components, gestures, and tests can access them immediately
  if (typeof window !== "undefined") {
    window.aureliaOra = {
      say: (query: string) => submitQuery(query),
      getSession: () => sessionRef.current,
      resetSession: () => {
        sessionRef.current = { history: [] };
        showWhisper("Sanctuary guide ready.");
      },
      getProviderName: () => provider.name,
      getState: () => oraState,
      welcome: () => triggerWelcomeAndListening()
    };

    window.aureliaVoice = {
      start: () => {
        isContinuousActiveRef.current = true;
        return startListening();
      },
      stop: () => {
        isContinuousActiveRef.current = false;
        speechOutput.cancel();
        stopListening();
      },
      getState: () => (isListening ? "listening" : oraState),
      getTranscript: () => partialTranscript,
      isContinuous: () => isContinuousActiveRef.current,
      triggerWelcome: () => triggerWelcomeAndListening(),
      simulateTranscript: (text: string) => {
        setIsOpen(false);
        return submitQuery(text);
      },
      bargeIn: (_partialText?: string) => {
        speechOutput.cancel();
        clearWhisperTimer();
        setOraState("listening");
      }
    };
  }

  // Register developer verification APIs on window
  useEffect(() => {
    window.aureliaOra = {
      say: (query: string) => submitQuery(query),
      getSession: () => sessionRef.current,
      resetSession: () => {
        sessionRef.current = { history: [] };
        showWhisper("Sanctuary guide ready.");
      },
      getProviderName: () => provider.name,
      getState: () => oraState,
      welcome: () => triggerWelcomeAndListening()
    };

    window.aureliaVoice = {
      start: () => {
        isContinuousActiveRef.current = true;
        return startListening();
      },
      stop: () => {
        isContinuousActiveRef.current = false;
        speechOutput.cancel();
        stopListening();
      },
      getState: () => (isListening ? "listening" : oraState),
      getTranscript: () => partialTranscript,
      isContinuous: () => isContinuousActiveRef.current,
      triggerWelcome: () => triggerWelcomeAndListening(),
      simulateTranscript: (text: string) => {
        setIsOpen(false);
        return submitQuery(text);
      },
      bargeIn: (_partialText?: string) => {
        speechOutput.cancel();
        clearWhisperTimer();
        setOraState("listening");
      }
    };

    return () => {
      delete window.aureliaOra;
      delete window.aureliaVoice;
    };
  }, [
    submitQuery,
    provider,
    oraState,
    isListening,
    partialTranscript,
    startListening,
    stopListening,
    triggerWelcomeAndListening,
    showWhisper
  ]);

  // Handle outside clicks to collapse text input without interrupting voice listening
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setOraState(isContinuousActiveRef.current && isListening ? "listening" : "idle");
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, isListening]);

  const handleToggleClick = () => {
    if (!hasShownWhisperRef.current) {
      hasShownWhisperRef.current = true;
      showWhisper(WELCOME_GREETING, 8000);
      speechOutput.speak(WELCOME_GREETING).catch(() => {});
    }

    if (isOpen) {
      setIsOpen(false);
      setOraState(isContinuousActiveRef.current && isListening ? "listening" : "idle");
    } else {
      setIsOpen(true);
      setOraState("active");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || oraState === "processing") return;
    const query = inputValue;
    setInputValue("");
    setIsOpen(false); // Collapse input surface upon submit
    await submitQuery(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setOraState(isContinuousActiveRef.current && isListening ? "listening" : "idle");
      inputRef.current?.blur();
    }
  };

  return (
    <aside
      ref={containerRef}
      className="ora-presence-container"
      aria-label="Ora Intelligent Sanctuary Presence"
    >
      {/* Live Voice Transcript (Only shown while visitor is actively speaking into mic) */}
      {isListening && partialTranscript && (
        <div className="ora-whisper-bubble" role="status" aria-live="polite">
          <span className="ora-whisper-kicker">YOU</span>
          <p className="ora-whisper-text">“{partialTranscript}”</p>
        </div>
      )}

      {/* Compact Input Surface (Revealed upon clicking Ora) */}
      {isOpen && (
        <form className="ora-input-surface" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="ora-surface-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening to you…" : "Ask Ora…"}
            aria-label="Ask Ora Sanctuary Presence"
          />
          <button
            type="button"
            className={`ora-surface-mic ${isListening ? "is-listening" : ""}`}
            onClick={handleToggleVoice}
            disabled={oraState === "processing"}
            aria-label={isListening ? "Mute microphone" : "Speak to Ora"}
            title={isListening ? "Mute microphone" : "Speak to Ora"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </button>
          <button
            type="submit"
            className="ora-surface-submit"
            disabled={!inputValue.trim() || oraState === "processing"}
            aria-label="Send spatial instruction"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </form>
      )}

      {/* Hands-Free Active Microphone Indicator */}
      {isListening && !whisperText && !partialTranscript && (
        <div className="ora-mic-live-badge" aria-label="Microphone live and listening">
          <span className="ora-mic-live-dot" aria-hidden="true" />
          <span className="ora-mic-live-label">Listening</span>
        </div>
      )}

      {/* Sculptural Living Presence Object */}
      <button
        type="button"
        className="ora-presence-anchor"
        data-state={isListening ? "listening" : oraState}
        onClick={handleToggleClick}
        onMouseEnter={() => {
          if (!isOpen && oraState === "idle" && !isListening) setOraState("hover");
        }}
        onMouseLeave={() => {
          if (!isOpen && oraState === "hover" && !isListening) setOraState("idle");
        }}
        aria-label={isListening ? "Ora is listening ambiently" : "Activate Ora Presence"}
        aria-expanded={isOpen}
      >
        <span className="ora-halo-ring" aria-hidden="true" />
        <span className="ora-core-orb" aria-hidden="true">
          <svg
            className="ora-core-triangle-svg"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="oraGoldGradient" x1="15%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stopColor="#f7efe3" />
                <stop offset="38%" stopColor="#d4b886" />
                <stop offset="78%" stopColor="#755227" />
                <stop offset="100%" stopColor="#1e1810" />
              </linearGradient>
            </defs>
            <polygon
              points="12,3.5 21.5,19.8 2.5,19.8"
              fill="url(#oraGoldGradient)"
              stroke="rgba(255, 255, 255, 0.45)"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    </aside>
  );
};
