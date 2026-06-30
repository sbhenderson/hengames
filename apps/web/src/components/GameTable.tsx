import { useEffect, useMemo, useRef, useState } from "react";
import type { ParticipantAvatar } from "@hengames/shared";
import { trpc, type RoomSnapshot } from "../api/trpc";
import { useFeedback } from "../feedback/feedback";
import { GameHud } from "./game-table/GameHud";
import { HandTray } from "./game-table/HandTray";
import { PlayerStrip, type PlayerStripParticipant } from "./game-table/PlayerStrip";
import { TableSurface } from "./game-table/TableSurface";
import type { GameNotification } from "./game-table/NotificationsMenu";
import { turnActionPrompt } from "./game-table/gameTableHelpers";
import type { HandAndFootTableView } from "./game-table/types";

export function GameTable(props: {
  room: RoomSnapshot;
  participantToken: string;
  notifications: GameNotification[];
  onBack(): void;
}) {
  const action = trpc.gameAction.useMutation();
  const updateAvatar = trpc.updateAvatar.useMutation();
  const { fire } = useFeedback();
  const [actionError, setActionError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const view = props.room.currentView as HandAndFootTableView | null;

  useEffect(() => {
    setActionError(null);
    setAvatarError(null);
  }, [props.participantToken, props.room.code, props.room.gameId, view?.currentPlayerId, view?.turnStep]);

  const currentParticipantId = props.room.currentParticipantId;
  const ownPlayer = currentParticipantId && view ? view.players[currentParticipantId] : undefined;
  const visibleCards = ownPlayer?.activePile === "foot" ? ownPlayer.foot : ownPlayer?.hand;
  const participant = props.room.participants.find((candidate) => candidate.id === currentParticipantId);

  const wasOwnTurnRef = useRef(false);
  useEffect(() => {
    const ownTurn = Boolean(view && view.currentPlayerId === currentParticipantId);
    if (ownTurn && !wasOwnTurnRef.current) {
      fire("turn");
    }
    wasOwnTurnRef.current = ownTurn;
  }, [view, currentParticipantId, fire]);

  const participants = useMemo(
    () =>
      props.room.participants.reduce<Record<string, PlayerStripParticipant>>((result, candidate) => {
        result[candidate.id] = {
          displayName: candidate.displayName,
          avatar: candidate.avatar
        };
        return result;
      }, {}),
    [props.room.participants]
  );

  if (!view) {
    return (
      <main className="page game-page">
        <button className="link-button" onClick={props.onBack} type="button">Back to rooms</button>
        <section className="panel">
          <p>Waiting for game state...</p>
        </section>
      </main>
    );
  }

  const currentPlayerName = displayName(view.currentPlayerId, props.room);
  const isOwnTurn = view.currentPlayerId === currentParticipantId;

  type GameActionInput = Parameters<typeof action.mutate>[0];
  const runAction = (gameAction: GameActionInput["action"]) => {
    setActionError(null);
    action.mutate(
      { code: props.room.code, participantToken: props.participantToken, action: gameAction },
      {
        onError(error) {
          setActionError(error.message);
        },
        onSuccess() {
          setActionError(null);
        }
      }
    );
  };

  const updateParticipantAvatar = (avatar: ParticipantAvatar) => {
    setAvatarError(null);
    updateAvatar.mutate(
      {
        code: props.room.code,
        participantToken: props.participantToken,
        avatar
      },
      {
        onError(error) {
          setAvatarError(error.message);
        },
        onSuccess() {
          setAvatarError(null);
        }
      }
    );
  };

  return (
    <main className="page game-page">
      <GameHud
        actionPrompt={turnActionPrompt({ isOwnTurn, currentPlayerName, turnStep: view.turnStep })}
        activePile={ownPlayer?.activePile}
        avatarDisabled={updateAvatar.isPending}
        avatarError={avatarError}
        currentPlayerName={currentPlayerName}
        isOwnTurn={isOwnTurn}
        notifications={props.notifications}
        onAvatarChange={updateParticipantAvatar}
        onBack={props.onBack}
        participant={participant}
        playerTeam={ownPlayer?.teamId}
        roomCode={props.room.code}
        round={view.round}
        teamScores={view.teamScores}
        turnStep={view.turnStep}
      />
      <section className="game-table-shell">
        <TableSurface
          discardCount={view.discardCount}
          drawCount={view.drawCount}
          lastEvent={view.lastEvent}
          melds={view.melds}
          topDiscard={view.topDiscard}
        />
        <PlayerStrip currentPlayerId={view.currentPlayerId} participants={participants} players={view.players} selfId={currentParticipantId} />
        <HandTray
          actionError={actionError}
          actionPending={action.isPending}
          activePile={ownPlayer?.activePile}
          cards={visibleCards}
          isOwnTurn={isOwnTurn}
          melds={view.melds}
          onAddToMeld={(cardIds, targetMeldId) => runAction({ type: "meld", cardIds, targetMeldId })}
          onCreateMeld={(cardIds) => runAction({ type: "meld", cardIds })}
          onDiscard={(cardId) => runAction({ type: "discard", cardId })}
          onDraw={() => runAction({ type: "draw" })}
          teamId={ownPlayer?.teamId}
          turnStep={view.turnStep}
        />
      </section>
    </main>
  );
}

function displayName(participantId: string, room: RoomSnapshot): string {
  return room.participants.find((participant) => participant.id === participantId)?.displayName ?? participantId;
}
