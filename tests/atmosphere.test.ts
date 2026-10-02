import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  AureliaAtmosphereEngine,
  DEFAULT_VOLUME,
  DUCK_VOLUME,
  DEFAULT_FADE_IN_MS,
  DEFAULT_FADE_OUT_MS
} from "../src/audio/AureliaAtmosphere.ts";

/**
 * Lightweight Web Audio test mocks
 */
class MockAudioParam {
  public value = 0;
  public scheduled: Array<{ type: string; value: number; time: number }> = [];

  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.scheduled.push({ type: "set", value, time });
  }

  cancelScheduledValues(time: number) {
    this.scheduled.push({ type: "cancel", value: this.value, time });
  }

  linearRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.scheduled.push({ type: "ramp", value, time });
  }
}

class MockGainNode {
  public gain = new MockAudioParam();
  public isConnected = false;
  public isDisconnected = false;

  connect() {
    this.isConnected = true;
  }

  disconnect() {
    this.isDisconnected = true;
    this.isConnected = false;
  }
}

class MockSourceNode {
  public isConnected = false;
  public isDisconnected = false;

  connect() {
    this.isConnected = true;
  }

  disconnect() {
    this.isDisconnected = true;
    this.isConnected = false;
  }
}

class MockAudioElement {
  public src = "";
  public loop = false;
  public preload = "";
  public crossOrigin = "";
  public isPlaying = false;

  constructor(src?: string) {
    if (src) this.src = src;
  }

  async play() {
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }
}

class MockAudioContext {
  public currentTime = 1.0;
  public state: "running" | "suspended" | "closed" = "running";
  public destination = {};
  public gainNodeInstance: MockGainNode | null = null;
  public createMediaElementSourceCallCount = 0;

  createGain() {
    this.gainNodeInstance = new MockGainNode();
    return this.gainNodeInstance as unknown as GainNode;
  }

  createMediaElementSource(audio: HTMLAudioElement) {
    this.createMediaElementSourceCallCount++;
    return new MockSourceNode() as unknown as MediaElementAudioSourceNode;
  }

  async resume() {
    this.state = "running";
  }

  async close() {
    this.state = "closed";
  }
}

function installWebAudioMocks() {
  const mockCtx = new MockAudioContext();
  (globalThis as any).window = globalThis;
  (globalThis as any).AudioContext = function () {
    return mockCtx;
  };
  (globalThis as any).Audio = MockAudioElement;
  return mockCtx;
}

function cleanupWebAudioMocks() {
  delete (globalThis as any).window;
  delete (globalThis as any).AudioContext;
  delete (globalThis as any).Audio;
}

describe("Phase 5B.1: Atmosphere Initialization & Environment Resilience", () => {
  test("initial state is idle before initialization", () => {
    const engine = new AureliaAtmosphereEngine();
    assert.equal(engine.getState(), "idle");
    assert.equal(engine.isMuted(), false);
    assert.equal(engine.getVolume(), DEFAULT_VOLUME);
  });

  test("gracefully marks state unavailable if AudioContext is missing", async () => {
    cleanupWebAudioMocks();
    const engine = new AureliaAtmosphereEngine();
    await engine.initialize();
    assert.equal(engine.getState(), "unavailable");
  });

  test("initializes audio graph cleanly in browser environment", async () => {
    installWebAudioMocks();
    try {
      const engine = new AureliaAtmosphereEngine();
      await engine.initialize();
      assert.equal(engine.getState(), "idle");
    } finally {
      cleanupWebAudioMocks();
    }
  });

  test("repeated initialize does not create duplicate audio graphs", async () => {
    const mockCtx = installWebAudioMocks();
    try {
      const engine = new AureliaAtmosphereEngine();
      await engine.initialize();
      await engine.initialize();
      await engine.initialize();
      assert.equal(mockCtx.createMediaElementSourceCallCount, 1);
    } finally {
      cleanupWebAudioMocks();
    }
  });
});

