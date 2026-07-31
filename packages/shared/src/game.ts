export type GameId = "hand-and-foot" | "pyramids";

export type GameMode = "multiplayer" | "solo";

export type GamePhase = "lobby" | "playing" | "round-over" | "game-over";

export type GameCatalogEntry = {
  id: GameId;
  displayName: string;
  mode: GameMode;
  emoji: string;
  tagline: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
};

export const GAME_CATALOG: readonly GameCatalogEntry[] = [
  {
    id: "hand-and-foot",
    displayName: "Hand and Foot",
    mode: "multiplayer",
    emoji: "🃏",
    tagline: "Four players, two teams, a mountain of melds.",
    description:
      "The classic partnership canasta variant. Build clean and dirty books with your partner and race to go out first.",
    minPlayers: 4,
    maxPlayers: 4
  },
  {
    id: "pyramids",
    displayName: "Pyramids",
    mode: "solo",
    emoji: "🔺",
    tagline: "Clear the pyramid one card at a time.",
    description:
      "A solo speed-solitaire. Play a card one higher or one lower than the target, keep your streak alive, and bank the points.",
    minPlayers: 1,
    maxPlayers: 1
  }
] as const;

export function findGame(gameId: GameId): GameCatalogEntry {
  const entry = GAME_CATALOG.find((game) => game.id === gameId);
  if (!entry) {
    throw new Error(`Unknown game: ${gameId}`);
  }
  return entry;
}

export type GameErrorCode =
  | "invalid-action"
  | "invalid-player"
  | "invalid-rules"
  | "not-your-turn"
  | "room-not-ready";

export class GameRuleError extends Error {
  constructor(
    readonly code: GameErrorCode,
    message: string
  ) {
    super(message);
    this.name = "GameRuleError";
  }
}

export type SoloGameResult = {
  /** Points earned in the finished session. */
  score: number;
  /** True when the player achieved the game's perfect outcome (e.g. cleared the pyramid). */
  perfect: boolean;
  /** True once the session has reached a terminal state. */
  complete: boolean;
};

export type GameDefinition<TRules, TState, TAction, TPlayerView> = {
  id: GameId;
  displayName: string;
  mode: GameMode;
  minPlayers: number;
  maxPlayers: number;
  defaultRules: TRules;
  createInitialState(input: {
    seed: string;
    playerIds: string[];
    rules: TRules;
  }): TState;
  getPlayerView(input: {
    state: TState;
    playerId: string | null;
    rules: TRules;
  }): TPlayerView;
  applyAction(input: {
    state: TState;
    action: TAction;
    playerId: string;
    rules: TRules;
  }): TState;
  /** Solo games report their banked result so scores can be recorded centrally. */
  getSoloResult?(input: { state: TState }): SoloGameResult;
  /** Action a solo game uses to bank its points once the game is over. */
  collectAction?: TAction;
};
