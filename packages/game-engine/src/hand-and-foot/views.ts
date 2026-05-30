import type { HandAndFootPlayerView, HandAndFootRules, HandAndFootState } from "./types.js";

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
      hand: isCurrentViewer ? JSON.parse(JSON.stringify(player.hand)) : undefined,
      foot: isCurrentViewer && player.activePile === "foot" ? JSON.parse(JSON.stringify(player.foot)) : undefined,
      handCount: isCurrentViewer ? undefined : player.hand.length,
      footCount: !isCurrentViewer && player.activePile === "foot" ? player.foot.length : undefined
    };
  }

  const topDiscard = state.discardPile.at(-1);

  return {
    phase: state.phase,
    round: state.round,
    currentPlayerId: state.playerOrder[state.currentPlayerIndex] ?? "",
    turnStep: state.turnStep,
    players,
    topDiscard: topDiscard ? JSON.parse(JSON.stringify(topDiscard)) : null,
    discardCount: state.discardPile.length,
    drawCount: state.drawPile.length,
    melds: JSON.parse(JSON.stringify(state.melds)),
    teamScores: { ...state.teamScores },
    roundScores: state.roundScores.map(score => ({ ...score })),
    lastEvent: state.lastEvent,
    lastEventSeq: state.lastEventSeq
  };
}
