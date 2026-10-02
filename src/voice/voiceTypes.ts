import { OraState } from "../ora/oraTypes";

export type VoiceState = OraState;

/**
 * AssemblyAI Streaming STT v3 WebSocket Server-to-Client Messages
 */
export interface AssemblyAiBeginMessage {
  type: "Begin";
  id?: string;
  session_id?: string;
  expires_at?: number;
}

export interface AssemblyAiSpeechStartedMessage {
  type: "SpeechStarted";
}

export interface AssemblyAiWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface AssemblyAiTurnMessage {
  type?: "Turn";
  turn_order?: number;
  end_of_turn?: boolean;
  transcript: string;
  end_of_turn_confidence?: number;
  turn_is_formatted?: boolean;
  words?: AssemblyAiWord[];
}

export interface AssemblyAiTerminationMessage {
  type: "Termination";
  audio_duration_seconds?: number;
}

export interface AssemblyAiErrorMessage {
  type: "Error";
  error: string;
}

export type AssemblyAiServerMessage =
  | AssemblyAiBeginMessage
  | AssemblyAiSpeechStartedMessage
  | AssemblyAiTurnMessage
  | AssemblyAiTerminationMessage
  | AssemblyAiErrorMessage;

export type AudioChunkHandler = (chunk: ArrayBuffer) => void;
export type TranscriptHandler = (transcript: string) => void;
export type VoiceStateHandler = (state: VoiceState) => void;
export type VoiceErrorHandler = (error: Error) => void;

export interface MicrophoneCaptureOptions {
  sampleRate?: number;
  channelCount?: number;
  chunkDurationMs?: number;
  onAudioChunk: AudioChunkHandler;
  onError?: VoiceErrorHandler;
}

export interface AssemblyAiStreamOptions {
  tokenUrl?: string;
  token?: string;
  sampleRate?: number;
  onBegin?: (sessionId: string) => void;
  onSpeechStarted?: () => void;
  onPartialTranscript?: TranscriptHandler;
  onFinalTranscript?: TranscriptHandler;
  onError?: VoiceErrorHandler;
  onClose?: () => void;
}

export interface VoiceSessionOptions {
  tokenUrl?: string;
  token?: string;
  continuous?: boolean;
  onStateChange?: VoiceStateHandler;
  onSpeechStarted?: () => void;
  onPartialUtterance?: TranscriptHandler;
  onFinalUtterance?: TranscriptHandler;
  onError?: VoiceErrorHandler;
}
