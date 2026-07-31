import { describe, expect, test } from "vitest";
import { pyramidTotalCards, pyramidsHeadline, streakLabel } from "./pyramidsHelpers";
import type { PyramidsTableView } from "./types";

function view(overrides: Partial<PyramidsTableView> = {}): PyramidsTableView {
  return {
    phase: "playing",
    rows: [],
    targetCard: { id: "t", rank: "7", suit: "hearts", deckIndex: 0 },
    drawCount: 23,
    consecutivePlays: 0,
    bestStreak: 0,
    gamePoints: 0,
    cardsRemaining: 28,
    cardsCleared: 0,
    pyramidCleared: false,
    collected: false,
    nextStreakBonus: 0,
    canDraw: true,
    canCollect: false,
    playableCardIds: [],
    lastEvent: "New pyramid dealt.",
    lastEventSeq: 0,
    ...overrides
  };
}

describe("pyramidsHeadline", () => {
  test("prompts to start when there is no session", () => {
    expect(pyramidsHeadline(null)).toBe("Ready when you are.");
  });

  test("names the target rank when a play is available", () => {
    expect(pyramidsHeadline(view({ playableCardIds: ["a"] }))).toBe(
      "Play a card one higher or one lower than the 7."
    );
  });

  test("nudges the player to draw when nothing is playable", () => {
    expect(pyramidsHeadline(view())).toBe("Nothing to play — draw a new target card.");
  });

  test("celebrates a cleared pyramid", () => {
    expect(pyramidsHeadline(view({ phase: "game-over", pyramidCleared: true }))).toBe("Pyramid cleared!");
  });

  test("reports a dead end", () => {
    expect(pyramidsHeadline(view({ phase: "game-over" }))).toBe("No legal moves left.");
  });

  test("collected sessions take priority over the game-over message", () => {
    expect(pyramidsHeadline(view({ phase: "game-over", collected: true }))).toBe(
      "Points collected. Play again?"
    );
  });
});

describe("streakLabel", () => {
  test("reports no streak before the first play", () => {
    expect(streakLabel(view())).toBe("No streak yet");
  });

  test("reports the streak length and the bonus on offer", () => {
    expect(streakLabel(view({ consecutivePlays: 3, nextStreakBonus: 6 }))).toBe(
      "3 in a row · +6 bonus next"
    );
  });
});

describe("pyramidTotalCards", () => {
  test("adds cleared and remaining cards", () => {
    expect(pyramidTotalCards(view({ cardsCleared: 5, cardsRemaining: 23 }))).toBe(28);
  });
});
