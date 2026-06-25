import { useEffect, useMemo, useState } from 'react';
import { getAverageRating } from '../utils/draftLogic.js';

function getLeadership(team) {
  return [team?.captain, team?.lieutenant].filter(Boolean).join(' & ');
}

export function Analytics({ teams, members }) {
  const [selectedTeam, setSelectedTeam] = useState(null);

  const stats = teams.map((team) => {
    const roster = members.filter((member) => member.draftedTeamId === team.id);
    return { team, roster, avg: roster.length ? Number(getAverageRating(roster)) || 0 : 0 };
  }).sort((a, b) => b.avg - a.avg);

  const selectedRoster = useMemo(() => {
    if (!selectedTeam) return [];

    const roleOrder = { captain: 1, lieutenant: 2 };
    return members
      .filter((member) => member.draftedTeamId === selectedTeam.id)
      .sort((a, b) => {
        const roleA = roleOrder[a.teamRole] || 3;
        const roleB = roleOrder[b.teamRole] || 3;
        return roleA - roleB || (a.pickNumber || 9999) - (b.pickNumber || 9999) || a.name.localeCompare(b.name);
      });
  }, [members, selectedTeam]);

  const openTeamWindow = (team) => {
    setSelectedTeam(team);
    window.history.pushState({ analyticsTeamWindow: team.id }, '');
  };

  const closeTeamWindow = () => setSelectedTeam(null);

  useEffect(() => {
    if (!selectedTeam) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeTeamWindow();
    };

    const handlePopState = () => closeTeamWindow();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedTeam]);

  return (
    <section className="card setupPanel">
      <h2>Team Analytics</h2>
      <div className="analyticsGrid">
        {stats.map(({ team, roster, avg }) => (
          <article className="analyticsCard" key={team.id}>
            <button className="analyticsTeamNameButton" type="button" onClick={() => openTeamWindow(team)}>
              {team.name}
            </button>
            <span>{roster.length} members</span>
            <b>{roster.length ? avg.toFixed(1) : '—'}</b>
            <div className="meter"><i style={{ width: `${Math.min(avg * 10, 100)}%` }} /></div>
          </article>
        ))}
      </div>

      {selectedTeam && (
        <div className="memberModalOverlay" onClick={closeTeamWindow} role="presentation">
          <div className="memberDraftModal teamRosterModal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="analytics-team-roster-title">
            <div className="memberDraftModalHeader">
              <div>
                <span>Team Roster</span>
                <h2 id="analytics-team-roster-title">{selectedTeam.name}</h2>
                <p>{getLeadership(selectedTeam) || 'No captain or lieutenant assigned'}</p>
              </div>
              <button type="button" className="modalCloseButton" onClick={closeTeamWindow} aria-label="Close team roster window">×</button>
            </div>

            <div className="teamRosterList">
              {selectedRoster.length ? selectedRoster.map((member) => (
                <div key={member.id}>
                  <strong>{member.name}</strong>
                  <span>{member.teamRole ? member.teamRole : member.pickNumber ? `Pick ${member.pickNumber}` : 'Assigned'}</span>
                  <b>{member.rating || '—'}</b>
                </div>
              )) : (
                <p className="emptyRosterMessage">No members assigned to this team yet.</p>
              )}
            </div>

            <div className="memberDraftActions">
              <button type="button" className="secondaryButton" onClick={closeTeamWindow}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
