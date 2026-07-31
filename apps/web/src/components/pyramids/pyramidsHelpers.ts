import type { PyramidsTableView } from "./types";

/** Short instruction shown above the pyramid, driven entirely by the server view. */
export function pyramidsHeadline(view: PyramidsTableView | null): string {
  if (!view) {
    return "Ready when you are.";
  }
  if (view.collected) {
    return "Points collected. Play again?";
  }
  if (view.phase === "game-over") {
    return view.pyramidCleared ? "Pyramid cleared!" : "No legal moves left.";
  }
  if (view.playableCardIds.length === 0) {
    return "Nothing to play — draw a new target card.";
  }
  return `Play a card one higher or one lower than the ${view.targetCard.rank}.`;
}

/** Label under the target card describing the streak bonus on offer. */
export function streakLabel(view: PyramidsTableView): string {
  if (view.consecutivePlays === 0) {
    return "No streak yet";
  }
  return `${view.consecutivePlays} in a row · +${view.nextStreakBonus} bonus next`;
}

export function pyramidTotalCards(view: PyramidsTableView): number {
  return view.cardsCleared + view.cardsRemaining;
}
