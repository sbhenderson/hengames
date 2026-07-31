import { isExposed, isPlayable, rowPoints } from "./cards.js";
import { nextStreakBonus } from "./scoring.js";
import type { PyramidSlotView, PyramidsPlayerView, PyramidsRules, PyramidsState } from "./types.js";

export function getPyramidsPlayerView(input: {
  state: PyramidsState;
  playerId: string | null;
  rules: PyramidsRules;
}): PyramidsPlayerView {
  const { state } = input;
  const rows: PyramidSlotView[][] = Array.from({ length: state.rules.rowCount }, () => []);
  const playableCardIds: string[] = [];
  // Face-down cards stay hidden so the client can never read ahead.
  const revealAll = state.phase === "game-over";

  for (const slot of state.slots) {
    const row = rows[slot.row];
    if (!row) {
      continue;
    }

    if (slot.removed) {
      row.push({ row: slot.row, column: slot.column, state: "removed" });
      continue;
    }

    const exposed = isExposed(state, slot);

    if (!exposed && !revealAll) {
      row.push({ row: slot.row, column: slot.column, state: "face-down" });
      continue;
    }

    const playable = exposed && isPlayable(state, slot);
    if (playable) {
      playableCardIds.push(slot.card.id);
    }

    row.push({
      row: slot.row,
      column: slot.column,
      state: "face-up",
      card: slot.card,
      playable,
      points: rowPoints(state.rules, slot.row)
    });
  }

  for (const row of rows) {
    row.sort((left, right) => left.column - right.column);
  }

  const cardsRemaining = state.slots.filter((slot) => !slot.removed).length;

  return {
    phase: state.phase,
    rows,
    targetCard: state.targetCard,
    drawCount: state.drawPile.length,
    consecutivePlays: state.consecutivePlays,
    bestStreak: state.bestStreak,
    gamePoints: state.gamePoints,
    cardsRemaining,
    cardsCleared: state.cardsCleared,
    pyramidCleared: state.pyramidCleared,
    collected: state.collected,
    nextStreakBonus: nextStreakBonus(state),
    canDraw: state.phase === "playing" && state.drawPile.length > 0,
    canCollect: state.phase === "game-over" && !state.collected,
    playableCardIds,
    lastEvent: state.lastEvent,
    lastEventSeq: state.lastEventSeq
  };
}
