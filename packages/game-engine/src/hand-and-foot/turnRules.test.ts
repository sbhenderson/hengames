import { describe, expect, it } from "vitest";
import { GameRuleError, type Card } from "@hengames/shared";
import { handAndFootDefinition } from "./index.js";
import type { HandAndFootAction, HandAndFootState, Meld } from "./types.js";
import { scoreRound } from "./scoring.js";

const rules = handAndFootDefinition.defaultRules;
type Suit = "clubs" | "diamonds" | "hearts" | "spades";
const c = (id: string, rank: Card["rank"], suit: Suit = "clubs"): Card => ({ id, rank, suit, deckIndex: 0 }) as Card;
const joker = (id: string): Card => ({ id, rank: "JOKER", suit: "joker", deckIndex: 0 });
const filler = (prefix: string, n: number): Card[] => Array.from({ length: n }, (_, i) => c(`${prefix}${i}`, "9"));

function base(): HandAndFootState {
  const state = handAndFootDefinition.createInitialState({
    seed: "turn-rules",
    playerIds: ["p1", "p2", "p3", "p4"],
    rules
  });
  state.redThrees = { red: [], blue: [] };
  state.drawPile = filler("dp", 20);
  state.discardPile = [c("d0", "5")];
  for (const p of Object.values(state.players)) {
    p.hand = filler(`${p.id}h`, 11);
    p.foot = filler(`${p.id}f`, 11);
  }
  return state;
}

function act(state: HandAndFootState, action: HandAndFootAction, playerId = "p1") {
  return handAndFootDefinition.applyAction({ state, playerId, rules, action });
}

function expectRejected(state: HandAndFootState, action: HandAndFootAction, playerId = "p1") {
  const before = structuredClone(state);
  expect(() => act(state, action, playerId)).toThrow(GameRuleError);
  expect(state).toEqual(before);
}

const meldOf = (id: string, teamId: "red" | "blue", rank: Card["rank"], cards: Card[]): Meld => {
  const isBook = cards.length >= 7;
  return { id, teamId, rank, cards, isBook, isClean: isBook && cards.every((x) => x.rank === rank) };
};
const cleanBook = (id: string, rank: Card["rank"] = "9") =>
  meldOf(id, "red", rank, Array.from({ length: 7 }, (_, i) => c(`${id}c${i}`, rank)));
const dirtyBook = (id: string, rank: Card["rank"] = "10") =>
  meldOf(id, "red", rank, [
    ...Array.from({ length: 5 }, (_, i) => c(`${id}c${i}`, rank)),
    c(`${id}w1`, "2"),
    c(`${id}w2`, "2", "diamonds")
  ]);

describe("draw with red 3s", () => {
  it("lays a drawn red 3 and replaces it", () => {
    const state = base();
    state.drawPile = [c("r1", "3", "hearts"), c("x1", "7"), c("x2", "8")];
    const next = act(state, { type: "draw" });
    expect(next.redThrees.red.map((x) => x.id)).toEqual(["r1"]);
    expect(next.players.p1!.hand).toHaveLength(13);
    expect(next.players.p1!.hand.map((x) => x.id)).toEqual(expect.arrayContaining(["x1", "x2"]));
    expect(next.turnStep).toBe("must-discard");
  });
});

