import { useEffect, useMemo, useState } from 'react';
import { Clock3, Play, RotateCcw, Search, Timer, UserRound, Users } from 'lucide-react';
import { getAverageRating, getTeamNumber } from '../utils/draftLogic.js';
import { RecentPicks } from './RecentPicks.jsx';
import { SummaryStrip } from './SummaryStrip.jsx';

function getLeadership(team) {
  return [team?.captain, team?.lieutenant].filter(Boolean).join(' & ');
}

function CurrentRoundOrderCard({ liveDraftOrder, draftedCount }) {
  const currentRoundIndex = Math.floor(draftedCount / Math.max(liveDraftOrder.length, 1));
  const picksMadeInRound = draftedCount % Math.max(liveDraftOrder.length, 1);
  const order = currentRoundIndex % 2 === 0 ? liveDraftOrder : [...liveDraftOrder].reverse();
  const remainingOrder = order.slice(picksMadeInRound);

  return (
    <section className="dashboardMetricCard orderMetric">
      <div className="metricIcon blue"><Users size={28} /></div>
      <div className="metricContent">
        <span>Current Round Order</span>
        <div className="miniOrderDots">
          {remainingOrder.map((team) => <b key={team.id} title={team.name}>{getTeamNumber(team) || team.name}</b>)}
        </div>
        <small>Round {currentRoundIndex + 1}</small>
      </div>
    </section>
  );
}

function MetricCard({ icon, color, label, value, sub, children }) {
  return (
    <section className="dashboardMetricCard">
      <div className={`metricIcon ${color}`}>{icon}</div>
      <div className="metricContent">
        <span>{label}</span>
        {children || <strong>{value}</strong>}
        {sub && <small>{sub}</small>}
      </div>
    </section>
  );
}

function DraftProgressCard({ round, totalRounds, draftPercent, draftedCount, liveDraftMemberCount }) {
  return (
    <section className="dashboardPanel compactPanel">
      <h3>Draft Progress</h3>
      <div className="progressLine"><strong>Round {round} of {totalRounds || 1}</strong><b>{draftPercent}%</b></div>
      <div className="dashboardProgress"><span style={{ width: `${draftPercent}%` }} /></div>
      <p>{draftedCount} of {liveDraftMemberCount} picks</p>
    </section>
  );
}

