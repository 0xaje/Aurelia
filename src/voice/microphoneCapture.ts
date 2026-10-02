import { MicrophoneCaptureOptions } from "./voiceTypes";

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_DURATION_MS = 100;
const SAMPLES_PER_CHUNK = Math.floor((TARGET_SAMPLE_RATE * CHUNK_DURATION_MS) / 1000); // 1600 samples

/**
 * Resamples Float32 audio samples from source sample rate to target sample rate (16kHz),
 * and converts to 16-bit linear PCM (little-endian).
 */
export function resampleAndConvertToPCM16(
  input: Float32Array,
  sourceSampleRate: number,
  targetSampleRate = TARGET_SAMPLE_RATE
): Int16Array {
  if (sourceSampleRate === targetSampleRate) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const originIdx = i * ratio;
    const idx0 = Math.floor(originIdx);
    const idx1 = Math.min(idx0 + 1, input.length - 1);
    const weight = originIdx - idx0;

    // Linear interpolation between adjacent samples
    const sample = input[idx0] * (1 - weight) + input[idx1] * weight;
    const clamped = Math.max(-1, Math.min(1, sample));
    output[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return output;
}

/**
 * Native browser microphone capture with AudioWorklet and 16kHz PCM16 mono streaming.
 * Handles audio conversion, ~100ms chunk aggregation, and resource lifecycle.
 */
export class MicrophoneCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;

  private sampleAccumulator: Int16Array = new Int16Array(0);
  private capturing = false;

  constructor(private options: MicrophoneCaptureOptions) {}

  public isCapturing(): boolean {
    return this.capturing;
  }

  /**
   * Prompts user for microphone access and initiates real-time 16kHz PCM streaming.
   */
  public async start(): Promise<void> {
    if (this.capturing) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      const err = new Error("Microphone capture is not supported in this browser environment.");
      this.options.onError?.(err);
      throw err;
    }

    try {
      // 1. Request microphone permission on explicit user gesture
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // 2. Initialize AudioContext
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 3. Attach AudioWorklet processor (with ScriptProcessor fallback)
      let workletAttached = false;
      if (this.audioContext.audioWorklet) {
        try {
          await this.audioContext.audioWorklet.addModule("/worklets/pcm-processor.js");
          this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");
          this.workletNode.port.onmessage = (event) => {
            this.handleAudioProcess(event.data);
          };
          this.sourceNode.connect(this.workletNode);
          workletAttached = true;
        } catch {
          // If worklet fails to load (e.g. strict CORS or unsupported asset), fallback below
          workletAttached = false;
        }
      }

      if (!workletAttached) {
        // Fallback for environments where AudioWorklet URL resolution is restricted
        this.scriptProcessorNode = this.audioContext.createScriptProcessor(2048, 1, 1);
        this.scriptProcessorNode.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          this.handleAudioProcess(inputData);
        };
        this.sourceNode.connect(this.scriptProcessorNode);
        this.scriptProcessorNode.connect(this.audioContext.destination);
      }

      this.capturing = true;
    } catch (err) {
      this.cleanup();
      const wrappedError = err instanceof Error ? err : new Error(String(err));
      this.options.onError?.(wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Processes raw float samples, downsamples to 16kHz PCM16, aggregates into 100ms chunks,
   * and pushes to the stream consumer.
   */
  private handleAudioProcess(rawFloatSamples: Float32Array): void {
    if (!this.capturing || !this.audioContext) return;

    const sourceSampleRate = this.audioContext.sampleRate;
    const pcm16 = resampleAndConvertToPCM16(rawFloatSamples, sourceSampleRate, TARGET_SAMPLE_RATE);

    // Merge into sample accumulator
    const newAccumulator = new Int16Array(this.sampleAccumulator.length + pcm16.length);
    newAccumulator.set(this.sampleAccumulator);
    newAccumulator.set(pcm16, this.sampleAccumulator.length);
    this.sampleAccumulator = newAccumulator;

    // Emit 100ms chunks (1600 samples = 3200 bytes)
    while (this.sampleAccumulator.length >= SAMPLES_PER_CHUNK) {
      const chunkSamples = this.sampleAccumulator.slice(0, SAMPLES_PER_CHUNK);
      this.sampleAccumulator = this.sampleAccumulator.slice(SAMPLES_PER_CHUNK);
      this.options.onAudioChunk(chunkSamples.buffer);
    }
  }

  /**
   * Stops microphone capture and completely releases audio resources.
   */
  public stop(): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.capturing = false;
    this.sampleAccumulator = new Int16Array(0);

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      this.mediaStream = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.sourceNode = null;
    }

    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.workletNode = null;
    }

    if (this.scriptProcessorNode) {
      try {
        this.scriptProcessorNode.disconnect();
        this.scriptProcessorNode.onaudioprocess = null;
      } catch {
        // Ignore disconnect errors
      }
      this.scriptProcessorNode = null;
    }

    if (this.audioContext) {
      try {
        if (this.audioContext.state !== "closed") {
          this.audioContext.close();
        }
      } catch {
        // Ignore close errors
      }
      this.audioContext = null;
    }
  }
}
