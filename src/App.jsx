import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileUp,
  ImagePlus,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  Shuffle,
  Star,
  Trash2,
  Trophy,
  Undo2,
  Unlock,
  Users,
  Zap,
} from 'lucide-react';

const STORAGE_KEY = 'lions-club-draft-phase-2b';
const COLORS = ['gold', 'blue', 'navy', 'gray'];

function makeDefaultTeams() {
  return Array.from({ length: 13 }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    captain: `Captain ${index + 1}`,
    lieutenant: `Lt. ${index + 1}`,
    color: COLORS[index % COLORS.length],
  }));
}

function makeDefaultMembers() {
  return Array.from({ length: 52 }, (_, index) => ({
    id: `member-${index + 1}`,
    name: `Member ${index + 1}`,
    rating: Number((Math.random() * 4 + 5).toFixed(1)),
    note: index % 4 === 0 ? 'Good attendance / reliable helper' : '',
    photo: '',
    tags: '',
    draftedTeamId: null,
    pickNumber: null,
  }));
}

function makeSeason(name = '2026 Draft') {
  const teams = makeDefaultTeams();
  return {
    id: crypto.randomUUID?.() || `season-${Date.now()}`,
    name,
    teams,
    draftOrder: teams,
    members: makeDefaultMembers(),
    history: [],
    locked: false,
  };
}

function normalizeState(parsed) {
  if (!parsed?.seasons?.length) throw new Error('Invalid saved draft data');
  return {
    ...parsed,
    seasons: parsed.seasons.map((season) => ({
      ...season,
      members: season.members.map((member) => ({ tags: '', photo: '', note: '', ...member })),
      history: season.history || [],
      locked: Boolean(season.locked),
    })),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('lions-club-draft-phase-2a');
    if (!raw) {
      const season = makeSeason();
      return { activeSeasonId: season.id, seasons: [season] };
    }
    return normalizeState(JSON.parse(raw));
  } catch {
    const season = makeSeason();
    return { activeSeasonId: season.id, seasons: [season] };
  }
}

function shuffleTeams(teams) {
  const copy = [...teams];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getCurrentTeam(order, pickCount) {
  if (!order.length) return null;
  const round = Math.floor(pickCount / order.length);
  const index = pickCount % order.length;
  return round % 2 === 0 ? order[index] : order[order.length - 1 - index];
}

function getAverageRating(roster) {
  if (!roster.length) return '—';
  return (roster.reduce((sum, member) => sum + Number(member.rating || 0), 0) / roster.length).toFixed(1);
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (current || row.length) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = '';
      }
      if (char === '\r' && next === '\n') i += 1;
    } else {
      current += char;
    }
  }
  if (current || row.length) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows.filter((item) => item.some(Boolean));
}

function importMembersFromCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.toLowerCase().trim());
  const hasHeader = headers.some((header) => ['name', 'member', 'rating', 'note', 'notes', 'photo', 'tags'].includes(header));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const indexFor = (...names) => {
    const index = headers.findIndex((header) => names.includes(header));
    return index >= 0 ? index : null;
  };

  const nameIndex = hasHeader ? indexFor('name', 'member', 'member name', 'full name') : 0;
  const ratingIndex = hasHeader ? indexFor('rating', 'score') : 1;
  const noteIndex = hasHeader ? indexFor('note', 'notes') : 2;
  const photoIndex = hasHeader ? indexFor('photo', 'photo url', 'image', 'image url') : 3;
  const tagsIndex = hasHeader ? indexFor('tags', 'tag') : 4;

  return dataRows
    .map((row, index) => ({
      id: crypto.randomUUID?.() || `member-import-${Date.now()}-${index}`,
      name: row[nameIndex ?? 0]?.trim() || '',
      rating: Number(row[ratingIndex ?? -1]) || 5,
      note: row[noteIndex ?? -1] || '',
      photo: row[photoIndex ?? -1] || '',
      tags: row[tagsIndex ?? -1] || '',
      draftedTeamId: null,
      pickNumber: null,
    }))
    .filter((member) => member.name);
}

