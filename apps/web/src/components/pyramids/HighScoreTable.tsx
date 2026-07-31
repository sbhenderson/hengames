import type { GameId } from "@hengames/shared";
import { trpc } from "../../api/trpc";

export function HighScoreTable(props: { gameId: GameId }) {
  const scores = trpc.listHighScores.useQuery({ gameId: props.gameId, limit: 10 });

  return (
    <section className="panel high-scores">
      <h2>High scores</h2>
      <p className="helper-text">Running totals from every game collected on this table.</p>
      {scores.data?.length ? (
        <ol className="high-score-list">
          {scores.data.map((entry, index) => (
            <li className="high-score-row" key={entry.playerId}>
              <span className="high-score-rank">{index + 1}</span>
              <span className="avatar small" style={{ background: entry.avatar.color }}>{entry.avatar.emoji}</span>
              <span className="high-score-name">{entry.displayName}</span>
              <span className="high-score-games">{entry.gamesPlayed} played</span>
              <strong className="high-score-value">{entry.score.toLocaleString()}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p>No scores collected yet. Be the first!</p>
      )}
    </section>
  );
}
