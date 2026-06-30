import type { Card } from "@hengames/shared";
import type { RoomSnapshot } from "../api/trpc";

let seq = 0;
function card(rank: Card["rank"], suit: Card["suit"], deckIndex = 0): Card {
  return { id: `c${seq++}`, rank, suit, deckIndex } as Card;
}

const hand: Card[] = [
  card("7", "hearts"),
  card("7", "spades"),
  card("7", "clubs"),
  card("2", "diamonds"),
  card("JOKER", "joker"),
  card("K", "hearts"),
  card("A", "spades"),
  card("9", "diamonds"),
  card("4", "clubs"),
  card("4", "hearts"),
  card("Q", "spades"),
  card("10", "diamonds"),
  card("3", "hearts")
];

export function previewRoomSnapshot(): RoomSnapshot {
  const snapshot = {
    code: "HENS",
    gameId: "hand-and-foot",
    status: "playing",
    phase: "in-progress",
    hostParticipantId: "p1",
    options: { deckCount: 6 },
    currentParticipantId: "p1",
    gameInstanceId: "preview-1",
    participants: [
      { id: "p1", displayName: "peeking-penguin", avatar: { emoji: "🐧", color: "#38bdf8" }, connected: true },
      { id: "p2", displayName: "lively-lion", avatar: { emoji: "🦁", color: "#fb923c" }, connected: true },
      { id: "p3", displayName: "wily-fox", avatar: { emoji: "🦊", color: "#f97316" }, connected: true },
      { id: "p4", displayName: "tidy-turtle", avatar: { emoji: "🐢", color: "#22c55e" }, connected: true }
    ],
    seats: [],
    spectatorIds: [],
    currentView: {
      phase: "playing",
      round: 2,
      currentPlayerId: "p1",
      turnStep: "must-discard",
      players: {
        p1: { id: "p1", teamId: "red", activePile: "hand", hand },
        p2: { id: "p2", teamId: "blue", activePile: "hand", handCount: 11 },
        p3: { id: "p3", teamId: "red", activePile: "foot", footCount: 9 },
        p4: { id: "p4", teamId: "blue", activePile: "hand", handCount: 13 }
      },
      topDiscard: card("8", "hearts"),
      discardCount: 14,
      drawCount: 213,
      melds: [
        {
          id: "m1",
          rank: "K",
          teamId: "red",
          cards: [card("K", "spades"), card("K", "diamonds"), card("K", "clubs"), card("K", "hearts"), card("K", "spades"), card("K", "diamonds"), card("K", "clubs")],
          isBook: true,
          isClean: true
        },
        {
          id: "m2",
          rank: "9",
          teamId: "red",
          cards: [card("9", "hearts"), card("9", "spades"), card("2", "clubs"), card("9", "diamonds")],
          isBook: false,
          isClean: false
        },
        {
          id: "m3",
          rank: "5",
          teamId: "blue",
          cards: [card("5", "hearts"), card("5", "spades"), card("5", "clubs"), card("JOKER", "joker"), card("5", "diamonds"), card("5", "hearts"), card("5", "spades")],
          isBook: true,
          isClean: false
        }
      ],
      teamScores: { red: 1340, blue: 980 },
      roundScores: [{ red: 540, blue: 410 }],
      lastEvent: "lively-lion melded three 6s",
      lastEventSeq: 42
    }
  };

  return snapshot as unknown as RoomSnapshot;
}
