import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AureliaFSM } from "../src/state/stateMachine.ts";
import type { PrimaryState } from "../src/state/types.ts";

describe("Aurelia Finite State Machine (FSM)", () => {
  test("initializes in IDLE state by default", () => {
    const fsm = new AureliaFSM();
    assert.equal(fsm.getState(), "IDLE");
  });

  test("initializes with a custom initial state if specified", () => {
    const fsm = new AureliaFSM("EXPLORING");
    assert.equal(fsm.getState(), "EXPLORING");
  });

  test("executes the complete signature happy-path transition sequence", () => {
    const fsm = new AureliaFSM("IDLE");

    // 1. User activates microphone
    assert.ok(fsm.transition("LISTENING"));
    assert.equal(fsm.getState(), "LISTENING");

    // 2. User finishes speaking
    assert.ok(fsm.transition("UNDERSTANDING"));
    assert.equal(fsm.getState(), "UNDERSTANDING");

    // 3. Tool call / UI action triggers camera glide
    assert.ok(fsm.transition("VISUAL_TRANSITION"));
    assert.equal(fsm.getState(), "VISUAL_TRANSITION");

    // 4. Glide completes, agent audio responds
    assert.ok(fsm.transition("RESPONDING"));
    assert.equal(fsm.getState(), "RESPONDING");

    // 5. Audio finishes, user explores room
    assert.ok(fsm.transition("EXPLORING"));
    assert.equal(fsm.getState(), "EXPLORING");

    // 6. User says "Book it"
    assert.ok(fsm.transition("BOOKING"));
    assert.equal(fsm.getState(), "BOOKING");

    // 7. Booking verified on server -> Key pass issued
    assert.ok(fsm.transition("KEY_ISSUED"));
    assert.equal(fsm.getState(), "KEY_ISSUED");

    // 8. User dismisses key pass back to exploration
    assert.ok(fsm.transition("EXPLORING"));
    assert.equal(fsm.getState(), "EXPLORING");
  });

  test("rejects illegal state jumps to preserve KEY_ISSUED invariant", () => {
    const fsm = new AureliaFSM("IDLE");

    // Attempting to jump directly from IDLE to KEY_ISSUED must be rejected
    const illegalJump1 = fsm.transition("KEY_ISSUED");
    assert.equal(illegalJump1, false);
    assert.equal(fsm.getState(), "IDLE");

    // Move to EXPLORING
    fsm.transition("LISTENING");
    fsm.transition("UNDERSTANDING");
    fsm.transition("EXPLORING");
    assert.equal(fsm.getState(), "EXPLORING");

    // Attempting to jump directly from EXPLORING to KEY_ISSUED without BOOKING must be rejected
    const illegalJump2 = fsm.transition("KEY_ISSUED");
    assert.equal(illegalJump2, false);
    assert.equal(fsm.getState(), "EXPLORING");
  });

  test("supports barge-in transition from RESPONDING to LISTENING", () => {
    const fsm = new AureliaFSM("RESPONDING");
    assert.ok(fsm.transition("LISTENING"));
    assert.equal(fsm.getState(), "LISTENING");
  });

  test("subscribes and receives notifications on state transitions", () => {
    const fsm = new AureliaFSM("IDLE");
    const history: PrimaryState[] = [];

    const unsubscribe = fsm.subscribe((state) => {
      history.push(state);
    });

    fsm.transition("LISTENING");
    fsm.transition("UNDERSTANDING");
    fsm.transition("EXPLORING");

    unsubscribe();
    fsm.transition("BOOKING");

    assert.deepEqual(history, ["IDLE", "LISTENING", "UNDERSTANDING", "EXPLORING"]);
  });
});