describe("pickup", () => {
  function pickupState() {
    const state = base();
    state.discardPile = [...Array.from({ length: 9 }, (_, i) => c(`pile${i}`, "7")), c("topk", "K")];
    state.players.p1!.hand = [c("k1", "K"), c("k2", "K", "hearts"), c("h3", "Q"), c("h4", "Q", "hearts")];
    return state;
  }

  it("melds into an existing meld and takes 6 cards", () => {
    const state = pickupState();
    state.melds = [meldOf("m1", "red", "K", [c("mk1", "K"), c("mk2", "K"), c("mk3", "K")])];
    const next = act(state, { type: "pickup", cardIds: ["k1", "k2"] });
    const kMelds = next.melds.filter((m) => m.teamId === "red" && m.rank === "K");
    expect(kMelds).toHaveLength(1);
    expect(kMelds[0]!.cards).toHaveLength(6);
    expect(next.players.p1!.hand).toHaveLength(4 - 2 + 6);
    expect(next.discardPile).toHaveLength(3);
    expect(next.turnStep).toBe("must-discard");
  });

  it("melds into a new meld when the team has another meld", () => {
    const state = pickupState();
    state.melds = [meldOf("m1", "red", "A", [c("a1", "A"), c("a2", "A"), c("a3", "A")])];
    const next = act(state, { type: "pickup", cardIds: ["k1", "k2"] });
    const kMeld = next.melds.find((m) => m.rank === "K");
    expect(kMeld?.cards).toHaveLength(3);
    expect(next.melds).toHaveLength(2);
    expect(next.players.p1!.hand).toHaveLength(8);
  });

  it("accepts wild cards and meets the opening minimum with the whole meld", () => {
    const state = pickupState();
    state.players.p1!.hand = [c("k1", "K"), c("k2", "K", "hearts"), c("w1", "2"), c("k3", "K", "spades")];
    const next = act(state, { type: "pickup", cardIds: ["k1", "k2", "w1", "k3"] });
    expect(next.melds[0]!.cards).toHaveLength(5);
  });

  it("moves only what remains for a short pile", () => {
    const state = pickupState();
    state.discardPile = [c("s1", "7"), c("s2", "8"), c("s3", "J"), c("topk", "K")];
    state.melds = [meldOf("m1", "red", "A", [c("a1", "A"), c("a2", "A"), c("a3", "A")])];
    const next = act(state, { type: "pickup", cardIds: ["k1", "k2"] });
    expect(next.discardPile).toHaveLength(0);
    expect(next.players.p1!.hand).toHaveLength(4 - 2 + 3);
  });

  it("lays a red 3 picked up from the pile", () => {
    const state = pickupState();
    state.discardPile = [c("r1", "3", "hearts"), c("topk", "K")];
    state.melds = [meldOf("m1", "red", "A", [c("a1", "A"), c("a2", "A"), c("a3", "A")])];
    const next = act(state, { type: "pickup", cardIds: ["k1", "k2"] });
    expect(next.redThrees.red.map((x) => x.id)).toEqual(["r1"]);
    expect(next.players.p1!.hand).toHaveLength(4 - 2 + 1);
  });

  it("rejects a single natural plus a wild", () => {
    const state = base();
    state.discardPile = [c("top9", "9")];
    state.players.p1!.hand = [c("n9", "9", "hearts"), c("w", "2"), c("x", "4")];
    expectRejected(state, { type: "pickup", cardIds: ["n9", "w"] });
  });

  it("rejects other ranks in the selection", () => {
    const state = pickupState();
    expectRejected(state, { type: "pickup", cardIds: ["k1", "k2", "h3"] });
  });

  it("rejects when a black 3 is on top", () => {
    const state = base();
    state.discardPile = [c("b3", "3", "spades")];
    state.players.p1!.hand = [c("t1", "3"), c("t2", "3", "clubs"), c("x", "4")];
    expectRejected(state, { type: "pickup", cardIds: ["t1", "t2"] });
  });

  it.each([
    ["2", c("w2", "2")],
    ["joker", joker("jk")]
  ])("rejects when a wild (%s) is on top", (_name, top) => {
    const state = base();
    state.discardPile = [top];
    state.players.p1!.hand = [c("t1", "2"), c("t2", "2", "hearts"), c("x", "4")];
    expectRejected(state, { type: "pickup", cardIds: ["t1", "t2"] });
  });

  it("rejects below the opening minimum", () => {
    const state = base();
    state.discardPile = [c("s", "7"), c("top4", "4")];
    state.players.p1!.hand = [c("f1", "4", "hearts"), c("f2", "4", "spades"), c("x", "Q")];
    expectRejected(state, { type: "pickup", cardIds: ["f1", "f2"] });
  });

  it("rejects after drawing and with an empty discard pile", () => {
    const drawn = act(pickupState(), { type: "draw" });
    expectRejected(drawn, { type: "pickup", cardIds: ["k1", "k2"] });
    const empty = pickupState();
    empty.discardPile = [];
    expectRejected(empty, { type: "pickup", cardIds: ["k1", "k2"] });
  });

  it("rejects unknown and duplicate card ids", () => {
    const state = pickupState();
    state.melds = [meldOf("m1", "red", "K", [c("mk1", "K"), c("mk2", "K"), c("mk3", "K")])];
    expectRejected(state, { type: "pickup", cardIds: ["k1", "nope"] });
    expectRejected(state, { type: "pickup", cardIds: ["k1", "k1"] });
  });

  it("enters the foot when the pickup empties the hand", () => {
    const state = pickupState();
    state.discardPile = [c("topk", "K")];
    state.players.p1!.hand = [c("k1", "K"), c("k2", "K", "hearts")];
    state.melds = [meldOf("m1", "red", "K", [c("mk1", "K"), c("mk2", "K"), c("mk3", "K")])];
    const next = act(state, { type: "pickup", cardIds: ["k1", "k2"] });
    expect(next.players.p1!.activePile).toBe("foot");
  });
});

