import { describe, expect, it } from "vitest";
import { handAndFootDefinition } from "./index";

describe("hand and foot setup", () => {
  it("deals eleven hand cards and eleven foot cards to each player", () => {
    const state = handAndFootDefinition.createInitialState({
      seed: "test-seed",
      playerIds: ["p1", "p2", "p3", "p4"],
      rules: handAndFootDefinition.defaultRules
    });

    expect(Object.values(state.players)).toHaveLength(4);
    expect(state.players.p1?.hand).toHaveLength(11);
    expect(state.players.p1?.foot).toHaveLength(11);
    expect(state.drawPile.length).toBeGreaterThan(0);
    expect(state.discardPile).toHaveLength(1);
  });

  it("does not expose another player's private cards", () => {
    const state = handAndFootDefinition.createInitialState({
      seed: "test-seed",
      playerIds: ["p1", "p2", "p3", "p4"],
      rules: handAndFootDefinition.defaultRules
    });

    const view = handAndFootDefinition.getPlayerView({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules
    });

    expect(view.players.p1?.hand).toHaveLength(11);
    expect(view.players.p2?.hand).toBeUndefined();
    expect(view.players.p2?.handCount).toBe(11);
  });
});
