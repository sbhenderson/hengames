import { GameRuleError } from "@hengames/shared";
import { createStandardDeck, shuffle } from "../common/deck.js";
import { pyramidSize } from "./cards.js";
import { settlePhase } from "./scoring.js";
import type { PyramidSlot, PyramidsRules, PyramidsState } from "./types.js";

/**
 * Row points run from the apex (index 0) down to the base, matching the
 * original Pyramids payout table where the final card is worth a small fortune.
 */
export const defaultPyramidsRules: PyramidsRules = {
  rowCount: 7,
  rowPoints: [502, 27, 17, 12, 7, 4, 3],
  streakBonusStep: 2,
  clearBonus: 500
};

export function createInitialPyramidsState(input: {
  seed: string;
  playerIds: string[];
  rules: PyramidsRules;
}): PyramidsState {
  const { playerIds, rules, seed } = input;
  const playerId = playerIds[0];

  if (playerIds.length !== 1 || !playerId) {
    throw new GameRuleError("invalid-rules", "Pyramids is a solo game and requires exactly one player.");
  }

  if (rules.rowCount < 1 || rules.rowPoints.length !== rules.rowCount) {
    throw new GameRuleError("invalid-rules", "Pyramids requires one row payout per pyramid row.");
  }

  const deck = shuffle(createStandardDeck(), seed);
  const needed = pyramidSize(rules.rowCount) + 1;

  if (deck.length < needed) {
    throw new GameRuleError("invalid-rules", "Not enough cards to build the pyramid.");
  }

  const slots: PyramidSlot[] = [];
  for (let row = 0; row < rules.rowCount; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      const card = deck.shift();
      if (!card) {
        throw new GameRuleError("invalid-rules", "Not enough cards to build the pyramid.");
      }
      slots.push({ row, column, card, removed: false });
    }
  }

  const targetCard = deck.shift();
  if (!targetCard) {
    throw new GameRuleError("invalid-rules", "Not enough cards to start the draw pile.");
  }

  return settlePhase({
    phase: "playing",
    playerId,
    rules,
    slots,
    drawPile: deck,
    targetCard,
    consecutivePlays: 0,
    bestStreak: 0,
    gamePoints: 0,
    cardsCleared: 0,
    pyramidCleared: false,
    collected: false,
    lastEvent: "New pyramid dealt.",
    lastEventSeq: 0
  });
}
