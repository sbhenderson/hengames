import { GameRuleError, type Card, type CardId } from "@hengames/shared";
import { isWildRank } from "./cards.js";
import { cardPoints, classifyMeld, scoreRound } from "./scoring.js";
import type { HandAndFootAction, HandAndFootRules, HandAndFootState } from "./types.js";

export function applyHandAndFootAction(input: {
  state: HandAndFootState;
  action: HandAndFootAction;
  playerId: string;
  rules: HandAndFootRules;
}): HandAndFootState {
  const { action, playerId, rules } = input;
  const state = cloneState(input.state);
  const currentPlayerId = state.playerOrder[state.currentPlayerIndex];

  if (state.phase !== "playing") {
    throw new GameRuleError("invalid-action", "The round is not currently playable.");
  }

  if (currentPlayerId !== playerId) {
    throw new GameRuleError("not-your-turn", "It is not your turn.");
  }

  if (action.type === "draw") {
    return drawCards(state, playerId, rules);
  }

  if (action.type === "meld") {
    return meldCards(state, playerId, action.cardIds, action.targetMeldId, rules);
  }

  return discardCard(state, playerId, action.cardId, rules);
}

function drawCards(state: HandAndFootState, playerId: string, rules: HandAndFootRules): HandAndFootState {
  if (state.turnStep !== "must-draw") {
    throw new GameRuleError("invalid-action", "You can only draw at the start of your turn.");
  }

  const player = requirePlayer(state, playerId);
  const drawn = state.drawPile.splice(0, rules.drawCount);

  if (drawn.length !== rules.drawCount) {
    throw new GameRuleError("invalid-action", "The draw pile does not have enough cards.");
  }

  activeCards(player).push(...drawn);
  state.turnStep = "must-discard";
  state.lastEvent = `${playerId} drew ${drawn.length} cards.`;
  return state;
}

function meldCards(
  state: HandAndFootState,
  playerId: string,
  cardIds: CardId[],
  targetMeldId: string | undefined,
  rules: HandAndFootRules
): HandAndFootState {
  if (state.turnStep === "must-draw") {
    throw new GameRuleError("invalid-action", "Draw before melding.");
  }

  const player = requirePlayer(state, playerId);
  const cards = removeCards(activeCards(player), cardIds);

  try {
    if (targetMeldId) {
      if (cards.length === 0) {
        throw new Error("Cannot add zero cards to a meld.");
      }
      const target = state.melds.find((meld) => meld.id === targetMeldId);
      if (!target) {
        throw new Error("Target meld not found.");
      }
      if (target.teamId !== player.teamId) {
        throw new Error("Cannot add cards to the other team's meld.");
      }
      if (cards.some((card) => card.rank !== target.rank && card.rank !== "2" && card.rank !== "JOKER")) {
        throw new Error("Cards added to a meld must match the meld rank or be wild.");
      }

      // Validate resulting meld composition before committing
      const resultingCards = [...target.cards, ...cards];
      const naturalCount = resultingCards.filter((card) => card.rank === target.rank).length;
      const wildCount = resultingCards.filter((card) => isWildRank(card.rank)).length;

      if (naturalCount < 2) {
        throw new Error("A meld requires at least two natural cards.");
      }
      if (wildCount > naturalCount) {
        throw new Error("A meld cannot contain more wild cards than natural cards.");
      }

      target.cards.push(...cards);
      target.isBook = target.cards.length >= rules.cleanBookSize;
      target.isClean = target.isBook && target.cards.every((card) => card.rank === target.rank);
      state.lastEvent = `${playerId} added ${cards.length} cards to a meld.`;
    } else {
      const roundIndex = Math.min(state.round - 1, rules.openingMeldMinimums.length - 1);
      const openingMinimum = rules.openingMeldMinimums[roundIndex];
      if (openingMinimum === undefined) {
        throw new Error("Opening meld minimum not configured for this round.");
      }
      const teamHasExistingMeld = state.melds.some((meld) => meld.teamId === player.teamId);
      const meldPointTotal = cards.reduce((total, card) => total + cardPoints(card, rules), 0);
      if (!teamHasExistingMeld && meldPointTotal < openingMinimum) {
        throw new Error(`Opening meld requires at least ${openingMinimum} points.`);
      }
      const meld = classifyMeld({
        id: `meld-${state.melds.length + 1}`,
        teamId: player.teamId,
        cards,
        rules
      });
      state.melds.push(meld);
      state.lastEvent = `${playerId} created a meld of ${meld.rank}.`;
    }
  } catch (error) {
    activeCards(player).push(...cards);
    throw new GameRuleError("invalid-action", error instanceof Error ? error.message : "Invalid meld.");
  }

  if (player.hand.length === 0 && player.activePile === "hand") {
    player.activePile = "foot";
    state.lastEvent = `${playerId} entered their foot.`;
  }

  // Check if melding would empty the active foot without meeting going-out requirements
  if (player.activePile === "foot" && activeCards(player).length === 0) {
    const teamMelds = state.melds.filter((meld) => meld.teamId === player.teamId);
    const hasCleanBook = teamMelds.some((meld) => meld.isBook && meld.isClean);
    const hasDirtyBook = teamMelds.some((meld) => meld.isBook && !meld.isClean);

    if ((rules.goingOutRequiresCleanBook && !hasCleanBook) || (rules.goingOutRequiresDirtyBook && !hasDirtyBook)) {
      // Restore cards to prevent stuck state
      activeCards(player).push(...cards);
      throw new GameRuleError(
        "invalid-action",
        "Cannot meld all cards from your foot without the required clean and dirty books."
      );
    }
  }

  state.turnStep = "must-discard";
  return maybeFinishRound(state, rules);
}

