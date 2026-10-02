/**
 * AURELIA — Atmosphere Ambient Audio Engine (Phase 5B.1)
 *
 * Implements foundational ambient atmosphere beneath the visual property experience.
 * Architecture:
 *   HTMLAudioElement -> MediaElementAudioSourceNode -> GainNode -> AudioContext.destination
 *
 * Principles:
 * - Audio is an atmospheric layer, not a music player or dashboard.
 * - Audio failure must never block or degrade the visual experience.
 * - Smooth AudioParam scheduling (no clicks, pops, or abrupt jumps).
 * - Preserves user volume across temporary duck/restore states.
 */

export type AtmosphereState =
  | "idle"
  | "playing"
  | "muted"
  | "paused"
  | "unavailable";

export interface AtmosphereOptions {
  audioSrc?: string;
  defaultVolume?: number;
  duckVolume?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  duckMs?: number;
  restoreMs?: number;
}

export interface AureliaAtmosphere {
  initialize(): Promise<void>;
  play(): Promise<void>;
  pause(): void;

  fadeIn(durationMs?: number): Promise<void>;
  fadeOut(durationMs?: number): Promise<void>;
  ensurePlaying(durationMs?: number): Promise<boolean>;

  duck(durationMs?: number): Promise<void>;
  restore(durationMs?: number): Promise<void>;

  setVolume(volume: number): void;
  getVolume(): number;
  getEffectiveGain(): number;

  mute(): void;
  unmute(): void;
  isMuted(): boolean;

  getState(): AtmosphereState;

  destroy(): void;
}

export const DEFAULT_VOLUME = 0.22;
export const DUCK_VOLUME = 0.035;
export const DEFAULT_FADE_IN_MS = 1800;
export const DEFAULT_FADE_OUT_MS = 1200;
export const DEFAULT_DUCK_MS = 350;
export const DEFAULT_RESTORE_MS = 900;
export const DEFAULT_AUDIO_SRC = "/audio/aurelia-atmosphere.mp3";

export class AureliaAtmosphereEngine implements AureliaAtmosphere {
  private audioSrc: string;
  private defaultVolume: number;
  private duckVolume: number;
  private fadeInMs: number;
  private fadeOutMs: number;
  private duckMs: number;
  private restoreMs: number;

  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;

  private userVolume: number;
  private state: AtmosphereState = "idle";
  private isMutedInternal = false;
  private isDuckedInternal = false;
  private isInitialized = false;
  private currentEffectiveGain = 0;

  constructor(options: AtmosphereOptions = {}) {
    this.audioSrc = options.audioSrc ?? DEFAULT_AUDIO_SRC;
    this.defaultVolume = this.clampVolume(options.defaultVolume ?? DEFAULT_VOLUME);
    this.duckVolume = this.clampVolume(options.duckVolume ?? DUCK_VOLUME);
    this.fadeInMs = options.fadeInMs ?? DEFAULT_FADE_IN_MS;
    this.fadeOutMs = options.fadeOutMs ?? DEFAULT_FADE_OUT_MS;
    this.duckMs = options.duckMs ?? DEFAULT_DUCK_MS;
    this.restoreMs = options.restoreMs ?? DEFAULT_RESTORE_MS;

    this.userVolume = this.defaultVolume;
  }

  private clampVolume(vol: number): number {
    return Math.max(0, Math.min(1, vol));
  }

  public getState(): AtmosphereState {
    return this.state;
  }

  public getVolume(): number {
    return this.userVolume;
  }

  public getEffectiveGain(): number {
    return this.currentEffectiveGain;
  }

  public isMuted(): boolean {
    return this.isMutedInternal;
  }

  /**
   * Initializes browser audio graph on user gesture. Safe against multiple calls.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      if (this.audioContext && this.audioContext.state === "suspended") {
        try {
          await this.audioContext.resume();
        } catch {
          // Graceful fallback
        }
      }
      return;
    }

    if (
      typeof window === "undefined" ||
      (typeof AudioContext === "undefined" &&
        typeof (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext === "undefined")
    ) {
      this.state = "unavailable";
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.audioContext = new AudioCtx();

      const audio = new Audio(this.audioSrc);
      audio.loop = true;
      audio.preload = "auto";
      this.audioElement = audio;

      const gain = this.audioContext.createGain();
      gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.gainNode = gain;
      this.currentEffectiveGain = 0;

      const source = this.audioContext.createMediaElementSource(audio);
      this.sourceNode = source;

      source.connect(gain);
      gain.connect(this.audioContext.destination);

      this.isInitialized = true;
      if (this.state !== "playing" && this.state !== "muted") {
        this.state = "idle";
      }
    } catch {
      // Audio failure must never break AURELIA
      this.state = "unavailable";
    }
  }

  /**
   * Smoothly ramps gain using Web Audio scheduling.
   */
  private rampGain(targetGain: number, durationMs: number): Promise<void> {
    const clampedTarget = this.clampVolume(targetGain);

    if (!this.gainNode || !this.audioContext) {
      this.currentEffectiveGain = clampedTarget;
      return Promise.resolve();
    }

    try {
      const now = this.audioContext.currentTime;
      const durationSec = Math.max(0.01, durationMs / 1000);
      const currentVal = this.gainNode.gain.value;

      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(currentVal, now);
      this.gainNode.gain.linearRampToValueAtTime(clampedTarget, now + durationSec);
      this.currentEffectiveGain = clampedTarget;

      return new Promise((resolve) => {
        setTimeout(resolve, durationMs);
      });
    } catch {
      this.currentEffectiveGain = clampedTarget;
      return Promise.resolve();
    }
  }

