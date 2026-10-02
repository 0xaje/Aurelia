import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { OraAtmosphereCoordinator } from "../src/audio/OraAtmosphereCoordinator.ts";
import { AureliaAtmosphere, AtmosphereState } from "../src/audio/AureliaAtmosphere.ts";
import { OraState } from "../src/ora/oraTypes.ts";

/**
 * Controlled mock atmosphere engine tracking calls and preserving invariants
 */
class MockAtmosphere implements AureliaAtmosphere {
  public state: AtmosphereState = "playing";
  public userVolume = 0.22;
  public effectiveGain = 0.22;
  public isMutedState = false;

  public duckCalls = 0;
  public restoreCalls = 0;
  public setVolumeCalls = 0;
  public playCalls = 0;
  public initializeCalls = 0;

  async initialize(): Promise<void> {
    this.initializeCalls++;
  }

  async play(): Promise<void> {
    this.playCalls++;
    this.state = this.isMutedState ? "muted" : "playing";
  }

  pause(): void {
    this.state = "paused";
  }

  async fadeIn(): Promise<void> {
    this.state = this.isMutedState ? "muted" : "playing";
  }

  async fadeOut(): Promise<void> {
    this.state = "paused";
  }

  async duck(): Promise<void> {
    this.duckCalls++;
    if (!this.isMutedState) {
      this.effectiveGain = 0.035;
    }
  }

  async restore(): Promise<void> {
    this.restoreCalls++;
    if (!this.isMutedState) {
      this.effectiveGain = this.userVolume;
    }
  }

  setVolume(volume: number): void {
    this.setVolumeCalls++;
    this.userVolume = volume;
  }

  getVolume(): number {
    return this.userVolume;
  }

  getEffectiveGain(): number {
    return this.effectiveGain;
  }

  mute(): void {
    this.isMutedState = true;
    this.state = "muted";
    this.effectiveGain = 0;
  }

  unmute(): void {
    this.isMutedState = false;
    this.state = "playing";
    this.effectiveGain = this.userVolume;
  }

  isMuted(): boolean {
    return this.isMutedState;
  }

  getState(): AtmosphereState {
    return this.state;
  }

  destroy(): void {
    this.state = "idle";
  }
}

describe("Phase 5B.2: Ora State Mapping to Atmosphere Commands", () => {
  let atmo: MockAtmosphere;
  let coordinator: OraAtmosphereCoordinator;

  beforeEach(() => {
    atmo = new MockAtmosphere();
    coordinator = new OraAtmosphereCoordinator(atmo);
  });

  test("idle and hover do NOT duck atmosphere", () => {
    coordinator.handleState("idle");
    assert.equal(atmo.duckCalls, 0);
    assert.equal(coordinator.getIsDucked(), false);

    coordinator.handleState("hover");
    assert.equal(atmo.duckCalls, 0);
    assert.equal(coordinator.getIsDucked(), false);
  });

  test("active triggers atmosphere duck", () => {
    coordinator.handleState("active");
    assert.equal(atmo.duckCalls, 1);
    assert.equal(coordinator.getIsDucked(), true);
  });

  test("listening triggers atmosphere duck", () => {
    coordinator.handleState("listening");
    assert.equal(atmo.duckCalls, 1);
    assert.equal(coordinator.getIsDucked(), true);
  });

  test("processing triggers atmosphere duck", () => {
    coordinator.handleState("processing");
    assert.equal(atmo.duckCalls, 1);
    assert.equal(coordinator.getIsDucked(), true);
  });

  test("responding triggers atmosphere duck", () => {
    coordinator.handleState("responding");
    assert.equal(atmo.duckCalls, 1);
    assert.equal(coordinator.getIsDucked(), true);
  });

  test("clarification triggers atmosphere duck", () => {
    coordinator.handleState("clarification");
    assert.equal(atmo.duckCalls, 1);
    assert.equal(coordinator.getIsDucked(), true);
  });

  test("error triggers atmosphere restore", () => {
    coordinator.handleState("active");
    assert.equal(atmo.duckCalls, 1);
    assert.equal(coordinator.getIsDucked(), true);

    coordinator.handleState("error");
    assert.equal(atmo.restoreCalls, 1);
    assert.equal(coordinator.getIsDucked(), false);
  });
});

