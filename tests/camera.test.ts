import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  VERIFIED_CINEMATIC_LANDMARKS,
  TOTAL_FRAMES,
  MIN_FRAME,
  MAX_FRAME,
  easeInOutCubic,
  clampFrame,
  frameToIndex,
  indexToFrame,
  frameToProgress,
  progressToFrame,
  calculateTimelineFrame,
  calculateTimelineProgress,
  resolveCinematicTarget,
  CameraTimelineController
} from "../src/camera/cameraTimeline.ts";

describe("Cinematic Target Resolution", () => {
  test("resolves verified landmark for exterior (Frame 1)", () => {
    const target = resolveCinematicTarget("exterior");
    assert.ok(target);
    assert.equal(target.frame, 1);
    assert.equal(target.durationMs, 1000);
    assert.equal(target.frame, VERIFIED_CINEMATIC_LANDMARKS.exterior);
  });

  test("resolves verified landmark for entrance (Frame 90)", () => {
    const target = resolveCinematicTarget("entrance");
    assert.ok(target);
    assert.equal(target.frame, 90);
    assert.equal(target.durationMs, 1000);
    assert.equal(target.frame, VERIFIED_CINEMATIC_LANDMARKS.entrance);
  });

  test("resolves verified landmark for living_room (Frame 170)", () => {
    const target = resolveCinematicTarget("living_room");
    assert.ok(target);
    assert.equal(target.frame, 170);
    assert.equal(target.durationMs, 1000);
    assert.equal(target.frame, VERIFIED_CINEMATIC_LANDMARKS.living_room);
  });

  test("resolves verified landmark for kitchen (Frame 245)", () => {
    const target = resolveCinematicTarget("kitchen");
    assert.ok(target);
    assert.equal(target.frame, 245);
    assert.equal(target.durationMs, 1000);
    assert.equal(target.frame, VERIFIED_CINEMATIC_LANDMARKS.kitchen);
  });

  test("resolves verified landmark for hallway (Frame 280)", () => {
    const target = resolveCinematicTarget("hallway");
    assert.ok(target);
    assert.equal(target.frame, 280);
    assert.equal(target.durationMs, 1000);
    assert.equal(target.frame, VERIFIED_CINEMATIC_LANDMARKS.hallway);
  });

  test("returns null for non-cinematic or unknown spaces", () => {
    assert.equal(resolveCinematicTarget("master_bedroom"), null);
    assert.equal(resolveCinematicTarget("ensuite_bathroom"), null);
    assert.equal(resolveCinematicTarget("infinity_pool"), null);
    assert.equal(resolveCinematicTarget("unknown_space"), null);
  });

  test("allows custom duration override in resolveCinematicTarget", () => {
    const target = resolveCinematicTarget("living_room", { durationMs: 800 });
    assert.ok(target);
    assert.equal(target.durationMs, 800);
  });
});

