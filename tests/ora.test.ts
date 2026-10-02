import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { interpretOraInput } from "../src/ora/oraInterpreter.ts";
import {
  defaultPropertyContext,
  buildPropertyContext
} from "../src/ora/oraPropertyContext.ts";
import {
  DeterministicOraProvider,
  executeOraRequest
} from "../src/ora/oraProvider.ts";
import { OraSessionContext } from "../src/ora/oraTypes.ts";

describe("Ora Natural Language Understanding -> Spatial Action", () => {
  const context = defaultPropertyContext;

  test("living room references resolve to living_room", () => {
    const queries = [
      "show me the living room",
      "take me to the living room",
      "show me the lounge",
      "show me the conversation pit",
      "I want to see where people sit"
    ];

    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "NAVIGATE_SPACE", `Failed on: ${q}`);
      if (res.type === "NAVIGATE_SPACE") {
        assert.equal(res.spaceId, "living_room", `Wrong spaceId on: ${q}`);
        assert.equal(res.action.type, "SHOW_SPACE");
        assert.equal(res.action.spaceId, "living_room");
      }
    }
  });

  test("kitchen references resolve to kitchen", () => {
    const queries = [
      "show me the kitchen",
      "take me to the kitchen",
      "show me the island",
      "what does the kitchen look like?",
      "show me where the meals are prepared"
    ];

    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "NAVIGATE_SPACE", `Failed on: ${q}`);
      if (res.type === "NAVIGATE_SPACE") {
        assert.equal(res.spaceId, "kitchen", `Wrong spaceId on: ${q}`);
        assert.equal(res.action.type, "SHOW_SPACE");
        assert.equal(res.action.spaceId, "kitchen");
      }
    }
  });

  test("bedroom references resolve to master_bedroom", () => {
    const queries = [
      "show me the bedroom",
      "show me the master bedroom",
      "where would I sleep?",
      "take me to the bedroom",
      "can I see the primary suite?"
    ];

    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "NAVIGATE_SPACE", `Failed on: ${q}`);
      if (res.type === "NAVIGATE_SPACE") {
        assert.equal(res.spaceId, "master_bedroom", `Wrong spaceId on: ${q}`);
        assert.equal(res.action.type, "SHOW_SPACE");
        assert.equal(res.action.spaceId, "master_bedroom");
      }
    }
  });

  test("bathroom references resolve to ensuite_bathroom", () => {
    const queries = [
      "show me the bathroom",
      "show me the ensuite",
      "what does the bathroom look like?",
      "take me to the spa"
    ];

    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "NAVIGATE_SPACE", `Failed on: ${q}`);
      if (res.type === "NAVIGATE_SPACE") {
        assert.equal(res.spaceId, "ensuite_bathroom", `Wrong spaceId on: ${q}`);
        assert.equal(res.action.type, "SHOW_SPACE");
        assert.equal(res.action.spaceId, "ensuite_bathroom");
      }
    }
  });

  test("pool references resolve to infinity_pool", () => {
    const queries = [
      "show me the pool",
      "can I see the pool?",
      "take me outside to the pool",
      "show me the swimming area"
    ];

    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "NAVIGATE_SPACE", `Failed on: ${q}`);
      if (res.type === "NAVIGATE_SPACE") {
        assert.equal(res.spaceId, "infinity_pool", `Wrong spaceId on: ${q}`);
        assert.equal(res.action.type, "SHOW_SPACE");
        assert.equal(res.action.spaceId, "infinity_pool");
      }
    }
  });

  test("entrance references resolve to entrance", () => {
    const queries = [
      "show me the entrance",
      "take me to the entrance",
      "where do I enter?",
      "show me the arrival canopy"
    ];

    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "NAVIGATE_SPACE", `Failed on: ${q}`);
      if (res.type === "NAVIGATE_SPACE") {
        assert.equal(res.spaceId, "entrance", `Wrong spaceId on: ${q}`);
        assert.equal(res.action.type, "SHOW_SPACE");
        assert.equal(res.action.spaceId, "entrance");
      }
    }
  });

  test("exterior references resolve to exterior", () => {
    const queries = [
      "show me the outside",
      "show me the property",
      "show me the exterior",
      "take me back outside"
    ];

    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "NAVIGATE_SPACE", `Failed on: ${q}`);
      if (res.type === "NAVIGATE_SPACE") {
        assert.equal(res.spaceId, "exterior", `Wrong spaceId on: ${q}`);
        assert.equal(res.action.type, "SHOW_SPACE");
        assert.equal(res.action.spaceId, "exterior");
      }
    }
  });

  test("hallway references resolve to hallway", () => {
    const queries = [
      "show me the corridor",
      "show me the hallway",
      "take me down the corridor"
    ];

    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "NAVIGATE_SPACE", `Failed on: ${q}`);
      if (res.type === "NAVIGATE_SPACE") {
        assert.equal(res.spaceId, "hallway", `Wrong spaceId on: ${q}`);
        assert.equal(res.action.type, "SHOW_SPACE");
        assert.equal(res.action.spaceId, "hallway");
      }
    }
  });

  test("overview references resolve to RETURN_TO_OVERVIEW", () => {
    const queries = ["overview", "show overview", "return to overview", "start over", "reset"];
    for (const q of queries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "RETURN_OVERVIEW");
      if (res.type === "RETURN_OVERVIEW") {
        assert.equal(res.action.type, "RETURN_TO_OVERVIEW");
      }
    }
  });
});

