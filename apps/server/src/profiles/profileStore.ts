import { randomUUID } from "node:crypto";
import {
  createEmptyGameStats,
  findGame,
  type GameId,
  type GameStats,
  type HighScoreEntry,
  type ParticipantAvatar,
  type PlayerProfile,
  type PublicPlayerProfile
} from "@hengames/shared";
import { generateAvatar, generateDisplayName, normalizeAvatar, normalizeDisplayName } from "../identity.js";

type ProfileRecord = PlayerProfile & { lastSeenAt: number };

export type ProfileStore = ReturnType<typeof createProfileStore>;

/**
 * Long-lived player identity that spans rooms and solo games. Profiles are keyed
 * by a client-held token so a browser keeps its running high scores between
 * visits; the store is in-memory, matching the room store.
 */
export function createProfileStore() {
  const profilesByToken = new Map<string, ProfileRecord>();

  function toPublic(profile: ProfileRecord): PublicPlayerProfile {
    return {
      id: profile.id,
      displayName: profile.displayName,
      avatar: { ...profile.avatar },
      createdAt: profile.createdAt,
      stats: structuredClone(profile.stats)
    };
  }

  function findRecord(token: string): ProfileRecord {
    const profile = profilesByToken.get(token);
    if (!profile) {
      throw new Error("Unknown player profile. Refresh to start a new session.");
    }
    return profile;
  }

  /**
   * Returns the profile for `token`, creating one when the token is missing or
   * unrecognised. Re-using an unknown token keeps a client's identity stable
   * across server restarts.
   */
  function ensureProfile(input: {
    token?: string;
    displayName?: string;
    avatar?: ParticipantAvatar;
  }): PlayerProfile {
    const existing = input.token ? profilesByToken.get(input.token) : undefined;

    if (existing) {
      const displayName = normalizeDisplayName(input.displayName);
      if (displayName) {
        existing.displayName = displayName;
      }
      if (input.avatar) {
        existing.avatar = normalizeAvatar(input.avatar);
      }
      existing.lastSeenAt = Date.now();
      return { ...toPublic(existing), token: existing.token };
    }

    const token = input.token ?? randomUUID();
    const id = randomUUID();
    const record: ProfileRecord = {
      id,
      token,
      displayName: normalizeDisplayName(input.displayName) ?? generateDisplayName(id),
      avatar: input.avatar ? normalizeAvatar(input.avatar) : generateAvatar(id),
      createdAt: new Date().toISOString(),
      stats: {},
      lastSeenAt: Date.now()
    };

    profilesByToken.set(token, record);
    return { ...toPublic(record), token };
  }

  function getProfile(token: string): PublicPlayerProfile {
    return toPublic(findRecord(token));
  }

  function updateProfile(input: {
    token: string;
    displayName?: string;
    avatar?: ParticipantAvatar;
  }): PublicPlayerProfile {
    const record = findRecord(input.token);
    const displayName = normalizeDisplayName(input.displayName);

    if (displayName) {
      record.displayName = displayName;
    }
    if (input.avatar) {
      record.avatar = normalizeAvatar(input.avatar);
    }

    record.lastSeenAt = Date.now();
    return toPublic(record);
  }

  function getStats(token: string, gameId: GameId): GameStats {
    const record = findRecord(token);
    return { ...(record.stats[gameId] ?? createEmptyGameStats()) };
  }

  /** Adds a finished solo game to the player's running totals. */
  function recordGameResult(input: {
    token: string;
    gameId: GameId;
    score: number;
    perfect?: boolean;
  }): GameStats {
    findGame(input.gameId);
    const record = findRecord(input.token);
    const score = Math.max(0, Math.round(input.score));
    const current = record.stats[input.gameId] ?? createEmptyGameStats();

    const next: GameStats = {
      gamesPlayed: current.gamesPlayed + 1,
      totalScore: current.totalScore + score,
      bestScore: Math.max(current.bestScore, score),
      lastScore: score,
      perfectGames: current.perfectGames + (input.perfect ? 1 : 0)
    };

    record.stats[input.gameId] = next;
    record.lastSeenAt = Date.now();
    return { ...next };
  }

  function listHighScores(input: { gameId: GameId; limit?: number }): HighScoreEntry[] {
    const limit = Math.max(1, Math.min(50, input.limit ?? 10));

    return Array.from(profilesByToken.values())
      .flatMap((profile) => {
        const stats = profile.stats[input.gameId];
        if (!stats || stats.gamesPlayed === 0) {
          return [];
        }
        return [
          {
            playerId: profile.id,
            displayName: profile.displayName,
            avatar: { ...profile.avatar },
            score: stats.totalScore,
            gamesPlayed: stats.gamesPlayed
          }
        ];
      })
      .sort((left, right) => right.score - left.score || left.displayName.localeCompare(right.displayName))
      .slice(0, limit);
  }

  return {
    ensureProfile,
    getProfile,
    getStats,
    updateProfile,
    recordGameResult,
    listHighScores
  };
}
