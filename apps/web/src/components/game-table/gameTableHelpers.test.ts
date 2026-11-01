import { describe, expect, test } from "vitest";
import type { Card } from "@hengames/shared";
import { formatCard, formatCardRank, isRedSuit, meldSeal, suitChar } from "./cardDisplay";
import type { MeldView } from "./types";
import {
  analyzeSelectedCards,
  canPickUp,
  canPickUpTopDiscard,
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

describe("pickup helpers", () => {
  const nines = [card("9a", "9", "clubs"), card("9b", "9", "spades")];

  test("enables pickup for two naturals matching the top discard", () => {
    const view = { turnStep: "must-draw" as const, topDiscard: card("top", "9", "hearts") };
    expect(canPickUp(view, nines)).toBe(true);
    expect(canPickUp(view, [...nines, card("w", "2", "clubs")])).toBe(true);
  });

  test("disables pickup for one natural, other ranks, or the wrong step", () => {
    const view = { turnStep: "must-draw" as const, topDiscard: card("top", "9", "hearts") };
    expect(canPickUp(view, [nines[0]!, card("w", "2", "clubs")])).toBe(false);
    expect(canPickUp(view, [...nines, card("k", "K", "clubs")])).toBe(false);
    expect(canPickUp({ ...view, turnStep: "must-discard" }, nines)).toBe(false);
  });

  test("disables pickup on a black 3, wild, or empty pile", () => {
    const threes = [card("t1", "3", "clubs"), card("t2", "3", "spades")];
    expect(canPickUp({ turnStep: "must-draw", topDiscard: card("b3", "3", "spades") }, threes)).toBe(false);
    expect(canPickUp({ turnStep: "must-draw", topDiscard: card("two", "2", "clubs") }, [card("a", "2"), card("b", "2")])).toBe(false);
    expect(canPickUp({ turnStep: "must-draw", topDiscard: null }, nines)).toBe(false);
    expect(canPickUpTopDiscard(card("jk", "JOKER"))).toBe(false);
    expect(canPickUpTopDiscard(card("q", "Q", "clubs"))).toBe(true);
  });

  test("prompts for pickup when the pile can be picked up", () => {
    const base = { isOwnTurn: true, currentPlayerName: "peeking-penguin", turnStep: "must-draw" as const };
    expect(turnActionPrompt({ ...base, canPickUpPile: true })).toBe("Your turn: draw 2 or pick up the pile");
    expect(turnActionPrompt({ ...base, canPickUpPile: false })).toBe("Your turn: draw 2");
  });

  test("disables meld actions while the selection contains a 3", () => {
    const hand = [card("3a", "3", "spades"), card("3b", "3", "clubs"), card("3c", "3", "spades"), card("ka", "K", "clubs")];
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
    const withThrees = analyzeSelectedCards({
      cards: hand,
      selectedCardIds: ["3a", "3b", "3c"],
      melds,
      teamId: "red",
      turnStep: "must-discard"
    });
    expect(withThrees.canCreateMeld).toBe(false);
    const mixed = analyzeSelectedCards({
      cards: hand,
      selectedCardIds: ["3a", "ka"],
      melds,
      teamId: "red",
      turnStep: "must-discard"
    });
    expect(mixed.addToMeldOptions).toEqual([]);
  });
});
