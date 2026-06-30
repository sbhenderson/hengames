import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "@hengames/shared";
import { formatCard } from "./cardDisplay";
import { analyzeSelectedCards, getCardHints, reconcileCardOrder } from "./gameTableHelpers";
import { PlayingCard } from "./PlayingCard";
import type { CardHint, HandAndFootTableView, MeldView, TeamId } from "./types";

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
  const visibleCards = useMemo(() => props.cards ?? [], [props.cards]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
  const selectedIds = analysis.selectedCards.map((card) => card.id);

  const toggleSelect = (cardId: string) => {
    if (props.isOwnTurn && !props.actionPending && props.turnStep === "must-discard" && selectedCardIds.length === 1 && selectedCardIds[0] === cardId) {
      props.onDiscard(cardId);
      return;
    }
    setSelectedCardIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]
    );
  };

  const moveBy = (cardId: string, offset: -1 | 1) => {
    setOrderedCardIds((current) => {
      const index = current.indexOf(cardId);
      const next = index + offset;
      if (index === -1 || next < 0 || next >= current.length) {
        return current;
      }
      return arrayMove(current, index, next);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    setOrderedCardIds((current) => {
      const from = current.indexOf(String(active.id));
      const to = current.indexOf(String(over.id));
      if (from === -1 || to === -1) {
        return current;
      }
      return arrayMove(current, from, to);
    });
  };

  if (!visibleCards.length) {
    return (
      <section className="hand-tray" aria-label={`Your ${pileLabel}`}>
        <div className="hand-tray__header">
          <h2>Your {pileLabel}</h2>
        </div>
        <p className="empty-hand">No cards in view right now — you may be spectating or waiting for your foot.</p>
      </section>
    );
  }

  const drawDisabled = !props.isOwnTurn || props.turnStep !== "must-draw" || props.actionPending;

  return (
    <section className="hand-tray" aria-label={`Your ${pileLabel}`}>
      <div className="hand-tray__header">
        <div>
          <h2>Your {pileLabel}</h2>
          <p className="helper-text">{visibleCards.length} cards · tap to pick up, drag to reorder</p>
        </div>
        <button className={drawDisabled ? "" : "primary"} disabled={drawDisabled} onClick={props.onDraw} type="button">
          Draw 2
        </button>
      </div>

      {props.actionError ? <p className="action-error" role="alert">{props.actionError}</p> : null}

      <div className="hand-action-bar" aria-label="Selected card actions">
        <span className="hand-action-bar__count">{selectedIds.length} selected</span>
        <button disabled={!props.isOwnTurn || !analysis.canCreateMeld || props.actionPending} onClick={() => props.onCreateMeld(selectedIds)} type="button">
          Create meld
        </button>
        {analysis.addToMeldOptions.map((option) => (
          <button disabled={!props.isOwnTurn || props.actionPending} key={option.meldId} onClick={() => props.onAddToMeld(selectedIds, option.meldId)} type="button">
            {option.label}
          </button>
        ))}
        <button disabled={!props.isOwnTurn || !analysis.canDiscard || props.actionPending} onClick={() => selectedIds[0] && props.onDiscard(selectedIds[0])} type="button">
          Discard
        </button>
        <button disabled={!selectedIds.length || props.actionPending} onClick={() => setSelectedCardIds([])} type="button">
          Clear
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedCardIds} strategy={horizontalListSortingStrategy}>
          <div className="hand-fan">
            <div className="hand-fan__inner">
              {orderedCards.map((card, index) => (
                <SortableCard
                  card={card}
                  canMoveLeft={index > 0}
                  canMoveRight={index < orderedCards.length - 1}
                  hint={hints[card.id]}
                  index={index}
                  key={card.id}
                  onMoveLeft={() => moveBy(card.id, -1)}
                  onMoveRight={() => moveBy(card.id, 1)}
                  onToggle={() => toggleSelect(card.id)}
                  selected={selectedCardIds.includes(card.id)}
                  total={orderedCards.length}
                />
              ))}
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function SortableCard(props: {
  card: Card;
  index: number;
  total: number;
  selected: boolean;
  hint?: CardHint;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onToggle(): void;
  onMoveLeft(): void;
  onMoveRight(): void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.card.id });
  const hintClass = props.hint ? ` hint-${props.hint}` : "";

  // Gentle fan: rotate cards around the centre of the hand.
  const mid = (props.total - 1) / 2;
  const tilt = props.total > 1 ? (props.index - mid) * Math.min(2.4, 16 / props.total) : 0;
  const lift = props.total > 1 ? Math.abs(props.index - mid) * 0.05 : 0;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : props.selected ? 30 : 10
  };

  return (
    <div className="hand-card-slot" ref={setNodeRef} style={style}>
      <div className={`hand-card-shell${props.selected ? " selected" : ""}`} style={{ "--tilt": `${tilt}deg`, "--lift": `${lift}rem` } as React.CSSProperties}>
        <button
          className="playing-card-button"
          onClick={props.onToggle}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={formatCard(props.card)}
          aria-pressed={props.selected}
        >
          <PlayingCard card={props.card} className={hintClass.trim()} />
        </button>
        {props.selected ? (
          <div className="card-reorder-controls" role="group" aria-label={`Reorder ${formatCard(props.card)}`}>
            <button disabled={!props.canMoveLeft} onClick={props.onMoveLeft} type="button">←</button>
            <button disabled={!props.canMoveRight} onClick={props.onMoveRight} type="button">→</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
