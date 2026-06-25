import { Clock3, Search, Timer, UserRound, Users } from 'lucide-react';
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
  return (
    <section className="dashboardPanel teamOverviewDashboard">
      <h3>Team Overview</h3>
      <div className="dashboardTeamList">
        {teams.slice(0, 12).map((team) => {
          const roster = members.filter((member) => member.draftedTeamId === team.id);
          const leadership = getLeadership(team);
          return (
            <div key={team.id}>
              <span>{team.name}</span>
              <b>{leadership || '—'}</b>
              <strong>{getAverageRating(roster)}</strong>
            </div>
          );
        })}
      </div>
      <button className="linkBtn" type="button" onClick={() => setActivePanel('teams')}>View All Teams →</button>
    </section>
  );
}

function AvailableMembersDashboard({ availableMembers, query, setQuery, draftMember, locked, setActivePanel }) {
  return (
    <section className="dashboardPanel availableDashboard">
      <h3>Available Members <small>(Un-drafted)</small></h3>
      <label className="searchBox dashboardSearch"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members..." /></label>
      <div className="availableDashboardList">
        {availableMembers.slice(0, 10).map((member, index) => (
          <div key={member.id}>
            <span>{index + 1}</span>
            <b>{member.name}</b>
            <strong>{member.rating || '—'}</strong>
            <button disabled={locked} onClick={() => draftMember(member.id)}>Draft</button>
          </div>
        ))}
      </div>
      <button className="linkBtn" type="button" onClick={() => setActivePanel('members')}>View All Members →</button>
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
}) {
  const currentLeadership = getLeadership(currentTeam);

  return (
    <div className="desktopDraft dashboardDesktop">
      <header className="dashboardHeader">
        <div>
          <h1>Dashboard</h1>
          <p>Live Draft Overview</p>
        </div>
      </header>

      <section className="dashboardMetrics">
        <CurrentRoundOrderCard liveDraftOrder={liveDraftOrder} draftedCount={draftedCount} />
        <MetricCard icon={<UserRound size={28} />} color="green" label="Members" value={availableMembers.length} sub="Available" />
        <MetricCard icon={<Clock3 size={28} />} color="purple" label="On The Clock" value={currentTeam?.name || '—'} sub={currentLeadership} />
        <MetricCard icon={<Timer size={28} />} color="gold" label="Time Remaining" value={`${timerMinutes}:${timerRemainder}`}>
          <strong>{timerMinutes}:{timerRemainder}</strong>
          <div className="metricTimerBar"><span style={{ width: `${timerPercent}%` }} /></div>
        </MetricCard>
      </section>

      <section className="dashboardMainGrid">
        <div className="dashboardLeftStack">
          <DraftProgressCard round={round} totalRounds={totalRounds} draftPercent={draftPercent} draftedCount={draftedCount} liveDraftMemberCount={liveDraftMemberCount} />
          <RecentPicks picks={lastPicks} members={members} teams={teams} />
        </div>
        <TeamOverviewDashboard teams={teams} members={members} setActivePanel={setActivePanel} />
        <AvailableMembersDashboard availableMembers={availableMembers} query={query} setQuery={setQuery} draftMember={draftMember} locked={locked} setActivePanel={setActivePanel} />
      </section>

      <SummaryStrip strongestTeam={strongestTeam} weakestTeam={weakestTeam} balancedTeam={balancedTeam} />
    </div>
  );
}
