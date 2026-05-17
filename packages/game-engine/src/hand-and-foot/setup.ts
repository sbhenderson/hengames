import { GameRuleError } from "@hengames/shared";
import { createDecks, shuffle } from "./cards.js";
import type { HandAndFootRules, HandAndFootState } from "./types.js";

export const defaultHandAndFootRules: HandAndFootRules = {
  playerCount: 4,
  teamCount: 2,
  deckCount: 6,
  cardsPerHand: 11,
  cardsPerFoot: 11,
  drawCount: 2,
  openingMeldMinimums: [50, 90, 120, 150],
  cleanBookSize: 7,
  dirtyBookSize: 7,
  goingOutRequiresCleanBook: true,
  goingOutRequiresDirtyBook: true,
  gameEndScore: 8500,
  cardPoints: {
    "3": 5,
    "4": 5,
    "5": 5,
    "6": 5,
    "7": 5,
    "8": 10,
    "9": 10,
    "10": 10,
    J: 10,
    Q: 10,
    K: 10,
    A: 20,
    "2": 20,
    JOKER: 50
  }
};

export function createInitialHandAndFootState(input: {
  seed: string;
  playerIds: string[];
  rules: HandAndFootRules;
}): HandAndFootState {
  const { playerIds, rules, seed } = input;

  if (playerIds.length !== rules.playerCount) {
    throw new GameRuleError("invalid-rules", `Hand and Foot requires exactly ${rules.playerCount} players.`);
  }

  const deck = shuffle(createDecks(rules.deckCount), seed);
  const players: HandAndFootState["players"] = {};

  for (const [index, playerId] of playerIds.entries()) {
    players[playerId] = {
      id: playerId,
      teamId: index % 2 === 0 ? "red" : "blue",
      hand: deck.splice(0, rules.cardsPerHand),
      foot: deck.splice(0, rules.cardsPerFoot),
      activePile: "hand"
    };
  }

  const firstDiscard = deck.shift();

  if (!firstDiscard) {
    throw new GameRuleError("invalid-rules", "Not enough cards to start the discard pile.");
  }

  return {
    phase: "playing",
    round: 1,
    playerOrder: [...playerIds],
    currentPlayerIndex: 0,
    turnStep: "must-draw",
    players,
    drawPile: deck,
    discardPile: [firstDiscard],
    melds: [],
    teamScores: { red: 0, blue: 0 },
    roundScores: [],
    lastEvent: "Game started."
  };
}
