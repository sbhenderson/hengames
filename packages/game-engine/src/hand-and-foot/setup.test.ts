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

  describe("red 3s in the deal", () => {
    const deal = (seed: string) =>
      handAndFootDefinition.createInitialState({
        seed,
        playerIds: ["p1", "p2", "p3", "p4"],
        rules: handAndFootDefinition.defaultRules
      });
    const isRed3 = (c: { rank: string; suit: string }) =>
      c.rank === "3" && (c.suit === "hearts" || c.suit === "diamonds");

    it("lays dealt red 3s, keeps 11-card hands, and leaves feet untouched", () => {
      let dealtSeed: string | undefined;
      for (let i = 0; i < 200 && !dealtSeed; i += 1) {
        const state = deal(`red-three-${i}`);
        if (state.redThrees.red.length + state.redThrees.blue.length > 0) {
          dealtSeed = `red-three-${i}`;
        }
      }
      expect(dealtSeed).toBeDefined();

      const state = deal(dealtSeed!);
      expect(state.redThrees.red.every(isRed3)).toBe(true);
      expect(state.redThrees.blue.every(isRed3)).toBe(true);
      for (const player of Object.values(state.players)) {
        expect(player.hand).toHaveLength(11);
        expect(player.hand.some(isRed3)).toBe(false);
        expect(player.foot).toHaveLength(11);
      }
    });

    it("starts every game with no red 3 in any hand and is deterministic for a seed", () => {
      for (let i = 0; i < 20; i += 1) {
        const state = deal(`seed-${i}`);
        for (const player of Object.values(state.players)) {
          expect(player.hand.some(isRed3)).toBe(false);
          expect(player.hand).toHaveLength(11);
        }
      }
      expect(deal("fixed")).toEqual(deal("fixed"));
    });
  });

  it("exposes laid red 3s publicly to other teams", () => {
    const state = handAndFootDefinition.createInitialState({
      seed: "test-seed",
      playerIds: ["p1", "p2", "p3", "p4"],
      rules: handAndFootDefinition.defaultRules
    });
    state.redThrees = { red: [], blue: [] };
    state.redThrees.red.push({ id: "r1", rank: "3", suit: "hearts", deckIndex: 0 });

    const view = handAndFootDefinition.getPlayerView({
      state,
      playerId: "p2",
      rules: handAndFootDefinition.defaultRules
    });

    expect(view.redThrees.red.map((c) => c.id)).toEqual(["r1"]);
    view.redThrees.red.pop();
    expect(state.redThrees.red).toHaveLength(1);
  });
});
