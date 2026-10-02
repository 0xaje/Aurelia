/**
 * AURELIA — Ora ↔ Atmosphere Coordinator (Phase 5B.2)
 *
 * Connects existing Ora interaction states to the Aurelia Atmosphere engine.
 * UX Principle:
 *   "The house becomes quieter when Ora speaks or listens."
 *
 * State Mapping:
 *   Normal:   idle, hover
 *   Ducked:   active, listening, processing, responding, clarification
 *   Restore:  error, return to idle/hover
 *
 * Rules:
 * - State-aware: tracks ducked state to prevent redundant duck/restore scheduling.
 * - Does not modify user volume (user volume is sacred).
 * - Preserves muted state (does not unmute if already muted).
 * - Safely no-ops if atmosphere is unavailable or not yet started (does not force-start audio).
 * - Completely decoupled from microphone capture, VAD, and camera systems.
 */

import { OraState } from "../ora/oraTypes";
import { AureliaAtmosphere } from "./AureliaAtmosphere";

export interface OraAtmosphereCoordinatorOptions {
  duckDurationMs?: number;
  restoreDurationMs?: number;
}

export class OraAtmosphereCoordinator {
  private atmosphere: AureliaAtmosphere;
  private isDucked = false;
  private lastState: OraState = "idle";
  private duckDurationMs?: number;
  private restoreDurationMs?: number;

  constructor(
    atmosphere: AureliaAtmosphere,
    options: OraAtmosphereCoordinatorOptions = {}
  ) {
    this.atmosphere = atmosphere;
    this.duckDurationMs = options.duckDurationMs;
    this.restoreDurationMs = options.restoreDurationMs;
  }

  /**
   * Determines whether an Ora state should cause the atmosphere to duck.
   */
  public static shouldDuck(state: OraState): boolean {
    switch (state) {
      case "active":
      case "listening":
      case "processing":
      case "responding":
      case "clarification":
        return true;
      case "idle":
      case "hover":
      case "error":
      default:
        return false;
    }
  }

  /**
   * Consumes an Ora interaction state and commands the atmosphere engine cleanly.
   */
  public handleState(state: OraState): void {
    this.lastState = state;

    // If atmosphere has not been started yet or is unavailable, safe no-op.
    // Do NOT force-start or initialize the atmosphere on Ora state changes.
    const atmoState = this.atmosphere.getState();
    if (atmoState === "unavailable" || atmoState === "idle") {
      return;
    }

    const needsDuck = OraAtmosphereCoordinator.shouldDuck(state);

    if (needsDuck) {
      if (!this.isDucked) {
        this.isDucked = true;
        this.atmosphere.duck(this.duckDurationMs).catch(() => {});
      }
    } else {
      // Normal state (idle, hover) or error
      if (this.isDucked) {
        this.isDucked = false;
        this.atmosphere.restore(this.restoreDurationMs).catch(() => {});
      }
    }
  }

  /**
   * Returns whether the coordinator has currently ducked the atmosphere.
   */
  public getIsDucked(): boolean {
    return this.isDucked;
  }

  /**
   * Returns the most recent Ora state received.
   */
  public getLastState(): OraState {
    return this.lastState;
  }

  /**
   * Resets coordinator to a neutral state without unexpectedly starting audio.
   */
  public reset(): void {
    if (this.isDucked) {
      this.isDucked = false;
      const atmoState = this.atmosphere.getState();
      if (atmoState === "playing" || atmoState === "muted") {
        this.atmosphere.restore(this.restoreDurationMs).catch(() => {});
      }
    }
    this.lastState = "idle";
  }
}
