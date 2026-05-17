import type { Card } from "@hengames/shared";
import { trpc, type RoomSnapshot } from "../api/trpc";

type HandAndFootTableView = {
  currentPlayerId: string;
  turnStep: "must-draw" | "may-meld" | "must-discard";
  players: Record<string, { hand?: Card[]; handCount?: number; footCount?: number; teamId: "red" | "blue"; activePile: "hand" | "foot" }>;
  topDiscard: Card | null;
  drawCount: number;
  melds: Array<{ id: string; rank: string; teamId: "red" | "blue"; cards: Card[]; isBook: boolean; isClean: boolean }>;
  teamScores: Record<"red" | "blue", number>;
  lastEvent: string;
};

export function GameTable(props: {
  room: RoomSnapshot;
  participantToken: string;
  onBack(): void;
}) {
  const action = trpc.gameAction.useMutation();
  const view = props.room.currentView as HandAndFootTableView | null;

  const currentParticipantId = props.room.currentParticipantId;
  const ownPlayer = currentParticipantId ? view?.players[currentParticipantId] : undefined;

  return (
    <main className="page">
      <button className="link-button" onClick={props.onBack}>Back to rooms</button>
      <section className="panel">
        <h1>Room {props.room.code}</h1>
        {view ? (
          <>
            <p>{view.lastEvent}</p>
            <p>Current turn: {displayName(view.currentPlayerId, props.room)}</p>
            <p>Scores: Red {view.teamScores.red} | Blue {view.teamScores.blue}</p>
            <div className="table-grid">
              <article className="panel">
                <h2>Your cards</h2>
                {ownPlayer?.hand?.length ? (
                  <div className="card-grid">
                    {ownPlayer.hand.map((card) => (
                      <button
                        className="playing-card"
                        key={card.id}
                        onClick={() =>
                          view.turnStep === "must-discard"
                            ? action.mutate({ code: props.room.code, participantToken: props.participantToken, action: { type: "discard", cardId: card.id } })
                            : undefined
                        }
                      >
                        {card.rank}
                        <small>{card.suit}</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>You are spectating public state.</p>
                )}
              </article>
              <article className="panel">
                <h2>Actions</h2>
                <button
                  disabled={view.turnStep !== "must-draw"}
                  onClick={() => action.mutate({ code: props.room.code, participantToken: props.participantToken, action: { type: "draw" } })}
                >
                  Draw 2
                </button>
                <p>Top discard: {view.topDiscard ? `${view.topDiscard.rank} ${view.topDiscard.suit}` : "None"}</p>
                <p>Draw pile: {view.drawCount}</p>
              </article>
            </div>
            <section className="panel">
              <h2>Melds and books</h2>
              <div className="room-list">
                {view.melds.map((meld) => (
                  <article className="room-card" key={meld.id}>
                    <strong>{meld.rank}</strong>
                    <span>Team {meld.teamId}</span>
                    <span>{meld.cards.length} cards</span>
                    <span>{meld.isBook ? (meld.isClean ? "Clean book" : "Dirty book") : "Meld"}</span>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <p>Waiting for game state...</p>
        )}
      </section>
    </main>
  );
}

function displayName(participantId: string, room: RoomSnapshot): string {
  return room.participants.find((participant) => participant.id === participantId)?.displayName ?? participantId;
}
