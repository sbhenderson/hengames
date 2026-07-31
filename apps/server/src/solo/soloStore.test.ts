import { beforeEach, describe, expect, test } from "vitest";
import type { PyramidsPlayerView } from "@hengames/game-engine";
import type { SoloSessionSnapshot } from "@hengames/shared";
import { createProfileStore } from "../profiles/profileStore.js";
import { createSoloStore } from "./soloStore.js";

function view(session: SoloSessionSnapshot): PyramidsPlayerView {
  return session.view as PyramidsPlayerView;
}

describe("soloStore", () => {
  let profileStore: ReturnType<typeof createProfileStore>;
  let store: ReturnType<typeof createSoloStore>;
  let profileToken: string;

  beforeEach(() => {
    profileStore = createProfileStore();
    store = createSoloStore({ profileStore });
    profileToken = profileStore.ensureProfile({ displayName: "henrietta" }).token;
  });

  /** Plays greedily until the game ends so the test never depends on the shuffle. */
  function playToCompletion(session: SoloSessionSnapshot): SoloSessionSnapshot {
    let current = session;
    for (let guard = 0; guard < 200 && current.status === "playing"; guard += 1) {
      const current_view = view(current);
      const cardId = current_view.playableCardIds[0];
      current = store.applyAction({
        sessionId: current.sessionId,
        profileToken,
        action: cardId ? { type: "play", cardId } : { type: "draw" }
      });
    }
    return current;
  }

  test("starts a pyramids session with a hidden pyramid", () => {
    const session = store.startGame({ gameId: "pyramids", profileToken, seed: "seed-1" });

    expect(session.sessionId).toBeTruthy();
    expect(session.gameId).toBe("pyramids");
    expect(session.status).toBe("playing");
    expect(session.score).toBe(0);
    expect(session.highScore).toBe(0);

    const snapshotView = view(session);
    expect(snapshotView.rows).toHaveLength(7);
    expect(snapshotView.drawCount).toBe(23);
    expect(snapshotView.cardsRemaining).toBe(28);
    expect(snapshotView.rows.flat().filter((slot) => slot.state === "face-up")).toHaveLength(7);
    expect(JSON.stringify(snapshotView.rows[0])).not.toContain("rank");
  });

  test("rejects starting a multiplayer game as a solo session", () => {
    expect(() => store.startGame({ gameId: "hand-and-foot", profileToken })).toThrow(/not a solo game/);
  });

  test("creates a profile on demand when starting a game", () => {
    const session = store.startGame({ gameId: "pyramids", profileToken: "fresh-token", seed: "s" });
    expect(session.status).toBe("playing");
    expect(profileStore.getProfile("fresh-token")).toBeTruthy();
  });

  test("applies a draw and resets the streak", () => {
    const started = store.startGame({ gameId: "pyramids", profileToken, seed: "seed-2" });
    const drawn = store.applyAction({ sessionId: started.sessionId, profileToken, action: { type: "draw" } });

    expect(view(drawn).drawCount).toBe(22);
    expect(view(drawn).consecutivePlays).toBe(0);
  });

  test("rejects an illegal play", () => {
    const started = store.startGame({ gameId: "pyramids", profileToken, seed: "seed-3" });

    expect(() =>
      store.applyAction({ sessionId: started.sessionId, profileToken, action: { type: "play", cardId: "bogus" } })
    ).toThrow(/can't be played right now/);
  });

  test("refuses to collect through applyAction so points are never lost", () => {
    const finished = playToCompletion(store.startGame({ gameId: "pyramids", profileToken, seed: "seed-5" }));

    expect(() =>
      store.applyAction({ sessionId: finished.sessionId, profileToken, action: { type: "collect" } })
    ).toThrow(/Use collect to bank your points/);

    // The session is untouched, so the legitimate path still awards the score.
    const collected = store.collect({ sessionId: finished.sessionId, profileToken });
    expect(collected.awarded).toBe(finished.score);
    expect(profileStore.getProfile(profileToken).stats.pyramids?.totalScore).toBe(finished.score);
  });

  test("hides sessions belonging to another player", () => {
    const started = store.startGame({ gameId: "pyramids", profileToken, seed: "seed-4" });
    const other = profileStore.ensureProfile({}).token;

    expect(() => store.getSession({ sessionId: started.sessionId, profileToken: other })).toThrow(
      /belongs to another player/
    );
    expect(() => store.getSession({ sessionId: "missing", profileToken })).toThrow(/no longer available/);
  });

  test("collecting banks the score into the running high score", () => {
    const finished = playToCompletion(store.startGame({ gameId: "pyramids", profileToken, seed: "seed-5" }));

    expect(finished.status).toBe("game-over");
    expect(view(finished).canCollect).toBe(true);

    const collected = store.collect({ sessionId: finished.sessionId, profileToken });

    expect(collected.awarded).toBe(finished.score);
    expect(collected.session.status).toBe("collected");
    expect(collected.session.highScore).toBe(finished.score);
    expect(collected.stats.gamesPlayed).toBe(1);
    expect(profileStore.getProfile(profileToken).stats.pyramids?.totalScore).toBe(finished.score);
  });

  test("a second game adds to the running total", () => {
    const first = playToCompletion(store.startGame({ gameId: "pyramids", profileToken, seed: "seed-6" }));
    const firstResult = store.collect({ sessionId: first.sessionId, profileToken });

    const second = playToCompletion(store.startGame({ gameId: "pyramids", profileToken, seed: "seed-7" }));
    expect(second.highScore).toBe(firstResult.awarded);

    const secondResult = store.collect({ sessionId: second.sessionId, profileToken });
    expect(secondResult.session.highScore).toBe(firstResult.awarded + secondResult.awarded);
  });

  test("refuses to collect twice or before the game is over", () => {
    const started = store.startGame({ gameId: "pyramids", profileToken, seed: "seed-8" });
    expect(() => store.collect({ sessionId: started.sessionId, profileToken })).toThrow(/only collect points/);

    const finished = playToCompletion(started);
    store.collect({ sessionId: finished.sessionId, profileToken });

    expect(() => store.collect({ sessionId: finished.sessionId, profileToken })).toThrow(/already been collected/);
    expect(profileStore.getProfile(profileToken).stats.pyramids?.gamesPlayed).toBe(1);
  });

  test("reveals the pyramid once the game is over", () => {
    const finished = playToCompletion(store.startGame({ gameId: "pyramids", profileToken, seed: "seed-9" }));

    expect(view(finished).rows.flat().every((slot) => slot.state !== "face-down")).toBe(true);
  });

  test("closes idle sessions", () => {
    const started = store.startGame({ gameId: "pyramids", profileToken, seed: "seed-10" });

    expect(store.closeInactiveSessions({ inactiveMs: 60_000 })).toEqual([]);
    expect(store.closeInactiveSessions({ inactiveMs: 0 })).toEqual([started.sessionId]);
    expect(() => store.getSession({ sessionId: started.sessionId, profileToken })).toThrow(/no longer available/);
  });
});
