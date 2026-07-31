import { useState } from "react";
import { findGame } from "@hengames/shared";
import { trpc } from "../../api/trpc";
import { useFeedback } from "../../feedback/feedback";
import { useProfile } from "../../profile/ProfileProvider";
import { CardBack, PlayingCard } from "../game-table/PlayingCard";
import { SoundToggle } from "../SoundToggle";
import { HighScoreTable } from "./HighScoreTable";
import { PyramidBoard } from "./PyramidBoard";
import { pyramidTotalCards, pyramidsHeadline, streakLabel } from "./pyramidsHelpers";
import type { PyramidsSession } from "./types";

const pyramids = findGame("pyramids");

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function PyramidsGame(props: { onBack(): void }) {
  const profile = useProfile();
  const feedback = useFeedback();
  const [session, setSession] = useState<PyramidsSession | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [collected, setCollected] = useState<{ awarded: number; highScore: number } | null>(null);
  const utils = trpc.useUtils();

  const startGame = trpc.startSoloGame.useMutation({
    onSuccess(result) {
      setSession(result as unknown as PyramidsSession);
      setActionError(null);
      setCollected(null);
      feedback.fire("deal");
    },
    onError(error) {
      setActionError(errorMessage(error));
    }
  });

  const soloAction = trpc.soloAction.useMutation({
    onSuccess(result) {
      setSession(result as unknown as PyramidsSession);
      setActionError(null);
    },
    onError(error) {
      setActionError(errorMessage(error));
      feedback.fire("error");
    }
  });

  const collectPoints = trpc.collectSoloPoints.useMutation({
    onSuccess(result) {
      const next = result.session as unknown as PyramidsSession;
      setSession(next);
      setCollected({ awarded: result.awarded, highScore: next.highScore });
      setActionError(null);
      feedback.fire("meld");
      profile.refresh();
      void utils.listHighScores.invalidate();
    },
    onError(error) {
      setActionError(errorMessage(error));
      feedback.fire("error");
    }
  });

  const stats = profile.statsFor("pyramids");
  const view = session?.view ?? null;
  const pending = startGame.isPending || soloAction.isPending || collectPoints.isPending;
  const highScore = session?.highScore ?? stats.totalScore;

  const headline = pyramidsHeadline(view);

  const play = (cardId: string) => {
    if (!session || pending) {
      return;
    }
    feedback.fire("select");
    soloAction.mutate({
      sessionId: session.sessionId,
      profileToken: profile.token,
      action: { type: "play", cardId }
    });
  };

  const draw = () => {
    if (!session || pending || !view?.canDraw) {
      return;
    }
    feedback.fire("draw");
    soloAction.mutate({
      sessionId: session.sessionId,
      profileToken: profile.token,
      action: { type: "draw" }
    });
  };

  return (
    <main className="page pyramids-page">
      <header className="pyramids-hud">
        <div className="pyramids-hud__top">
          <button className="link-button" onClick={props.onBack}>← All games</button>
          <h1>{pyramids.displayName}</h1>
          <SoundToggle />
        </div>
        <dl className="pyramids-stats">
          <div>
            <dt>Consecutive plays</dt>
            <dd>{view?.consecutivePlays ?? 0}</dd>
          </div>
          <div>
            <dt>Game points</dt>
            <dd>{(view?.gamePoints ?? 0).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Cards in pile</dt>
            <dd>{view?.drawCount ?? 0}</dd>
          </div>
          <div>
            <dt>High score</dt>
            <dd>{highScore.toLocaleString()}</dd>
          </div>
        </dl>
      </header>

      {!session ? (
        <section className="panel pyramids-intro">
          <h2>How to play</h2>
          <p>{pyramids.description}</p>
          <ul className="pyramids-rules">
            <li>Only face-up pyramid cards can be played, and only onto a target one rank away.</li>
            <li>Aces are high and low, so a 2 or a King can be played on an Ace and back again.</li>
            <li>A pyramid card is revealed once both cards covering it are gone.</li>
            <li>Stuck? Draw a new target card — but drawing resets your streak bonus.</li>
            <li>Every point you collect is added to your running high score.</li>
          </ul>
          {actionError ? <p className="action-error">{actionError}</p> : null}
          <button
            className="primary"
            disabled={pending}
            onClick={() => startGame.mutate({ gameId: "pyramids", profileToken: profile.token })}
            type="button"
          >
            {startGame.isPending ? "Dealing…" : "Play Pyramids"}
          </button>
        </section>
      ) : null}

      {!session ? <HighScoreTable gameId="pyramids" /> : null}

      {session && view ? (
        <>
          <section className="pyramids-table">
            <p className={`pyramids-headline${view.phase === "game-over" ? " is-over" : ""}`}>{headline}</p>

            <PyramidBoard
              disabled={pending || view.phase === "game-over"}
              onPlay={play}
              rows={view.rows}
            />

            <div className="pyramids-piles">
              <div className="pyramids-pile">
                <span className="pile__label">Draw pile</span>
                <button
                  aria-label="Draw a new target card"
                  className="pyramids-draw-button"
                  disabled={!view.canDraw || pending}
                  onClick={draw}
                  type="button"
                >
                  <CardBack size="lg" />
                </button>
                <span className="pile__count">{view.drawCount} left</span>
              </div>

              <div className="pyramids-pile">
                <span className="pile__label">Target</span>
                <PlayingCard card={view.targetCard} size="lg" />
                <span className="pile__count">{streakLabel(view)}</span>
              </div>
            </div>

            <p className="event-banner">{view.lastEvent}</p>
            {actionError ? <p className="action-error">{actionError}</p> : null}
          </section>

          {view.phase === "game-over" ? (
            <section className="panel pyramids-result">
              <h2>{view.pyramidCleared ? "Pyramid cleared!" : "Game over"}</h2>
              <dl className="pyramids-stats">
                <div>
                  <dt>Cards cleared</dt>
                  <dd>{view.cardsCleared} / {pyramidTotalCards(view)}</dd>
                </div>
                <div>
                  <dt>Best streak</dt>
                  <dd>{view.bestStreak}</dd>
                </div>
                <div>
                  <dt>Game points</dt>
                  <dd>{view.gamePoints.toLocaleString()}</dd>
                </div>
              </dl>

              {collected ? (
                <>
                  <p>
                    Collected <strong>{collected.awarded.toLocaleString()}</strong> points. Your running
                    high score is now <strong>{collected.highScore.toLocaleString()}</strong>.
                  </p>
                  <button
                    className="primary"
                    disabled={pending}
                    onClick={() => startGame.mutate({ gameId: "pyramids", profileToken: profile.token })}
                    type="button"
                  >
                    Play again
                  </button>
                </>
              ) : (
                <button
                  className="primary"
                  disabled={pending || !view.canCollect}
                  onClick={() =>
                    collectPoints.mutate({ sessionId: session.sessionId, profileToken: profile.token })
                  }
                  type="button"
                >
                  {collectPoints.isPending ? "Collecting…" : "Collect points"}
                </button>
              )}
            </section>
          ) : null}

          {view.phase === "game-over" ? <HighScoreTable gameId="pyramids" /> : null}
        </>
      ) : null}
    </main>
  );
}