function discardCard(
  state: HandAndFootState,
  playerId: string,
  cardId: CardId,
  rules: HandAndFootRules
): HandAndFootState {
  if (state.turnStep === "must-draw") {
    throw new GameRuleError("invalid-action", "Draw before discarding.");
  }

  const player = requirePlayer(state, playerId);
  const [card] = removeCards(activeCards(player), [cardId]);
  if (!card) {
    throw new GameRuleError("invalid-action", "Card not found.");
  }

  state.discardPile.push(card);
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.playerOrder.length;
  state.turnStep = "must-draw";
  state.lastEvent = `${playerId} discarded.`;
  return maybeFinishRound(state, rules);
}

function maybeFinishRound(state: HandAndFootState, rules: HandAndFootRules): HandAndFootState {
  const emptyPlayer = Object.values(state.players).find(
    (player) => player.activePile === "foot" && player.hand.length === 0 && player.foot.length === 0
  );

  if (!emptyPlayer) {
    return state;
  }

  const teamMelds = state.melds.filter((meld) => meld.teamId === emptyPlayer.teamId);
  const hasCleanBook = teamMelds.some((meld) => meld.isBook && meld.isClean);
  const hasDirtyBook = teamMelds.some((meld) => meld.isBook && !meld.isClean);

  if ((rules.goingOutRequiresCleanBook && !hasCleanBook) || (rules.goingOutRequiresDirtyBook && !hasDirtyBook)) {
    return state;
  }

  const roundScore = scoreRound(state, rules);
  state.roundScores.push(roundScore);
  state.teamScores.red += roundScore.red;
  state.teamScores.blue += roundScore.blue;
  state.phase = state.teamScores.red >= rules.gameEndScore || state.teamScores.blue >= rules.gameEndScore ? "game-over" : "round-over";
  state.lastEvent = `${emptyPlayer.id} went out.`;
  return state;
}

function requirePlayer(state: HandAndFootState, playerId: string) {
  const player = state.players[playerId];
  if (!player) {
    throw new GameRuleError("invalid-player", "Player is not in this game.");
  }
  return player;
}

function activeCards(player: { activePile: "hand" | "foot"; hand: Card[]; foot: Card[] }): Card[] {
  return player.activePile === "hand" ? player.hand : player.foot;
}

function removeCards(cards: Card[], cardIds: CardId[]): Card[] {
  const removed: Card[] = [];

  for (const cardId of cardIds) {
    const index = cards.findIndex((card) => card.id === cardId);
    if (index === -1) {
      throw new GameRuleError("invalid-action", `Card ${cardId} is not available.`);
    }
    const [card] = cards.splice(index, 1);
    if (card) {
      removed.push(card);
    }
  }

  return removed;
}

function cloneState(state: HandAndFootState): HandAndFootState {
  return structuredClone(state);
}