describe("Phase 5B.2: Smooth Continuity & No Repeated Ducking", () => {
  let atmo: MockAtmosphere;
  let coordinator: OraAtmosphereCoordinator;

  beforeEach(() => {
    atmo = new MockAtmosphere();
    coordinator = new OraAtmosphereCoordinator(atmo);
  });

  test("active -> listening -> processing -> responding causes only one duck call", () => {
    const sequence: OraState[] = ["active", "listening", "processing", "responding"];

    for (const state of sequence) {
      coordinator.handleState(state);
      assert.equal(coordinator.getIsDucked(), true);
    }

    assert.equal(atmo.duckCalls, 1, "Must duck exactly once during multi-state interaction sequence");
    assert.equal(atmo.restoreCalls, 0, "Must not restore until interaction completes");
  });

  test("responding -> idle restores atmosphere once", () => {
    coordinator.handleState("active");
    coordinator.handleState("listening");
    coordinator.handleState("processing");
    coordinator.handleState("responding");
    assert.equal(atmo.duckCalls, 1);
    assert.equal(atmo.restoreCalls, 0);

    coordinator.handleState("idle");
    assert.equal(atmo.restoreCalls, 1, "Must restore atmosphere when returning to idle");
    assert.equal(coordinator.getIsDucked(), false);

    // Repeated idle calls do not trigger additional restores
    coordinator.handleState("idle");
    assert.equal(atmo.restoreCalls, 1);
  });

  test("clarification -> idle restores atmosphere once", () => {
    coordinator.handleState("active");
    coordinator.handleState("clarification");
    assert.equal(atmo.duckCalls, 1);
    assert.equal(atmo.restoreCalls, 0);

    coordinator.handleState("idle");
    assert.equal(atmo.restoreCalls, 1);
    assert.equal(coordinator.getIsDucked(), false);
  });
});

describe("Phase 5B.2: Error Recovery & Invariant Protection", () => {
  let atmo: MockAtmosphere;
  let coordinator: OraAtmosphereCoordinator;

  beforeEach(() => {
    atmo = new MockAtmosphere();
    coordinator = new OraAtmosphereCoordinator(atmo);
  });

  test("processing -> error smoothly restores atmosphere", () => {
    coordinator.handleState("listening");
    coordinator.handleState("processing");
    assert.equal(atmo.duckCalls, 1);

    coordinator.handleState("error");
    assert.equal(atmo.restoreCalls, 1, "Error must restore atmosphere so user is not stuck ducked");
    assert.equal(coordinator.getIsDucked(), false);
  });

  test("error while already idle is a safe no-op", () => {
    coordinator.handleState("error");
    assert.equal(atmo.duckCalls, 0);
    assert.equal(atmo.restoreCalls, 0);
    assert.equal(coordinator.getIsDucked(), false);
  });
});

describe("Phase 5B.2: User Intent: Volume & Mute Preservation", () => {
  let atmo: MockAtmosphere;
  let coordinator: OraAtmosphereCoordinator;

  beforeEach(() => {
    atmo = new MockAtmosphere();
    coordinator = new OraAtmosphereCoordinator(atmo);
  });

  test("coordinator never mutates userVolume", () => {
    atmo.setVolume(0.12);
    coordinator.handleState("active");
    coordinator.handleState("listening");
    coordinator.handleState("idle");

    assert.equal(atmo.getVolume(), 0.12, "User volume must remain strictly untouched");
    assert.equal(atmo.setVolumeCalls, 1, "Coordinator must never call setVolume");
  });

  test("interacting with Ora while muted does NOT unmute atmosphere", () => {
    atmo.mute();
    assert.equal(atmo.isMuted(), true);
    assert.equal(atmo.getState(), "muted");

    coordinator.handleState("active");
    coordinator.handleState("listening");
    coordinator.handleState("idle");

    assert.equal(atmo.isMuted(), true, "Atmosphere must remain muted throughout Ora interaction");
    assert.equal(atmo.getState(), "muted");
  });
});

describe("Phase 5B.2: Pre-Playback & Environment Resilience", () => {
  test("safe no-op when atmosphere is not yet initialized (idle)", () => {
    const atmo = new MockAtmosphere();
    atmo.state = "idle";
    const coordinator = new OraAtmosphereCoordinator(atmo);

    coordinator.handleState("active");
    coordinator.handleState("listening");
    coordinator.handleState("idle");

    assert.equal(atmo.duckCalls, 0, "Must not duck unstarted atmosphere");
    assert.equal(atmo.playCalls, 0, "Must not force-start atmosphere");
    assert.equal(atmo.initializeCalls, 0, "Must not initialize audio on Ora state change");
  });

  test("safe no-op when atmosphere is unavailable", () => {
    const atmo = new MockAtmosphere();
    atmo.state = "unavailable";
    const coordinator = new OraAtmosphereCoordinator(atmo);

    assert.doesNotThrow(() => {
      coordinator.handleState("active");
      coordinator.handleState("processing");
      coordinator.handleState("idle");
    });
    assert.equal(atmo.duckCalls, 0);
  });

  test("reset returns coordinator to neutral state without starting audio", () => {
    const atmo = new MockAtmosphere();
    const coordinator = new OraAtmosphereCoordinator(atmo);

    coordinator.handleState("active");
    assert.equal(coordinator.getIsDucked(), true);
    assert.equal(atmo.duckCalls, 1);

    coordinator.reset();
    assert.equal(coordinator.getIsDucked(), false);
    assert.equal(coordinator.getLastState(), "idle");
    assert.equal(atmo.restoreCalls, 1);

    // Repeated reset is safe
    assert.doesNotThrow(() => {
      coordinator.reset();
    });
  });
});
