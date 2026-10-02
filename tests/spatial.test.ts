import { test, describe } from "node:test";
import assert from "node:assert/strict";
import rawProperty from "../data/shortlet.json" with { type: "json" };
import {
  defaultProperty,
  resolveSpaceAction,
  getDetailSpaces,
  getCinematicSpaces,
  getSpaceById,
  type ShortletProperty
} from "../src/domain/spatial.ts";

const property: ShortletProperty = rawProperty as ShortletProperty;

describe("Aurelia Sanctuary Property Model Integrity", () => {
  test("defines single private shortlet estate with USD currency", () => {
    assert.equal(property.property.id, "aurelia-sanctuary");
    assert.equal(property.property.name, "Aurelia Sanctuary");
    assert.equal(property.property.type, "private_shortlet_estate");
    assert.equal(property.property.currency, "USD");
  });

  test("contains zero old hotel suite categories or NGN references", () => {
    const jsonStr = JSON.stringify(property);
    assert.equal(jsonStr.includes("Deluxe Room"), false);
    assert.equal(jsonStr.includes("Executive Suite"), false);
    assert.equal(jsonStr.includes("Presidential Suite"), false);
    assert.equal(jsonStr.includes("NGN"), false);
    assert.equal(jsonStr.includes("₦"), false);
  });

  test("pricing is truthful: unverified rates are represented as null/unavailable", () => {
    assert.equal(property.property.pricing.nightly_rate_usd, null);
    assert.equal(property.property.pricing.status, "available_on_inquiry");
  });

  test("separates spaces into exactly cinematic and detail representation types", () => {
    const detailSpaces = getDetailSpaces(property);
    const cinematicSpaces = getCinematicSpaces(property);

    assert.equal(detailSpaces.length, 3);
    assert.deepEqual(
      detailSpaces.map((s) => s.id),
      ["master_bedroom", "ensuite_bathroom", "infinity_pool"]
    );

    assert.equal(cinematicSpaces.length, 5);
    assert.deepEqual(
      cinematicSpaces.map((s) => s.id),
      ["exterior", "entrance", "living_room", "kitchen", "hallway"]
    );
  });
});

describe("Spatial Action Contract Resolution", () => {
  test("resolves SHOW_SPACE(master_bedroom) to detail visual /spaces/master-bedroom.jpg", () => {
    const res = resolveSpaceAction({ type: "SHOW_SPACE", spaceId: "master_bedroom" }, property);

    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.view.mode, "detail");
      assert.equal(res.view.space.id, "master_bedroom");
      assert.equal(res.view.visual.src, "/spaces/master-bedroom.jpg");
      assert.equal(res.view.visual.aspectRatio, "16:9");
    }
  });

  test("resolves SHOW_SPACE(ensuite_bathroom) to detail visual /spaces/ensuite-bathroom.jpg", () => {
    const res = resolveSpaceAction({ type: "SHOW_SPACE", spaceId: "ensuite_bathroom" }, property);

    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.view.mode, "detail");
      assert.equal(res.view.space.id, "ensuite_bathroom");
      assert.equal(res.view.visual.src, "/spaces/ensuite-bathroom.jpg");
    }
  });

  test("resolves SHOW_SPACE(infinity_pool) to detail visual /spaces/infinity-pool.jpg", () => {
    const res = resolveSpaceAction({ type: "SHOW_SPACE", spaceId: "infinity_pool" }, property);

    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.view.mode, "detail");
      assert.equal(res.view.space.id, "infinity_pool");
      assert.equal(res.view.visual.src, "/spaces/infinity-pool.jpg");
    }
  });

  test("resolves SHOW_SPACE(living_room) to cinematic representation (Frame 170)", () => {
    const res = resolveSpaceAction({ type: "SHOW_SPACE", spaceId: "living_room" }, property);

    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.view.mode, "cinematic");
      assert.equal(res.view.space.id, "living_room");
      assert.equal(res.view.frame, 170);
      assert.equal("visual" in res.view, false);
    }
  });

  test("resolves SHOW_SPACE(exterior) to cinematic representation (Frame 1)", () => {
    const res = resolveSpaceAction({ type: "SHOW_SPACE", spaceId: "exterior" }, property);

    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.view.mode, "cinematic");
      assert.equal(res.view.frame, 1);
    }
  });

  test("fails safely on invalid or unknown space ID without crashing", () => {
    const res = resolveSpaceAction({ type: "SHOW_SPACE", spaceId: "presidential-suite" }, property);

    assert.equal(res.success, false);
    if (!res.success) {
      assert.ok(res.error.includes("Unknown space identifier"));
      assert.equal(res.fallbackView.mode, "overview");
    }
  });

  test("resolves RETURN_TO_OVERVIEW action", () => {
    const res = resolveSpaceAction({ type: "RETURN_TO_OVERVIEW" }, property);

    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.view.mode, "overview");
    }
  });
});
