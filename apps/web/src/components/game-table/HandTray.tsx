import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@hengames/shared";
import { analyzeSelectedCards, getCardHints, reconcileCardOrder } from "./gameTableHelpers";
import { PlayingCardButton } from "./PlayingCardButton";
import type { HandAndFootTableView, MeldView, TeamId } from "./types";

export function HandTray(props: {
  cards: Card[] | undefined;
  activePile: "hand" | "foot" | undefined;
  teamId: TeamId | undefined;
  turnStep: HandAndFootTableView["turnStep"];
  isOwnTurn: boolean;
  melds: MeldView[];
  actionError: string | null;
  actionPending: boolean;
  onDraw(): void;
  onDiscard(cardId: string): void;
  onCreateMeld(cardIds: string[]): void;
  onAddToMeld(cardIds: string[], targetMeldId: string): void;
}) {
  const [orderedCardIds, setOrderedCardIds] = useState<string[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const draggedCardIdRef = useRef<string | null>(null);
  const visibleCards = useMemo(() => props.cards ?? [], [props.cards]);

  useEffect(() => {
    setOrderedCardIds((currentOrder) => reconcileCardOrder(visibleCards, currentOrder));
  }, [visibleCards]);

  useEffect(() => {
    const visibleCardIds = new Set(visibleCards.map((card) => card.id));
    setSelectedCardIds((currentSelection) => currentSelection.filter((cardId) => visibleCardIds.has(cardId)));
  }, [visibleCards]);

  const orderedCards = useMemo(() => {
    const byId = new Map(visibleCards.map((card) => [card.id, card]));
    return orderedCardIds.map((cardId) => byId.get(cardId)).filter((card): card is Card => Boolean(card));
  }, [orderedCardIds, visibleCards]);

  const hints = useMemo(
    () => getCardHints({ cards: visibleCards, melds: props.melds, teamId: props.teamId }),
    [visibleCards, props.melds, props.teamId]
  );
  const analysis = useMemo(
    () =>
      analyzeSelectedCards({
        cards: visibleCards,
        selectedCardIds,
        melds: props.melds,
        teamId: props.teamId,
        turnStep: props.turnStep
      }),
    [visibleCards, selectedCardIds, props.melds, props.teamId, props.turnStep]
  );

  const pileLabel = props.activePile ?? "hand";

  if (!visibleCards.length) {
    return (
      <section className="hand-tray" aria-label={`Your ${pileLabel}`}>
        <h2>Your {pileLabel}</h2>
        <p className="helper-text">No visible cards right now. You may be spectating or waiting for your next pile.</p>
      </section>
    );
  }

  const selectedIds = analysis.selectedCards.map((card) => card.id);

  return (
    <section className="hand-tray" aria-label={`Your ${pileLabel}`}>
      <div className="hand-tray__header">
        <div>
          <h2>Your {pileLabel}</h2>
          <p className="helper-text">{visibleCards.length} cards. Tap to select; selected cards can be dragged or moved left/right. Tap a selected discard card again to discard it.</p>
        </div>
        <button disabled={!props.isOwnTurn || props.turnStep !== "must-draw" || props.actionPending} onClick={props.onDraw} type="button">
          Draw 2
        </button>
      </div>
      {props.actionError ? <p className="action-error" role="alert">{props.actionError}</p> : null}
      <div className="hand-action-bar" aria-label="Selected card actions">
        <span>{selectedIds.length} selected</span>
        <button disabled={!props.isOwnTurn || !analysis.canCreateMeld || props.actionPending} onClick={() => props.onCreateMeld(selectedIds)} type="button">
          Create meld
        </button>
        {analysis.addToMeldOptions.map((option) => (
          <button disabled={!props.isOwnTurn || props.actionPending} key={option.meldId} onClick={() => props.onAddToMeld(selectedIds, option.meldId)} type="button">
            {option.label}
          </button>
        ))}
        <button
          disabled={!props.isOwnTurn || !analysis.canDiscard || props.actionPending}
          onClick={() => {
            const cardId = selectedIds[0];
            if (cardId) {
              props.onDiscard(cardId);
            }
          }}
          type="button"
        >
          Discard
        </button>
        <button disabled={!selectedIds.length || props.actionPending} onClick={() => setSelectedCardIds([])} type="button">
          Clear
        </button>
      </div>
      <div className="hand-card-row">
        {orderedCards.map((card, index) => (
          <PlayingCardButton
            card={card}
            canMoveLeft={index > 0}
            canMoveRight={index < orderedCards.length - 1}
            draggable={selectedCardIds.includes(card.id)}
            hint={hints[card.id]}
            key={card.id}
            onDragEnd={() => {
              draggedCardIdRef.current = null;
            }}
            onDragEnter={() => {
              const draggedCardId = draggedCardIdRef.current;
              if (draggedCardId && draggedCardId !== card.id) {
                setOrderedCardIds((currentOrder) => moveBefore(currentOrder, draggedCardId, card.id));
              }
            }}
            onDragStart={() => {
              draggedCardIdRef.current = card.id;
            }}
            onMoveLeft={() => setOrderedCardIds((currentOrder) => moveByOffset(currentOrder, card.id, -1))}
            onMoveRight={() => setOrderedCardIds((currentOrder) => moveByOffset(currentOrder, card.id, 1))}
            onToggle={() => {
              if (props.isOwnTurn && !props.actionPending && props.turnStep === "must-discard" && selectedCardIds.length === 1 && selectedCardIds[0] === card.id) {
                props.onDiscard(card.id);
                return;
              }
              setSelectedCardIds((currentSelection) =>
                currentSelection.includes(card.id)
                  ? currentSelection.filter((selectedCardId) => selectedCardId !== card.id)
                  : [...currentSelection, card.id]
              );
            }}
            selected={selectedCardIds.includes(card.id)}
          />
        ))}
      </div>
    </section>
  );
}

function moveBefore(cardIds: string[], movingCardId: string, targetCardId: string): string[] {
  const withoutMoving = cardIds.filter((cardId) => cardId !== movingCardId);
  const targetIndex = withoutMoving.indexOf(targetCardId);
  if (targetIndex === -1) {
    return cardIds;
  }
  return [...withoutMoving.slice(0, targetIndex), movingCardId, ...withoutMoving.slice(targetIndex)];
}

function moveByOffset(cardIds: string[], cardId: string, offset: -1 | 1): string[] {
  const currentIndex = cardIds.indexOf(cardId);
  const nextIndex = currentIndex + offset;
  if (currentIndex === -1 || nextIndex < 0 || nextIndex >= cardIds.length) {
    return cardIds;
  }
  const nextOrder = [...cardIds];
  const card = nextOrder[currentIndex];
  if (!card) {
    return cardIds;
  }
  nextOrder.splice(currentIndex, 1);
  nextOrder.splice(nextIndex, 0, card);
  return nextOrder;
}
