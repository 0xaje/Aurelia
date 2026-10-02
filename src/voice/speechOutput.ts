/**
 * Aurelia Ora Speech Output System
 * 
 * Provides warm, serene vocalization for Ora's greetings and responses
 * using the browser's high-fidelity SpeechSynthesis engine.
 */

export interface SpeechOutputOptions {
  rate?: number;    // Speech rate (default 0.92 for calm luxury tempo)
  pitch?: number;   // Pitch (default 0.98 for soothing warm tone)
  volume?: number;  // Volume (default 1.0)
  lang?: string;    // Preferred language (default 'en-GB' / 'en-US')
}

class SpeechOutputManager {
  private isSpeakingInternal = false;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private voiceLoaded = false;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices(): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Prefer calm, elegant British or refined natural English voices
    const preferredNames = [
      "Google UK English Female",
      "Serena",
      "Victoria",
      "Samantha",
      "Karen",
      "Moira",
      "Fiona",
      "en-GB"
    ];

    for (const name of preferredNames) {
      const match = voices.find(
        (v) => v.name.includes(name) || (v.lang && v.lang.startsWith(name))
      );
      if (match) {
        this.preferredVoice = match;
        this.voiceLoaded = true;
        break;
      }
    }

    if (!this.preferredVoice) {
      this.preferredVoice = voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
      this.voiceLoaded = true;
    }
  }

  public isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingInternal || (this.isSupported() && window.speechSynthesis.speaking);
  }

  /**
   * Vocalizes text with warm luxury cadence.
   * Resolves true when playback completes successfully, or false on error/cancellation/block.
   */
  public async speak(text: string, options: SpeechOutputOptions = {}): Promise<boolean> {
    if (!this.isSupported() || !text.trim()) {
      return false;
    }

    // Cancel any overlapping utterance
    this.cancel();

    if (!this.voiceLoaded) {
      this.initVoices();
    }

    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text.trim());
        utterance.rate = options.rate ?? 0.92;
        utterance.pitch = options.pitch ?? 0.98;
        utterance.volume = options.volume ?? 1.0;

        if (this.preferredVoice) {
          utterance.voice = this.preferredVoice;
        } else if (options.lang) {
          utterance.lang = options.lang;
        }

        this.isSpeakingInternal = true;

        utterance.onend = () => {
          this.isSpeakingInternal = false;
          resolve(true);
        };

        utterance.onerror = () => {
          this.isSpeakingInternal = false;
          resolve(false);
        };

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
      } catch {
        this.isSpeakingInternal = false;
        resolve(false);
      }
    });
  }

  public cancel(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe fallback
      }
    }
    this.isSpeakingInternal = false;
  }
}

export const speechOutput = new SpeechOutputManager();
