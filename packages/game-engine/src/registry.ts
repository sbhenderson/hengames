import { GAME_CATALOG, type GameDefinition, type GameId } from "@hengames/shared";
import { handAndFootDefinition } from "./hand-and-foot/index.js";
import { pyramidsDefinition } from "./pyramids/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameDefinition = GameDefinition<any, any, any, any>;

export const gameDefinitions: Record<GameId, AnyGameDefinition> = {
  "hand-and-foot": handAndFootDefinition,
  pyramids: pyramidsDefinition
};

export function getGameDefinition(gameId: GameId): AnyGameDefinition {
  const definition = gameDefinitions[gameId];
  if (!definition) {
    throw new Error(`Unknown game: ${gameId}`);
  }
  return definition;
}

export function listSoloGameIds(): GameId[] {
  return GAME_CATALOG.filter((game) => game.mode === "solo").map((game) => game.id);
}
