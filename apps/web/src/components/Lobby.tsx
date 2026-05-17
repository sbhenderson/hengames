import type { SeatId } from "@hengames/shared";
import { trpc, type RoomSnapshot } from "../api/trpc";

const seats: SeatId[] = ["north", "east", "south", "west"];

export function Lobby(props: {
  room: RoomSnapshot;
  participantToken: string;
  onBack(): void;
}) {
  const chooseSeat = trpc.chooseSeat.useMutation();
  const setReady = trpc.setReady.useMutation();
  const resetLobby = trpc.resetLobby.useMutation();
  const kickParticipant = trpc.kickParticipant.useMutation();
  const startGame = trpc.startGame.useMutation();

  const participant = props.room.participants.find((candidate) => candidate.id === props.room.currentParticipantId);
  const ownSeat = props.room.seats.find((seat) => seat.participantId === participant?.id);
  const isHost = participant?.id === props.room.hostParticipantId;

  return (
    <main className="page">
      <button className="link-button" onClick={props.onBack}>Back to rooms</button>
      <section className="panel">
        <h1>Room {props.room.code}</h1>
        <p>{props.room.status === "waiting" ? "Choose a seat and ready up." : "Game in progress."}</p>
        <div className="seat-grid">
          {seats.map((seatId) => {
            const seat = props.room.seats.find((candidate) => candidate.id === seatId);
            const occupant = props.room.participants.find((candidate) => candidate.id === seat?.participantId);
            return (
              <article className="seat-card" key={seatId}>
                <strong>{seatId}</strong>
                <span>Team {seat?.teamId}</span>
                <span>{occupant?.displayName ?? "Open"}</span>
                <span>{seat?.ready ? "Ready" : "Not ready"}</span>
                {!seat?.participantId ? (
                  <button onClick={() => chooseSeat.mutate({ code: props.room.code, participantToken: props.participantToken, seatId })}>
                    Sit here
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
        {ownSeat ? (
          <button onClick={() => setReady.mutate({ code: props.room.code, participantToken: props.participantToken, ready: !ownSeat.ready })}>
            {ownSeat.ready ? "Unready" : "Ready"}
          </button>
        ) : (
          <p>You are spectating until you choose an open seat.</p>
        )}
        {isHost ? (
          <button onClick={() => startGame.mutate({ code: props.room.code, participantToken: props.participantToken })}>Start game</button>
        ) : null}
      </section>
      {isHost ? (
        <section className="panel">
          <h2>Host controls</h2>
          <button onClick={() => resetLobby.mutate({ code: props.room.code, participantToken: props.participantToken })}>
            Reset lobby seats
          </button>
          <div className="room-list">
            {props.room.participants
              .filter((candidate) => candidate.id !== props.room.hostParticipantId)
              .map((candidate) => (
                <article className="room-card" key={candidate.id}>
                  <span>{candidate.displayName}</span>
                  <button
                    onClick={() =>
                      kickParticipant.mutate({
                        code: props.room.code,
                        participantToken: props.participantToken,
                        targetParticipantId: candidate.id
                      })
                    }
                  >
                    Kick
                  </button>
                </article>
              ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
