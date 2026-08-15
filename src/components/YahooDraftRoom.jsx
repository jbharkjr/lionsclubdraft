import { useMemo, useState } from 'react';
import {
  ChevronDown,
  Clock3,
  Search,
  Star,
  Users,
  X,
} from 'lucide-react';
import { getTeamNumber } from '../utils/draftLogic.js';

function leadership(team) {
  return [team?.captain, team?.lieutenant].filter(Boolean).join(' & ');
}

function currentRoundOrder(liveDraftOrder, draftedCount) {
  const roundIndex = Math.floor(draftedCount / Math.max(liveDraftOrder.length, 1));
  const used = draftedCount % Math.max(liveDraftOrder.length, 1);
  const order = roundIndex % 2 === 0 ? liveDraftOrder : [...liveDraftOrder].reverse();
  return {
    roundIndex,
    used,
    full: order,
    remaining: order.slice(used),
  };
}

export function YahooDraftRoom({
  activeSeason,
  teams,
  members,
  liveDraftOrder,
  availableMembers,
  draftMember,
  locked,
  currentTeam,
  round,
  draftedCount,
  totalRounds,
  lastPicks,
  timerMinutes,
  timerRemainder,
  timerPercent,
  timerRunning,
  setTimerRunning,
  setTimerSeconds,
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');
  const [activeTab, setActiveTab] = useState('players');
  const [rightTab, setRightTab] = useState('queue');
  const [selectedId, setSelectedId] = useState(null);
  const [queue, setQueue] = useState([]);

  const orderInfo = currentRoundOrder(liveDraftOrder, draftedCount);
  const currentRoster = useMemo(
    () => members
      .filter((member) => member.draftedTeamId === currentTeam?.id)
      .sort((a, b) => (a.pickNumber || 9999) - (b.pickNumber || 9999) || a.name.localeCompare(b.name)),
    [members, currentTeam],
  );

  const filteredMembers = useMemo(() => {
    const list = availableMembers.filter((member) =>
      member.name.toLowerCase().includes(search.toLowerCase())
    );

    return [...list].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      const scoreA = Number(a.rating || 0);
      const scoreB = Number(b.rating || 0);

      if (sort === 'name-desc') return nameB.localeCompare(nameA);
      if (sort === 'rating-desc') return scoreB - scoreA || nameA.localeCompare(nameB);
      if (sort === 'rating-asc') return scoreA - scoreB || nameA.localeCompare(nameB);
      return nameA.localeCompare(nameB);
    });
  }, [availableMembers, search, sort]);

  const queuedMembers = queue
    .map((id) => members.find((member) => member.id === id))
    .filter((member) => member && !member.draftedTeamId);

  const selectedMember = members.find((member) => member.id === selectedId) || null;

  const toggleQueue = (id) => {
    setQueue((current) => (
      current.includes(id)
        ? current.filter((memberId) => memberId !== id)
        : [...current, id]
    ));
  };

  const handleDraft = (member) => {
    if (!member || locked || !currentTeam) return;
    draftMember(member.id);
    setSelectedId(null);
    setQueue((current) => current.filter((id) => id !== member.id));
  };

  return (
    <section className="desktopDraft yahooDraftRoom">
      <header className="yahooDraftHeader">
        <div className="yahooLeagueBlock">
          <span className="yahooEyebrow">Lufkin Host Lions Club</span>
          <h1>{activeSeason.name}</h1>
          <p>Live Snake Draft · {liveDraftOrder.length} drafting teams · {totalRounds} rounds</p>
        </div>

        <div className="yahooOnClock">
          <div>
            <span>On the clock</span>
            <strong>{currentTeam?.name || 'Draft Complete'}</strong>
            <small>{leadership(currentTeam)}</small>
          </div>
          <div className="yahooTimer">
            <Clock3 size={18} />
            <strong>{timerMinutes}:{timerRemainder}</strong>
            <div className="yahooTimerTrack"><span style={{ width: `${timerPercent}%` }} /></div>
          </div>
          <div className="yahooTimerActions">
            <button type="button" onClick={() => setTimerRunning((value) => !value)}>
              {timerRunning ? 'Pause' : 'Start'}
            </button>
            <button type="button" onClick={() => setTimerSeconds()}>Reset</button>
          </div>
        </div>
      </header>

      <div className="yahooRoundStrip">
        <div className="yahooRoundLabel">
          <span>Round {orderInfo.roundIndex + 1}</span>
          <small>Pick {draftedCount + 1}</small>
        </div>
        <div className="yahooOrderTrack">
          {orderInfo.full.map((team, index) => {
            const isPast = index < orderInfo.used;
            const isCurrent = index === orderInfo.used;
            return (
              <div
                key={`${orderInfo.roundIndex}-${team.id}`}
                className={`yahooOrderTeam ${isPast ? 'past' : ''} ${isCurrent ? 'current' : ''}`}
                title={`${team.name} — ${leadership(team)}`}
              >
                <b>{getTeamNumber(team) || index + 1}</b>
                <span>{team.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="yahooDraftGrid">
        <aside className="yahooRecentPane">
          <div className="yahooPaneTitle">
            <span>Recent Picks</span>
            <small>Latest selections</small>
          </div>
          <div className="yahooRecentList">
            {lastPicks.length === 0 && <div className="yahooEmpty">No picks yet.</div>}
            {lastPicks.map((pick) => {
              const member = members.find((item) => item.id === pick.memberId);
              const team = teams.find((item) => item.id === pick.teamId);
              return (
                <div className="yahooRecentPick" key={`${pick.pickNumber}-${pick.memberId}`}>
                  <b>{pick.pickNumber}</b>
                  <div>
                    <strong>{member?.name}</strong>
                    <span>{team?.name}</span>
                  </div>
                  <em>{member?.rating || '—'}</em>
                </div>
              );
            })}
          </div>

          <div className="yahooPaneTitle yahooRosterHeading">
            <span>{currentTeam?.name || 'Team'} Roster</span>
            <small>{currentRoster.length} members</small>
          </div>
          <div className="yahooCompactRoster">
            {currentRoster.map((member) => (
              <div key={member.id}>
                <span>{member.name}</span>
                <b>{member.rating || '—'}</b>
              </div>
            ))}
            {!currentRoster.length && <div className="yahooEmpty">No members drafted yet.</div>}
          </div>
        </aside>

        <main className="yahooPlayerPane">
          <div className="yahooTabs">
            <button className={activeTab === 'players' ? 'active' : ''} onClick={() => setActiveTab('players')}>Available Members</button>
            <button className={activeTab === 'results' ? 'active' : ''} onClick={() => setActiveTab('results')}>Draft Results</button>
          </div>

          {activeTab === 'players' ? (
            <>
              <div className="yahooPlayerTools">
                <label className="yahooSearch">
                  <Search size={18} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search available members" />
                </label>
                <label className="yahooSort">
                  <span>Sort</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value)}>
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="rating-desc">Score High-Low</option>
                    <option value="rating-asc">Score Low-High</option>
                  </select>
                  <ChevronDown size={16} />
                </label>
              </div>

              <div className="yahooTableHeader">
                <span></span>
                <span>Member</span>
                <span>Score</span>
                <span>Status</span>
                <span></span>
              </div>

              <div className="yahooPlayerList">
                {filteredMembers.map((member) => {
                  const queued = queue.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      className={`yahooPlayerRow ${selectedId === member.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(member.id)}
                    >
                      <button
                        className={`yahooStar ${queued ? 'queued' : ''}`}
                        type="button"
                        aria-label={queued ? 'Remove from queue' : 'Add to queue'}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleQueue(member.id);
                        }}
                      >
                        <Star size={18} fill={queued ? 'currentColor' : 'none'} />
                      </button>
                      <div className="yahooMemberIdentity">
                        <div className="yahooMemberAvatar">
                          {member.photo ? <img src={member.photo} alt="" /> : member.name.charAt(0)}
                        </div>
                        <strong>{member.name}</strong>
                      </div>
                      <b>{member.rating || '—'}</b>
                      <span className="yahooAvailableBadge">Available</span>
                      <button
                        type="button"
                        className="yahooDraftButton"
                        disabled={locked || !currentTeam}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDraft(member);
                        }}
                      >
                        Draft
                      </button>
                    </div>
                  );
                })}
                {!filteredMembers.length && <div className="yahooEmpty yahooPlayerEmpty">No available members match your search.</div>}
              </div>
            </>
          ) : (
            <div className="yahooResults">
              <div className="yahooResultsHeader">
                <span>Pick</span><span>Team</span><span>Member</span><span>Score</span>
              </div>
              {[...activeSeason.history].sort((a, b) => b.pickNumber - a.pickNumber).map((pick) => {
                const member = members.find((item) => item.id === pick.memberId);
                const team = teams.find((item) => item.id === pick.teamId);
                return (
                  <div className="yahooResultRow" key={`${pick.pickNumber}-${pick.memberId}`}>
                    <b>{pick.pickNumber}</b>
                    <span>{team?.name}</span>
                    <strong>{member?.name}</strong>
                    <em>{member?.rating || '—'}</em>
                  </div>
                );
              })}
            </div>
          )}

          {selectedMember && activeTab === 'players' && (
            <div className="yahooSelectedBar">
              <button className="yahooSelectedClose" type="button" onClick={() => setSelectedId(null)}><X size={16} /></button>
              <div>
                <span>Selected</span>
                <strong>{selectedMember.name}</strong>
              </div>
              <b>Score {selectedMember.rating || '—'}</b>
              <button type="button" disabled={locked || !currentTeam} onClick={() => handleDraft(selectedMember)}>
                Draft to {currentTeam?.name || 'Team'}
              </button>
            </div>
          )}
        </main>

        <aside className="yahooQueuePane">
          <div className="yahooTabs yahooRightTabs">
            <button className={rightTab === 'queue' ? 'active' : ''} onClick={() => setRightTab('queue')}>Queue ({queuedMembers.length})</button>
            <button className={rightTab === 'teams' ? 'active' : ''} onClick={() => setRightTab('teams')}>Teams</button>
          </div>

          {rightTab === 'queue' ? (
            <div className="yahooQueueList">
              {!queuedMembers.length && (
                <div className="yahooQueueEmpty">
                  <Star size={28} />
                  <strong>Your queue is empty</strong>
                  <span>Star members in the list to keep your preferred choices handy.</span>
                </div>
              )}
              {queuedMembers.map((member, index) => (
                <div className="yahooQueueRow" key={member.id}>
                  <b>{index + 1}</b>
                  <span>{member.name}</span>
                  <em>{member.rating || '—'}</em>
                  <button type="button" onClick={() => toggleQueue(member.id)}><X size={14} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="yahooTeamList">
              {teams.map((team) => {
                const roster = members.filter((member) => member.draftedTeamId === team.id);
                return (
                  <div key={team.id} className={team.id === currentTeam?.id ? 'current' : ''}>
                    <span><Users size={15} /> {team.name}</span>
                    <b>{roster.length}</b>
                    <small>{leadership(team)}</small>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
