import type { GameDefinition } from "@hengames/shared";
import { applyPyramidsAction } from "./actions.js";
import { createInitialPyramidsState, defaultPyramidsRules } from "./setup.js";
import { getPyramidsPlayerView } from "./views.js";
import type { PyramidsAction, PyramidsPlayerView, PyramidsRules, PyramidsState } from "./types.js";

export const pyramidsDefinition: GameDefinition<
  PyramidsRules,
  PyramidsState,
  PyramidsAction,
  PyramidsPlayerView
> = {
  id: "pyramids",
  displayName: "Pyramids",
  mode: "solo",
  minPlayers: 1,
  maxPlayers: 1,
  defaultRules: defaultPyramidsRules,
  createInitialState: createInitialPyramidsState,
  getPlayerView: getPyramidsPlayerView,
  applyAction: applyPyramidsAction,
  collectAction: { type: "collect" },
  getSoloResult: ({ state }) => ({
    score: state.gamePoints,
    perfect: state.pyramidCleared,
    complete: state.phase === "game-over"
  })
};

export * from "./actions.js";
export * from "./cards.js";
export * from "./scoring.js";
export * from "./setup.js";
export * from "./types.js";
export * from "./views.js";
