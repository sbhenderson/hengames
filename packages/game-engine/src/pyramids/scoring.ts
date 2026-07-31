import { listPlayableSlots, rowPoints } from "./cards.js";
import type { PyramidsRules, PyramidsState } from "./types.js";

/**
 * Points for clearing a card on `row` as the `streakLength`-th play since the
 * last draw. The first play of a streak earns no bonus.
 */
export function playPoints(rules: PyramidsRules, row: number, streakLength: number): number {
  const bonus = Math.max(0, streakLength - 1) * rules.streakBonusStep;
  return rowPoints(rules, row) + bonus;
}

/** Bonus the next play would earn if the current streak continues. */
export function nextStreakBonus(state: PyramidsState): number {
  return state.consecutivePlays * state.rules.streakBonusStep;
}

export function hasLegalMove(state: PyramidsState): boolean {
  return listPlayableSlots(state).length > 0;
}

/**
 * The game ends when the pyramid is empty, or when the draw pile is exhausted
 * and no exposed card can be played on the target.
 */
export function settlePhase(state: PyramidsState): PyramidsState {
  if (state.phase === "game-over") {
    return state;
  }

  if (state.slots.every((slot) => slot.removed)) {
    return {
      ...state,
      phase: "game-over",
      pyramidCleared: true,
      gamePoints: state.gamePoints + state.rules.clearBonus,
      lastEvent: `Pyramid cleared! Bonus ${state.rules.clearBonus} points.`,
      lastEventSeq: state.lastEventSeq + 1
    };
  }

  if (state.drawPile.length === 0 && !hasLegalMove(state)) {
    return {
      ...state,
      phase: "game-over",
      lastEvent: "No legal moves and no cards left to draw. Game over.",
      lastEventSeq: state.lastEventSeq + 1
    };
  }

  return state;
}
