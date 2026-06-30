import { describe, expect, test } from "vitest";
import type { Card } from "@hengames/shared";
import { formatCard, formatCardRank, isRedSuit, meldSeal, suitChar } from "./cardDisplay";
import type { MeldView } from "./types";
import {
  analyzeSelectedCards,
  getCardHints,
  reconcileCardOrder,
  turnActionPrompt
} from "./gameTableHelpers";

function card(id: string, rank: Card["rank"], suit: Card["suit"] = "hearts"): Card {
  if (rank === "JOKER") {
    return { id, rank, suit: "joker", deckIndex: 0 };
  }
  return { id, rank, suit: suit === "joker" ? "hearts" : suit, deckIndex: 0 };
}

describe("card display helpers", () => {
  test("formats standard cards and jokers as accessible text", () => {
    expect(formatCardRank(card("a", "A", "spades"))).toBe("A");
    expect(formatCard(card("a", "A", "spades"))).toBe("A of spades");
    expect(formatCardRank(card("j", "JOKER"))).toBe("JOKER");
    expect(formatCard(card("j", "JOKER"))).toBe("Joker");
  });

  test("maps suits to glyphs and colors", () => {
    expect(suitChar.spades).toBe("\u2660");
    expect(suitChar.hearts).toBe("\u2665");
    expect(isRedSuit("hearts")).toBe(true);
    expect(isRedSuit("diamonds")).toBe(true);
    expect(isRedSuit("spades")).toBe(false);
    expect(isRedSuit("clubs")).toBe(false);
  });

  test("seals clean and dirty books and building melds", () => {
    const cleanBook: MeldView = {
      id: "clean-book",
      rank: "8",
      teamId: "red",
      cards: [card("8a", "8"), card("8b", "8"), card("8c", "8")],
      isBook: true,
      isClean: true
    };
    const dirtyBook: MeldView = {
      id: "dirty-book",
      rank: "K",
      teamId: "blue",
      cards: [card("ka", "K"), card("kb", "K"), card("kc", "K")],
      isBook: true,
      isClean: false
    };
    const cleanBuilding: MeldView = {
      id: "clean-building",
      rank: "Q",
      teamId: "red",
      cards: [card("qa", "Q"), card("qb", "Q")],
      isBook: false,
      isClean: false
    };
    const dirtyBuilding: MeldView = {
      id: "dirty-building",
      rank: "J",
      teamId: "blue",
      cards: [card("ja", "J"), card("wild", "2")],
      isBook: false,
      isClean: false
    };

    expect(meldSeal(cleanBook)).toEqual({ kind: "clean", label: "Clean book" });
    expect(meldSeal(dirtyBook)).toEqual({ kind: "dirty", label: "Dirty book" });
    expect(meldSeal(cleanBuilding)).toEqual({ kind: "building-clean", label: "Clean" });
    expect(meldSeal(dirtyBuilding)).toEqual({ kind: "building-dirty", label: "Dirty" });
  });
});

describe("game table interaction helpers", () => {
  test("reconciles saved card order with fresh cards", () => {
    const cards = [card("a", "A"), card("b", "K"), card("c", "5"), card("d", "7")];

    expect(reconcileCardOrder(cards, ["c", "a", "missing"])).toEqual(["c", "a", "b", "d"]);
  });

  test("builds direct action prompts for own and waiting turns", () => {
    expect(
      turnActionPrompt({
        isOwnTurn: true,
        currentPlayerName: "peeking-penguin",
        turnStep: "must-draw"
      })
    ).toBe("Your turn: draw 2");
    expect(
      turnActionPrompt({
        isOwnTurn: true,
        currentPlayerName: "peeking-penguin",
        turnStep: "must-discard"
      })
    ).toBe("Your turn: meld if you can, then discard 1");
    expect(
      turnActionPrompt({
        isOwnTurn: false,
        currentPlayerName: "curious-cardinal",
        turnStep: "must-draw"
      })
    ).toBe("Waiting for curious-cardinal to draw");
  });

  test("detects create-meld, add-to-meld, and discard options", () => {
    const hand = [
      card("8a", "8"),
      card("8b", "8"),
      card("8c", "8"),
      card("wild", "2"),
      card("ka", "K")
    ];
    const melds = [
      {
        id: "meld-k",
        rank: "K" as const,
        teamId: "red" as const,
        cards: [card("kb", "K"), card("kc", "K"), card("kd", "K")],
        isBook: false,
        isClean: true
      }
    ];

    expect(
      analyzeSelectedCards({
        cards: hand,
        selectedCardIds: ["8a", "8b", "8c"],
        melds,
        teamId: "red",
        turnStep: "must-discard"
      })
    ).toMatchObject({ canCreateMeld: true, canDiscard: false });

    expect(
      analyzeSelectedCards({
        cards: hand,
        selectedCardIds: ["ka"],
        melds,
        teamId: "red",
        turnStep: "must-discard"
      })
    ).toMatchObject({
      canCreateMeld: false,
      canDiscard: true,
      addToMeldOptions: [{ meldId: "meld-k", rank: "K", label: "Add to K" }]
    });
  });

  test("classifies possible meld, existing meld, and wild helper card hints", () => {
    const hand = [
      card("8a", "8"),
      card("8b", "8"),
      card("8c", "8"),
      card("ka", "K"),
      card("wild", "JOKER")
    ];
    const melds = [
      {
        id: "meld-k",
        rank: "K" as const,
        teamId: "red" as const,
        cards: [card("kb", "K"), card("kc", "K"), card("kd", "K")],
        isBook: false,
        isClean: true
      }
    ];

    const hints = getCardHints({ cards: hand, melds, teamId: "red" });

    expect(hints["8a"]).toBe("possible-meld");
    expect(hints["ka"]).toBe("existing-meld");
    expect(hints["wild"]).toBe("wild-helper");
  });
});
