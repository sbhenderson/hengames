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
      isClean: true
    };
    const dirtyBuilding: MeldView = {
      id: "dirty-building",
      rank: "J",
      teamId: "blue",
      cards: [card("ja", "J"), card("jb", "J")],
      isBook: false,
      isClean: false
    };

    // Clean completed book
    expect(bookLabel(cleanBook)).toBe("Red clean book");
    expect(bookClassName(cleanBook)).toBe("book-badge clean-book");

    // Dirty completed book
    expect(bookLabel(dirtyBook)).toBe("Black dirty book");
    expect(bookClassName(dirtyBook)).toBe("book-badge dirty-book");

    // Clean in-progress meld
    expect(bookLabel(cleanBuilding)).toBe("Building red book");
    expect(bookClassName(cleanBuilding)).toBe("book-badge clean-book");

    // Dirty in-progress meld
    expect(bookLabel(dirtyBuilding)).toBe("Building black book");
    expect(bookClassName(dirtyBuilding)).toBe("book-badge dirty-book");
  });
});
