import { beforeEach, describe, expect, test } from "vitest";
import { createProfileStore } from "./profileStore.js";

describe("profileStore", () => {
  let store: ReturnType<typeof createProfileStore>;

  beforeEach(() => {
    store = createProfileStore();
  });

  test("creates a profile with a generated name and avatar", () => {
    const profile = store.ensureProfile({});

    expect(profile.token).toBeTruthy();
    expect(profile.id).toBeTruthy();
    expect(profile.displayName).toMatch(/^[a-z]+-[a-z]+$/);
    expect(profile.avatar.emoji).toBeTruthy();
    expect(profile.avatar.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(profile.stats).toEqual({});
  });

  test("honours a supplied name and avatar", () => {
    const profile = store.ensureProfile({
      displayName: "  Henrietta  ",
      avatar: { emoji: "🐔", color: "#ff0000" }
    });

    expect(profile.displayName).toBe("Henrietta");
    expect(profile.avatar).toEqual({ emoji: "🐔", color: "#ff0000" });
  });

  test("returns the same profile for a known token", () => {
    const first = store.ensureProfile({});
    const second = store.ensureProfile({ token: first.token });

    expect(second.id).toBe(first.id);
    expect(second.displayName).toBe(first.displayName);
  });

  test("adopts an unrecognised token so clients survive a restart", () => {
    const profile = store.ensureProfile({ token: "client-held-token" });

    expect(profile.token).toBe("client-held-token");
    expect(store.getProfile("client-held-token").id).toBe(profile.id);
  });

  test("rejects an invalid avatar", () => {
    expect(() => store.ensureProfile({ avatar: { emoji: "🐔", color: "red" } })).toThrow(/hex color/);
  });

  test("throws for an unknown profile token", () => {
    expect(() => store.getProfile("nope")).toThrow(/Unknown player profile/);
  });

  test("updates name and avatar", () => {
    const profile = store.ensureProfile({});
    const updated = store.updateProfile({
      token: profile.token,
      displayName: "Cluck Norris",
      avatar: { emoji: "🥚", color: "#00ff00" }
    });

    expect(updated.displayName).toBe("Cluck Norris");
    expect(updated.avatar.emoji).toBe("🥚");
  });

  test("ignores a blank display name on update", () => {
    const profile = store.ensureProfile({ displayName: "Henrietta" });
    const updated = store.updateProfile({ token: profile.token, displayName: "   " });

    expect(updated.displayName).toBe("Henrietta");
  });

  test("accumulates a running total across games", () => {
    const profile = store.ensureProfile({});

    store.recordGameResult({ token: profile.token, gameId: "pyramids", score: 120 });
    const stats = store.recordGameResult({ token: profile.token, gameId: "pyramids", score: 80, perfect: true });

    expect(stats).toEqual({
      gamesPlayed: 2,
      totalScore: 200,
      bestScore: 120,
      lastScore: 80,
      perfectGames: 1
    });
    expect(store.getProfile(profile.token).stats.pyramids?.totalScore).toBe(200);
  });

  test("returns empty stats for a game that has never been played", () => {
    const profile = store.ensureProfile({});

    expect(store.getStats(profile.token, "pyramids")).toEqual({
      gamesPlayed: 0,
      totalScore: 0,
      bestScore: 0,
      lastScore: 0,
      perfectGames: 0
    });
  });

  test("does not leak internal state through snapshots", () => {
    const profile = store.ensureProfile({});
    store.recordGameResult({ token: profile.token, gameId: "pyramids", score: 50 });

    const snapshot = store.getProfile(profile.token);
    snapshot.stats.pyramids!.totalScore = 9999;

    expect(store.getProfile(profile.token).stats.pyramids?.totalScore).toBe(50);
  });

  test("ranks high scores by running total and skips unplayed games", () => {
    const alice = store.ensureProfile({ displayName: "alice" });
    const bob = store.ensureProfile({ displayName: "bob" });
    store.ensureProfile({ displayName: "never-played" });

    store.recordGameResult({ token: alice.token, gameId: "pyramids", score: 100 });
    store.recordGameResult({ token: bob.token, gameId: "pyramids", score: 300 });

    const scores = store.listHighScores({ gameId: "pyramids" });

    expect(scores).toHaveLength(2);
    expect(scores[0]?.displayName).toBe("bob");
    expect(scores[0]?.score).toBe(300);
    expect(scores[1]?.displayName).toBe("alice");
  });

  test("caps the high score list", () => {
    for (let index = 0; index < 5; index += 1) {
      const profile = store.ensureProfile({ displayName: `player-${index}` });
      store.recordGameResult({ token: profile.token, gameId: "pyramids", score: index });
    }

    expect(store.listHighScores({ gameId: "pyramids", limit: 2 })).toHaveLength(2);
  });
});
