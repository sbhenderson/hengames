import { describe, expect, it } from "vitest";
import { GameRuleError } from "@hengames/shared";
import { handAndFootDefinition } from "./index.js";

function startState() {
  return handAndFootDefinition.createInitialState({
    seed: "actions",
    playerIds: ["p1", "p2", "p3", "p4"],
    rules: handAndFootDefinition.defaultRules
  });
}

describe("hand and foot actions", () => {
  it("draws two cards and requires a discard", () => {
    const state = startState();
    const next = handAndFootDefinition.applyAction({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "draw" }
    });

    expect(next.players.p1?.hand).toHaveLength(13);
    expect(next.turnStep).toBe("must-discard");
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

  it("still allows melding before the required discard after drawing", () => {
    const state = startState();
    const p1 = state.players.p1;

    if (!p1) {
      throw new Error("Expected p1");
    }

    p1.hand = [{ id: "a1", rank: "A", suit: "clubs", deckIndex: 0 }];
    state.drawPile.unshift(
      { id: "a2", rank: "A", suit: "diamonds", deckIndex: 0 },
      { id: "a3", rank: "A", suit: "hearts", deckIndex: 0 }
    );

    const drawn = handAndFootDefinition.applyAction({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "draw" }
    });

    const melded = handAndFootDefinition.applyAction({
      state: drawn,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "meld", cardIds: ["a1", "a2", "a3"] }
    });

    expect(melded.melds[0]).toMatchObject({ rank: "A", isBook: false });
    expect(melded.turnStep).toBe("must-discard");
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

  it("rejects adding zero cards to an existing meld", () => {
    const state = startState();
    const p1 = state.players.p1;

    if (!p1) {
      throw new Error("Expected p1");
    }

    // Create an existing meld with high-value cards to meet opening minimum (50 points)
    // Kings = 10 points each, so 5 Kings = 50 points
    p1.hand = [
      { id: "a", rank: "K", suit: "clubs", deckIndex: 0 },
      { id: "b", rank: "K", suit: "diamonds", deckIndex: 0 },
      { id: "c", rank: "K", suit: "hearts", deckIndex: 0 },
      { id: "d", rank: "K", suit: "spades", deckIndex: 0 },
      { id: "e", rank: "K", suit: "clubs", deckIndex: 1 }
    ];
    state.turnStep = "may-meld";

    const withMeld = handAndFootDefinition.applyAction({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "meld", cardIds: ["a", "b", "c", "d", "e"] }
    });

    const meldId = withMeld.melds[0]?.id;
    if (!meldId) {
      throw new Error("Expected meld to be created");
    }

    // Attempt to add zero cards to the meld
    expect(() =>
      handAndFootDefinition.applyAction({
        state: withMeld,
        playerId: "p1",
        rules: handAndFootDefinition.defaultRules,
        action: { type: "meld", cardIds: [], targetMeldId: meldId }
      })
    ).toThrow(GameRuleError);
  });

  it("rejects adding excessive wild cards to an existing meld and preserves player cards", () => {
    const state = startState();
    const p1 = state.players.p1;

    if (!p1) {
      throw new Error("Expected p1");
    }

    // Set up all cards at once - high value cards for opening meld, then 8s and wilds
    p1.hand = [
      // Opening meld cards (5 Kings = 50 points)
      { id: "k1", rank: "K", suit: "clubs", deckIndex: 0 },
      { id: "k2", rank: "K", suit: "diamonds", deckIndex: 0 },
      { id: "k3", rank: "K", suit: "hearts", deckIndex: 0 },
      { id: "k4", rank: "K", suit: "spades", deckIndex: 0 },
      { id: "k5", rank: "K", suit: "clubs", deckIndex: 1 },
      // Second meld cards (3 natural 8s)
      { id: "n1", rank: "8", suit: "clubs", deckIndex: 0 },
      { id: "n2", rank: "8", suit: "diamonds", deckIndex: 0 },
      { id: "n3", rank: "8", suit: "hearts", deckIndex: 0 },
      // Wild cards (4 total - too many for 3 naturals)
      { id: "w1", rank: "2", suit: "clubs", deckIndex: 0 },
      { id: "w2", rank: "2", suit: "diamonds", deckIndex: 0 },
      { id: "w3", rank: "2", suit: "hearts", deckIndex: 0 },
      { id: "w4", rank: "JOKER", suit: "joker", deckIndex: 0 }
    ];
    state.turnStep = "may-meld";

    // Create opening meld
    const withFirstMeld = handAndFootDefinition.applyAction({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "meld", cardIds: ["k1", "k2", "k3", "k4", "k5"] }
    });
    withFirstMeld.turnStep = "may-meld";

    // Create second meld with 3 naturals
    const withSecondMeld = handAndFootDefinition.applyAction({
      state: withFirstMeld,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "meld", cardIds: ["n1", "n2", "n3"] }
    });
    withSecondMeld.turnStep = "may-meld";

    const secondMeldId = withSecondMeld.melds[1]?.id;
    if (!secondMeldId) {
      throw new Error("Expected second meld to be created");
    }

    // Verify player has 4 wilds remaining
    expect(withSecondMeld.players.p1?.hand).toHaveLength(4);

    // Attempt to add 4 wilds to a meld with only 3 naturals (would be invalid: 3 naturals, 4 wilds)
    expect(() =>
      handAndFootDefinition.applyAction({
        state: withSecondMeld,
        playerId: "p1",
        rules: handAndFootDefinition.defaultRules,
        action: { type: "meld", cardIds: ["w1", "w2", "w3", "w4"], targetMeldId: secondMeldId }
      })
    ).toThrow(GameRuleError);

    // Verify player still has all 4 wild cards after rejection
    expect(withSecondMeld.players.p1?.hand).toHaveLength(4);
    expect(withSecondMeld.players.p1?.hand.map((c) => c.id)).toEqual(
      expect.arrayContaining(["w1", "w2", "w3", "w4"])
    );
  });

  it("rejects melding all cards from active foot when going-out requirements are not satisfied", () => {
    const state = startState();
    const p1 = state.players.p1;

    if (!p1) {
      throw new Error("Expected p1");
    }

    // Put player in their foot with no hand cards
    p1.hand = [];
    p1.activePile = "foot";
    p1.foot = [
      { id: "f1", rank: "8", suit: "clubs", deckIndex: 0 },
      { id: "f2", rank: "8", suit: "diamonds", deckIndex: 0 },
      { id: "f3", rank: "8", suit: "hearts", deckIndex: 0 }
    ];
    state.turnStep = "may-meld";

    // No existing melds (no clean or dirty book)
    state.melds = [];

    // Attempt to meld all foot cards without the required books
    expect(() =>
      handAndFootDefinition.applyAction({
        state,
        playerId: "p1",
        rules: handAndFootDefinition.defaultRules,
        action: { type: "meld", cardIds: ["f1", "f2", "f3"] }
      })
    ).toThrow(GameRuleError);

    // Verify player still has their foot cards
    expect(state.players.p1?.foot).toHaveLength(3);
    expect(state.players.p1?.foot.map((c) => c.id)).toEqual(expect.arrayContaining(["f1", "f2", "f3"]));
  });

  it("allows melding all cards from active foot when going-out requirements are satisfied", () => {
    const state = startState();
    const p1 = state.players.p1;

    if (!p1) {
      throw new Error("Expected p1");
    }

    // Put player in their foot with no hand cards
    p1.hand = [];
    p1.activePile = "foot";
    p1.foot = [
      { id: "f1", rank: "8", suit: "clubs", deckIndex: 0 },
      { id: "f2", rank: "8", suit: "diamonds", deckIndex: 0 },
      { id: "f3", rank: "8", suit: "hearts", deckIndex: 0 },
      { id: "f4", rank: "8", suit: "spades", deckIndex: 0 },
      { id: "f5", rank: "8", suit: "clubs", deckIndex: 1 },
      { id: "f6", rank: "8", suit: "diamonds", deckIndex: 1 },
      { id: "f7", rank: "8", suit: "hearts", deckIndex: 1 }
    ];
    state.turnStep = "may-meld";

    // Create existing clean and dirty books for the team
    state.melds = [
      {
        id: "clean-book",
        teamId: "red",
        rank: "9",
        cards: Array.from({ length: 7 }, (_, i) => ({ id: `c${i}`, rank: "9" as const, suit: "clubs" as const, deckIndex: 0 })),
        isBook: true,
        isClean: true
      },
      {
        id: "dirty-book",
        teamId: "red",
        rank: "10",
        cards: [
          ...Array.from({ length: 5 }, (_, i) => ({ id: `d${i}`, rank: "10" as const, suit: "clubs" as const, deckIndex: 0 })),
          { id: "dw1", rank: "2" as const, suit: "clubs" as const, deckIndex: 0 },
          { id: "dw2", rank: "2" as const, suit: "diamonds" as const, deckIndex: 0 }
        ],
        isBook: true,
        isClean: false
      }
    ];

    // Should succeed - player has required books and is melding a clean book from all foot cards
    const next = handAndFootDefinition.applyAction({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "meld", cardIds: ["f1", "f2", "f3", "f4", "f5", "f6", "f7"] }
    });

    // Round should end because player went out with requirements met
    expect(next.phase).not.toBe("playing");
    expect(next.lastEvent).toContain("went out");
  });
});
