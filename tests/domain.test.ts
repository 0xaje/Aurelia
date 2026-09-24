import { test, describe } from "node:test";
import assert from "node:assert/strict";
import rawRooms from "../data/rooms.json" with { type: "json" };
import type { Room, UIAction } from "../src/state/types.ts";
import { searchRooms } from "../src/domain/roomSearch.ts";
import {
  interpretTextCommand,
  extractBudget,
  formatCommandResponse
} from "../src/domain/interpreter.ts";

const catalog: Room[] = rawRooms as Room[];

describe("Deterministic Budget Extraction", () => {
  test("extracts '150k' format", () => {
    assert.equal(extractBudget("around 150k per night"), 150000);
    assert.equal(extractBudget("under 150k"), 150000);
  });

  test("extracts '₦150,000' and '150,000' format", () => {
    assert.equal(extractBudget("around ₦150,000 a night"), 150000);
    assert.equal(extractBudget("budget of 150,000 naira"), 150000);
    assert.equal(extractBudget("150000"), 150000);
  });

  test("returns undefined when no budget is present", () => {
    assert.equal(extractBudget("show me the balcony"), undefined);
  });
});

describe("Deterministic Text Command Interpreter", () => {
  test("interprets signature anniversary search query with budget and balcony", () => {
    const input =
      "I'm coming with my wife for our anniversary. Somewhere quiet, with a balcony, around ₦150k.";
    const cmd = interpretTextCommand(input);

    assert.equal(cmd.type, "SEARCH_ROOMS");
    if (cmd.type === "SEARCH_ROOMS") {
      assert.equal(cmd.filters.max_price_ngn, 150000);
      assert.equal(cmd.filters.required_balcony, true);
    }
  });

  test("interprets budget-only room search", () => {
    const cmd = interpretTextCommand("Find me a room under 150000");
    assert.equal(cmd.type, "SEARCH_ROOMS");
    if (cmd.type === "SEARCH_ROOMS") {
      assert.equal(cmd.filters.max_price_ngn, 150000);
    }
  });

  test("interprets bathtub search query", () => {
    const cmd = interpretTextCommand("Show me something with a bathtub");
    assert.equal(cmd.type, "SEARCH_ROOMS");
    if (cmd.type === "SEARCH_ROOMS") {
      assert.equal(cmd.filters.required_bathtub, true);
    }
  });

  test("interprets 'What does it look like at night?' as night ambiance", () => {
    const cmd = interpretTextCommand("What does it look like at night?");
    assert.equal(cmd.type, "ADJUST_VIEW");
    if (cmd.type === "ADJUST_VIEW") {
      assert.equal(cmd.ambiance, "night");
    }
  });

  test("interprets 'Show me the bathroom.' as bathroom feature focus", () => {
    const cmd = interpretTextCommand("Show me the bathroom.");
    assert.equal(cmd.type, "ADJUST_VIEW");
    if (cmd.type === "ADJUST_VIEW") {
      assert.equal(cmd.feature, "bathroom");
    }
  });

  test("interprets 'Show me the balcony at night.' as combined feature and ambiance", () => {
    const cmd = interpretTextCommand("Show me the balcony at night.");
    assert.equal(cmd.type, "ADJUST_VIEW");
    if (cmd.type === "ADJUST_VIEW") {
      assert.equal(cmd.feature, "balcony");
      assert.equal(cmd.ambiance, "night");
    }
  });

  test("returns UNSUPPORTED for unrelated or ambiguous queries without hallucination", () => {
    const cmd = interpretTextCommand("What is the weather in Tokyo?");
    assert.equal(cmd.type, "UNSUPPORTED");
    if (cmd.type === "UNSUPPORTED") {
      assert.ok(cmd.reason.includes("I can help you search rooms"));
    }
  });
});

describe("Authoritative Room Search Domain", () => {
  test("searches by maximum price", () => {
    const matches = searchRooms(catalog, { max_price_ngn: 100000 });
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, "deluxe");
    assert.equal(matches[0].price_per_night, 85000);
  });

  test("searches by required balcony", () => {
    const matches = searchRooms(catalog, { required_balcony: true });
    assert.equal(matches.length, 2);
    assert.deepEqual(
      matches.map((m) => m.id),
      ["executive-suite", "presidential-suite"]
    );
  });

  test("searches by required bathtub", () => {
    const matches = searchRooms(catalog, { required_bathtub: true });
    assert.equal(matches.length, 2);
    assert.deepEqual(
      matches.map((m) => m.id),
      ["executive-suite", "presidential-suite"]
    );
  });

  test("resolves signature query: max ₦150k + balcony -> Executive Suite", () => {
    const matches = searchRooms(catalog, {
      max_price_ngn: 150000,
      required_balcony: true
    });
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, "executive-suite");
    assert.equal(matches[0].price_per_night, 145000);
    assert.equal(matches[0].has_balcony, true);
  });

  test("returns empty array when no room matches criteria", () => {
    const matches = searchRooms(catalog, { max_price_ngn: 50000 });
    assert.equal(matches.length, 0);
  });

  test("all returned room facts strictly match data/rooms.json", () => {
    const all = searchRooms(catalog, {});
    assert.equal(all.length, 3);
    assert.equal(all[0].price_per_night, 85000);
    assert.equal(all[1].price_per_night, 145000);
    assert.equal(all[2].price_per_night, 280000);
  });
});

describe("End-to-End Command to UI Action Integration", () => {
  test("processes text command into matching room and typed UIAction", () => {
    const input =
      "I'm coming with my wife for our anniversary. Somewhere quiet, with a balcony, around ₦150k.";
    const cmd = interpretTextCommand(input);

    assert.equal(cmd.type, "SEARCH_ROOMS");
    if (cmd.type === "SEARCH_ROOMS") {
      const results = searchRooms(catalog, cmd.filters);
      assert.equal(results.length, 1);
      const matched = results[0];

      // Formulate typed UIAction
      const action: UIAction = {
        type: "FOCUS_ROOM",
        payload: { roomId: matched.id }
      };

      assert.equal(action.type, "FOCUS_ROOM");
      assert.equal(action.payload.roomId, "executive-suite");

      // Verify factual response
      const response = formatCommandResponse(cmd, results);
      assert.ok(response.includes("Executive Suite"));
      assert.ok(response.includes("₦145,000"));
    }
  });

  test("processes view command into typed UIAction", () => {
    const input = "Show me the balcony at night.";
    const cmd = interpretTextCommand(input);

    assert.equal(cmd.type, "ADJUST_VIEW");
    if (cmd.type === "ADJUST_VIEW") {
      const actions: UIAction[] = [];
      if (cmd.feature) {
        actions.push({
          type: "SHOW_FEATURE",
          payload: { feature: cmd.feature }
        });
      }
      if (cmd.ambiance) {
        actions.push({
          type: "CHANGE_AMBIANCE",
          payload: { mode: cmd.ambiance }
        });
      }

      assert.equal(actions.length, 2);
      assert.equal(actions[0].type, "SHOW_FEATURE");
      assert.equal(actions[1].type, "CHANGE_AMBIANCE");
    }
  });
});