  /**
   * Computes the target gain accounting for mute, ducking, and user volume.
   */
  private computeEffectiveTarget(): number {
    if (this.isMutedInternal) return 0;
    if (this.isDuckedInternal) return Math.min(this.duckVolume, this.userVolume);
    return this.userVolume;
  }

  /**
   * Resumes and plays the audio element.
   */
  public async play(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.state === "unavailable" || !this.audioElement) {
      return;
    }

    if (this.audioContext && this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch {
        // Fallback
      }
    }

    try {
      await this.audioElement.play();
      this.state = this.isMutedInternal ? "muted" : "playing";
      const targetGain = this.computeEffectiveTarget();
      await this.rampGain(targetGain, 50);
    } catch {
      // Browser prevented unprompted playback
      if (this.state !== "playing" && this.state !== "muted") {
        this.state = "paused";
      }
    }
  }

  /**
   * Pauses atmosphere playback.
   */
  public pause(): void {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
      } catch {
        // Fallback
      }
    }

    if (this.state === "playing" || this.state === "muted" || this.state === "idle") {
      this.state = "paused";
    }
  }

  /**
   * Resumes Web Audio graph and ensures audio element is playing.
   * Returns true if playing successfully, false if still blocked by browser autoplay policy.
   */
  public async ensurePlaying(durationMs: number = this.fadeInMs): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.state === "unavailable" || !this.audioElement) {
      return false;
    }

    if (this.audioContext && this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch {
        // Fallback
      }
    }

    try {
      await this.audioElement.play();
      this.state = this.isMutedInternal ? "muted" : "playing";
      const targetGain = this.computeEffectiveTarget();
      await this.rampGain(targetGain, durationMs);
      return true;
    } catch {
      if (this.state !== "playing" && this.state !== "muted") {
        this.state = "paused";
      }
      return false;
    }
  }

  /**
   * Fades in atmosphere from zero to normal volume.
   */
  public async fadeIn(durationMs: number = this.fadeInMs): Promise<void> {
    await this.ensurePlaying(durationMs);
  }

  /**
   * Fades out atmosphere to zero, then pauses.
   */
  public async fadeOut(durationMs: number = this.fadeOutMs): Promise<void> {
    if (!this.gainNode || !this.audioElement) {
      this.pause();
      return;
    }

    await this.rampGain(0, durationMs);
    this.pause();
  }

  /**
   * Temporarily ducks atmosphere volume without overwriting userVolume.
   */
  public async duck(durationMs: number = this.duckMs): Promise<void> {
    this.isDuckedInternal = true;
    if (this.state === "playing") {
      const targetGain = this.computeEffectiveTarget();
      await this.rampGain(targetGain, durationMs);
    }
  }

  /**
   * Restores volume from ducked state back to userVolume.
   */
  public async restore(durationMs: number = this.restoreMs): Promise<void> {
    this.isDuckedInternal = false;
    if (this.state === "playing") {
      const targetGain = this.computeEffectiveTarget();
      await this.rampGain(targetGain, durationMs);
    }
  }

  /**
   * Updates master user volume (clamped 0.0 - 1.0).
   */
  public setVolume(volume: number): void {
    const clamped = this.clampVolume(volume);
    this.userVolume = clamped;

    if (this.state === "playing" && !this.isMutedInternal && !this.isDuckedInternal) {
      this.rampGain(clamped, 60);
    }
  }

  /**
   * Mutes atmosphere output immediately while preserving playback and user volume.
   */
  public mute(): void {
    this.isMutedInternal = true;

    if (this.gainNode && this.audioContext) {
      try {
        const now = this.audioContext.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(0, now);
        this.currentEffectiveGain = 0;
      } catch {
        this.currentEffectiveGain = 0;
      }
    }

    if (this.state === "playing") {
      this.state = "muted";
    }
  }

  /**
   * Unmutes atmosphere and restores previous volume.
   */
  public unmute(): void {
    this.isMutedInternal = false;

    if (this.state === "muted") {
      this.state = "playing";
    }

    if (this.state === "playing") {
      const targetGain = this.computeEffectiveTarget();
      this.rampGain(targetGain, 250);
    }
  }

  /**
   * Completely tears down audio graph and releases browser resources.
   */
  public destroy(): void {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = "";
      } catch {
        // Fallback
      }
      this.audioElement = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // Fallback
      }
      this.sourceNode = null;
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // Fallback
      }
      this.gainNode = null;
    }

    if (this.audioContext) {
      try {
        if (this.audioContext.state !== "closed") {
          this.audioContext.close().catch(() => {});
        }
      } catch {
        // Fallback
      }
      this.audioContext = null;
    }

    this.isInitialized = false;
    this.isMutedInternal = false;
    this.isDuckedInternal = false;
    this.currentEffectiveGain = 0;
    this.userVolume = this.defaultVolume;
    this.state = "idle";
  }
}

export const aureliaAtmosphere = new AureliaAtmosphereEngine();
