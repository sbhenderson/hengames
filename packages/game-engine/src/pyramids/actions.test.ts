import { describe, expect, test } from "vitest";
import type { Card, StandardRank, Suit } from "@hengames/shared";
import { applyPyramidsAction } from "./actions.js";
import { listPlayableSlots } from "./cards.js";
import { getPyramidsPlayerView } from "./views.js";
import type { PyramidSlot, PyramidsRules, PyramidsState } from "./types.js";

const testRules: PyramidsRules = {
  rowCount: 3,
  rowPoints: [100, 20, 5],
  streakBonusStep: 2,
  clearBonus: 500
};

let cardSeq = 0;

function card(rank: StandardRank, suit: Suit = "hearts"): Card {
  cardSeq += 1;
  return { id: `${rank}-${suit}-${cardSeq}`, rank, suit, deckIndex: 0 };
}

/** Builds a pyramid from rows of ranks, top row first. */
function buildState(input: {
  rows: StandardRank[][];
  target: StandardRank;
  drawPile?: StandardRank[];
  rules?: PyramidsRules;
}): PyramidsState {
  const slots: PyramidSlot[] = [];
  input.rows.forEach((ranks, row) => {
    ranks.forEach((rank, column) => {
      slots.push({ row, column, card: card(rank), removed: false });
    });
  });

  return {
    phase: "playing",
    playerId: "p1",
    rules: input.rules ?? testRules,
    slots,
    drawPile: (input.drawPile ?? []).map((rank) => card(rank)),
    targetCard: card(input.target, "spades"),
    consecutivePlays: 0,
    bestStreak: 0,
    gamePoints: 0,
    cardsCleared: 0,
    pyramidCleared: false,
    collected: false,
    lastEvent: "New pyramid dealt.",
    lastEventSeq: 0
  };
}

function baseCard(state: PyramidsState, column: number): Card {
  const slot = state.slots.find((candidate) => candidate.row === state.rules.rowCount - 1 && candidate.column === column);
  if (!slot) {
    throw new Error(`No base slot at column ${column}`);
  }
  return slot.card;
}

function play(state: PyramidsState, cardId: string): PyramidsState {
  return applyPyramidsAction({ state, action: { type: "play", cardId }, playerId: "p1", rules: state.rules });
}

function draw(state: PyramidsState): PyramidsState {
  return applyPyramidsAction({ state, action: { type: "draw" }, playerId: "p1", rules: state.rules });
}

describe("playing cards", () => {
  test("plays an exposed card that is one higher than the target", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "5", drawPile: ["2"] });
    const next = play(state, baseCard(state, 0).id);

    expect(next.targetCard.rank).toBe("6");
    expect(next.cardsCleared).toBe(1);
    expect(next.consecutivePlays).toBe(1);
    expect(next.slots.find((slot) => slot.card.id === baseCard(state, 0).id)?.removed).toBe(true);
  });

  test("plays a card that is one lower than the target", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "7", drawPile: ["2"] });
    const next = play(state, baseCard(state, 0).id);
    expect(next.targetCard.rank).toBe("6");
  });

  test("rejects a card that is neither one higher nor one lower", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "9", drawPile: ["2"] });
    expect(() => play(state, baseCard(state, 0).id)).toThrow(/one higher or one lower/);
  });

  test("rejects a covered card even when the rank matches", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "5", drawPile: ["2"] });
    const covered = state.slots.find((slot) => slot.row === 1 && slot.column === 0);
    expect(covered?.card.rank).toBe("4");
    expect(() => play(state, covered!.card.id)).toThrow(/can't be played right now/);
  });

  test("does not reveal whether an unplayable id is hidden, removed or unknown", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "5", drawPile: ["2"] });
    const after = play(state, baseCard(state, 0).id);
    const covered = state.slots.find((slot) => slot.row === 1 && slot.column === 1)!.card.id;

    // A removed card, a still-covered card and a nonexistent id are indistinguishable.
    const messages = [baseCard(state, 0).id, covered, "nope"].map((cardId) => {
      try {
        play(after, cardId);
        return "no error";
      } catch (error) {
        return (error as Error).message;
      }
    });

    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toMatch(/can't be played right now/);
  });

  test("aces wrap around kings and twos", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["A", "2", "K"]], target: "A", drawPile: ["5"] });
    expect(listPlayableSlots(state).map((slot) => slot.card.rank).sort()).toEqual(["2", "K"]);

    const afterKing = play(state, baseCard(state, 2).id);
    expect(afterKing.targetCard.rank).toBe("K");
    expect(listPlayableSlots(afterKing).map((slot) => slot.card.rank)).toEqual(["A"]);
  });

  test("uncovers the card above once both children are gone", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "5", "J"]], target: "5", drawPile: ["2"] });
    const afterFirst = play(state, baseCard(state, 0).id);
    const afterSecond = play(afterFirst, baseCard(state, 1).id);

    const uncovered = afterSecond.slots.find((slot) => slot.row === 1 && slot.column === 0);
    expect(uncovered?.card.rank).toBe("4");
    expect(listPlayableSlots(afterSecond).map((slot) => slot.card.rank)).toContain("4");
  });
});

