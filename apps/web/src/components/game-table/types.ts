import type { Card } from "@hengames/shared";

export type TeamId = "red" | "blue";

export type HandAndFootTableView = {
  phase: "playing" | "round-over" | "game-over";
  round: number;
  currentPlayerId: string;
  turnStep: "must-draw" | "may-meld" | "must-discard";
  players: Record<string, PublicPlayerState>;
  topDiscard: Card | null;
  discardCount: number;
  drawCount: number;
  melds: MeldView[];
  teamScores: Record<TeamId, number>;
  roundScores: Array<Record<TeamId, number>>;
  lastEvent: string;
};

export type PublicPlayerState = {
  id: string;
  teamId: TeamId;
  activePile: "hand" | "foot";
  hand?: Card[];
  foot?: Card[];
  handCount?: number;
  footCount?: number;
};

export type MeldView = {
  id: string;
  rank: Card["rank"];
  teamId: TeamId;
  cards: Card[];
  isBook: boolean;
  isClean: boolean;
};

export type CardHint = "possible-meld" | "existing-meld" | "wild-helper";

export type AddToMeldOption = {
  meldId: string;
  rank: Card["rank"];
  label: string;
};

export type SelectionAnalysis = {
  selectedCards: Card[];
  canCreateMeld: boolean;
  addToMeldOptions: AddToMeldOption[];
  canDiscard: boolean;
};
