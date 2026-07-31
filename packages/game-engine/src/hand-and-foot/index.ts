import type { GameDefinition } from "@hengames/shared";
import { applyHandAndFootAction } from "./actions.js";
import { createInitialHandAndFootState, defaultHandAndFootRules } from "./setup.js";
import { getHandAndFootPlayerView } from "./views.js";
import type { HandAndFootAction, HandAndFootPlayerView, HandAndFootRules, HandAndFootState } from "./types.js";

export const handAndFootDefinition: GameDefinition<
  HandAndFootRules,
  HandAndFootState,
  HandAndFootAction,
  HandAndFootPlayerView
> = {
  id: "hand-and-foot",
  displayName: "Hand and Foot",
  mode: "multiplayer",
  minPlayers: 4,
  maxPlayers: 4,
  defaultRules: defaultHandAndFootRules,
  createInitialState: createInitialHandAndFootState,
  getPlayerView: getHandAndFootPlayerView,
  applyAction: applyHandAndFootAction
};

export * from "./actions.js";
export * from "./types.js";
export * from "./cards.js";
export * from "./setup.js";
export * from "./views.js";
