import type { Card } from "@hengames/shared";
import { trpc, type RoomSnapshot } from "../api/trpc";

type HandAndFootTableView = {
  round: number;
  currentPlayerId: string;
  turnStep: "must-draw" | "may-meld" | "must-discard";
  players: Record<string, { hand?: Card[]; handCount?: number; footCount?: number; teamId: "red" | "blue"; activePile: "hand" | "foot" }>;
  topDiscard: Card | null;
  discardCount: number;
  drawCount: number;
  melds: Array<{ id: string; rank: string; teamId: "red" | "blue"; cards: Card[]; isBook: boolean; isClean: boolean }>;
  teamScores: Record<"red" | "blue", number>;
  lastEvent: string;
};

const suitEmoji: Record<Card["suit"], string> = {
  clubs: "♣️",
  diamonds: "♦️",
  hearts: "♥️",
  spades: "♠️",
  joker: "🤡"
};

const avatarChoices = [
  { emoji: "🦊", color: "#f97316" },
  { emoji: "🐧", color: "#38bdf8" },
  { emoji: "🦉", color: "#a78bfa" },
  { emoji: "🐢", color: "#22c55e" }
];

export function GameTable(props: {
  room: RoomSnapshot;
  participantToken: string;
  onBack(): void;
}) {
  const action = trpc.gameAction.useMutation();
  const updateAvatar = trpc.updateAvatar.useMutation();
  const view = props.room.currentView as HandAndFootTableView | null;

  const currentParticipantId = props.room.currentParticipantId;
  const ownPlayer = currentParticipantId ? view?.players[currentParticipantId] : undefined;
  const participant = props.room.participants.find((candidate) => candidate.id === currentParticipantId);

  return (
    <main className="page">
      <button className="link-button" onClick={props.onBack}>Back to rooms</button>
      <section className="panel">
        <h1>Room {props.room.code}</h1>
        {view ? (
          <>
            <p>{view.lastEvent}</p>
            <div className="status-grid">
              <article className="status-card">
                <strong>Round {view.round}</strong>
                <span>{turnStepLabel(view.turnStep)}</span>
              </article>
              <article className="status-card">
                <strong>Current turn</strong>
                <span>{displayName(view.currentPlayerId, props.room)}</span>
              </article>
              <article className="status-card">
                <strong>Scores</strong>
                <span>Red {view.teamScores.red} | Blue {view.teamScores.blue}</span>
              </article>
              <article className="status-card">
                <strong>Piles</strong>
                <span>Draw {view.drawCount} | Discard {view.discardCount}</span>
              </article>
            </div>
            {participant ? (
              <div className="profile-card">
                <span className="avatar" style={{ background: participant.avatar.color }}>{participant.avatar.emoji}</span>
                <div>
                  <strong>You are {participant.displayName}</strong>
                  <p className="helper-text">
                    Team {ownPlayer?.teamId}; currently playing from your {ownPlayer?.activePile ?? "hand"}.
                  </p>
                  <div className="avatar-picker" aria-label="Choose avatar">
                    {avatarChoices.map((avatar) => (
                      <button
                        aria-label={`Use ${avatar.emoji} avatar`}
                        className="avatar-choice"
                        key={`${avatar.emoji}-${avatar.color}`}
                        onClick={() =>
                          updateAvatar.mutate({
                            code: props.room.code,
                            participantToken: props.participantToken,
                            avatar
                          })
                        }
                        style={{ background: avatar.color }}
                      >
                        {avatar.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
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
                        {formatCardRank(card)}
                        <small>{suitEmoji[card.suit]}</small>
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
                <p>Top discard: {view.topDiscard ? formatCard(view.topDiscard) : "None"}</p>
                <p>Draw pile: {view.drawCount}</p>
                <div className="room-list">
                  {Object.entries(view.players).map(([playerId, player]) => (
                    <article className="room-card compact" key={playerId}>
                      <strong>{displayName(playerId, props.room)}</strong>
                      <span>Team {player.teamId}</span>
                      <span>{player.activePile}: {player.hand?.length ?? player.handCount ?? 0} cards</span>
                      {player.footCount !== undefined ? <span>Foot: {player.footCount} cards</span> : null}
                    </article>
                  ))}
                </div>
              </article>
            </div>
            <section className="panel">
              <h2>Table books</h2>
              {(["red", "blue"] as const).map((teamId) => (
                <div className="team-books" key={teamId}>
                  <h3>Team {teamId}</h3>
                  <div className="room-list">
                    {teamMelds(view, teamId).map((meld) => (
                      <article className="room-card" key={meld.id}>
                        <strong>{meld.rank}</strong>
                        <span>{meld.cards.length} cards</span>
                        <span className={bookClassName(meld)}>
                          {bookLabel(meld)}
                        </span>
                      </article>
                    ))}
                    {teamMelds(view, teamId).length === 0 ? <p>No melds or books yet.</p> : null}
                  </div>
                </div>
              ))}
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

function turnStepLabel(turnStep: HandAndFootTableView["turnStep"]): string {
  if (turnStep === "must-draw") {
    return "Draw 2 to start the turn";
  }
  if (turnStep === "must-discard") {
    return "Discard one card";
  }
  return "Meld cards";
}

function formatCardRank(card: Card): string {
  return card.rank === "JOKER" ? "🤡" : card.rank;
}

function formatCard(card: Card): string {
  return card.rank === "JOKER" ? "🤡 Joker" : `${card.rank} ${suitEmoji[card.suit]}`;
}

function teamMelds(view: HandAndFootTableView, teamId: "red" | "blue") {
  return view.melds.filter((meld) => meld.teamId === teamId);
}

function bookLabel(meld: HandAndFootTableView["melds"][number]): string {
  const hasWilds = meld.cards.some((card) => card.rank === "2" || card.rank === "JOKER");
  if (meld.isBook) {
    return hasWilds ? "Black dirty book" : "Red clean book";
  }
  return hasWilds ? "Building black book" : "Building red book";
}

function bookClassName(meld: HandAndFootTableView["melds"][number]): string {
  const hasWilds = meld.cards.some((card) => card.rank === "2" || card.rank === "JOKER");
  return hasWilds ? "book-badge dirty-book" : "book-badge clean-book";
}
