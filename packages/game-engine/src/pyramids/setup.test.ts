import { describe, expect, test } from "vitest";
import { isAdjacentRank, isExposed, pyramidSize } from "./cards.js";
import { createInitialPyramidsState, defaultPyramidsRules } from "./setup.js";

describe("pyramid layout", () => {
  test("pyramidSize matches the triangular number for the row count", () => {
    expect(pyramidSize(7)).toBe(28);
    expect(pyramidSize(1)).toBe(1);
  });

  test("deals a 28 card pyramid, a target card and a 23 card draw pile", () => {
    const state = createInitialPyramidsState({
      seed: "seed-1",
      playerIds: ["p1"],
      rules: defaultPyramidsRules
    });

    expect(state.slots).toHaveLength(28);
    expect(state.drawPile).toHaveLength(23);
    expect(state.targetCard).toBeDefined();
    expect(state.phase).toBe("playing");
    expect(state.gamePoints).toBe(0);
    expect(state.consecutivePlays).toBe(0);
  });

  test("uses a single deck with no duplicates and no jokers", () => {
    const state = createInitialPyramidsState({
      seed: "seed-2",
      playerIds: ["p1"],
      rules: defaultPyramidsRules
    });

    const all = [...state.slots.map((slot) => slot.card), state.targetCard, ...state.drawPile];
    expect(all).toHaveLength(52);
    expect(new Set(all.map((card) => card.id)).size).toBe(52);
    expect(all.some((card) => card.rank === "JOKER")).toBe(false);
  });

  test("rows widen from a single apex card to the base row", () => {
    const state = createInitialPyramidsState({
      seed: "seed-3",
      playerIds: ["p1"],
      rules: defaultPyramidsRules
    });

    for (let row = 0; row < defaultPyramidsRules.rowCount; row += 1) {
      expect(state.slots.filter((slot) => slot.row === row)).toHaveLength(row + 1);
    }
  });

  test("only the base row starts exposed", () => {
    const state = createInitialPyramidsState({
      seed: "seed-4",
      playerIds: ["p1"],
      rules: defaultPyramidsRules
    });

    const exposed = state.slots.filter((slot) => isExposed(state, slot));
    expect(exposed).toHaveLength(7);
    expect(exposed.every((slot) => slot.row === 6)).toBe(true);
  });

  test("a covered card is exposed once both cards below it are removed", () => {
    const state = createInitialPyramidsState({
      seed: "seed-5",
      playerIds: ["p1"],
      rules: defaultPyramidsRules
    });

    const parent = state.slots.find((slot) => slot.row === 5 && slot.column === 2);
    expect(parent).toBeDefined();

    const partial = {
      ...state,
      slots: state.slots.map((slot) =>
        slot.row === 6 && slot.column === 2 ? { ...slot, removed: true } : slot
      )
    };
    expect(isExposed(partial, partial.slots.find((slot) => slot.row === 5 && slot.column === 2)!)).toBe(false);

    const full = {
      ...state,
      slots: state.slots.map((slot) =>
        slot.row === 6 && (slot.column === 2 || slot.column === 3) ? { ...slot, removed: true } : slot
      )
    };
    expect(isExposed(full, full.slots.find((slot) => slot.row === 5 && slot.column === 2)!)).toBe(true);
  });

  test("rejects anything other than a single player", () => {
    expect(() =>
      createInitialPyramidsState({ seed: "s", playerIds: [], rules: defaultPyramidsRules })
    ).toThrow(/solo game/);
    expect(() =>
      createInitialPyramidsState({ seed: "s", playerIds: ["a", "b"], rules: defaultPyramidsRules })
    ).toThrow(/solo game/);
  });

  test("rejects rules with a mismatched payout table", () => {
    expect(() =>
      createInitialPyramidsState({
        seed: "s",
        playerIds: ["p1"],
        rules: { ...defaultPyramidsRules, rowPoints: [1, 2] }
      })
    ).toThrow(/one row payout/);
  });
});

describe("rank adjacency", () => {
  test("treats neighbouring ranks as playable", () => {
    expect(isAdjacentRank({ rank: "5" }, { rank: "4" })).toBe(true);
    expect(isAdjacentRank({ rank: "5" }, { rank: "6" })).toBe(true);
    expect(isAdjacentRank({ rank: "5" }, { rank: "7" })).toBe(false);
    expect(isAdjacentRank({ rank: "5" }, { rank: "5" })).toBe(false);
  });

  test("aces are high and low", () => {
    expect(isAdjacentRank({ rank: "A" }, { rank: "2" })).toBe(true);
    expect(isAdjacentRank({ rank: "A" }, { rank: "K" })).toBe(true);
    expect(isAdjacentRank({ rank: "K" }, { rank: "A" })).toBe(true);
    expect(isAdjacentRank({ rank: "K" }, { rank: "2" })).toBe(false);
  });

  test("rejects jokers", () => {
    expect(() => isAdjacentRank({ rank: "JOKER" }, { rank: "A" })).toThrow(/without jokers/);
  });
});
