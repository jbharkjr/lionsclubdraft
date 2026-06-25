import { getAverageRating } from '../utils/draftLogic.js';

export function TeamOverviewTable({ teams, members, totalRounds }) {
  return (
    <section className="card splitPanel">
      <h3>Team Overview</h3>
      <div className="teamTable">
        <div className="tableHead"><span>Team</span><span>Members</span><span>Picks</span><span>Score</span></div>
        {teams.map((team, index) => {
          const roster = members.filter((member) => member.draftedTeamId === team.id);
          const avg = getAverageRating(roster);
          return (
            <div className={`teamTableRow ${team.color}`} key={team.id}>
              <span><i>{index + 1}</i><b>{team.name}</b></span>
              <span>{roster.length}</span>
              <span>{totalRounds || '—'}</span>
              <span>{avg}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
