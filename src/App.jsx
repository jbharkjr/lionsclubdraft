import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart3, CheckCircle2, Clock3, Download, FileUp, ImagePlus, Lock, Plus, RotateCcw, Save, Search, Shuffle, Star, Trash2, Trophy, Undo2, Unlock, Users, Zap } from 'lucide-react';

const STORAGE_KEY = 'lions-club-draft-phase-2b';
const TABLE = 'draft_app_state';
const ROW_ID = 'main';
const COLORS = ['gold', 'blue', 'navy', 'gray'];
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function makeDefaultTeams() {
  return Array.from({ length: 13 }, (_, index) => ({ id: `team-${index + 1}`, name: `Team ${index + 1}`, captain: `Captain ${index + 1}`, lieutenant: `Lt. ${index + 1}`, color: COLORS[index % COLORS.length] }));
}
function makeDefaultMembers() {
  return Array.from({ length: 52 }, (_, index) => ({ id: `member-${index + 1}`, name: `Member ${index + 1}`, rating: Number((Math.random() * 4 + 5).toFixed(1)), note: index % 4 === 0 ? 'Good attendance / reliable helper' : '', photo: '', tags: '', draftedTeamId: null, pickNumber: null }));
}
function makeSeason(name = '2026 Draft') {
  const teams = makeDefaultTeams();
  return { id: crypto.randomUUID?.() || `season-${Date.now()}`, name, teams, draftOrder: teams, members: makeDefaultMembers(), history: [], locked: false };
}
function makeDefaultState() { const season = makeSeason(); return { activeSeasonId: season.id, seasons: [season] }; }
function normalizeState(parsed) {
  if (!parsed?.seasons?.length) return makeDefaultState();
  const seasons = parsed.seasons.map((season) => {
    const teams = (season.teams?.length ? season.teams : makeDefaultTeams()).map((team, index) => ({ color: COLORS[index % COLORS.length], ...team }));
    return { ...season, teams, draftOrder: season.draftOrder?.length ? season.draftOrder.map((team) => teams.find((item) => item.id === team.id) || team) : teams, members: (season.members?.length ? season.members : []).map((member) => ({ tags: '', photo: '', note: '', draftedTeamId: null, pickNumber: null, ...member })), history: season.history || [], locked: Boolean(season.locked) };
  });
  return { activeSeasonId: seasons.some((s) => s.id === parsed.activeSeasonId) ? parsed.activeSeasonId : seasons[0].id, seasons };
}
function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('lions-club-draft-phase-2a') || localStorage.getItem('lions-club-draft-fantasy');
    return raw ? normalizeState(JSON.parse(raw)) : makeDefaultState();
  } catch { return makeDefaultState(); }
}
function shuffleTeams(teams) { const copy = [...teams]; for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
function getCurrentTeam(order, pickCount) { if (!order.length) return null; const round = Math.floor(pickCount / order.length); const index = pickCount % order.length; return round % 2 === 0 ? order[index] : order[order.length - 1 - index]; }
function getAverageRating(roster) { if (!roster.length) return '—'; return (roster.reduce((sum, member) => sum + Number(member.rating || 0), 0) / roster.length).toFixed(1); }
function parseCsv(text) {
  const rows = []; let current = ''; let row = []; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]; const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { current += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(current.trim()); current = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (current || row.length) { row.push(current.trim()); rows.push(row); row = []; current = ''; } if (char === '\r' && next === '\n') i += 1; }
    else current += char;
  }
  if (current || row.length) { row.push(current.trim()); rows.push(row); }
  return rows.filter((item) => item.some(Boolean));
}
function importMembersFromCsv(text) {
  const rows = parseCsv(text); if (!rows.length) return [];
  const headers = rows[0].map((header) => header.toLowerCase().trim());
  const hasHeader = headers.some((header) => ['name', 'member', 'rating', 'note', 'notes', 'photo', 'tags'].includes(header));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const indexFor = (...names) => { const index = headers.findIndex((header) => names.includes(header)); return index >= 0 ? index : null; };
  const nameIndex = hasHeader ? indexFor('name', 'member', 'member name', 'full name') : 0;
  const ratingIndex = hasHeader ? indexFor('rating', 'score') : 1;
  const noteIndex = hasHeader ? indexFor('note', 'notes') : 2;
  const photoIndex = hasHeader ? indexFor('photo', 'photo url', 'image', 'image url') : 3;
  const tagsIndex = hasHeader ? indexFor('tags', 'tag') : 4;
  return dataRows.map((row, index) => ({ id: crypto.randomUUID?.() || `member-import-${Date.now()}-${index}`, name: row[nameIndex ?? 0]?.trim() || '', rating: Number(row[ratingIndex ?? -1]) || 5, note: row[noteIndex ?? -1] || '', photo: row[photoIndex ?? -1] || '', tags: row[tagsIndex ?? -1] || '', draftedTeamId: null, pickNumber: null })).filter((member) => member.name);
}
function toCsvValue(value) { const stringValue = String(value ?? ''); return /[",\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue; }
function downloadText(filename, text) { const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }

export default function App() {
  const [state, setState] = useState(loadLocalState);
  const [remoteReady, setRemoteReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState(supabase ? 'Connecting to Supabase...' : 'Local only');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('rating');
  const [activePanel, setActivePanel] = useState('draft');
  const [newSeasonName, setNewSeasonName] = useState('');
  const importRef = useRef(null);
  const saveTimer = useRef(null);

  const activeSeason = state.seasons.find((season) => season.id === state.activeSeasonId) || state.seasons[0];
  const teams = activeSeason.teams;
  const members = activeSeason.members;
  const draftOrder = activeSeason.draftOrder;
  const history = activeSeason.history;

  useEffect(() => {
    let cancelled = false;
    async function loadRemoteState() {
      if (!supabase) { setRemoteReady(true); return; }
      setSyncStatus('Loading from Supabase...');
      const { data, error } = await supabase.from(TABLE).select('data').eq('id', ROW_ID).maybeSingle();
      if (cancelled) return;
      if (error) { console.error(error); setSyncStatus('Supabase load error - using local copy'); setRemoteReady(true); return; }
      if (data?.data) { setState(normalizeState(data.data)); setSyncStatus('Loaded from Supabase'); }
      else {
        const localState = loadLocalState(); setState(localState);
        const { error: insertError } = await supabase.from(TABLE).upsert({ id: ROW_ID, data: localState, updated_at: new Date().toISOString() });
        setSyncStatus(insertError ? 'Supabase save error' : 'Supabase initialized');
      }
      setRemoteReady(true);
    }
    loadRemoteState();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!supabase || !remoteReady) return;
    clearTimeout(saveTimer.current);
    setSyncStatus('Saving...');
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, data: state, updated_at: new Date().toISOString() });
      setSyncStatus(error ? 'Supabase save error' : `Saved ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
      if (error) console.error(error);
    }, 700);
  }, [state, remoteReady]);

  const forceSave = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!supabase) { setSyncStatus('Saved locally only'); return; }
    setSyncStatus('Saving...');
    const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, data: state, updated_at: new Date().toISOString() });
    setSyncStatus(error ? 'Supabase save error' : 'Saved to Supabase');
  };
  const updateSeason = (updater) => setState((prev) => ({ ...prev, seasons: prev.seasons.map((season) => (season.id === prev.activeSeasonId ? updater(season) : season)) }));
  const draftedCount = members.filter((member) => member.draftedTeamId).length;
  const currentTeam = getCurrentTeam(draftOrder, draftedCount);
  const round = Math.floor(draftedCount / teams.length) + 1;
  const draftPercent = members.length ? Math.round((draftedCount / members.length) * 100) : 0;
  const availableMembers = useMemo(() => members.filter((member) => !member.draftedTeamId).filter((member) => `${member.name} ${member.note} ${member.tags}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.rating - a.rating)), [members, query, sort]);
  const topAvailable = availableMembers.slice(0, 6);
  const lastPick = history.length ? history[history.length - 1] : null;
  const lastPickMember = lastPick ? members.find((member) => member.id === lastPick.memberId) : null;
  const lastPickTeam = lastPick ? teams.find((team) => team.id === lastPick.teamId) : null;
  const teamStats = teams.map((team) => { const roster = members.filter((member) => member.draftedTeamId === team.id); return { team, roster, avg: roster.length ? Number(getAverageRating(roster)) : 0 }; });
  const strongestTeam = [...teamStats].sort((a, b) => b.avg - a.avg)[0];
  const draftMember = (memberId) => { if (!currentTeam || activeSeason.locked) return; const pickNumber = draftedCount + 1; updateSeason((season) => ({ ...season, members: season.members.map((member) => (member.id === memberId ? { ...member, draftedTeamId: currentTeam.id, pickNumber } : member)), history: [...season.history, { memberId, teamId: currentTeam.id, pickNumber, timestamp: new Date().toISOString() }] })); };
  const undoLastPick = () => { if (activeSeason.locked) return; const last = history[history.length - 1]; if (!last) return; updateSeason((season) => ({ ...season, members: season.members.map((member) => (member.id === last.memberId ? { ...member, draftedTeamId: null, pickNumber: null } : member)), history: season.history.slice(0, -1) })); };
  const updateMember = (id, field, value) => updateSeason((season) => ({ ...season, members: season.members.map((member) => (member.id === id ? { ...member, [field]: value } : member)) }));
  const deleteMember = (id) => { if (!window.confirm('Delete this member from the active season?')) return; updateSeason((season) => ({ ...season, members: season.members.filter((member) => member.id !== id), history: season.history.filter((pick) => pick.memberId !== id) })); };
  const updateTeam = (id, field, value) => updateSeason((season) => { const teamsNext = season.teams.map((team) => (team.id === id ? { ...team, [field]: value } : team)); return { ...season, teams: teamsNext, draftOrder: season.draftOrder.map((team) => teamsNext.find((candidate) => candidate.id === team.id) || team) }; });
  const randomizeOrder = () => { if (activeSeason.locked) return; if (history.length && !window.confirm('Randomizing will clear current picks for this season. Continue?')) return; updateSeason((season) => ({ ...season, draftOrder: shuffleTeams(season.teams), members: season.members.map((member) => ({ ...member, draftedTeamId: null, pickNumber: null })), history: [] })); };
  const resetDraft = () => { if (!window.confirm('Reset all picks for this season? Members, notes, ratings, and teams will remain.')) return; updateSeason((season) => ({ ...season, members: season.members.map((member) => ({ ...member, draftedTeamId: null, pickNumber: null })), history: [] })); };
  const addSeason = () => { const name = newSeasonName.trim() || `${new Date().getFullYear()} Draft`; const season = makeSeason(name); setState((prev) => ({ activeSeasonId: season.id, seasons: [...prev.seasons, season] })); setNewSeasonName(''); };
  const renameSeason = (name) => updateSeason((season) => ({ ...season, name }));
  const toggleLock = () => updateSeason((season) => ({ ...season, locked: !season.locked }));
  const addMember = () => updateSeason((season) => ({ ...season, members: [...season.members, { id: crypto.randomUUID?.() || `member-${Date.now()}`, name: `New Member ${season.members.length + 1}`, rating: 5, note: '', photo: '', tags: '', draftedTeamId: null, pickNumber: null }] }));
  const handleImport = async (event) => { const file = event.target.files?.[0]; if (!file) return; const text = await file.text(); const imported = importMembersFromCsv(text); if (!imported.length) { window.alert('No valid members found. Use columns like Name, Rating, Notes, Photo, Tags.'); return; } const mode = window.confirm(`Import ${imported.length} members. Press OK to replace current members, or Cancel to append them.`); updateSeason((season) => ({ ...season, members: mode ? imported : [...season.members, ...imported], history: [] })); event.target.value = ''; };
  const exportMembers = () => { const header = ['Name', 'Rating', 'Notes', 'Photo', 'Tags', 'Drafted Team', 'Pick Number']; const lines = members.map((member) => { const team = teams.find((item) => item.id === member.draftedTeamId); return [member.name, member.rating, member.note, member.photo, member.tags, team?.name || '', member.pickNumber || ''].map(toCsvValue).join(','); }); downloadText(`${activeSeason.name.replaceAll(' ', '-')}-members.csv`, [header.join(','), ...lines].join('\n')); };
  const exportRosters = () => { const header = ['Team', 'Captain', 'Lt', 'Member', 'Rating', 'Pick Number', 'Notes', 'Tags']; const lines = teams.flatMap((team) => members.filter((member) => member.draftedTeamId === team.id).sort((a, b) => a.pickNumber - b.pickNumber).map((member) => [team.name, team.captain, team.lieutenant, member.name, member.rating, member.pickNumber, member.note, member.tags].map(toCsvValue).join(','))); downloadText(`${activeSeason.name.replaceAll(' ', '-')}-rosters.csv`, [header.join(','), ...lines].join('\n')); };

  return <main className="appShell">
    <header className="draftHero"><div className="brandBlock"><div className="leagueMark">LC</div><div><p className="eyebrow">Lions Club Fantasy Draft</p><h1>{activeSeason.name}</h1><p className="subtle">Snake draft command center with Supabase-backed persistence.</p></div></div><div className="heroActions"><button className="primaryBtn" type="button" onClick={randomizeOrder}><Shuffle size={18}/> Randomize</button><button className="secondaryBtn" type="button" onClick={resetDraft}><RotateCcw size={17}/> Reset</button><button className="secondaryBtn" type="button" onClick={undoLastPick}><Undo2 size={17}/> Undo</button><button className="secondaryBtn" type="button" onClick={toggleLock}>{activeSeason.locked ? <Unlock size={17}/> : <Lock size={17}/>} {activeSeason.locked ? 'Unlock' : 'Lock'}</button></div></header>
    <section className="scoreboard"><div className="onClock card"><span className="label">On The Clock</span><h2>{currentTeam?.name}</h2><p>{currentTeam?.captain} / {currentTeam?.lieutenant}</p><div className="pickLine"><strong>Round {round}</strong><span>Pick {draftedCount + 1}</span><small>{draftedCount}/{members.length} drafted</small></div><div className="progressTrack"><span style={{ width: `${draftPercent}%` }} /></div></div><div className="tickerCard card"><span className="label">Last Pick</span><h3>{lastPickMember?.name || 'No picks yet'}</h3><p>{lastPickTeam?.name || 'Draft board ready'}</p></div><div className="tickerCard card"><span className="label">Strongest Team</span><h3>{strongestTeam?.team?.name || '—'}</h3><p>{strongestTeam?.roster?.length ? `Avg ${strongestTeam.avg.toFixed(1)}` : 'No drafted rosters yet'}</p></div></section>
    <section className="controlDeck card"><div className="seasonTools"><label>Season<select value={state.activeSeasonId} onChange={(event) => setState((prev) => ({ ...prev, activeSeasonId: event.target.value }))}>{state.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label><label>Rename Season<input value={activeSeason.name} onChange={(event) => renameSeason(event.target.value)} /></label><label>New Season<input value={newSeasonName} onChange={(event) => setNewSeasonName(event.target.value)} placeholder="2027 Draft" /></label><button className="secondaryBtn" type="button" onClick={addSeason}><Plus size={17}/> Add</button><button className="secondaryBtn" type="button" onClick={forceSave}><Save size={17}/> Save</button></div><div className="tabs"><button type="button" className={activePanel === 'draft' ? 'active' : ''} onClick={() => setActivePanel('draft')}><Zap size={16}/> Draft Room</button><button type="button" className={activePanel === 'teams' ? 'active' : ''} onClick={() => setActivePanel('teams')}><Users size={16}/> Teams</button><button type="button" className={activePanel === 'members' ? 'active' : ''} onClick={() => setActivePanel('members')}><Users size={16}/> Members</button><button type="button" className={activePanel === 'history' ? 'active' : ''} onClick={() => setActivePanel('history')}><Clock3 size={16}/> History</button><button type="button" className={activePanel === 'analytics' ? 'active' : ''} onClick={() => setActivePanel('analytics')}><BarChart3 size={16}/> Analytics</button></div><div className={`syncStatus ${supabase ? 'remote' : 'local'}`}>{syncStatus}</div></section>
    {activePanel === 'draft' && <DraftRoom members={members} teams={teams} draftOrder={draftOrder} availableMembers={availableMembers} topAvailable={topAvailable} query={query} setQuery={setQuery} sort={sort} setSort={setSort} updateMember={updateMember} draftMember={draftMember} locked={activeSeason.locked} />}
    {activePanel === 'teams' && <TeamSetup teams={teams} updateTeam={updateTeam} />}
    {activePanel === 'members' && <MemberManager members={members} addMember={addMember} updateMember={updateMember} deleteMember={deleteMember} handleImport={handleImport} importRef={importRef} exportMembers={exportMembers} exportRosters={exportRosters} />}
    {activePanel === 'history' && <DraftHistory history={history} members={members} teams={teams} />}
    {activePanel === 'analytics' && <Analytics teams={teams} members={members} />}
  </main>;
}

function DraftRoom({ members, teams, draftOrder, availableMembers, topAvailable, query, setQuery, sort, setSort, updateMember, draftMember, locked }) { return <section className="draftRoomGrid"><div className="leftRail"><div className="card panelCard"><div className="panelHeader"><h2>Top Remaining</h2><span>{availableMembers.length} available</span></div><div className="topList">{topAvailable.map((member, index) => <div className="topProspect" key={member.id}><b>#{index + 1}</b><span>{member.name}</span><strong>{member.rating}</strong></div>)}</div></div><div className="card panelCard"><h2><Trophy size={20}/> Snake Order</h2><div className="orderList">{draftOrder.map((team, index) => <div className="orderRow" key={team.id}><span>{index + 1}</span><strong>{team.name}</strong></div>)}</div></div></div><div className="card draftPool"><div className="panelHeader"><h2>Draft Pool</h2><span>{members.length} total</span></div><div className="toolsRow"><label className="searchBox"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, notes, or tags" /></label><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="rating">Sort by Rating</option><option value="name">Sort by Name</option></select></div><div className="prospectGrid">{availableMembers.map((member) => <article className="prospectCard" key={member.id}><div className="avatarXL">{member.photo ? <img src={member.photo} alt={member.name} /> : <ImagePlus size={26} />}</div><div className="prospectBody"><div className="prospectTop"><input className="memberName" value={member.name} onChange={(event) => updateMember(member.id, 'name', event.target.value)} /><span className="ratingBadge"><Star size={14}/> {member.rating}</span></div><textarea value={member.note} onChange={(event) => updateMember(member.id, 'note', event.target.value)} placeholder="Draft note..." /><div className="tagLine">{member.tags}</div><div className="memberMeta"><input type="number" min="0" max="10" step="0.1" value={member.rating} onChange={(event) => updateMember(member.id, 'rating', Number(event.target.value))} /><button type="button" disabled={locked} onClick={() => draftMember(member.id)}><CheckCircle2 size={16}/> Draft</button></div></div></article>)}</div></div><TeamGrid teams={teams} members={members} /></section>; }
function TeamSetup({ teams, updateTeam }) { return <section className="card setupPanel"><h2>Team Setup</h2><p className="helperText">Edit team names, captains, lieutenants, and team colors.</p><div className="teamSetupGrid">{teams.map((team) => <article className="setupCard" key={team.id}><label>Team Name<input value={team.name} onChange={(event) => updateTeam(team.id, 'name', event.target.value)} /></label><label>Captain<input value={team.captain} onChange={(event) => updateTeam(team.id, 'captain', event.target.value)} /></label><label>Lt.<input value={team.lieutenant} onChange={(event) => updateTeam(team.id, 'lieutenant', event.target.value)} /></label><label>Color<select value={team.color} onChange={(event) => updateTeam(team.id, 'color', event.target.value)}>{COLORS.map((color) => <option key={color} value={color}>{color}</option>)}</select></label></article>)}</div></section>; }
function MemberManager({ members, addMember, updateMember, deleteMember, handleImport, importRef, exportMembers, exportRosters }) { return <section className="card setupPanel"><div className="panelHeader managerHeader"><h2>Member Manager</h2><div className="heroActions"><input ref={importRef} hidden type="file" accept=".csv,text/csv" onChange={handleImport} /><button className="secondaryBtn" type="button" onClick={() => importRef.current?.click()}><FileUp size={17}/> Import CSV</button><button className="secondaryBtn" type="button" onClick={exportMembers}><Download size={17}/> Export Members</button><button className="secondaryBtn" type="button" onClick={exportRosters}><Download size={17}/> Export Rosters</button><button className="primaryBtn" type="button" onClick={addMember}><Plus size={17}/> Add Member</button></div></div><p className="helperText">CSV columns supported: Name, Rating, Notes, Photo, Tags.</p><div className="memberManagerList">{members.map((member) => <article className="managerRow" key={member.id}><input value={member.name} onChange={(event) => updateMember(member.id, 'name', event.target.value)} /><input type="number" min="0" max="10" step="0.1" value={member.rating} onChange={(event) => updateMember(member.id, 'rating', Number(event.target.value))} /><input value={member.photo} onChange={(event) => updateMember(member.id, 'photo', event.target.value)} placeholder="Photo URL" /><input value={member.tags} onChange={(event) => updateMember(member.id, 'tags', event.target.value)} placeholder="Tags" /><textarea value={member.note} onChange={(event) => updateMember(member.id, 'note', event.target.value)} placeholder="Notes" /><button className="dangerBtn" type="button" onClick={() => deleteMember(member.id)}><Trash2 size={16}/></button></article>)}</div></section>; }
function DraftHistory({ history, members, teams }) { const ordered = [...history].sort((a, b) => b.pickNumber - a.pickNumber); return <section className="card setupPanel"><h2><Clock3 size={20}/> Draft History</h2><p className="helperText">Most recent picks appear first.</p><div className="historyList">{ordered.length === 0 && <p>No picks have been made yet.</p>}{ordered.map((pick) => { const member = members.find((item) => item.id === pick.memberId); const team = teams.find((item) => item.id === pick.teamId); return <div className="historyRow" key={`${pick.pickNumber}-${pick.memberId}`}><strong>Pick {pick.pickNumber}</strong><span>{team?.name}</span><span>{member?.name}</span><b>{member?.rating}</b></div>; })}</div></section>; }
function Analytics({ teams, members }) { const stats = teams.map((team) => { const roster = members.filter((member) => member.draftedTeamId === team.id); return { team, roster, avg: roster.length ? Number(getAverageRating(roster)) : 0 }; }).sort((a, b) => b.avg - a.avg); return <section className="card setupPanel"><h2>Team Analytics</h2><p className="helperText">Ratings-based summary of drafted rosters.</p><div className="analyticsGrid">{stats.map(({ team, roster, avg }) => <article className="analyticsCard" key={team.id}><div><strong>{team.name}</strong><span>{roster.length} members</span></div><b>{roster.length ? avg.toFixed(1) : '—'}</b><div className="meter"><span style={{ width: `${Math.min(avg * 10, 100)}%` }} /></div></article>)}</div></section>; }
function TeamGrid({ teams, members }) { return <div className="teamBoard">{teams.map((team) => { const roster = members.filter((member) => member.draftedTeamId === team.id).sort((a, b) => a.pickNumber - b.pickNumber); const avg = getAverageRating(roster); return <section className={`teamCard ${team.color}`} key={team.id}><div className="teamTop"><div><h3>{team.name}</h3><p>{team.captain} / {team.lieutenant}</p></div><span>{roster.length}</span></div><small>Avg Rating: {avg}</small><ol>{roster.map((member) => <li key={member.id}><span>{member.name}</span><b>{member.rating}</b></li>)}</ol></section>; })}</div>; }
