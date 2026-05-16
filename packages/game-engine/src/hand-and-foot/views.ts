import type { HandAndFootPlayerView, HandAndFootRules, HandAndFootState } from "./types";

export function getHandAndFootPlayerView(input: {
  state: HandAndFootState;
  playerId: string | null;
  rules: HandAndFootRules;
}): HandAndFootPlayerView {
  const { state, playerId } = input;
  const players: HandAndFootPlayerView["players"] = {};

  for (const player of Object.values(state.players)) {
    const isCurrentViewer = player.id === playerId;
    players[player.id] = {
      id: player.id,
      teamId: player.teamId,
      activePile: player.activePile,
      hand: isCurrentViewer ? player.hand : undefined,
      foot: isCurrentViewer && player.activePile === "foot" ? player.foot : undefined,
      handCount: isCurrentViewer ? undefined : player.hand.length,
      footCount: !isCurrentViewer && player.activePile === "foot" ? player.foot.length : undefined
    };
  }

  return {
    phase: state.phase,
    round: state.round,
    currentPlayerId: state.playerOrder[state.currentPlayerIndex] ?? "",
    turnStep: state.turnStep,
    players,
    topDiscard: state.discardPile.at(-1) ?? null,
    discardCount: state.discardPile.length,
    drawCount: state.drawPile.length,
    melds: state.melds,
    teamScores: state.teamScores,
    roundScores: state.roundScores,
    lastEvent: state.lastEvent
  };
}
