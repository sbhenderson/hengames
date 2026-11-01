import { GameRuleError, type Card, type CardId } from "@hengames/shared";
import { isWildRank } from "./cards.js";
import { settleRedThrees } from "./redThrees.js";
import { cardPoints, classifyMeld, scoreRound } from "./scoring.js";
import type {
  HandAndFootAction,
  HandAndFootPlayerState,
  HandAndFootRules,
  HandAndFootState,
  Meld
} from "./types.js";

function setEvent(state: HandAndFootState, message: string): void {
  state.lastEvent = message;
  state.lastEventSeq += 1;
}

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

  if (action.type === "pickup") {
    return pickUpPile(state, playerId, action.cardIds, rules);
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
  settleRedThrees(state, player);
  state.turnStep = "must-discard";
  setEvent(state, `${playerId} drew ${drawn.length} cards.`);
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
  const wasInFoot = player.activePile === "foot";
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
      addCardsToMeld(target, cards, rules);
      setEvent(state, `${playerId} added ${cards.length} cards to a meld.`);
    } else {
      checkOpeningMinimum(state, player, cards, rules);
      const meld = classifyMeld({
        id: `meld-${state.melds.length + 1}`,
        teamId: player.teamId,
        cards,
        rules
      });
      state.melds.push(meld);
      setEvent(state, `${playerId} created a meld of ${meld.rank}.`);
    }
  } catch (error) {
    activeCards(player).push(...cards);
    throw new GameRuleError("invalid-action", error instanceof Error ? error.message : "Invalid meld.");
  }

  if (wasInFoot && player.foot.length < 2 && !hasRequiredBooks(state, player.teamId, rules)) {
    throw new GameRuleError(
      "invalid-action",
      "Without the required clean and dirty books, a foot meld must leave at least 2 cards."
    );
  }

  enterFootIfHandEmpty(state, player);

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

  if (player.activePile === "foot" && player.foot.length === 0 && !hasRequiredBooks(state, player.teamId, rules)) {
    throw new GameRuleError("invalid-action", "You need the required clean and dirty books to go out.");
  }

  state.discardPile.push(card);
  setEvent(state, `${playerId} discarded.`);
  enterFootIfHandEmpty(state, player);

  if (player.activePile === "foot" && player.foot.length === 0) {
    return maybeFinishRound(state, rules);
  }

  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.playerOrder.length;
  state.turnStep = "must-draw";

  if (state.drawPile.length < rules.drawCount) {
    finishRound(state, rules, "The draw pile ran out.");
  }
  return state;
}

function pickUpPile(
  state: HandAndFootState,
  playerId: string,
  cardIds: CardId[],
  rules: HandAndFootRules
): HandAndFootState {
  if (state.turnStep !== "must-draw") {
    throw new GameRuleError("invalid-action", "You can only pick up the pile at the start of your turn.");
  }

  const top = state.discardPile.at(-1);
  if (!top) {
    throw new GameRuleError("invalid-action", "The discard pile is empty.");
  }
  if (top.rank === "3" || isWildRank(top.rank)) {
    throw new GameRuleError("invalid-action", "This card on top blocks picking up the pile.");
  }

  const player = requirePlayer(state, playerId);
  const cards = removeCards(activeCards(player), cardIds);

  try {
    if (cards.some((card) => card.rank !== top.rank && !isWildRank(card.rank))) {
      throw new Error("Pickup cards must match the top discard or be wild.");
    }
    if (cards.filter((card) => card.rank === top.rank).length < 2) {
      throw new Error("Picking up requires two natural cards matching the top discard.");
    }

    const existing = state.melds.find((meld) => meld.teamId === player.teamId && meld.rank === top.rank);
    if (existing) {
      addCardsToMeld(existing, [top, ...cards], rules);
    } else {
      const meldCards = [top, ...cards];
      checkOpeningMinimum(state, player, meldCards, rules);
      state.melds.push(
        classifyMeld({ id: `meld-${state.melds.length + 1}`, teamId: player.teamId, cards: meldCards, rules })
      );
    }
  } catch (error) {
    throw new GameRuleError("invalid-action", error instanceof Error ? error.message : "Invalid pickup.");
  }

  state.discardPile.pop();
  const taken = state.discardPile.splice(Math.max(0, state.discardPile.length - 6));
  activeCards(player).push(...taken);
  settleRedThrees(state, player);
  enterFootIfHandEmpty(state, player);

  if (activeCards(player).length === 0) {
    throw new GameRuleError("invalid-action", "You must keep a card to discard after picking up.");
  }

  state.turnStep = "must-discard";
  setEvent(state, `${playerId} picked up the pile.`);
  return state;
}

function addCardsToMeld(target: Meld, cards: Card[], rules: HandAndFootRules): void {
  if (cards.some((card) => card.rank !== target.rank && !isWildRank(card.rank))) {
    throw new Error("Cards added to a meld must match the meld rank or be wild.");
  }

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
}

function checkOpeningMinimum(
  state: HandAndFootState,
  player: HandAndFootPlayerState,
  cards: Card[],
  rules: HandAndFootRules
): void {
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
}

function hasRequiredBooks(state: HandAndFootState, teamId: "red" | "blue", rules: HandAndFootRules): boolean {
  const teamMelds = state.melds.filter((meld) => meld.teamId === teamId);
  const hasCleanBook = teamMelds.some((meld) => meld.isBook && meld.isClean);
  const hasDirtyBook = teamMelds.some((meld) => meld.isBook && !meld.isClean);
  return !(
    (rules.goingOutRequiresCleanBook && !hasCleanBook) ||
    (rules.goingOutRequiresDirtyBook && !hasDirtyBook)
  );
}

function enterFootIfHandEmpty(state: HandAndFootState, player: HandAndFootPlayerState): void {
  if (player.activePile === "hand" && player.hand.length === 0) {
    player.activePile = "foot";
    setEvent(state, `${player.id} entered their foot.`);
    settleRedThrees(state, player);
  }
}

function finishRound(state: HandAndFootState, rules: HandAndFootRules, message: string): void {
  const roundScore = scoreRound(state, rules);
  state.roundScores.push(roundScore);
  state.teamScores.red += roundScore.red;
  state.teamScores.blue += roundScore.blue;
  state.phase =
    state.teamScores.red >= rules.gameEndScore || state.teamScores.blue >= rules.gameEndScore
      ? "game-over"
      : "round-over";
  setEvent(state, message);
}

function maybeFinishRound(state: HandAndFootState, rules: HandAndFootRules): HandAndFootState {
  const emptyPlayer = Object.values(state.players).find(
    (player) => player.activePile === "foot" && player.hand.length === 0 && player.foot.length === 0
  );

  if (!emptyPlayer) {
    return state;
  }

  if (!hasRequiredBooks(state, emptyPlayer.teamId, rules)) {
    return state;
  }

  finishRound(state, rules, `${emptyPlayer.id} went out.`);
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
