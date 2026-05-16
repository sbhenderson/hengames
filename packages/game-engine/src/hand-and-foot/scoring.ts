import type { Card, Rank } from "@hengames/shared";
import { isWildRank } from "./cards";
import type { HandAndFootRules, HandAndFootState, Meld } from "./types";

export function cardPoints(card: Pick<Card, "rank">, rules: HandAndFootRules): number {
  return rules.cardPoints[card.rank];
}

export function determineMeldRank(cards: Card[]): Rank {
  const natural = cards.find((card) => !isWildRank(card.rank));
  if (!natural) {
    throw new Error("Meld requires at least one natural card.");
  }
  return natural.rank;
}

export function classifyMeld(input: {
  id: string;
  teamId: "red" | "blue";
  cards: Card[];
  rules: HandAndFootRules;
}): Meld {
  const { cards, id, rules, teamId } = input;
  const rank = determineMeldRank(cards);
  const naturalCount = cards.filter((card) => card.rank === rank).length;
  const wildCount = cards.filter((card) => isWildRank(card.rank)).length;

  if (cards.length < 3) {
    throw new Error("A meld requires at least three cards.");
  }

  if (naturalCount < 2) {
    throw new Error("A meld requires at least two natural cards.");
  }

  if (wildCount > naturalCount) {
    throw new Error("A meld cannot contain more wild cards than natural cards.");
  }

  const isBook = cards.length >= rules.cleanBookSize;

  return {
    id,
    teamId,
    rank,
    cards,
    isBook,
    isClean: isBook && wildCount === 0
  };
}

export function scoreRound(state: HandAndFootState, rules: HandAndFootRules): Record<"red" | "blue", number> {
  const score = { red: 0, blue: 0 };

  for (const meld of state.melds) {
    const bookBonus = meld.isBook ? (meld.isClean ? 500 : 300) : 0;
    const cardTotal = meld.cards.reduce((total, card) => total + cardPoints(card, rules), 0);
    score[meld.teamId] += bookBonus + cardTotal;
  }

  for (const player of Object.values(state.players)) {
    const penaltyCards = [...player.hand, ...player.foot];
    score[player.teamId] -= penaltyCards.reduce((total, card) => total + cardPoints(card, rules), 0);
  }

  return score;
}
