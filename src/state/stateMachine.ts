import type { PrimaryState } from "./types.ts";

const LEGAL_TRANSITIONS: Record<PrimaryState, PrimaryState[]> = {
  IDLE: ["LISTENING", "UNDERSTANDING"],
  LISTENING: ["UNDERSTANDING", "IDLE"],
  UNDERSTANDING: ["VISUAL_TRANSITION", "RESPONDING", "EXPLORING", "IDLE"],
  VISUAL_TRANSITION: ["RESPONDING", "EXPLORING"],
  RESPONDING: ["LISTENING", "EXPLORING", "IDLE"],
  EXPLORING: ["LISTENING", "UNDERSTANDING", "BOOKING", "IDLE", "VISUAL_TRANSITION"],
  BOOKING: ["KEY_ISSUED", "EXPLORING"],
  KEY_ISSUED: ["EXPLORING", "IDLE"]
};

export class AureliaFSM {
  private currentState: PrimaryState = "IDLE";
  private listeners: Array<(state: PrimaryState) => void> = [];

  constructor(initialState: PrimaryState = "IDLE") {
    this.currentState = initialState;
  }

  public getState(): PrimaryState {
    return this.currentState;
  }

  public canTransitionTo(target: PrimaryState): boolean {
    const allowed = LEGAL_TRANSITIONS[this.currentState];
    return allowed ? allowed.includes(target) : false;
  }

  public transition(target: PrimaryState): boolean {
    if (this.currentState === target) {
      return true; // No-op
    }

    if (!this.canTransitionTo(target)) {
      console.warn(
        `[AureliaFSM] Illegal state transition rejected: ${this.currentState} -> ${target}`
      );
      return false;
    }

    const previous = this.currentState;
    this.currentState = target;
    this.notify(target);
    console.info(`[AureliaFSM] State transition: ${previous} -> ${target}`);
    return true;
  }

  public subscribe(callback: (state: PrimaryState) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentState);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(newState: PrimaryState): void {
    this.listeners.forEach((callback) => {
      try {
        callback(newState);
      } catch (err) {
        console.error("[AureliaFSM] Error in state listener:", err);
      }
    });
  }
}