describe("scoring", () => {
  test("awards row points plus a growing streak bonus", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "5", "4"]], target: "5", drawPile: ["2"] });

    const first = play(state, baseCard(state, 0).id); // 6, base row: 5 + 0
    expect(first.gamePoints).toBe(5);

    const second = play(first, baseCard(state, 1).id); // 5, base row: 5 + 2
    expect(second.gamePoints).toBe(12);
    expect(second.consecutivePlays).toBe(2);

    const third = play(second, baseCard(state, 2).id); // 4, base row: 5 + 4
    expect(third.gamePoints).toBe(21);
    expect(third.bestStreak).toBe(3);
  });

  test("higher rows are worth more", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "5", "J"]], target: "5", drawPile: ["2"] });
    const uncovered = play(play(state, baseCard(state, 0).id), baseCard(state, 1).id);
    const afterRowOne = play(uncovered, uncovered.slots.find((slot) => slot.row === 1 && slot.column === 0)!.card.id);

    // Row 1 is worth 20 with a third-play bonus of 4.
    expect(afterRowOne.gamePoints - uncovered.gamePoints).toBe(24);
  });

  test("drawing resets the streak but keeps banked points", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "5", "J"]], target: "5", drawPile: ["2", "8"] });
    const played = play(state, baseCard(state, 0).id);
    const drawn = draw(played);

    expect(drawn.consecutivePlays).toBe(0);
    expect(drawn.bestStreak).toBe(1);
    expect(drawn.gamePoints).toBe(played.gamePoints);
    expect(drawn.targetCard.rank).toBe("2");
    expect(drawn.drawPile).toHaveLength(1);
  });

  test("clearing the pyramid ends the game and pays the clear bonus", () => {
    const state = buildState({ rows: [["J"], ["9", "10"], ["6", "7", "8"]], target: "5" });

    let next = play(state, baseCard(state, 0).id); // 6 -> 5 + 0
    next = play(next, baseCard(state, 1).id); // 7 -> 5 + 2
    next = play(next, baseCard(state, 2).id); // 8 -> 5 + 4
    next = play(next, next.slots.find((slot) => slot.row === 1 && slot.column === 0)!.card.id); // 9 -> 20 + 6
    next = play(next, next.slots.find((slot) => slot.row === 1 && slot.column === 1)!.card.id); // 10 -> 20 + 8
    next = play(next, next.slots.find((slot) => slot.row === 0 && slot.column === 0)!.card.id); // J -> 100 + 10

    expect(next.phase).toBe("game-over");
    expect(next.pyramidCleared).toBe(true);
    expect(next.cardsCleared).toBe(6);
    expect(next.bestStreak).toBe(6);
    expect(next.gamePoints).toBe(185 + testRules.clearBonus);
  });
});

describe("game over and collecting", () => {
  test("ends the game when the draw pile is empty and nothing is playable", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "5", drawPile: ["8"] });
    const played = play(state, baseCard(state, 0).id); // target becomes 6
    const drawn = draw(played); // target becomes 8, pile empty

    expect(drawn.phase).toBe("game-over");
    expect(drawn.pyramidCleared).toBe(false);
  });

  test("blocks plays and draws once the game is over", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "8" });
    expect(state.drawPile).toHaveLength(0);
    const finished = applyPyramidsAction({
      state: { ...state, phase: "game-over" },
      action: { type: "collect" },
      playerId: "p1",
      rules: testRules
    });

    expect(finished.collected).toBe(true);
    expect(() => play(finished, baseCard(state, 0).id)).toThrow(/game is over/);
    expect(() => draw(finished)).toThrow(/game is over/);
    expect(() =>
      applyPyramidsAction({ state: finished, action: { type: "collect" }, playerId: "p1", rules: testRules })
    ).toThrow(/already been collected/);
  });

  test("refuses to collect while the game is still running", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "5", drawPile: ["2"] });
    expect(() =>
      applyPyramidsAction({ state, action: { type: "collect" }, playerId: "p1", rules: testRules })
    ).toThrow(/only collect points once the game is over/);
  });

  test("refuses to draw from an empty pile while moves remain", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "5" });
    expect(() => draw(state)).toThrow(/draw pile is empty/);
  });

  test("rejects actions from another player", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "5", drawPile: ["2"] });
    expect(() =>
      applyPyramidsAction({ state, action: { type: "draw" }, playerId: "intruder", rules: testRules })
    ).toThrow(/belongs to another player/);
  });
});

describe("player view", () => {
  test("hides covered cards and flags playable ones", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "5", drawPile: ["2"] });
    const view = getPyramidsPlayerView({ state, playerId: "p1", rules: testRules });

    expect(view.rows).toHaveLength(3);
    expect(view.rows[0]?.[0]?.state).toBe("face-down");
    expect(view.rows[2]?.every((slot) => slot.state === "face-up")).toBe(true);
    expect(view.playableCardIds).toEqual([baseCard(state, 0).id]);
    expect(view.drawCount).toBe(1);
    expect(view.cardsRemaining).toBe(6);
    expect(view.canDraw).toBe(true);
    expect(view.canCollect).toBe(false);
  });

  test("never leaks a face-down card object", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "5", drawPile: ["2"] });
    const view = getPyramidsPlayerView({ state, playerId: "p1", rules: testRules });
    const hidden = view.rows.flat().filter((slot) => slot.state === "face-down");

    expect(hidden.length).toBeGreaterThan(0);
    expect(JSON.stringify(hidden)).not.toContain("rank");
  });

  test("reveals the remaining pyramid once the game is over", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "3", "J"]], target: "5" });
    const view = getPyramidsPlayerView({
      state: { ...state, phase: "game-over" },
      playerId: "p1",
      rules: testRules
    });

    expect(view.rows.flat().every((slot) => slot.state === "face-up")).toBe(true);
    expect(view.canCollect).toBe(true);
  });

  test("reports the bonus the next play would earn", () => {
    const state = buildState({ rows: [["9"], ["4", "7"], ["6", "5", "4"]], target: "5", drawPile: ["2"] });
    expect(getPyramidsPlayerView({ state, playerId: "p1", rules: testRules }).nextStreakBonus).toBe(0);

    const played = play(state, baseCard(state, 0).id);
    expect(getPyramidsPlayerView({ state: played, playerId: "p1", rules: testRules }).nextStreakBonus).toBe(2);
  });
});