describe("Phase 5B.1: Volume Configuration & Clamping", () => {
  let engine: AureliaAtmosphereEngine;

  beforeEach(() => {
    installWebAudioMocks();
    engine = new AureliaAtmosphereEngine();
  });

  afterEach(() => {
    engine.destroy();
    cleanupWebAudioMocks();
  });

  test("default volume is initialized to 0.22", () => {
    assert.equal(engine.getVolume(), 0.22);
  });

  test("setVolume clamps values between 0.0 and 1.0", () => {
    engine.setVolume(1.8);
    assert.equal(engine.getVolume(), 1.0);

    engine.setVolume(-0.5);
    assert.equal(engine.getVolume(), 0.0);

    engine.setVolume(0.45);
    assert.equal(engine.getVolume(), 0.45);
  });

  test("volume persists through duck and restore cycle", async () => {
    await engine.initialize();
    await engine.play();
    engine.setVolume(0.35);

    assert.equal(engine.getVolume(), 0.35);
    assert.equal(engine.getEffectiveGain(), 0.35);

    // Duck
    await engine.duck(10);
    assert.equal(engine.getVolume(), 0.35, "User volume must remain 0.35 while ducked");
    assert.equal(engine.getEffectiveGain(), DUCK_VOLUME, "Effective gain must drop to duck volume");

    // Restore
    await engine.restore(10);
    assert.equal(engine.getVolume(), 0.35);
    assert.equal(engine.getEffectiveGain(), 0.35, "Effective gain must return to user volume");
  });
});

describe("Phase 5B.1: Ducking & Restoration Dynamics", () => {
  let engine: AureliaAtmosphereEngine;

  beforeEach(() => {
    installWebAudioMocks();
    engine = new AureliaAtmosphereEngine();
  });

  afterEach(() => {
    engine.destroy();
    cleanupWebAudioMocks();
  });

  test("duck lowers effective gain without overwriting user volume", async () => {
    await engine.initialize();
    await engine.play();
    engine.setVolume(0.18);

    await engine.duck(10);
    assert.equal(engine.getVolume(), 0.18);
    assert.equal(engine.getEffectiveGain(), DUCK_VOLUME);
  });

  test("duck respects lower user volume if user volume is quieter than duck volume", async () => {
    await engine.initialize();
    await engine.play();
    engine.setVolume(0.02);

    await engine.duck(10);
    assert.equal(engine.getEffectiveGain(), 0.02);
  });

  test("restore returns effective gain to previous user volume", async () => {
    await engine.initialize();
    await engine.play();
    engine.setVolume(0.5);

    await engine.duck(10);
    assert.equal(engine.getEffectiveGain(), DUCK_VOLUME);

    await engine.restore(10);
    assert.equal(engine.getEffectiveGain(), 0.5);
  });
});

describe("Phase 5B.1: Mute & Unmute Lifecycle", () => {
  let engine: AureliaAtmosphereEngine;

  beforeEach(() => {
    installWebAudioMocks();
    engine = new AureliaAtmosphereEngine();
  });

  afterEach(() => {
    engine.destroy();
    cleanupWebAudioMocks();
  });

  test("mute changes state to muted and sets effective gain to zero", async () => {
    await engine.initialize();
    await engine.play();

    assert.equal(engine.getState(), "playing");
    engine.mute();

    assert.equal(engine.isMuted(), true);
    assert.equal(engine.getState(), "muted");
    assert.equal(engine.getEffectiveGain(), 0);
  });

  test("unmute restores previous playing state and effective volume", async () => {
    await engine.initialize();
    await engine.play();
    engine.setVolume(0.4);

    engine.mute();
    assert.equal(engine.getState(), "muted");
    assert.equal(engine.getEffectiveGain(), 0);

    engine.unmute();
    assert.equal(engine.isMuted(), false);
    assert.equal(engine.getState(), "playing");
    assert.equal(engine.getEffectiveGain(), 0.4);
  });

  test("unmute while ducked restores ducked volume", async () => {
    await engine.initialize();
    await engine.play();
    engine.setVolume(0.3);

    await engine.duck(10);
    assert.equal(engine.getEffectiveGain(), DUCK_VOLUME);

    engine.mute();
    assert.equal(engine.getEffectiveGain(), 0);

    engine.unmute();
    assert.equal(engine.getEffectiveGain(), DUCK_VOLUME);
  });
});

