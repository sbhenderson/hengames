import { randomUUID } from "node:crypto";
import {
  findGame,
  type GameId,
  type SoloCollectResult,
  type SoloSessionSnapshot,
  type SoloSessionStatus
} from "@hengames/shared";
import { getGameDefinition, type AnyGameDefinition } from "@hengames/game-engine";
import type { ProfileStore } from "../profiles/profileStore.js";

const SESSION_INACTIVITY_LIMIT_MS = 60 * 60 * 1000;

type SoloRecord = {
  sessionId: string;
  gameId: GameId;
  profileToken: string;
  playerId: string;
  definition: AnyGameDefinition;
  rules: unknown;
  state: unknown;
  startedAt: string;
  lastActivityAt: number;
};

export type SoloStore = ReturnType<typeof createSoloStore>;

/**
 * Server-authoritative single-player sessions. The engine state stays on the
 * server so face-down cards are never sent to the client and banked scores
 * cannot be forged.
 */
export function createSoloStore(input: { profileStore: ProfileStore }) {
  const { profileStore } = input;
  const sessions = new Map<string, SoloRecord>();

  function requireSoloGame(gameId: GameId): AnyGameDefinition {
    const catalogEntry = findGame(gameId);
    if (catalogEntry.mode !== "solo") {
      throw new Error(`${catalogEntry.displayName} is not a solo game.`);
    }
    return getGameDefinition(gameId);
  }

  function findSession(sessionId: string, profileToken: string): SoloRecord {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error("That game is no longer available. Start a new one.");
    }
    if (session.profileToken !== profileToken) {
      throw new Error("That game belongs to another player.");
    }
    return session;
  }

  function resolveResult(session: SoloRecord) {
    return (
      session.definition.getSoloResult?.({ state: session.state }) ?? {
        score: 0,
        perfect: false,
        complete: false
      }
    );
  }

  function resolveStatus(session: SoloRecord): SoloSessionStatus {
    const state = session.state as { collected?: boolean };
    if (state.collected) {
      return "collected";
    }
    return resolveResult(session).complete ? "game-over" : "playing";
  }

  function isCollectAction(session: SoloRecord, action: unknown): boolean {
    const collectAction = session.definition.collectAction as { type?: string } | undefined;
    if (!collectAction?.type) {
      return false;
    }
    return (action as { type?: string } | null)?.type === collectAction.type;
  }

  function toSnapshot(session: SoloRecord): SoloSessionSnapshot {
    const stats = profileStore.getStats(session.profileToken, session.gameId);
    const status = resolveStatus(session);
    const result = resolveResult(session);

    return {
      sessionId: session.sessionId,
      gameId: session.gameId,
      status,
      score: result.score,
      /** Banked running total; the in-progress session score is added on collect. */
      highScore: stats.totalScore,
      startedAt: session.startedAt,
      view: session.definition.getPlayerView({
        state: session.state,
        playerId: session.playerId,
        rules: session.rules
      })
    };
  }

  function touch(session: SoloRecord) {
    session.lastActivityAt = Date.now();
  }

  function startGame(request: { gameId: GameId; profileToken: string; seed?: string }): SoloSessionSnapshot {
    const definition = requireSoloGame(request.gameId);
    const profile = profileStore.ensureProfile({ token: request.profileToken });
    const rules = definition.defaultRules;
    const state = definition.createInitialState({
      seed: request.seed ?? randomUUID(),
      playerIds: [profile.id],
      rules
    });

    const session: SoloRecord = {
      sessionId: randomUUID(),
      gameId: request.gameId,
      profileToken: request.profileToken,
      playerId: profile.id,
      definition,
      rules,
      state,
      startedAt: new Date().toISOString(),
      lastActivityAt: Date.now()
    };

    sessions.set(session.sessionId, session);
    return toSnapshot(session);
  }

  function getSession(request: { sessionId: string; profileToken: string }): SoloSessionSnapshot {
    const session = findSession(request.sessionId, request.profileToken);
    touch(session);
    return toSnapshot(session);
  }

  function applyAction(request: {
    sessionId: string;
    profileToken: string;
    action: unknown;
  }): SoloSessionSnapshot {
    const session = findSession(request.sessionId, request.profileToken);

    // Collecting must go through `collect` so the score is banked; applying the
    // collect action here would mark the session collected and lose the points.
    if (isCollectAction(session, request.action)) {
      throw new Error("Use collect to bank your points.");
    }

    session.state = session.definition.applyAction({
      state: session.state,
      action: request.action,
      playerId: session.playerId,
      rules: session.rules
    });
    touch(session);
    return toSnapshot(session);
  }

  /** Banks the finished session's points into the player's running total. */
  function collect(request: { sessionId: string; profileToken: string }): SoloCollectResult {
    const session = findSession(request.sessionId, request.profileToken);

    if (!session.definition.collectAction) {
      throw new Error(`${session.definition.displayName} does not support collecting points.`);
    }

    // The engine validates that the game is over and not already collected.
    session.state = session.definition.applyAction({
      state: session.state,
      action: session.definition.collectAction,
      playerId: session.playerId,
      rules: session.rules
    });
    touch(session);

    const result = resolveResult(session);
    const stats = profileStore.recordGameResult({
      token: session.profileToken,
      gameId: session.gameId,
      score: result.score,
      perfect: result.perfect
    });

    return { session: toSnapshot(session), awarded: result.score, stats };
  }

  function closeInactiveSessions(request?: { inactiveMs?: number; now?: number }): string[] {
    const inactiveMs = request?.inactiveMs ?? SESSION_INACTIVITY_LIMIT_MS;
    const now = request?.now ?? Date.now();
    const closed: string[] = [];

    for (const [sessionId, session] of sessions) {
      if (now - session.lastActivityAt >= inactiveMs) {
        sessions.delete(sessionId);
        closed.push(sessionId);
      }
    }

    return closed;
  }

  return { startGame, getSession, applyAction, collect, closeInactiveSessions };
}