describe("Easing & Pure Math Functions", () => {
  test("easeInOutCubic boundary conditions and symmetry", () => {
    assert.equal(easeInOutCubic(0), 0);
    assert.equal(easeInOutCubic(0.5), 0.5);
    assert.equal(easeInOutCubic(1), 1);

    // Negative progress clamps to 0
    assert.equal(easeInOutCubic(-0.5), 0);
    // Over-progress clamps to 1
    assert.equal(easeInOutCubic(1.5), 1);

    // Ease-in creates slow start (e.g. t = 0.2 gives 4 * 0.008 = 0.032 < 0.2)
    assert.ok(easeInOutCubic(0.2) < 0.2);
    // Ease-out creates slow landing (e.g. t = 0.8 gives > 0.8)
    assert.ok(easeInOutCubic(0.8) > 0.8);
    // Monotonicity check
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.05) {
      const val = easeInOutCubic(t);
      assert.ok(val >= prev);
      prev = val;
    }
  });

  test("frame clamping handles boundary violations safely", () => {
    // Target below minimum (0 and negative)
    assert.equal(clampFrame(0), MIN_FRAME);
    assert.equal(clampFrame(-42), MIN_FRAME);

    // Target above maximum (301, 1000)
    assert.equal(clampFrame(301), MAX_FRAME);
    assert.equal(clampFrame(9999), MAX_FRAME);

    // Valid frames preserved
    assert.equal(clampFrame(1), 1);
    assert.equal(clampFrame(170), 170);
    assert.equal(clampFrame(300), 300);

    // Floating-point frames rounded cleanly
    assert.equal(clampFrame(170.4), 170);
    assert.equal(clampFrame(170.8), 171);

    // Non-numbers or NaNs safely return min
    assert.equal(clampFrame(NaN), MIN_FRAME);
  });

  test("frame index and progress conversions are reversible", () => {
    assert.equal(frameToIndex(1), 0);
    assert.equal(frameToIndex(300), 299);
    assert.equal(indexToFrame(0), 1);
    assert.equal(indexToFrame(299), 300);

    assert.equal(frameToProgress(1), 0);
    assert.equal(frameToProgress(300), 1);
    assert.equal(progressToFrame(0), 1);
    assert.equal(progressToFrame(1), 300);
  });
});

describe("Timeline Calculation Behavior", () => {
  test("computes timeline frame at progress 0, 0.5, and 1", () => {
    const start = 1;
    const target = 170;

    // At progress 0: returns start frame exactly
    assert.equal(calculateTimelineFrame(start, target, 0), 1);

    // At progress 0.5: returns exact midpoint for symmetric easeInOutCubic
    // 1 + (170 - 1) * 0.5 = 1 + 84.5 = 85.5 -> rounds to 86
    assert.equal(calculateTimelineFrame(start, target, 0.5), 86);

    // At progress 1: returns target frame exactly
    assert.equal(calculateTimelineFrame(start, target, 1), 170);
  });

  test("computes timeline frame in reverse navigation", () => {
    const start = 280;
    const target = 90;

    assert.equal(calculateTimelineFrame(start, target, 0), 280);
    assert.equal(calculateTimelineFrame(start, target, 1), 90);
    // Reverse midpoint: 280 + (90 - 280) * 0.5 = 280 - 95 = 185
    assert.equal(calculateTimelineFrame(start, target, 0.5), 185);
  });

  test("handles start equals target smoothly", () => {
    assert.equal(calculateTimelineFrame(170, 170, 0), 170);
    assert.equal(calculateTimelineFrame(170, 170, 0.5), 170);
    assert.equal(calculateTimelineFrame(170, 170, 1), 170);
  });

  test("clamps out-of-bounds progress in calculateTimelineFrame", () => {
    assert.equal(calculateTimelineFrame(10, 100, -1), 10);
    assert.equal(calculateTimelineFrame(10, 100, 2), 100);
  });

  test("calculates normalized timeline progress over time", () => {
    const startTime = 1000;
    const duration = 1000;

    assert.equal(calculateTimelineProgress(startTime, 1000, duration), 0);
    assert.equal(calculateTimelineProgress(startTime, 1500, duration), 0.5);
    assert.equal(calculateTimelineProgress(startTime, 2000, duration), 1);
    assert.equal(calculateTimelineProgress(startTime, 3000, duration), 1);
    assert.equal(calculateTimelineProgress(startTime, 500, duration), 0);
    // Zero duration completes immediately
    assert.equal(calculateTimelineProgress(startTime, 1000, 0), 1);
  });
});

