import { describe, expect, test } from "vitest";
import type { Card } from "@hengames/shared";
import { bookClassName, bookLabel, formatCard, formatCardRank } from "./cardDisplay";
import type { MeldView } from "./types";

function card(id: string, rank: Card["rank"], suit: Card["suit"] = "hearts"): Card {
  if (rank === "JOKER") {
    return { id, rank, suit: "joker", deckIndex: 0 };
  }
  return { id, rank, suit: suit === "joker" ? "hearts" : suit, deckIndex: 0 };
}

describe("card display helpers", () => {
  test("formats standard cards and jokers", () => {
    expect(formatCardRank(card("a", "A", "spades"))).toBe("A");
    expect(formatCard(card("a", "A", "spades"))).toBe("A ♠️");
    expect(formatCardRank(card("j", "JOKER"))).toBe("🤡");
    expect(formatCard(card("j", "JOKER"))).toBe("🤡 Joker");
  });

  test("labels clean and dirty books with text and classes", () => {
    const clean: MeldView = {
      id: "clean",
      rank: "8",
      teamId: "red",
      cards: [card("8a", "8"), card("8b", "8"), card("8c", "8")],
      isBook: true,
      isClean: true
    };
    const dirty: MeldView = {
      id: "dirty",
      rank: "K",
      teamId: "blue",
      cards: [card("ka", "K"), card("kb", "K"), card("wild", "2")],
      isBook: false,
      isClean: false
    };

    expect(bookLabel(clean)).toBe("Red clean book");
    expect(bookClassName(clean)).toBe("book-badge clean-book");
    expect(bookLabel(dirty)).toBe("Building black book");
    expect(bookClassName(dirty)).toBe("book-badge dirty-book");
  });
});