describe("threes in melds", () => {
  it("rejects a meld containing a black 3 and keeps the cards", () => {
    const state = base();
    state.turnStep = "may-meld";
    state.melds = [meldOf("m1", "red", "A", [c("a1", "A"), c("a2", "A"), c("a3", "A")])];
    state.players.p1!.hand = [c("k1", "K"), c("k2", "K", "hearts"), c("b3", "3", "spades"), c("k3", "K", "diamonds")];
    expectRejected(state, { type: "meld", cardIds: ["k1", "k2", "b3"] });
  });

  it("rejects a meld of three black 3s", () => {
    const state = base();
    state.turnStep = "may-meld";
    state.melds = [meldOf("m1", "red", "A", [c("a1", "A"), c("a2", "A"), c("a3", "A")])];
    state.players.p1!.hand = [c("a", "3", "clubs"), c("b", "3", "spades"), c("d", "3", "clubs"), c("x", "4")];
    expectRejected(state, { type: "meld", cardIds: ["a", "b", "d"] });
  });

  it("rejects adding a 3 to a meld", () => {
    const state = base();
    state.turnStep = "may-meld";
    state.melds = [meldOf("m1", "red", "K", [c("mk1", "K"), c("mk2", "K"), c("mk3", "K")])];
    state.players.p1!.hand = [c("b3", "3", "spades"), c("x", "4")];
    expectRejected(state, { type: "meld", cardIds: ["b3"], targetMeldId: "m1" });
  });

  it("allows discarding a black 3", () => {
    const state = base();
    state.turnStep = "must-discard";
    state.players.p1!.hand = [c("b3", "3", "clubs"), c("x", "4")];
    const next = act(state, { type: "discard", cardId: "b3" });
    expect(next.discardPile.at(-1)?.id).toBe("b3");
  });
});

describe("discarding into and out of the foot", () => {
  it("enters the foot when the last hand card is discarded", () => {
    const state = base();
    state.turnStep = "must-discard";
    state.players.p1!.hand = [c("x", "4")];
    const next = act(state, { type: "discard", cardId: "x" });
    expect(next.players.p1!.activePile).toBe("foot");
    expect(next.players.p1!.hand).toHaveLength(0);
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.turnStep).toBe("must-draw");
  });

  it("lays and replaces a red 3 in the foot being entered", () => {
    const state = base();
    state.turnStep = "must-discard";
    state.players.p1!.hand = [c("x", "4")];
    state.players.p1!.foot = [c("r1", "3", "diamonds"), c("f1", "6"), c("f2", "7")];
    state.drawPile = [c("rep", "J"), ...filler("dq", 5)];
    const next = act(state, { type: "discard", cardId: "x" });
    expect(next.redThrees.red.map((x) => x.id)).toEqual(["r1"]);
    expect(next.players.p1!.foot.map((x) => x.id)).toEqual(["f1", "f2", "rep"]);
  });

  it("goes out by discarding the last foot card with both books", () => {
    const state = base();
    state.turnStep = "must-discard";
    state.melds = [cleanBook("clean"), dirtyBook("dirty")];
    state.players.p1!.hand = [];
    state.players.p1!.activePile = "foot";
    state.players.p1!.foot = [c("last", "4")];
    const next = act(state, { type: "discard", cardId: "last" });
    expect(next.phase).not.toBe("playing");
    expect(next.lastEvent).toContain("went out");
  });

  it("rejects discarding the last foot card without books", () => {
    const state = base();
    state.turnStep = "must-discard";
    state.players.p1!.hand = [];
    state.players.p1!.activePile = "foot";
    state.players.p1!.foot = [c("last", "4")];
    expectRejected(state, { type: "discard", cardId: "last" });
  });
});