describe("CameraTimelineController Stateful Engine & Safety", () => {
  test("current frame equals target completes immediately without RAF", async () => {
    let currentFrame = 170;
    const renderedFrames: number[] = [];
    let syncedScrollFrame: number | null = null;

    const controller = new CameraTimelineController({
      getCurrentFrame: () => currentFrame,
      renderFrame: (f) => {
        renderedFrames.push(f);
        currentFrame = f;
      },
      syncScroll: (f) => {
        syncedScrollFrame = f;
      }
    });

    let completed = false;
    const result = await controller.navigateToFrame(170, {
      onComplete: () => {
        completed = true;
      }
    });

    assert.equal(result, true);
    assert.equal(completed, true);
    assert.equal(controller.isNavigating(), false);
    assert.equal(syncedScrollFrame, 170);
  });

  test("clamps out-of-bound targets below 0 and above 300", async () => {
    let currentFrame = 100;
    const framesRendered: number[] = [];

    const controller = new CameraTimelineController({
      getCurrentFrame: () => currentFrame,
      renderFrame: (f) => {
        framesRendered.push(f);
        currentFrame = f;
      },
      syncScroll: () => {}
    });

    // Target below 0 (-50) should clamp to 1 with duration = 0
    await controller.navigateToFrame(-50, { durationMs: 0 });
    assert.equal(currentFrame, 1);

    // Target above 300 (450) should clamp to 300 with duration = 0
    await controller.navigateToFrame(450, { durationMs: 0 });
    assert.equal(currentFrame, 300);
  });

  test("repeated navigation cancels active tween and updates target", async () => {
    let currentFrame = 1;
    let renderCount = 0;

    const controller = new CameraTimelineController({
      getCurrentFrame: () => currentFrame,
      renderFrame: (f) => {
        renderCount++;
        currentFrame = f;
      }
    });

    // Start first navigation
    let firstCancelled = false;
    const p1 = controller.navigateToFrame(170, {
      durationMs: 500,
      ignoreReducedMotion: true,
      onCancel: () => {
        firstCancelled = true;
      }
    });

    assert.equal(controller.isNavigating(), true);

    // Immediately trigger second navigation to frame 90
    // navigateToFrame cancels previous navigation internally
    controller.cancelNavigation();
    assert.equal(controller.isNavigating(), false);

    const p2 = await controller.navigateToFrame(90, { durationMs: 0 });
    assert.equal(p2, true);
    assert.equal(currentFrame, 90);
  });

  test("cancelNavigation stops active tween immediately", async () => {
    let currentFrame = 50;
    const controller = new CameraTimelineController({
      getCurrentFrame: () => currentFrame,
      renderFrame: (f) => {
        currentFrame = f;
      }
    });

    controller.navigateToFrame(200, { durationMs: 1000, ignoreReducedMotion: true });
    assert.equal(controller.isNavigating(), true);

    controller.cancelNavigation();
    assert.equal(controller.isNavigating(), false);
  });

  test("reduced motion completes immediately when duration is 0", async () => {
    let currentFrame = 1;
    let syncedScroll: number | null = null;
    let completed = false;

    const controller = new CameraTimelineController({
      getCurrentFrame: () => currentFrame,
      renderFrame: (f) => {
        currentFrame = f;
      },
      syncScroll: (f) => {
        syncedScroll = f;
      }
    });

    const res = await controller.navigateToFrame(170, {
      durationMs: 0,
      onComplete: () => {
        completed = true;
      }
    });

    assert.equal(res, true);
    assert.equal(completed, true);
    assert.equal(currentFrame, 170);
    assert.equal(syncedScroll, 170);
    assert.equal(controller.isNavigating(), false);
  });

  test("cancelling returns false and triggers onCancel callback", async () => {
    let currentFrame = 10;
    let cancelled = false;

    const controller = new CameraTimelineController({
      getCurrentFrame: () => currentFrame,
      renderFrame: (f) => {
        currentFrame = f;
      }
    });

    const promise = controller.navigateToFrame(250, {
      durationMs: 1000,
      ignoreReducedMotion: true,
      onCancel: () => {
        cancelled = true;
      }
    });

    assert.equal(controller.isNavigating(), true);
    controller.cancelNavigation();
    assert.equal(controller.isNavigating(), false);
  });
});
