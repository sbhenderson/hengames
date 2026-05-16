import type { GameDefinition } from "@hengames/shared";
import { applyHandAndFootAction } from "./actions";
import { createInitialHandAndFootState, defaultHandAndFootRules } from "./setup";
import { getHandAndFootPlayerView } from "./views";
import type { HandAndFootAction, HandAndFootPlayerView, HandAndFootRules, HandAndFootState } from "./types";

export const handAndFootDefinition: GameDefinition<
  HandAndFootRules,
  HandAndFootState,
  HandAndFootAction,
  HandAndFootPlayerView
> = {
  id: "hand-and-foot",
  displayName: "Hand and Foot",
  defaultRules: defaultHandAndFootRules,
  createInitialState: createInitialHandAndFootState,
  getPlayerView: getHandAndFootPlayerView,
  applyAction: applyHandAndFootAction
};

export * from "./actions";
export * from "./types";
export * from "./cards";
export * from "./setup";
export * from "./views";
