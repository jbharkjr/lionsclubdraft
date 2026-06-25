import { getAverageRating } from '../utils/draftLogic.js';

export function Analytics({ teams, members }) {
  const stats = teams.map((team) => {
    const roster = members.filter((member) => member.draftedTeamId === team.id);
    return { team, roster, avg: roster.length ? Number(getAverageRating(roster)) || 0 : 0 };
  }).sort((a, b) => b.avg - a.avg);

  return (
    <section className="card setupPanel">
      <h2>Team Analytics</h2>
      <div className="analyticsGrid">
        {stats.map(({ team, roster, avg }) => (
          <article className="analyticsCard" key={team.id}>
            <strong>{team.name}</strong>
            <span>{roster.length} members</span>
            <b>{roster.length ? avg.toFixed(1) : '—'}</b>
            <div className="meter"><i style={{ width: `${Math.min(avg * 10, 100)}%` }} /></div>
          </article>
        ))}
      </div>
    </section>
  );
}
