import { describe, expect, it } from "vitest";
import { GameRuleError } from "@hengames/shared";
import { handAndFootDefinition } from "./index";

function startState() {
  return handAndFootDefinition.createInitialState({
    seed: "actions",
    playerIds: ["p1", "p2", "p3", "p4"],
    rules: handAndFootDefinition.defaultRules
  });
}

describe("hand and foot actions", () => {
  it("draws two cards and advances to meld step", () => {
    const state = startState();
    const next = handAndFootDefinition.applyAction({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "draw" }
    });

    expect(next.players.p1?.hand).toHaveLength(13);
    expect(next.turnStep).toBe("may-meld");
  });

  it("rejects acting out of turn", () => {
    const state = startState();
    expect(() =>
      handAndFootDefinition.applyAction({
        state,
        playerId: "p2",
        rules: handAndFootDefinition.defaultRules,
        action: { type: "draw" }
      })
    ).toThrow(GameRuleError);
  });

  it("discards after drawing and advances the turn", () => {
    const drawn = handAndFootDefinition.applyAction({
      state: startState(),
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "draw" }
    });
    const cardId = drawn.players.p1?.hand[0]?.id;

    if (!cardId) {
      throw new Error("Expected p1 to have a card to discard");
    }

    const next = handAndFootDefinition.applyAction({
      state: drawn,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "discard", cardId }
    });

    expect(next.currentPlayerIndex).toBe(1);
    expect(next.turnStep).toBe("must-draw");
  });

  it("creates a clean book from seven same-rank natural cards", () => {
    const state = startState();
    const p1 = state.players.p1;

    if (!p1) {
      throw new Error("Expected p1");
    }

    p1.hand = [
      { id: "a", rank: "8", suit: "clubs", deckIndex: 0 },
      { id: "b", rank: "8", suit: "diamonds", deckIndex: 0 },
      { id: "c", rank: "8", suit: "hearts", deckIndex: 0 },
      { id: "d", rank: "8", suit: "spades", deckIndex: 0 },
      { id: "e", rank: "8", suit: "clubs", deckIndex: 1 },
      { id: "f", rank: "8", suit: "diamonds", deckIndex: 1 },
      { id: "g", rank: "8", suit: "hearts", deckIndex: 1 }
    ];
    state.turnStep = "may-meld";

    const next = handAndFootDefinition.applyAction({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "meld", cardIds: ["a", "b", "c", "d", "e", "f", "g"] }
    });

    expect(next.melds[0]).toMatchObject({ rank: "8", isBook: true, isClean: true });
  });

  it("enforces the opening meld minimum for the round", () => {
    const state = startState();
    const p1 = state.players.p1;

    if (!p1) {
      throw new Error("Expected p1");
    }

    p1.hand = [
      { id: "a", rank: "4", suit: "clubs", deckIndex: 0 },
      { id: "b", rank: "4", suit: "diamonds", deckIndex: 0 },
      { id: "c", rank: "4", suit: "hearts", deckIndex: 0 }
    ];
    state.turnStep = "may-meld";

    expect(() =>
      handAndFootDefinition.applyAction({
        state,
        playerId: "p1",
        rules: handAndFootDefinition.defaultRules,
        action: { type: "meld", cardIds: ["a", "b", "c"] }
      })
    ).toThrow(GameRuleError);
  });
});