function TeamOverviewDashboard({ teams, members, setActivePanel }) {
  const [selectedTeam, setSelectedTeam] = useState(null);

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
    window.history.pushState({ teamOverviewWindow: team.id }, '');
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
    <section className="dashboardPanel teamOverviewDashboard">
      <h3>Team Overview</h3>
      <div className="dashboardTeamList">
        {teams.slice(0, 12).map((team) => {
          const roster = members.filter((member) => member.draftedTeamId === team.id);
          const leadership = getLeadership(team);
          return (
            <div key={team.id}>
              <button className="teamOverviewNameButton" type="button" onClick={() => openTeamWindow(team)}>
                {team.name}
              </button>
              <b>{leadership || '—'}</b>
              <strong>{getAverageRating(roster)}</strong>
            </div>
          );
        })}
      </div>
      <button className="linkBtn" type="button" onClick={() => setActivePanel('teams')}>View All Teams →</button>

      {selectedTeam && (
        <div className="memberModalOverlay" onClick={closeTeamWindow} role="presentation">
          <div className="memberDraftModal teamRosterModal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="team-roster-modal-title">
            <div className="memberDraftModalHeader">
              <div>
                <span>Team Roster</span>
                <h2 id="team-roster-modal-title">{selectedTeam.name}</h2>
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

function AvailableMembersDashboard({ availableMembers, query, setQuery, draftMember, locked, setActivePanel }) {
  const [sortMode, setSortMode] = useState('name-asc');

  const sortedMembers = useMemo(() => {
    const getRating = (member) => Number.parseFloat(member.rating) || 0;
    const getName = (member) => (member.name || '').toLowerCase();

    return [...availableMembers].sort((a, b) => {
      if (sortMode === 'rating-desc') return getRating(b) - getRating(a) || getName(a).localeCompare(getName(b));
      if (sortMode === 'rating-asc') return getRating(a) - getRating(b) || getName(a).localeCompare(getName(b));
      if (sortMode === 'name-desc') return getName(b).localeCompare(getName(a));
      return getName(a).localeCompare(getName(b));
    });
  }, [availableMembers, sortMode]);

  return (
    <section className="dashboardPanel availableDashboard">
      <div className="availableDashboardHeader">
        <h3>Available Members <small>(Un-drafted)</small></h3>
        <label className="dashboardSortControl">
          <span>Sort</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="rating-desc">Rating High-Low</option>
            <option value="rating-asc">Rating Low-High</option>
          </select>
        </label>
      </div>
      <label className="searchBox dashboardSearch"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members..." /></label>
      <div className="availableDashboardList">
        {sortedMembers.map((member, index) => (
          <div key={member.id}>
            <span>{index + 1}</span>
            <b>{member.name}</b>
            <strong>{member.rating || '—'}</strong>
            <button disabled={locked} onClick={() => draftMember(member.id)}>Draft</button>
          </div>
        ))}
      </div>
      <button className="linkBtn" type="button" onClick={() => setActivePanel('availableDraftList')}>View All Members →</button>
    </section>
  );
}

export function Dashboard({
  teams,
  members,
  liveDraftOrder,
  availableMembers,
  query,
  setQuery,
  draftMember,
  locked,
  setActivePanel,
  currentTeam,
  round,
  draftedCount,
  liveDraftMemberCount,
  totalRounds,
  draftPercent,
  lastPicks,
  strongestTeam,
  weakestTeam,
  balancedTeam,
  timerMinutes,
  timerRemainder,
  timerPercent,
  timerRunning,
  setTimerRunning,
  setTimerSeconds,
}) {
  const currentLeadership = getLeadership(currentTeam);

  return (
    <div className="desktopDraft dashboardDesktop">
      <section className="dashboardMetrics">
        <CurrentRoundOrderCard liveDraftOrder={liveDraftOrder} draftedCount={draftedCount} />
        <MetricCard icon={<UserRound size={28} />} color="green" label="Members" value={availableMembers.length} sub="Available" />
        <MetricCard icon={<Clock3 size={28} />} color="purple" label="On The Clock" value={currentTeam?.name || '—'} sub={currentLeadership} />
        <MetricCard icon={<Timer size={28} />} color="gold" label="Time Remaining" value={`${timerMinutes}:${timerRemainder}`}>
          <strong>{timerMinutes}:{timerRemainder}</strong>
          <div className="dashboardTimerControls">
            <button type="button" onClick={() => setTimerRunning((prev) => !prev)}>
              <Play size={15} /> {timerRunning ? 'Pause' : 'Start'}
            </button>
            <button type="button" onClick={() => setTimerSeconds()}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>
          <div className="metricTimerBar"><span style={{ width: `${timerPercent}%` }} /></div>
        </MetricCard>
      </section>

      <section className="dashboardMainGrid">
        <div className="dashboardLeftStack">
          <DraftProgressCard round={round} totalRounds={totalRounds} draftPercent={draftPercent} draftedCount={draftedCount} liveDraftMemberCount={liveDraftMemberCount} />
          <RecentPicks picks={lastPicks} members={members} teams={teams} />
        </div>
        <AvailableMembersDashboard availableMembers={availableMembers} query={query} setQuery={setQuery} draftMember={draftMember} locked={locked} setActivePanel={setActivePanel} />
        <TeamOverviewDashboard teams={teams} members={members} setActivePanel={setActivePanel} />
      </section>

      <SummaryStrip strongestTeam={strongestTeam} weakestTeam={weakestTeam} balancedTeam={balancedTeam} />
    </div>
  );
}
