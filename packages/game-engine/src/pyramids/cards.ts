import type { Card, StandardRank } from "@hengames/shared";
import type { PyramidSlot, PyramidsRules, PyramidsState } from "./types.js";

const RANK_VALUES: Record<StandardRank, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13
};

export function rankValue(card: Pick<Card, "rank">): number {
  if (card.rank === "JOKER") {
    throw new Error("Pyramids is played without jokers.");
  }
  return RANK_VALUES[card.rank];
}

/**
 * Aces are high and low, so A-2 and K-A are both adjacent pairs while K-2 is not.
 */
export function isAdjacentRank(a: Pick<Card, "rank">, b: Pick<Card, "rank">): boolean {
  const left = rankValue(a);
  const right = rankValue(b);
  const distance = Math.abs(left - right);
  return distance === 1 || distance === 12;
}

/** Number of cards in a pyramid with `rowCount` rows. */
export function pyramidSize(rowCount: number): number {
  return (rowCount * (rowCount + 1)) / 2;
}

export function slotKey(row: number, column: number): string {
  return `${row}:${column}`;
}

/**
 * A slot is exposed when it sits on the base row, or when both of the cards
 * overlapping it from the row below have been removed.
 */
export function isExposed(state: Pick<PyramidsState, "slots" | "rules">, slot: PyramidSlot): boolean {
  if (slot.removed) {
    return false;
  }
  if (slot.row === state.rules.rowCount - 1) {
    return true;
  }
  const left = findSlot(state.slots, slot.row + 1, slot.column);
  const right = findSlot(state.slots, slot.row + 1, slot.column + 1);
  return Boolean(left?.removed && right?.removed);
}

export function findSlot(slots: PyramidSlot[], row: number, column: number): PyramidSlot | undefined {
  return slots.find((slot) => slot.row === row && slot.column === column);
}

export function rowPoints(rules: PyramidsRules, row: number): number {
  return rules.rowPoints[row] ?? 0;
}

export function isPlayable(state: PyramidsState, slot: PyramidSlot): boolean {
  return isExposed(state, slot) && isAdjacentRank(slot.card, state.targetCard);
}

export function listPlayableSlots(state: PyramidsState): PyramidSlot[] {
  return state.slots.filter((slot) => isPlayable(state, slot));
}
