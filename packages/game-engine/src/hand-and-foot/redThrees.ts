import { isRedThree } from "./cards.js";
import type { HandAndFootPlayerState, HandAndFootState } from "./types.js";

/** Lays every red 3 in the player's active pile for their team, drawing a replacement for each while stock remains. */
export function settleRedThrees(state: HandAndFootState, player: HandAndFootPlayerState): void {
  const pile = player.activePile === "hand" ? player.hand : player.foot;

  for (;;) {
    const index = pile.findIndex(isRedThree);
    const [redThree] = index === -1 ? [] : pile.splice(index, 1);
    if (!redThree) {
      return;
    }
    state.redThrees[player.teamId].push(redThree);
    const replacement = state.drawPile.shift();
    if (replacement) {
      pile.push(replacement);
    }
  }
}