describe("foot meld floor", () => {
  function footState(withBooks: boolean) {
    const state = base();
    state.turnStep = "may-meld";
    state.melds = withBooks
      ? [cleanBook("clean"), dirtyBook("dirty")]
      : [meldOf("m1", "red", "A", [c("a1", "A"), c("a2", "A"), c("a3", "A")])];
    const p1 = state.players.p1!;
    p1.hand = [];
    p1.activePile = "foot";
    p1.foot = [c("f1", "8"), c("f2", "8", "hearts"), c("f3", "8", "spades"), c("f4", "5")];
    return state;
  }

  it("rejects melding 3 of 4 foot cards without books", () => {
    expectRejected(footState(false), { type: "meld", cardIds: ["f1", "f2", "f3"] });
  });

  it("allows leaving one card when the team has the books", () => {
    const next = act(footState(true), { type: "meld", cardIds: ["f1", "f2", "f3"] });
    expect(next.players.p1!.foot.map((x) => x.id)).toEqual(["f4"]);
  });

  it("allows leaving two cards without books", () => {
    const state = footState(false);
    state.players.p1!.foot.push(c("f5", "6"));
    const next = act(state, { type: "meld", cardIds: ["f1", "f2", "f3"] });
    expect(next.players.p1!.foot).toHaveLength(2);
  });
});

describe("draw pile exhaustion", () => {
  function discardState(stock: number) {
    const state = base();
    state.turnStep = "must-discard";
    state.drawPile = filler("dp", stock);
    return state;
  }

  it("ends the round when 1 card is left after a discard", () => {
    const next = act(discardState(1), { type: "discard", cardId: "p1h0" });
    expect(next.phase === "round-over" || next.phase === "game-over").toBe(true);
    expect(next.roundScores).toHaveLength(1);
    expect(next.teamScores.red).toBe(next.roundScores[0]!.red);
  });

  it("continues when 2 cards are left", () => {
    const next = act(discardState(2), { type: "discard", cardId: "p1h0" });
    expect(next.phase).toBe("playing");
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.turnStep).toBe("must-draw");
  });
});

describe("scoring with 3s", () => {
  function empty(): HandAndFootState {
    const state = base();
    for (const p of Object.values(state.players)) {
      p.hand = [];
      p.foot = [];
    }
    return state;
  }

  it("scores a clean book of seven Ks as 570", () => {
    const state = empty();
    state.melds = [meldOf("m", "red", "K", Array.from({ length: 7 }, (_, i) => c(`k${i}`, "K")))];
    expect(scoreRound(state, rules).red).toBe(570);
  });

  it("scores +100 per laid red 3", () => {
    const state = empty();
    state.redThrees.red = [c("r1", "3", "hearts"), c("r2", "3", "diamonds")];
    expect(scoreRound(state, rules).red).toBe(200);
  });

  it("scores -500 for a red 3 left in an unplayed foot", () => {
    const state = empty();
    state.players.p1!.foot = [c("r1", "3", "hearts")];
    expect(scoreRound(state, rules).red).toBe(-500);
  });

  it("scores -5 for a black 3 left in hand", () => {
    const state = empty();
    state.players.p3!.hand = [c("b3", "3", "spades")];
    expect(scoreRound(state, rules).red).toBe(-5);
  });
});
