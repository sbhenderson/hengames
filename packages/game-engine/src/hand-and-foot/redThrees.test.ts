import { describe, expect, it } from "vitest";
import type { Card } from "@hengames/shared";
import { settleRedThrees } from "./redThrees.js";
import { handAndFootDefinition } from "./index.js";

const card = (id: string, rank: Card["rank"], suit: "clubs" | "diamonds" | "hearts" | "spades"): Card =>
  ({ id, rank, suit, deckIndex: 0 }) as Card;

function fresh() {
  const state = handAndFootDefinition.createInitialState({
    seed: "red-threes",
    playerIds: ["p1", "p2", "p3", "p4"],
    rules: handAndFootDefinition.defaultRules
  });
  state.redThrees = { red: [], blue: [] };
  return state;
}

describe("settleRedThrees", () => {
  it("lays a single red 3 and draws one replacement", () => {
    const state = fresh();
    const p1 = state.players.p1!;
    p1.hand = [card("a", "K", "clubs"), card("r1", "3", "hearts")];
    state.drawPile = [card("n1", "9", "clubs"), card("n2", "9", "spades")];

    settleRedThrees(state, p1);

    expect(state.redThrees.red.map((c) => c.id)).toEqual(["r1"]);
    expect(p1.hand.map((c) => c.id)).toEqual(["a", "n1"]);
    expect(state.drawPile).toHaveLength(1);
  });

  it("chains replacements that are also red 3s", () => {
    const state = fresh();
    const p2 = state.players.p2!;
    p2.hand = [card("r1", "3", "diamonds")];
    state.drawPile = [card("r2", "3", "hearts"), card("n1", "9", "clubs")];

    settleRedThrees(state, p2);

    expect(state.redThrees.blue.map((c) => c.id)).toEqual(["r1", "r2"]);
    expect(p2.hand.map((c) => c.id)).toEqual(["n1"]);
  });

  it("gives no replacement when the stock is empty", () => {
    const state = fresh();
    const p1 = state.players.p1!;
    p1.hand = [card("a", "K", "clubs"), card("r1", "3", "hearts")];
    state.drawPile = [];

    settleRedThrees(state, p1);

    expect(state.redThrees.red).toHaveLength(1);
    expect(p1.hand.map((c) => c.id)).toEqual(["a"]);
  });

  it("leaves black 3s alone and settles the foot when it is active", () => {
    const state = fresh();
    const p1 = state.players.p1!;
    p1.activePile = "foot";
    p1.foot = [card("b", "3", "spades"), card("r1", "3", "hearts")];
    state.drawPile = [card("n1", "9", "clubs")];

    settleRedThrees(state, p1);

    expect(p1.foot.map((c) => c.id)).toEqual(["b", "n1"]);
    expect(state.redThrees.red).toHaveLength(1);
  });
});