describe("Unknown Spaces & Over-Inference Safeguards", () => {
  const context = defaultPropertyContext;

  test("explicit missing spaces return UNSUPPORTED_SPACE without hallucination", () => {
    const unsupportedQueries = [
      "show me the gym",
      "take me to the cinema",
      "show me the garage",
      "where can I park my car?"
    ];

    for (const q of unsupportedQueries) {
      const res = interpretOraInput(q, context);
      assert.equal(res.type, "UNSUPPORTED_SPACE", `Failed on: ${q}`);
      if (res.type === "UNSUPPORTED_SPACE") {
        assert.ok(res.spokenResponse.includes("does not feature"));
        assert.ok(res.availableSpaces.length > 0);
      }
    }
  });

  test("guest room request does NOT map to master_bedroom", () => {
    const res = interpretOraInput("show me the guest room", context);
    // Must be unsupported or clarification, NEVER master_bedroom
    assert.notEqual(res.type, "NAVIGATE_SPACE");
    assert.equal(res.type, "UNSUPPORTED_SPACE");
    if (res.type === "UNSUPPORTED_SPACE") {
      assert.equal(res.requestedEntity, "guest_room");
    }
  });

  test("ambiguous directional references trigger CLARIFICATION_REQUIRED", () => {
    const res = interpretOraInput("show me upstairs", context);
    assert.equal(res.type, "CLARIFICATION_REQUIRED");
    if (res.type === "CLARIFICATION_REQUIRED") {
      assert.equal(res.reason, "ambiguous_space");
      assert.ok(res.spokenResponse.includes("single-level"));
    }
  });
});

describe("Conversational Continuity & Session History", () => {
  const context = defaultPropertyContext;

  test("follow-up 'what about the bathroom?' after viewing bedroom", async () => {
    const session: OraSessionContext = {
      lastSpaceId: "master_bedroom",
      history: []
    };

    const provider = new DeterministicOraProvider();

    // 1. Initial turn: "Show me the bedroom"
    const turn1 = await executeOraRequest("Show me the bedroom", provider, context, session);
    assert.equal(session.lastSpaceId, "master_bedroom");
    assert.equal(turn1.resolution?.success, true);
    if (turn1.resolution?.success) {
      assert.equal(turn1.resolution.view.mode, "detail");
      assert.equal(turn1.resolution.view.space.id, "master_bedroom");
    }

    // 2. Follow-up turn: "What about the bathroom?"
    const turn2 = await executeOraRequest("What about the bathroom?", provider, context, session);
    assert.equal(session.lastSpaceId, "ensuite_bathroom");
    assert.equal(turn2.action?.type, "SHOW_SPACE");
    assert.equal(turn2.action?.spaceId, "ensuite_bathroom");
    assert.ok(turn2.spokenResponse.includes("adjoining the master bedroom"));
    assert.equal(turn2.resolution?.success, true);

    // 3. Follow-up turn: "And the pool?"
    const turn3 = await executeOraRequest("And the pool?", provider, context, session);
    assert.equal(session.lastSpaceId, "infinity_pool");
    assert.equal(turn3.action?.type, "SHOW_SPACE");
    if (turn3.action?.type === "SHOW_SPACE") {
      assert.equal(turn3.action.spaceId, "infinity_pool");
    }
    assert.equal(session.history.length, 6); // 3 user + 3 ora messages
  });

  test("follow-up 'what about the kitchen?' navigates to cinematic space", async () => {
    const session: OraSessionContext = {
      lastSpaceId: "living_room",
      history: []
    };

    const provider = new DeterministicOraProvider();
    const result = await executeOraRequest("What about the kitchen?", provider, context, session);

    assert.equal(result.action?.type, "SHOW_SPACE");
    assert.equal(result.action?.spaceId, "kitchen");
    assert.equal(result.resolution?.success, true);
    if (result.resolution?.success) {
      assert.equal(result.resolution.view.mode, "cinematic");
      assert.equal(result.resolution.view.frame, 245);
    }
  });
});
