import { MicrophoneCapture } from "./microphoneCapture";
import { AssemblyAiStream } from "./assemblyAiStream";
import { VoiceSessionOptions, VoiceState } from "./voiceTypes";

/**
 * Coordinates browser microphone capture, AssemblyAI streaming STT, and voice state lifecycle.
 * Supports continuous turn-by-turn listening without requiring repeated mic clicks.
 */
export class VoiceSession {
  private mic: MicrophoneCapture | null = null;
  private stream: AssemblyAiStream | null = null;
  private currentState: VoiceState = "idle";
  private currentTranscript = "";
  private currentPartial = "";
  private isPaused = false;

  constructor(private options: VoiceSessionOptions = {}) {}

  public getState(): VoiceState {
    return this.currentState;
  }

  public getTranscript(): string {
    return this.currentTranscript;
  }

  public getPartialTranscript(): string {
    return this.currentPartial;
  }

  public isContinuous(): boolean {
    return this.options.continuous !== false;
  }

  public isLive(): boolean {
    return !!(this.mic && this.stream && this.stream.getIsConnected());
  }

  private setState(state: VoiceState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.options.onStateChange?.(state);
  }

  /**
   * Starts microphone capture and connects the AssemblyAI v3 streaming WebSocket.
   */
  public async start(): Promise<void> {
    if (this.currentState === "listening" || this.currentState === "processing") {
      return;
    }

    this.currentTranscript = "";
    this.currentPartial = "";
    this.isPaused = false;
    this.setState("listening");

    try {
      // 1. Initialize AssemblyAI v3 streaming socket
      this.stream = new AssemblyAiStream({
        tokenUrl: this.options.tokenUrl,
        token: this.options.token,
        sampleRate: 16000,
        onSpeechStarted: () => {
          this.options.onSpeechStarted?.();
        },
        onPartialTranscript: (partial) => {
          if (!this.isPaused) {
            this.currentPartial = partial;
            this.options.onPartialUtterance?.(partial);
          }
        },
        onFinalTranscript: (final) => {
          if (!this.isPaused) {
            this.handleFinalTranscript(final);
          }
        },
        onError: (err) => {
          this.handleError(err);
        },
        onClose: () => {
          if (this.currentState === "listening") {
            this.setState("idle");
          }
        }
      });

      // 2. Initialize microphone capture producing 16kHz PCM16 chunks
      this.mic = new MicrophoneCapture({
        sampleRate: 16000,
        channelCount: 1,
        onAudioChunk: (chunk) => {
          if (!this.isPaused && this.stream) {
            this.stream.sendAudio(chunk);
          }
        },
        onError: (err) => {
          this.handleError(err);
        }
      });

      // 3. Activate microphone first (requests browser mic access)
      await this.mic.start();
      // 4. Connect AssemblyAI streaming WebSocket once mic is active
      await this.stream.connect();
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      this.handleError(wrapped);
      throw wrapped;
    }
  }

  /**
   * Temporarily pauses audio forwarding if explicitly requested.
   */
  public pauseStreaming(): void {
    this.isPaused = true;
  }

  /**
   * Resumes continuous streaming and resets state back to listening for the next turn.
   */
  public resumeListening(): void {
    this.isPaused = false;
    this.currentPartial = "";
    if (this.mic && this.stream && this.stream.getIsConnected()) {
      this.setState("listening");
    }
  }

  /**
   * Processes the final transcript emitted when the user finishes speaking a turn.
   */
  private handleFinalTranscript(finalText: string): void {
    const trimmed = finalText.trim();
    if (!trimmed) {
      // Ignore empty or whitespace-only final transcripts
      return;
    }

    this.currentTranscript = trimmed;
    this.currentPartial = "";
    this.setState("processing");

    const continuous = this.options.continuous !== false;

    if (!continuous) {
      // Stop recording if single-turn mode
      this.stopCaptureOnly();
    }
    // In continuous mode, microphone remains active to allow natural barge-in

    // Pass final transcript to consumer
    this.options.onFinalUtterance?.(trimmed);
  }

  private handleError(error: Error): void {
    this.cleanup();
    this.setState("error");
    this.options.onError?.(error);
  }

  /**
   * Stops audio capture without terminating final processing.
   */
  private stopCaptureOnly(): void {
    if (this.mic) {
      this.mic.stop();
      this.mic = null;
    }
    if (this.stream) {
      this.stream.terminate();
      this.stream = null;
    }
  }

  /**
   * Stops the voice session completely and returns to idle.
   */
  public stop(): void {
    this.cleanup();
    this.setState("idle");
  }

  /**
   * Releases all underlying audio and networking resources.
   */
  public cleanup(): void {
    this.isPaused = false;
    if (this.mic) {
      this.mic.stop();
      this.mic = null;
    }
    if (this.stream) {
      this.stream.terminate();
      this.stream = null;
    }
  }
}
