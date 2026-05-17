import { describe, expect, it } from "vitest";
import { handAndFootDefinition } from "./index.js";

describe("hand and foot setup", () => {
  it("uses six decks by default", () => {
    expect(handAndFootDefinition.defaultRules.deckCount).toBe(6);
  });

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
    expect(view.players.p2?.footCount).toBeUndefined();
  });

  it("returns defensive copies that do not mutate internal state", () => {
    const state = handAndFootDefinition.createInitialState({
      seed: "test-seed",
      playerIds: ["p1", "p2", "p3", "p4"],
      rules: handAndFootDefinition.defaultRules
    });

    const originalHandLength = state.players.p1!.hand.length;
    const originalTeamScoresRed = state.teamScores.red;
    const originalRoundScoresLength = state.roundScores.length;
    const originalMeldsLength = state.melds.length;

    const view = handAndFootDefinition.getPlayerView({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules
    });

    // Mutate returned view data
    view.players.p1!.hand!.pop();
    view.teamScores.red = 999;
    view.roundScores.push({ red: 100, blue: 200 });
    view.melds.push({ id: "fake", teamId: "red", rank: "3", cards: [], isBook: false, isClean: false });

    // Assert original state is unchanged
    expect(state.players.p1!.hand.length).toBe(originalHandLength);
    expect(state.teamScores.red).toBe(originalTeamScoresRed);
    expect(state.roundScores.length).toBe(originalRoundScoresLength);
    expect(state.melds.length).toBe(originalMeldsLength);

    // Fresh view should also be unchanged
    const freshView = handAndFootDefinition.getPlayerView({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules
    });
    expect(freshView.players.p1!.hand!.length).toBe(originalHandLength);
    expect(freshView.teamScores.red).toBe(originalTeamScoresRed);
    expect(freshView.roundScores.length).toBe(originalRoundScoresLength);
    expect(freshView.melds.length).toBe(originalMeldsLength);
  });
});
