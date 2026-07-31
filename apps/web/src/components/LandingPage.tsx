import { GAME_CATALOG, type GameId } from "@hengames/shared";
import { useProfile } from "../profile/ProfileProvider";
import { ProfileCard } from "./ProfileCard";

function playerLabel(min: number, max: number): string {
  return min === max ? `${min} player${min === 1 ? "" : "s"}` : `${min}–${max} players`;
}

export function LandingPage(props: { onPickGame(gameId: GameId): void }) {
  const profile = useProfile();

  return (
    <main className="page">
      <section className="hero">
        <h1>HenGames</h1>
        <p>A cozy card table for you and your flock. Pick a game to get started.</p>
        <ProfileCard />
      </section>

      <section className="panel">
        <h2>Choose a game</h2>
        <div className="game-tiles">
          {GAME_CATALOG.map((game) => {
            const stats = profile.statsFor(game.id);
            const solo = game.mode === "solo";

            return (
              <article className="game-tile" key={game.id}>
                <div className="game-tile__top">
                  <span className="game-tile__emoji" aria-hidden="true">{game.emoji}</span>
                  <div>
                    <h3>{game.displayName}</h3>
                    <p className="game-tile__tagline">{game.tagline}</p>
                  </div>
                </div>
                <p className="helper-text">{game.description}</p>
                <div className="game-tile__meta">
                  <span className={`mode-badge ${solo ? "solo" : "multiplayer"}`}>
                    {solo ? "Solo" : "Multiplayer"}
                  </span>
                  <span className="helper-text">{playerLabel(game.minPlayers, game.maxPlayers)}</span>
                </div>
                {solo ? (
                  <dl className="game-tile__scores">
                    <div>
                      <dt>High score</dt>
                      <dd>{stats.totalScore.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Best game</dt>
                      <dd>{stats.bestScore.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Played</dt>
                      <dd>{stats.gamesPlayed.toLocaleString()}</dd>
                    </div>
                  </dl>
                ) : null}
                <button className="primary" type="button" onClick={() => props.onPickGame(game.id)}>
                  {solo ? `Play ${game.displayName}` : `Find a ${game.displayName} room`}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
