export type GameId = "hand-and-foot";

export type GamePhase = "lobby" | "playing" | "round-over" | "game-over";

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

export type GameDefinition<TRules, TState, TAction, TPlayerView> = {
  id: GameId;
  displayName: string;
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
};
