import {
  AssemblyAiStreamOptions,
  AssemblyAiServerMessage,
  AssemblyAiTurnMessage
} from "./voiceTypes";

const DEFAULT_TOKEN_URL = "/api/assemblyai/token";
const ASSEMBLYAI_V3_WS_BASE = "wss://streaming.assemblyai.com/v3/ws";

/**
 * AssemblyAI Streaming STT v3 WebSocket client.
 * Securely uses temporary server-minted tokens to stream PCM16 audio.
 */
export class AssemblyAiStream {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private isTerminated = false;

  constructor(private options: AssemblyAiStreamOptions = {}) {}

  public isOpen(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }

  public getIsConnected(): boolean {
    return this.isOpen();
  }

  /**
   * Fetches temporary streaming token from backend endpoint and opens the v3 WebSocket.
   */
  public async connect(): Promise<void> {
    if (this.isConnected && this.socket) return;
    this.isTerminated = false;

    // 1. Fetch short-lived token from backend (or use injected test token)
    let token = this.options.token;
    if (!token) {
      const tokenUrl = this.options.tokenUrl || DEFAULT_TOKEN_URL;
      const res = await fetch(tokenUrl);
      if (!res.ok) {
        let errorMsg = `Server failed to generate token (${res.status})`;
        try {
          const body = await res.json();
          if (body.error) errorMsg = body.error;
        } catch {
          // Ignore JSON parse error
        }
        throw new Error(errorMsg);
      }
      const data = (await res.json()) as { token?: string };
      if (!data.token) {
        throw new Error("No token returned by token endpoint");
      }
      token = data.token;
    }

    // 2. Open AssemblyAI v3 WebSocket with temporary token
    const sampleRate = this.options.sampleRate || 16000;
    const wsUrl = `${ASSEMBLYAI_V3_WS_BASE}?token=${encodeURIComponent(token)}&sample_rate=${sampleRate}`;

    return new Promise<void>((resolve, reject) => {
      let resolved = false;

      try {
        this.socket = new WebSocket(wsUrl);
        this.socket.binaryType = "arraybuffer";

        this.socket.onopen = () => {
          this.isConnected = true;
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onerror = () => {
          const err = new Error("AssemblyAI WebSocket connection error");
          this.options.onError?.(err);
          if (!resolved) {
            resolved = true;
            reject(err);
          }
        };

        this.socket.onclose = () => {
          this.isConnected = false;
          this.options.onClose?.();
        };
      } catch (err) {
        const wrappedError = err instanceof Error ? err : new Error(String(err));
        this.options.onError?.(wrappedError);
        reject(wrappedError);
      }
    });
  }

  /**
   * Handles text JSON messages received from AssemblyAI v3 streaming endpoint.
   */
  private handleMessage(data: unknown): void {
    if (typeof data !== "string") return;

    try {
      const msg = JSON.parse(data) as AssemblyAiServerMessage;

      if (msg.type === "Begin") {
        this.options.onBegin?.(msg.id || msg.session_id || "");
      } else if (msg.type === "SpeechStarted") {
        this.options.onSpeechStarted?.();
      } else if (msg.type === "Turn" || "transcript" in msg) {
        const turnMsg = msg as AssemblyAiTurnMessage;
        const transcript = turnMsg.transcript?.trim() || "";
        if (turnMsg.end_of_turn) {
          // Finalized turn utterance -> trigger downstream action
          this.options.onFinalTranscript?.(transcript);
        } else {
          // Partial turn update -> live preview only
          this.options.onPartialTranscript?.(transcript);
        }
      } else if (msg.type === "Error") {
        this.options.onError?.(new Error(msg.error || "AssemblyAI streaming error"));
      } else if (msg.type === "Termination") {
        this.cleanup();
      }
    } catch (err) {
      // Ignore non-JSON frame or parse errors safely
    }
  }

  /**
   * Streams raw 16kHz PCM16 audio chunk (ArrayBuffer) to the active WebSocket.
   */
  public sendAudio(chunk: ArrayBuffer): void {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(chunk);
  }

  /**
   * Sends Terminate frame and performs clean WebSocket teardown.
   */
  public terminate(): void {
    if (this.isTerminated) return;
    this.isTerminated = true;

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        // Send official v3 client termination message
        this.socket.send(JSON.stringify({ type: "Terminate" }));
      } catch {
        // Ignore send error on closing socket
      }
    }

    // Allow graceful server termination frame with timeout fallback
    setTimeout(() => {
      this.cleanup();
    }, 250);
  }

  private cleanup(): void {
    this.isConnected = false;
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // Ignore socket close errors
      }
      this.socket = null;
    }
  }
}
