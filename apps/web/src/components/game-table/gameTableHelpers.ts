import type { Card } from "@hengames/shared";
import type { AddToMeldOption, CardHint, HandAndFootTableView, MeldView, SelectionAnalysis, TeamId } from "./types";

export function reconcileCardOrder(cards: Card[], previousOrder: string[]): string[] {
  const cardIds = cards.map((card) => card.id);
  const presentIds = new Set(cardIds);
  const orderedExisting = previousOrder.filter((cardId) => presentIds.has(cardId));
  const alreadyOrdered = new Set(orderedExisting);
  const appendedNew = cardIds.filter((cardId) => !alreadyOrdered.has(cardId));
  return [...orderedExisting, ...appendedNew];
}

export function turnActionPrompt(input: {
  isOwnTurn: boolean;
  currentPlayerName: string;
  turnStep: HandAndFootTableView["turnStep"];
}): string {
  if (input.isOwnTurn) {
    if (input.turnStep === "must-draw") {
      return "Your turn: draw 2";
    }
    if (input.turnStep === "must-discard") {
      return "Your turn: meld if you can, then discard 1";
    }
    return "Your turn: select cards to meld";
  }

  if (input.turnStep === "must-draw") {
    return `Waiting for ${input.currentPlayerName} to draw`;
  }
  if (input.turnStep === "must-discard") {
    return `Waiting for ${input.currentPlayerName} to discard`;
  }
  return `Waiting for ${input.currentPlayerName} to meld`;
}

export function analyzeSelectedCards(input: {
  cards: Card[];
  selectedCardIds: string[];
  melds: MeldView[];
  teamId: TeamId | undefined;
  turnStep: HandAndFootTableView["turnStep"];
}): SelectionAnalysis {
  const selectedIdSet = new Set(input.selectedCardIds);
  const selectedCards = input.cards.filter((card) => selectedIdSet.has(card.id));
  const ownMelds = input.teamId ? input.melds.filter((meld) => meld.teamId === input.teamId) : [];

  return {
    selectedCards,
    canCreateMeld: canFormMeld(selectedCards),
    addToMeldOptions: addToMeldOptions(selectedCards, ownMelds),
    canDiscard: input.turnStep === "must-discard" && selectedCards.length === 1
  };
}

export function getCardHints(input: {
  cards: Card[];
  melds: MeldView[];
  teamId: TeamId | undefined;
}): Record<string, CardHint> {
  const hints: Record<string, CardHint> = {};
  const naturalCounts = new Map<Card["rank"], number>();
  const ownMeldRanks = new Set(
    input.melds
      .filter((meld) => meld.teamId === input.teamId)
      .map((meld) => meld.rank)
  );

  for (const card of input.cards) {
    if (!isWild(card)) {
      naturalCounts.set(card.rank, (naturalCounts.get(card.rank) ?? 0) + 1);
    }
  }

  for (const card of input.cards) {
    if (isWild(card)) {
      hints[card.id] = "wild-helper";
    } else if (ownMeldRanks.has(card.rank)) {
      hints[card.id] = "existing-meld";
    } else if ((naturalCounts.get(card.rank) ?? 0) >= 3) {
      hints[card.id] = "possible-meld";
    }
  }

  return hints;
}

function addToMeldOptions(selectedCards: Card[], melds: MeldView[]): AddToMeldOption[] {
  if (selectedCards.length === 0) {
    return [];
  }

  return melds
    .filter((meld) => selectedCards.every((card) => isWild(card) || card.rank === meld.rank))
    .filter((meld) => canFormMeld([...meld.cards, ...selectedCards]))
    .map((meld) => ({
      meldId: meld.id,
      rank: meld.rank,
      label: `Add to ${meld.rank}`
    }));
}

function canFormMeld(cards: Card[]): boolean {
  if (cards.length < 3) {
    return false;
  }

  const naturalCards = cards.filter((card) => !isWild(card));
  const wildCards = cards.filter(isWild);
  const naturalRanks = new Set(naturalCards.map((card) => card.rank));

  return naturalCards.length >= 2 && naturalRanks.size === 1 && wildCards.length <= naturalCards.length;
}

function isWild(card: Card): boolean {
  return card.rank === "2" || card.rank === "JOKER";
}
