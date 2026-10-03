import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AureliaProductAdapter, aureliaProductAdapter } from "../src/ora/aureliaAdapter";
import {
  isTourRequest,
  detectExplicitSpace,
  detectExplicitAmbiance,
  resolveDirectNavigationIntent
} from "../src/ora/fastPath";

describe("Phase 2: ProductAdapter & AureliaProductAdapter Contract", () => {
  const adapter = new AureliaProductAdapter();

  test("getContext() exposes Aurelia Sanctuary metadata, 8 spaces, and capabilities", () => {
    const ctx = adapter.getContext();
    assert.equal(ctx.productId, "aurelia-sanctuary");
    assert.equal(ctx.productName, "Aurelia Sanctuary");
    assert.equal(ctx.entities.length, 8);
    assert.deepEqual(ctx.supportedAmbiances, ["day", "sunset", "night"]);
    assert.equal(ctx.capabilities.supportsSpatialNavigation, true);
    assert.equal(ctx.capabilities.supportsAtmosphereControl, true);
    assert.equal(ctx.capabilities.supportsGuidedTour, true);
    assert.equal(ctx.capabilities.supportsDirectTransaction, true);
  });

  test("navigateToEntity() navigates to valid architectural spaces", async () => {
    const resLiving = await adapter.navigateToEntity("living_room");
    assert.equal(resLiving.success, true);
    if (resLiving.success) {
      assert.equal((resLiving.data as any).mode, "cinematic");
      assert.equal((resLiving.data as any).frame, 170);
    }

    const resPool = await adapter.navigateToEntity("infinity_pool");
    assert.equal(resPool.success, true);
    if (resPool.success) {
      assert.equal((resPool.data as any).mode, "detail");
    }

    const resInvalid = await adapter.navigateToEntity("nonexistent_space");
    assert.equal(resInvalid.success, false);
    if (!resInvalid.success) {
      assert.ok(resInvalid.error.includes("Unknown space identifier"));
    }
  });

  test("setAmbiance() transitions between day, sunset, and night", async () => {
    const resSunset = await adapter.setAmbiance("sunset");
    assert.equal(resSunset.success, true);
    if (resSunset.success) {
      assert.equal((resSunset.data as any).mode, "ambiance");
      assert.equal((resSunset.data as any).ambiance, "sunset");
    }

    const resInvalid = await adapter.setAmbiance("rainstorm");
    assert.equal(resInvalid.success, false);
    if (!resInvalid.success) {
      assert.ok(resInvalid.error.includes("Unsupported ambiance"));
    }
  });

  test("startTour() returns success", async () => {
    const res = await adapter.startTour();
    assert.equal(res.success, true);
    assert.ok(res.message?.includes("grand tour"));
  });

  test("executeAction() dispatches generic OraAction envelopes", async () => {
    const navAction = await adapter.executeAction({
      type: "NAVIGATE",
      payload: { targetId: "master_bedroom" }
    });
    assert.equal(navAction.success, true);

    const ambianceAction = await adapter.executeAction({
      type: "SET_AMBIANCE",
      payload: { mode: "night" }
    });
    assert.equal(ambianceAction.success, true);

    const tourAction = await adapter.executeAction({
      type: "START_TOUR"
    });
    assert.equal(tourAction.success, true);

    const txAction = await adapter.executeAction({
      type: "INITIATE_TRANSACTION",
      payload: { transactionType: "RESERVATION", guestName: "John", nights: 2 }
    });
    assert.equal(txAction.success, true);

    const handoffAction = await adapter.executeAction({
      type: "DISPATCH_HANDOFF",
      payload: { channel: "WHATSAPP", prefilledText: "Invoice AUR-2026-9412" }
    });
    assert.equal(handoffAction.success, true);
  });

  test("singleton instance is exported", () => {
    assert.ok(aureliaProductAdapter instanceof AureliaProductAdapter);
  });
});

describe("Phase 2: Pure Fast-Path Module Isolation (src/ora/fastPath.ts)", () => {
  test("isTourRequest detects full tour queries", () => {
    assert.equal(isTourRequest("give me a full tour"), true);
    assert.equal(isTourRequest("show me everything"), true);
    assert.equal(isTourRequest("show me the whole house"), true);
    assert.equal(isTourRequest("show me the kitchen"), false);
  });

  test("detectExplicitSpace extracts valid space IDs", () => {
    assert.equal(detectExplicitSpace("take me to the master bedroom"), "master_bedroom");
    assert.equal(detectExplicitSpace("show me the toilet"), "ensuite_bathroom");
    assert.equal(detectExplicitSpace("where can i swim"), "infinity_pool");
    assert.equal(detectExplicitSpace("show me the garage"), null); // unsupported
  });

  test("detectExplicitAmbiance extracts day, sunset, and night", () => {
    assert.equal(detectExplicitAmbiance("show it at golden hour"), "sunset");
    assert.equal(detectExplicitAmbiance("what does it look like at night"), "night");
    assert.equal(detectExplicitAmbiance("show it during daytime"), "day");
    assert.equal(detectExplicitAmbiance("show it in the fog"), null);
  });

  test("resolveDirectNavigationIntent executes <1ms direct routing", () => {
    const decision = resolveDirectNavigationIntent("show me the toilet");
    assert.ok(decision);
    assert.equal(decision.type, "SHOW_SPACE");
    if (decision.type === "SHOW_SPACE") {
      assert.equal(decision.spaceId, "ensuite_bathroom");
    }
  });
});
