import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { interpretOraInput } from "../src/ora/oraInterpreter.ts";
import { defaultPropertyContext } from "../src/ora/oraPropertyContext.ts";
import {
  DeterministicOraProvider,
  executeOraRequest
} from "../src/ora/oraProvider.ts";
import { resolveSpaceAction, defaultProperty } from "../src/domain/spatial.ts";
import { OraSessionContext } from "../src/ora/oraTypes.ts";

describe("Phase 4.1: Natural Language Ambiance Controls", () => {
  const context = defaultPropertyContext;

  test("daytime queries resolve to SHOW_AMBIANCE('day')", () => {
    const queries = [
      "show it in the daytime",
      "show me the property during the day",
      "let me see it in daylight",
      "switch to daytime",
      "day view"
    ];

    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "CHANGE_AMBIANCE", `Failed on: ${q}`);
      if (res.type === "CHANGE_AMBIANCE") {
        assert.equal(res.ambiance, "day");
        assert.equal(res.action.type, "SHOW_AMBIANCE");
        if (res.action.type === "SHOW_AMBIANCE") {
          assert.equal(res.action.ambiance, "day");
        }
      }
    }
  });

  test("sunset queries resolve to SHOW_AMBIANCE('sunset')", () => {
    const queries = [
      "show me the property at sunset",
      "let me see sunset",
      "what does it look like during golden hour?",
      "show me golden hour",
      "sunset view",
      "at sunset"
    ];

    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "CHANGE_AMBIANCE", `Failed on: ${q}`);
      if (res.type === "CHANGE_AMBIANCE") {
        assert.equal(res.ambiance, "sunset");
        assert.equal(res.action.type, "SHOW_AMBIANCE");
        if (res.action.type === "SHOW_AMBIANCE") {
          assert.equal(res.action.ambiance, "sunset");
        }
      }
    }
  });

  test("night queries resolve to SHOW_AMBIANCE('night')", () => {
    const queries = [
      "show me at night",
      "what does it look like after dark?",
      "let me see the property at night",
      "show me the nighttime view",
      "night view"
    ];

    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "CHANGE_AMBIANCE", `Failed on: ${q}`);
      if (res.type === "CHANGE_AMBIANCE") {
        assert.equal(res.ambiance, "night");
        assert.equal(res.action.type, "SHOW_AMBIANCE");
        if (res.action.type === "SHOW_AMBIANCE") {
          assert.equal(res.action.ambiance, "night");
        }
      }
    }
  });

  test("unsupported ambiances are rejected without hallucinating new tracks", () => {
    const unsupported = [
      "show me at midnight",
      "what does it look like at dawn?",
      "show me in the rain",
      "show me during a storm"
    ];

    for (const q of unsupported) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "CLARIFICATION_REQUIRED", `Failed on: ${q}`);
      if (res.type === "CLARIFICATION_REQUIRED") {
        assert.equal(res.reason, "unsupported_ambiance");
        assert.ok(res.spokenResponse.includes("three authentic cinematic lighting tracks"));
      }
    }
  });
});

describe("Phase 4.1: Combined Space + Ambiance Commands", () => {
  const context = defaultPropertyContext;

  test("'show me the living room at sunset' produces both space and ambiance actions", () => {
    const res = interpretOraInput("show me the living room at sunset", context);
    assert.equal(res.type, "NAVIGATE_SPACE");
    if (res.type === "NAVIGATE_SPACE") {
      assert.equal(res.spaceId, "living_room");
      assert.equal(res.action.type, "SHOW_SPACE");
      if (res.action.type === "SHOW_SPACE") {
        assert.equal(res.action.spaceId, "living_room");
      }
      assert.ok(res.ambianceAction);
      assert.equal(res.ambianceAction?.type, "SHOW_AMBIANCE");
      assert.equal(res.ambianceAction?.ambiance, "sunset");
      assert.equal(res.spokenResponse, "Of course.");
    }
  });

  test("'show me the pool at night' handles detail space with evening ambiance", () => {
    const res = interpretOraInput("show me the pool at night", context);
    assert.equal(res.type, "NAVIGATE_SPACE");
    if (res.type === "NAVIGATE_SPACE") {
      assert.equal(res.spaceId, "infinity_pool");
      assert.equal(res.action.type, "SHOW_SPACE");
      assert.ok(res.ambianceAction);
      assert.equal(res.ambianceAction?.ambiance, "night");
      assert.equal(res.spokenResponse, "Of course.");
    }
  });

  test("executeOraRequest resolves combined actions and updates session", async () => {
    const provider = new DeterministicOraProvider();
    const session: OraSessionContext = { history: [] };

    const result = await executeOraRequest(
      "show me the kitchen during the day",
      provider,
      context,
      session
    );

    assert.equal(result.action?.type, "SHOW_SPACE");
    assert.equal(result.ambianceAction?.type, "SHOW_AMBIANCE");
    assert.equal(result.ambianceAction?.ambiance, "day");
    assert.equal(session.lastAmbiance, "day");
    assert.equal(session.lastSpaceId, "kitchen");
  });
});

describe("Phase 4.1: Spatial Action Model for Ambiance", () => {
  test("resolveSpaceAction resolves valid SHOW_AMBIANCE actions", () => {
    const dayRes = resolveSpaceAction({ type: "SHOW_AMBIANCE", ambiance: "day" }, defaultProperty);
    assert.equal(dayRes.success, true);
    if (dayRes.success) {
      assert.equal(dayRes.view.mode, "ambiance");
      if (dayRes.view.mode === "ambiance") {
        assert.equal(dayRes.view.ambiance, "day");
      }
    }

    const sunsetRes = resolveSpaceAction({ type: "SHOW_AMBIANCE", ambiance: "sunset" }, defaultProperty);
    assert.equal(sunsetRes.success, true);
    if (sunsetRes.success) {
      assert.equal(sunsetRes.view.mode, "ambiance");
      if (sunsetRes.view.mode === "ambiance") {
        assert.equal(sunsetRes.view.ambiance, "sunset");
      }
    }

    const nightRes = resolveSpaceAction({ type: "SHOW_AMBIANCE", ambiance: "night" }, defaultProperty);
    assert.equal(nightRes.success, true);
    if (nightRes.success) {
      assert.equal(nightRes.view.mode, "ambiance");
      if (nightRes.view.mode === "ambiance") {
        assert.equal(nightRes.view.ambiance, "night");
      }
    }
  });

  test("resolveSpaceAction rejects unsupported ambiance safely", () => {
    const invalidRes = resolveSpaceAction(
      { type: "SHOW_AMBIANCE", ambiance: "midnight" as any },
      defaultProperty
    );
    assert.equal(invalidRes.success, false);
    if (!invalidRes.success) {
      assert.ok(invalidRes.error.includes("Unsupported ambiance"));
      assert.equal(invalidRes.fallbackView.mode, "overview");
    }
  });
});