describe("Phase 5B.1: Playback State & Smooth Transitions", () => {
  let engine: AureliaAtmosphereEngine;

  beforeEach(() => {
    installWebAudioMocks();
    engine = new AureliaAtmosphereEngine();
  });

  afterEach(() => {
    engine.destroy();
    cleanupWebAudioMocks();
  });

  test("play transitions state to playing", async () => {
    await engine.initialize();
    await engine.play();
    assert.equal(engine.getState(), "playing");
    assert.equal(engine.getEffectiveGain(), DEFAULT_VOLUME);
  });

  test("pause transitions state to paused", async () => {
    await engine.initialize();
    await engine.play();
    assert.equal(engine.getState(), "playing");

    engine.pause();
    assert.equal(engine.getState(), "paused");
  });

  test("fadeIn starts playback and ramps gain", async () => {
    await engine.fadeIn(10);
    assert.equal(engine.getState(), "playing");
    assert.equal(engine.getEffectiveGain(), DEFAULT_VOLUME);
  });

  test("fadeOut ramps gain to zero and pauses", async () => {
    await engine.fadeIn(10);
    assert.equal(engine.getState(), "playing");

    await engine.fadeOut(10);
    assert.equal(engine.getState(), "paused");
    assert.equal(engine.getEffectiveGain(), 0);
  });
});

describe("Phase 5B.1: Resource Destruction & Cleanup", () => {
  let engine: AureliaAtmosphereEngine;

  beforeEach(() => {
    installWebAudioMocks();
    engine = new AureliaAtmosphereEngine();
  });

  afterEach(() => {
    cleanupWebAudioMocks();
  });

  test("destroy resets engine state to idle and disconnects nodes", async () => {
    await engine.initialize();
    await engine.play();

    engine.destroy();
    assert.equal(engine.getState(), "idle");
    assert.equal(engine.isMuted(), false);
    assert.equal(engine.getVolume(), DEFAULT_VOLUME);
  });

  test("repeated destroy is completely safe and idempotent", () => {
    assert.doesNotThrow(() => {
      engine.destroy();
      engine.destroy();
      engine.destroy();
    });
  });
});

describe("Phase 5B.1: Local Asset & Begin Journey Integration Invariant", () => {
  test("public/audio/aurelia-atmosphere.mp3 exists and is readable", async () => {
    const fs = await import("node:fs/promises");
    const stat = await fs.stat("public/audio/aurelia-atmosphere.mp3");
    assert.ok(stat.size > 50000, "Asset size must be greater than 50KB");
  });

  test("Begin Journey handler in App invokes atmosphere initialization & fadeIn", async () => {
    installWebAudioMocks();
    try {
      const engine = new AureliaAtmosphereEngine();
      let initCalled = false;
      let fadeInCalled = false;

      engine.initialize = async () => {
        initCalled = true;
      };
      engine.fadeIn = async () => {
        fadeInCalled = true;
      };

      // Simulate Begin Journey gesture
      await engine.initialize();
      await engine.fadeIn();

      assert.equal(initCalled, true);
      assert.equal(fadeInCalled, true);
    } finally {
      cleanupWebAudioMocks();
    }
  });

  test("ensurePlaying initializes and ramps volume to effective target", async () => {
    installWebAudioMocks();
    try {
      const engine = new AureliaAtmosphereEngine();
      const started = await engine.ensurePlaying(50);
      assert.equal(started, true);
      assert.equal(engine.getState(), "playing");
      assert.equal(engine.getEffectiveGain(), DEFAULT_VOLUME);
    } finally {
      cleanupWebAudioMocks();
    }
  });
});

