import { GameRuleError, type Card } from "@hengames/shared";
import { isAdjacentRank, isExposed } from "./cards.js";
import { playPoints, settlePhase } from "./scoring.js";
import type { PyramidsAction, PyramidsRules, PyramidsState } from "./types.js";

function describe(card: Card): string {
  return card.rank === "JOKER" ? "Joker" : `${card.rank} of ${card.suit}`;
}

export function applyPyramidsAction(input: {
  state: PyramidsState;
  action: PyramidsAction;
  playerId: string;
  rules: PyramidsRules;
}): PyramidsState {
  const { action, playerId, state } = input;

  if (playerId !== state.playerId) {
    throw new GameRuleError("invalid-player", "This Pyramids game belongs to another player.");
  }

  switch (action.type) {
    case "play":
      return playCard(state, action.cardId);
    case "draw":
      return drawCard(state);
    case "collect":
      return collectPoints(state);
    default: {
      const exhaustive: never = action;
      throw new GameRuleError("invalid-action", `Unsupported action: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function playCard(state: PyramidsState, cardId: string): PyramidsState {
  if (state.phase !== "playing") {
    throw new GameRuleError("invalid-action", "The game is over. Collect your points to finish.");
  }

  // Only ever resolve against face-up cards. Distinguishing "unknown", "already
  // played" and "still covered" would let a client enumerate card ids and read
  // the whole face-down pyramid, so unresolvable ids share one generic message.
  const slot = state.slots.find(
    (candidate) => candidate.card.id === cardId && !candidate.removed && isExposed(state, candidate)
  );

  if (!slot) {
    throw new GameRuleError("invalid-action", "That card can't be played right now.");
  }

  if (!isAdjacentRank(slot.card, state.targetCard)) {
    throw new GameRuleError(
      "invalid-action",
      `${describe(slot.card)} is not one higher or one lower than ${describe(state.targetCard)}.`
    );
  }

  const consecutivePlays = state.consecutivePlays + 1;
  const earned = playPoints(state.rules, slot.row, consecutivePlays);

  return settlePhase({
    ...state,
    slots: state.slots.map((candidate) =>
      candidate === slot ? { ...candidate, removed: true } : candidate
    ),
    targetCard: slot.card,
    consecutivePlays,
    bestStreak: Math.max(state.bestStreak, consecutivePlays),
    gamePoints: state.gamePoints + earned,
    cardsCleared: state.cardsCleared + 1,
    lastEvent: `Played ${describe(slot.card)} for ${earned} points.`,
    lastEventSeq: state.lastEventSeq + 1
  });
}

function drawCard(state: PyramidsState): PyramidsState {
  if (state.phase !== "playing") {
    throw new GameRuleError("invalid-action", "The game is over. Collect your points to finish.");
  }

  const [next, ...rest] = state.drawPile;

  if (!next) {
    throw new GameRuleError("invalid-action", "The draw pile is empty.");
  }

  return settlePhase({
    ...state,
    drawPile: rest,
    targetCard: next,
    consecutivePlays: 0,
    lastEvent: `Drew ${describe(next)}. Streak reset.`,
    lastEventSeq: state.lastEventSeq + 1
  });
}

function collectPoints(state: PyramidsState): PyramidsState {
  if (state.phase !== "game-over") {
    throw new GameRuleError("invalid-action", "You can only collect points once the game is over.");
  }

  if (state.collected) {
    throw new GameRuleError("invalid-action", "These points have already been collected.");
  }

  return {
    ...state,
    collected: true,
    lastEvent: `Collected ${state.gamePoints} points.`,
    lastEventSeq: state.lastEventSeq + 1
  };
}