function toCsvValue(value) {
  const stringValue = String(value ?? '');
  return /[",\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function teamStats(teams, members) {
  return teams.map((team) => {
    const roster = members.filter((member) => member.draftedTeamId === team.id);
    const avg = roster.length ? Number(getAverageRating(roster)) : 0;
    return { team, roster, avg };
  });
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('rating');
  const [activePanel, setActivePanel] = useState('draft');
  const [newSeasonName, setNewSeasonName] = useState('');
  const importRef = useRef(null);

  const activeSeason = state.seasons.find((season) => season.id === state.activeSeasonId) || state.seasons[0];
  const teams = activeSeason.teams;
  const members = activeSeason.members;
  const draftOrder = activeSeason.draftOrder;
  const history = activeSeason.history;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateSeason = (updater) => {
    setState((prev) => ({
      ...prev,
      seasons: prev.seasons.map((season) => (
        season.id === prev.activeSeasonId ? updater(season) : season
      )),
    }));
  };

  const draftedCount = members.filter((member) => member.draftedTeamId).length;
  const currentTeam = getCurrentTeam(draftOrder, draftedCount);
  const nextTeam = getCurrentTeam(draftOrder, draftedCount + 1);
  const round = Math.floor(draftedCount / teams.length) + 1;
  const progress = members.length ? Math.round((draftedCount / members.length) * 100) : 0;
  const recentPick = history.length ? history[history.length - 1] : null;
  const recentMember = recentPick ? members.find((item) => item.id === recentPick.memberId) : null;
  const recentTeam = recentPick ? teams.find((item) => item.id === recentPick.teamId) : null;

  const availableMembers = useMemo(() => {
    return members
      .filter((member) => !member.draftedTeamId)
      .filter((member) => `${member.name} ${member.note} ${member.tags}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.rating - a.rating));
  }, [members, query, sort]);

  const topRemaining = availableMembers.slice(0, 5);
  const stats = teamStats(teams, members);
  const strongest = [...stats].filter((item) => item.roster.length).sort((a, b) => b.avg - a.avg)[0];

  const draftMember = (memberId) => {
    if (!currentTeam || activeSeason.locked) return;
    const pickNumber = draftedCount + 1;
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.id === memberId ? { ...member, draftedTeamId: currentTeam.id, pickNumber } : member
      )),
      history: [...season.history, { memberId, teamId: currentTeam.id, pickNumber, timestamp: new Date().toISOString() }],
    }));
  };

  const undoLastPick = () => {
    if (activeSeason.locked) return;
    const last = history[history.length - 1];
    if (!last) return;
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.id === last.memberId ? { ...member, draftedTeamId: null, pickNumber: null } : member
      )),
      history: season.history.slice(0, -1),
    }));
  };

  const updateMember = (id, field, value) => {
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.id === id ? { ...member, [field]: value } : member
      )),
    }));
  };

  const deleteMember = (id) => {
    if (!window.confirm('Delete this member from the active season?')) return;
    updateSeason((season) => ({
      ...season,
      members: season.members.filter((member) => member.id !== id),
      history: season.history.filter((pick) => pick.memberId !== id),
    }));
  };

  const updateTeam = (id, field, value) => {
    updateSeason((season) => {
      const teamsNext = season.teams.map((team) => (team.id === id ? { ...team, [field]: value } : team));
      const draftOrderNext = season.draftOrder.map((team) => teamsNext.find((candidate) => candidate.id === team.id) || team);
      return { ...season, teams: teamsNext, draftOrder: draftOrderNext };
    });
  };

  const randomizeOrder = () => {
    if (activeSeason.locked) return;
    if (history.length && !window.confirm('Randomizing will clear current picks for this season. Continue?')) return;
    updateSeason((season) => ({
      ...season,
      draftOrder: shuffleTeams(season.teams),
      members: season.members.map((member) => ({ ...member, draftedTeamId: null, pickNumber: null })),
      history: [],
    }));
  };

  const resetDraft = () => {
    if (!window.confirm('Reset all picks for this season? Members, notes, ratings, and teams will remain.')) return;
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => ({ ...member, draftedTeamId: null, pickNumber: null })),
      history: [],
    }));
  };

  const addSeason = () => {
    const name = newSeasonName.trim() || `${new Date().getFullYear()} Draft`;
    const season = makeSeason(name);
    setState((prev) => ({ activeSeasonId: season.id, seasons: [...prev.seasons, season] }));
    setNewSeasonName('');
  };

  const renameSeason = (name) => {
    updateSeason((season) => ({ ...season, name }));
  };

  const toggleLock = () => {
    updateSeason((season) => ({ ...season, locked: !season.locked }));
  };

  const addMember = () => {
    updateSeason((season) => ({
      ...season,
      members: [
        ...season.members,
        {
          id: crypto.randomUUID?.() || `member-${Date.now()}`,
          name: `New Member ${season.members.length + 1}`,
          rating: 5,
          note: '',
          photo: '',
          tags: '',
          draftedTeamId: null,
          pickNumber: null,
        },
      ],
    }));
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const imported = importMembersFromCsv(text);
    if (!imported.length) {
      window.alert('No valid members found. Use columns like Name, Rating, Notes, Photo, Tags.');
      return;
    }
    const mode = window.confirm(`Import ${imported.length} members. Press OK to replace current members, or Cancel to append them.`);
    updateSeason((season) => ({
      ...season,
      members: mode ? imported : [...season.members, ...imported],
      history: [],
    }));
    event.target.value = '';
  };

  const exportMembers = () => {
    const header = ['Name', 'Rating', 'Notes', 'Photo', 'Tags', 'Drafted Team', 'Pick Number'];
    const lines = members.map((member) => {
      const team = teams.find((item) => item.id === member.draftedTeamId);
      return [member.name, member.rating, member.note, member.photo, member.tags, team?.name || '', member.pickNumber || ''].map(toCsvValue).join(',');
    });
    downloadText(`${activeSeason.name.replaceAll(' ', '-')}-members.csv`, [header.join(','), ...lines].join('\n'));
  };

  const exportRosters = () => {
    const header = ['Team', 'Captain', 'Lt', 'Member', 'Rating', 'Pick Number', 'Notes', 'Tags'];
    const lines = teams.flatMap((team) => members
      .filter((member) => member.draftedTeamId === team.id)
      .sort((a, b) => a.pickNumber - b.pickNumber)
      .map((member) => [team.name, team.captain, team.lieutenant, member.name, member.rating, member.pickNumber, member.note, member.tags].map(toCsvValue).join(',')));
    downloadText(`${activeSeason.name.replaceAll(' ', '-')}-rosters.csv`, [header.join(','), ...lines].join('\n'));
  };

  return (
    <main className="draftShell">
      <section className="scoreboard">
        <div className="scoreboardGlow" />
        <div className="leagueMark">
          <div className="crest"><Shield size={34} /></div>
          <div>
            <span>Lions Club Fantasy Draft</span>
            <h1>{activeSeason.name}</h1>
          </div>
        </div>
        <div className="scoreboardStats">
          <StatPill label="Round" value={round} />
          <StatPill label="Pick" value={draftedCount + 1} />
          <StatPill label="Drafted" value={`${draftedCount}/${members.length}`} />
          <StatPill label="Status" value={activeSeason.locked ? 'Locked' : 'Live'} />
        </div>
      </section>

      <section className={`onClockCard ${currentTeam?.color || 'blue'}`}>
        <div className="onClockLabel"><Zap size={18} /> On The Clock</div>
        <div className="onClockMain">
          <div>
            <h2>{currentTeam?.name || 'Draft Complete'}</h2>
            <p>{currentTeam ? `${currentTeam.captain} / ${currentTeam.lieutenant}` : 'All members have been selected.'}</p>
          </div>
          <div className="clockRound">
            <span>Round {round}</span>
            <strong>Pick {draftedCount + 1}</strong>
          </div>
        </div>
        <div className="draftProgress"><span style={{ width: `${progress}%` }} /></div>
        <div className="tickerBar">
          <span>Next: {nextTeam?.name || '—'}</span>
          <span>Last: {recentMember ? `${recentMember.name} to ${recentTeam?.name}` : 'No picks yet'}</span>
          <span>Top Team: {strongest ? `${strongest.team.name} ${strongest.avg.toFixed(1)}` : '—'}</span>
        </div>
      </section>

      <section className="controlDeck">
        <div className="seasonPanel glassCard">
          <label>Season<select value={state.activeSeasonId} onChange={(event) => setState((prev) => ({ ...prev, activeSeasonId: event.target.value }))}>{state.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
          <label>Rename<input value={activeSeason.name} onChange={(event) => renameSeason(event.target.value)} /></label>
          <label>New Season<input value={newSeasonName} onChange={(event) => setNewSeasonName(event.target.value)} placeholder="2027 Draft" /></label>
          <button className="utilityBtn" type="button" onClick={addSeason}><Plus size={17} /> Add</button>
        </div>

        <div className="actionPanel glassCard">
          <button className="goldBtn" type="button" onClick={randomizeOrder}><Shuffle size={18} /> Randomize</button>
          <button className="utilityBtn" type="button" onClick={resetDraft}><RotateCcw size={17} /> Reset</button>
          <button className="utilityBtn" type="button" onClick={undoLastPick}><Undo2 size={17} /> Undo</button>
          <button className="utilityBtn" type="button" onClick={toggleLock}>{activeSeason.locked ? <Unlock size={17} /> : <Lock size={17} />} {activeSeason.locked ? 'Unlock' : 'Lock'}</button>
        </div>
      </section>

      <nav className="draftTabs">
        <button type="button" className={activePanel === 'draft' ? 'active' : ''} onClick={() => setActivePanel('draft')}>Draft Room</button>
        <button type="button" className={activePanel === 'teams' ? 'active' : ''} onClick={() => setActivePanel('teams')}>Team Setup</button>
        <button type="button" className={activePanel === 'members' ? 'active' : ''} onClick={() => setActivePanel('members')}>Member Manager</button>
        <button type="button" className={activePanel === 'history' ? 'active' : ''} onClick={() => setActivePanel('history')}>Draft History</button>
        <button type="button" className={activePanel === 'analytics' ? 'active' : ''} onClick={() => setActivePanel('analytics')}>Analytics</button>
      </nav>

      {activePanel === 'draft' && (
        <DraftRoom
          members={members}
          teams={teams}
          draftOrder={draftOrder}
          availableMembers={availableMembers}
          topRemaining={topRemaining}
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          updateMember={updateMember}
          draftMember={draftMember}
          locked={activeSeason.locked}
        />
      )}
      {activePanel === 'teams' && <TeamSetup teams={teams} updateTeam={updateTeam} />}
      {activePanel === 'members' && <MemberManager members={members} addMember={addMember} updateMember={updateMember} deleteMember={deleteMember} handleImport={handleImport} importRef={importRef} exportMembers={exportMembers} exportRosters={exportRosters} />}
      {activePanel === 'history' && <DraftHistory history={history} members={members} teams={teams} />}
      {activePanel === 'analytics' && <Analytics teams={teams} members={members} />}
    </main>
  );
}

function StatPill({ label, value }) {
  return <div className="statPill"><span>{label}</span><strong>{value}</strong></div>;
}

function DraftRoom({ members, teams, draftOrder, availableMembers, topRemaining, query, setQuery, sort, setSort, updateMember, draftMember, locked }) {
  return (
    <section className="draftRoomGrid">
      <aside className="prospectBoard glassCard">
        <div className="panelTitle"><div><span>Prospects</span><h2>Available Members</h2></div><b>{availableMembers.length}</b></div>
        <div className="toolsRow">
          <label className="searchBox"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, notes, or tags" /></label>
          <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="rating">Rating</option><option value="name">Name</option></select>
        </div>
        <div className="memberList">
          {availableMembers.map((member) => <DraftMemberCard key={member.id} member={member} updateMember={updateMember} draftMember={draftMember} locked={locked} />)}
        </div>
      </aside>

      <section className="centralBoard">
        <div className="miniBoard glassCard">
          <h3><Star size={18} /> Top Remaining</h3>
          {topRemaining.map((member, index) => <div className="topProspect" key={member.id}><span>{index + 1}</span><strong>{member.name}</strong><b>{member.rating}</b></div>)}
        </div>
        <div className="orderBoard glassCard">
          <h3><Trophy size={18} /> Snake Order</h3>
          <div className="orderStack">{draftOrder.map((team, index) => <div className={`orderChip ${team.color}`} key={team.id}><span>{index + 1}</span><strong>{team.name}</strong><ChevronRight size={15} /></div>)}</div>
        </div>
      </section>

      <section className="teamWarRoom">
        <TeamGrid teams={teams} members={members} />
      </section>
    </section>
  );
}

function DraftMemberCard({ member, updateMember, draftMember, locked }) {
  return (
    <article className="draftCard">
      <div className="avatar big">{member.photo ? <img src={member.photo} alt={member.name} /> : <ImagePlus size={26} />}</div>
      <div className="memberInfo">
        <input className="memberName" value={member.name} onChange={(event) => updateMember(member.id, 'name', event.target.value)} />
        <div className="ratingBadge"><Star size={15} /> {member.rating}</div>
        <textarea value={member.note} onChange={(event) => updateMember(member.id, 'note', event.target.value)} placeholder="Add note..." />
        <div className="tagLine">{member.tags}</div>
        <div className="memberMeta">
          <label><span>Rating</span><input type="number" min="0" max="10" step="0.1" value={member.rating} onChange={(event) => updateMember(member.id, 'rating', Number(event.target.value))} /></label>
          <button type="button" disabled={locked} onClick={() => draftMember(member.id)}><CheckCircle2 size={16} /> Draft</button>
        </div>
      </div>
    </article>
  );
}

function TeamSetup({ teams, updateTeam }) {
  return (
    <section className="glassCard setupPanel">
      <div className="panelTitle"><div><span>Franchise Control</span><h2>Team Setup</h2></div></div>
      <p className="helperText">Edit team names, captains, lieutenants, and team colors. Draft order stays linked to these teams.</p>
      <div className="teamSetupGrid">
        {teams.map((team) => (
          <article className={`setupCard ${team.color}`} key={team.id}>
            <label>Team Name<input value={team.name} onChange={(event) => updateTeam(team.id, 'name', event.target.value)} /></label>
            <label>Captain<input value={team.captain} onChange={(event) => updateTeam(team.id, 'captain', event.target.value)} /></label>
            <label>Lt.<input value={team.lieutenant} onChange={(event) => updateTeam(team.id, 'lieutenant', event.target.value)} /></label>
            <label>Color<select value={team.color} onChange={(event) => updateTeam(team.id, 'color', event.target.value)}>{COLORS.map((color) => <option key={color} value={color}>{color}</option>)}</select></label>
          </article>
        ))}
      </div>
    </section>
  );
}

function MemberManager({ members, addMember, updateMember, deleteMember, handleImport, importRef, exportMembers, exportRosters }) {
  return (
    <section className="glassCard setupPanel">
      <div className="panelTitle managerHeader">
        <div><span>Roster Database</span><h2>Member Manager</h2></div>
        <div className="heroActions">
          <input ref={importRef} hidden type="file" accept=".csv,text/csv" onChange={handleImport} />
          <button className="utilityBtn" type="button" onClick={() => importRef.current?.click()}><FileUp size={17} /> Import CSV</button>
          <button className="utilityBtn" type="button" onClick={exportMembers}><Download size={17} /> Members</button>
          <button className="utilityBtn" type="button" onClick={exportRosters}><Download size={17} /> Rosters</button>
          <button className="goldBtn" type="button" onClick={addMember}><Plus size={17} /> Add Member</button>
        </div>
      </div>
      <p className="helperText">CSV columns supported: Name, Rating, Notes, Photo, Tags. Import can replace or append members.</p>
      <div className="memberManagerList">
        {members.map((member) => (
          <article className="managerRow" key={member.id}>
            <input value={member.name} onChange={(event) => updateMember(member.id, 'name', event.target.value)} />
            <input type="number" min="0" max="10" step="0.1" value={member.rating} onChange={(event) => updateMember(member.id, 'rating', Number(event.target.value))} />
            <input value={member.photo} onChange={(event) => updateMember(member.id, 'photo', event.target.value)} placeholder="Photo URL" />
            <input value={member.tags} onChange={(event) => updateMember(member.id, 'tags', event.target.value)} placeholder="Tags" />
            <textarea value={member.note} onChange={(event) => updateMember(member.id, 'note', event.target.value)} placeholder="Notes" />
            <button className="dangerBtn" type="button" onClick={() => deleteMember(member.id)}><Trash2 size={16} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}

function DraftHistory({ history, members, teams }) {
  const ordered = [...history].sort((a, b) => b.pickNumber - a.pickNumber);
  return (
    <section className="glassCard setupPanel">
      <div className="panelTitle"><div><span>Selection Feed</span><h2><Clock3 size={20} /> Draft History</h2></div></div>
      <p className="helperText">Most recent picks appear first.</p>
      <div className="historyList">
        {ordered.length === 0 && <p>No picks have been made yet.</p>}
        {ordered.map((pick) => {
          const member = members.find((item) => item.id === pick.memberId);
          const team = teams.find((item) => item.id === pick.teamId);
          return <div className="historyRow" key={`${pick.pickNumber}-${pick.memberId}`}><strong>Pick {pick.pickNumber}</strong><span>{team?.name}</span><span>{member?.name}</span><b>{member?.rating}</b></div>;
        })}
      </div>
    </section>
  );
}

function Analytics({ teams, members }) {
  const stats = teamStats(teams, members).sort((a, b) => b.avg - a.avg);
  return (
    <section className="glassCard setupPanel">
      <div className="panelTitle"><div><span>Team Intelligence</span><h2><BarChart3 size={20} /> Analytics</h2></div></div>
      <p className="helperText">Ratings-based summary of drafted rosters.</p>
      <div className="analyticsGrid">
        {stats.map(({ team, roster, avg }) => (
          <article className={`analyticsCard ${team.color}`} key={team.id}>
            <div><strong>{team.name}</strong><span>{roster.length} members</span></div>
            <b>{roster.length ? avg.toFixed(1) : '—'}</b>
            <div className="meter"><span style={{ width: `${Math.min(avg * 10, 100)}%` }} /></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TeamGrid({ teams, members }) {
  return (
    <div className="teamGrid">
      {teams.map((team) => {
        const roster = members.filter((member) => member.draftedTeamId === team.id).sort((a, b) => a.pickNumber - b.pickNumber);
        const avg = getAverageRating(roster);
        return (
          <section className={`teamCard ${team.color}`} key={team.id}>
            <div className="teamTop"><h3>{team.name}</h3><span><Users size={14} /> {roster.length}</span></div>
            <p>{team.captain} / {team.lieutenant}</p>
            <small>Avg Rating: {avg}</small>
            <ol>{roster.map((member) => <li key={member.id}><span>{member.name}</span><b>{member.rating}</b></li>)}</ol>
          </section>
        );
      })}
    </div>
  );
}
