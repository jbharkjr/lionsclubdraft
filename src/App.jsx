import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart3, CheckCircle2, Clock3, Download, FileUp, ImagePlus, Lock, Plus, RotateCcw, Save, Search, Shuffle, Star, Trash2, Trophy, Undo2, Unlock, Users, Zap } from 'lucide-react';
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  Download,
  FileUp,
  HelpCircle,
  ImagePlus,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shuffle,
  Star,
  Trash2,
  Trophy,
  Undo2,
  Unlock,
  Users,
  Zap,
  X,
} from 'lucide-react';

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
  const [syncStatus, setSyncStatus] = useState(supabase ? 'Connecting...' : 'Local only');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('rating');
  const [activePanel, setActivePanel] = useState('draft');
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      setSyncStatus('Loading...');
      const { data, error } = await supabase.from(SUPABASE_TABLE).select('data').eq('id', SUPABASE_ROW_ID).maybeSingle();
      if (cancelled) return;
      if (error) { console.error(error); setSyncStatus('Supabase load error'); setRemoteReady(true); return; }
      if (data?.data) { setState(normalizeState(data.data)); setSyncStatus('Connected'); }
      else {
        const localState = loadLocalState();
        setState(localState);
        const { error: insertError } = await supabase.from(SUPABASE_TABLE).upsert({ id: SUPABASE_ROW_ID, data: localState, updated_at: new Date().toISOString() });
        setSyncStatus(insertError ? 'Supabase save error' : 'Connected');
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
      const { error } = await supabase.from(SUPABASE_TABLE).upsert({ id: SUPABASE_ROW_ID, data: state, updated_at: new Date().toISOString() });
      setSyncStatus(error ? 'Supabase save error' : 'Connected');
    }, 650);
  }, [state, remoteReady]);

  const forceSave = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!supabase) { setSyncStatus('Saved locally'); return; }
    setSyncStatus('Saving...');
    const { error } = await supabase.from(SUPABASE_TABLE).upsert({ id: SUPABASE_ROW_ID, data: state, updated_at: new Date().toISOString() });
    setSyncStatus(error ? 'Supabase save error' : 'Connected');
  };

  const updateSeason = (updater) => setState((prev) => ({ ...prev, seasons: prev.seasons.map((season) => season.id === prev.activeSeasonId ? updater(season) : season) }));
  const draftedCount = members.filter((m) => m.draftedTeamId).length;
  const currentTeam = getCurrentTeam(draftOrder, draftedCount);
  const round = Math.floor(draftedCount / Math.max(teams.length, 1)) + 1;
  const totalRounds = Math.max(1, Math.ceil(members.length / Math.max(teams.length, 1)));
  const draftPercent = members.length ? Math.round((draftedCount / members.length) * 100) : 0;

  const availableMembers = useMemo(() => members.filter((m) => !m.draftedTeamId).filter((m) => `${m.name} ${m.note} ${m.tags}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=> sort === 'name' ? a.name.localeCompare(b.name) : b.rating - a.rating), [members, query, sort]);
  const topAvailable = availableMembers.slice(0, 5);
  const recentPicks = [...history].sort((a,b)=>b.pickNumber-a.pickNumber).slice(0,4);
  const stats = teams.map((team) => { const roster = members.filter((m)=>m.draftedTeamId===team.id); return { team, roster, avg: roster.length ? Number(getAverageRating(roster)) : 0, total: roster.reduce((s,m)=>s+Number(m.rating||0),0) }; });
  const draftedStats = stats.filter((s)=>s.roster.length);
  const strongestTeam = draftedStats.length ? [...draftedStats].sort((a,b)=>b.avg-a.avg)[0] : null;
  const weakestTeam = draftedStats.length ? [...draftedStats].sort((a,b)=>a.avg-b.avg)[0] : null;
  const balancedTeam = draftedStats.length ? [...draftedStats].sort((a,b)=>Math.abs(8-a.avg)-Math.abs(8-b.avg))[0] : null;

  const draftMember = (memberId) => {
    if (!currentTeam || activeSeason.locked) return;
    const pickNumber = draftedCount + 1;
    updateSeason((season) => ({ ...season, members: season.members.map((m)=>m.id===memberId?{...m,draftedTeamId: currentTeam.id, pickNumber}:m), history: [...season.history, { memberId, teamId: currentTeam.id, pickNumber, timestamp: new Date().toISOString() }] }));
  };
  const undoLastPick = () => { if (activeSeason.locked) return; const last = history[history.length-1]; if (!last) return; updateSeason((season)=>({...season, members: season.members.map((m)=>m.id===last.memberId?{...m,draftedTeamId:null,pickNumber:null}:m), history: season.history.slice(0,-1)})); };
  const updateMember = (id, field, value) => updateSeason((season)=>({...season, members: season.members.map((m)=>m.id===id?{...m,[field]:value}:m)}));
  const deleteMember = (id) => { if(!window.confirm('Delete this member from the active season?')) return; updateSeason((season)=>({...season, members: season.members.filter((m)=>m.id!==id), history: season.history.filter((p)=>p.memberId!==id)})); };
  const updateTeam = (id, field, value) => updateSeason((season)=>{ const teamsNext = season.teams.map((t)=>t.id===id?{...t,[field]:value}:t); const draftOrderNext = season.draftOrder.map((t)=>teamsNext.find((x)=>x.id===t.id)||t); return {...season, teams: teamsNext, draftOrder: draftOrderNext}; });
  const randomizeOrder = () => { if(activeSeason.locked) return; if(history.length && !window.confirm('Randomizing will clear current picks for this season. Continue?')) return; updateSeason((season)=>({...season, draftOrder: shuffleTeams(season.teams), members: season.members.map((m)=>({...m,draftedTeamId:null,pickNumber:null})), history: []})); };
  const resetDraft = () => { if(!window.confirm('Reset all picks for this season? Members, notes, ratings, and teams will remain.')) return; updateSeason((season)=>({...season, members: season.members.map((m)=>({...m,draftedTeamId:null,pickNumber:null})), history: []})); };
  const addSeason = () => { const season = makeSeason(newSeasonName.trim() || `${new Date().getFullYear()} Draft`); setState((prev)=>({activeSeasonId: season.id, seasons: [...prev.seasons, season]})); setNewSeasonName(''); };
  const deleteSeason = (seasonId) => { if(state.seasons.length<=1){ window.alert('At least one season is required.'); return;} const target=state.seasons.find((s)=>s.id===seasonId); if(!window.confirm(`Delete ${target?.name || 'this season'}? This cannot be undone.`)) return; setState((prev)=>{ const seasons=prev.seasons.filter((s)=>s.id!==seasonId); return { activeSeasonId: prev.activeSeasonId===seasonId?seasons[0].id:prev.activeSeasonId, seasons }; }); };
  const renameSeason = (name) => updateSeason((season)=>({...season,name}));
  const toggleLock = () => updateSeason((season)=>({...season, locked: !season.locked}));
  const addMember = () => updateSeason((season)=>({...season, members: [...season.members, { id: crypto.randomUUID?.() || `member-${Date.now()}`, name: `New Member ${season.members.length+1}`, rating: 5, note:'', photo:'', tags:'', draftedTeamId:null, pickNumber:null }]}));
  const handleImport = async (event) => { const file=event.target.files?.[0]; if(!file)return; const imported=importMembersFromCsv(await file.text()); if(!imported.length){window.alert('No valid members found. Use columns like Name, Rating, Notes, Photo, Tags.');return;} const replace=window.confirm(`Import ${imported.length} members. Press OK to replace current members, or Cancel to append them.`); updateSeason((season)=>({...season, members: replace?imported:[...season.members,...imported], history: []})); event.target.value=''; };
  const exportMembers = () => { const header=['Name','Rating','Notes','Photo','Tags','Drafted Team','Pick Number']; const lines=members.map((m)=>{const team=teams.find((t)=>t.id===m.draftedTeamId); return [m.name,m.rating,m.note,m.photo,m.tags,team?.name||'',m.pickNumber||''].map(toCsvValue).join(',');}); downloadText(`${activeSeason.name.replaceAll(' ','-')}-members.csv`, [header.join(','), ...lines].join('\n')); };
  const exportRosters = () => { const header=['Team','Captain','Lt','Member','Rating','Pick Number','Notes','Tags']; const lines=teams.flatMap((team)=>members.filter((m)=>m.draftedTeamId===team.id).sort((a,b)=>a.pickNumber-b.pickNumber).map((m)=>[team.name,team.captain,team.lieutenant,m.name,m.rating,m.pickNumber,m.note,m.tags].map(toCsvValue).join(','))); downloadText(`${activeSeason.name.replaceAll(' ','-')}-rosters.csv`, [header.join(','),...lines].join('\n')); };

  return <div className="appFrame">
    <aside className="sideNav"><div className="logoBadge"><div className="logoCircle">L</div><span>Lions<br/>International</span></div><nav>
      <button className={activePanel==='draft'?'active':''} onClick={()=>setActivePanel('draft')}><Zap size={18}/> Draft Room</button>
      <button className={activePanel==='teams'?'active':''} onClick={()=>setActivePanel('teams')}><Users size={18}/> Teams</button>
      <button className={activePanel==='members'?'active':''} onClick={()=>setActivePanel('members')}><Users size={18}/> Members</button>
      <button className={activePanel==='history'?'active':''} onClick={()=>setActivePanel('history')}><Clock3 size={18}/> Draft History</button>
      <button className={activePanel==='analytics'?'active':''} onClick={()=>setActivePanel('analytics')}><BarChart3 size={18}/> Analytics</button>
      <button className={settingsOpen?'active':''} onClick={()=>setSettingsOpen(true)}><Settings size={18}/> Settings</button>
    </nav><div className="syncPanel"><strong>{syncStatus==='Connected'?'✓ Supabase':syncStatus}</strong><span>{supabase?'Connected':'Local mode'}</span></div></aside>
    <main className="mainStage"><header className="topBar"><button className="outlineBtn" onClick={randomizeOrder}><Shuffle size={16}/> Start New Draft</button><div className="topIcons"><Bell size={20}/><HelpCircle size={20}/><button className="settingsButton" onClick={()=>setSettingsOpen(true)}><Settings size={17}/> Settings</button></div></header>
      {activePanel==='draft' && <><section className="dashboardGrid"><div className="clockPanel"><span className="sectionTitle">On The Clock</span><div className="onClock"><div className="teamPuck"><span>Team</span><strong>{currentTeam?.name?.match(/\d+/)?.[0] || currentTeam?.name?.slice(0,2) || '—'}</strong></div><div className="clockInfo"><h1>{currentTeam?.name}</h1><h2>Is On The Clock</h2><p>Pick {draftedCount+1}</p></div><div className="timerBox"><span>Round {round}</span><small>Pick {draftedCount+1}</small><strong>1:23</strong><em>Time Remaining</em><div className="miniBar"><i/></div></div></div><div className="progressPanel card"><div className="panelHeader"><h3>Draft Progress</h3><span>{draftedCount} of {members.length} picks</span></div><p>Round {round} of {totalRounds}<b>{draftPercent}%</b></p><div className="roundGrid">{Array.from({length:Math.min(totalRounds,24)},(_,i)=><span className={i+1===round?'current':i+1<round?'done':''} key={i}>{i+1}</span>)}</div></div><RecentPicks picks={recentPicks} members={members} teams={teams}/></div><div className="rightColumn"><TopAvailable topAvailable={topAvailable} setActivePanel={setActivePanel}/><SnakeOrder draftOrder={draftOrder}/></div></section><section className="lowerBoard"><div className="boardHeader">Team Overview</div><TeamGrid teams={teams} members={members}/><SummaryStrip strongestTeam={strongestTeam} weakestTeam={weakestTeam} balancedTeam={balancedTeam}/></section></>}
      {activePanel==='teams' && <TeamSetup teams={teams} updateTeam={updateTeam}/>} {activePanel==='members' && <MemberManager members={members} availableMembers={availableMembers} query={query} setQuery={setQuery} sort={sort} setSort={setSort} addMember={addMember} updateMember={updateMember} deleteMember={deleteMember} draftMember={draftMember} handleImport={handleImport} importRef={importRef} exportMembers={exportMembers} exportRosters={exportRosters} locked={activeSeason.locked}/>} {activePanel==='history' && <DraftHistory history={history} members={members} teams={teams}/>} {activePanel==='analytics' && <Analytics teams={teams} members={members}/>} </main>
    {settingsOpen && <SettingsDrawer state={state} setState={setState} activeSeason={activeSeason} newSeasonName={newSeasonName} setNewSeasonName={setNewSeasonName} addSeason={addSeason} deleteSeason={deleteSeason} renameSeason={renameSeason} toggleLock={toggleLock} forceSave={forceSave} close={()=>setSettingsOpen(false)}/>} </div>;
}

function TopAvailable({ topAvailable, setActivePanel }) { return <section className="card sideCard"><h3>Top Available Members</h3><div className="availableList">{topAvailable.map((m,i)=><div key={m.id}><span>{i+1}.</span><b>{m.name}</b><strong>{m.rating}</strong></div>)}</div><button className="linkBtn" onClick={()=>setActivePanel('members')}>View all members →</button></section>; }
function SnakeOrder({ draftOrder }) { return <section className="card sideCard"><h3>Snake Draft Order</h3>{[0,1,2].map((r)=>{const order=r%2===0?draftOrder:[...draftOrder].reverse();return <div className="snakeRound" key={r}><span>Round {r+1}</span><div>{order.slice(0,10).map((_,i)=><b key={i}>{i+1}</b>)}</div></div>})}</section>; }
function RecentPicks({ picks, members, teams }) { return <section className="recentPanel card"><h3>Recent Picks</h3><div className="recentGrid">{picks.length===0&&<p>No picks yet.</p>}{picks.map((p)=>{const m=members.find((x)=>x.id===p.memberId);const t=teams.find((x)=>x.id===p.teamId);return <div className="recentPick" key={`${p.pickNumber}-${p.memberId}`}><b>{p.pickNumber}</b><span>{m?.name}</span><small>{t?.name}</small></div>})}</div></section>; }
function SummaryStrip({ strongestTeam, weakestTeam, balancedTeam }) { return <section className="summaryStrip"><div><Trophy size={24}/><span>Strongest Team</span><b>{strongestTeam?`${strongestTeam.team.name} (${strongestTeam.avg.toFixed(1)})`:'—'}</b></div><div><Star size={24}/><span>Most Balanced</span><b>{balancedTeam?`${balancedTeam.team.name} (${balancedTeam.avg.toFixed(1)})`:'—'}</b></div><div><BarChart3 size={24}/><span>Weakest Team</span><b>{weakestTeam?`${weakestTeam.team.name} (${weakestTeam.avg.toFixed(1)})`:'—'}</b></div></section>; }
function SettingsDrawer({ state, setState, activeSeason, newSeasonName, setNewSeasonName, addSeason, deleteSeason, renameSeason, toggleLock, forceSave, close }) { return <aside className="settingsDrawer"><div className="drawerTop"><h2>Settings</h2><button onClick={close}>×</button></div><div className="drawerTabs"><button className="active">Seasons</button><button>Draft Settings</button><button>Preferences</button></div><h3>Manage Seasons</h3><p>Create, rename or delete draft seasons.</p><input value={newSeasonName} onChange={(e)=>setNewSeasonName(e.target.value)} placeholder="2027 Draft"/><button className="goldWide" onClick={addSeason}><Plus size={18}/> New Season</button><div className="seasonRows">{state.seasons.map((s)=><div key={s.id} className="seasonRow"><button onClick={()=>setState((prev)=>({...prev,activeSeasonId:s.id}))}>{s.name}</button>{s.id===state.activeSeasonId&&<span>Active</span>}<button className="miniDanger" onClick={()=>deleteSeason(s.id)}>Delete</button></div>)}</div><label>Rename Active Season<input value={activeSeason.name} onChange={(e)=>renameSeason(e.target.value)}/></label><div className="settingsStack"><button className="secondaryBtn" onClick={toggleLock}>{activeSeason.locked?<Unlock size={17}/>:<Lock size={17}/>} {activeSeason.locked?'Unlock Draft':'Lock Draft'}</button><button className="secondaryBtn" onClick={forceSave}><Save size={17}/> Save Now</button></div></aside>; }
function TeamSetup({ teams, updateTeam }) { return <section className="card setupPanel"><h2>Team Setup</h2><p>Edit team names, captains, lieutenants, and team colors.</p><div className="teamSetupGrid">{teams.map((t)=><article className="setupCard" key={t.id}><label>Team Name<input value={t.name} onChange={(e)=>updateTeam(t.id,'name',e.target.value)}/></label><label>Captain<input value={t.captain} onChange={(e)=>updateTeam(t.id,'captain',e.target.value)}/></label><label>Lt.<input value={t.lieutenant} onChange={(e)=>updateTeam(t.id,'lieutenant',e.target.value)}/></label><label>Color<select value={t.color} onChange={(e)=>updateTeam(t.id,'color',e.target.value)}>{COLORS.map((c)=><option key={c} value={c}>{c}</option>)}</select></label></article>)}</div></section>; }
function MemberManager({ availableMembers, query, setQuery, sort, setSort, addMember, updateMember, deleteMember, draftMember, handleImport, importRef, exportMembers, exportRosters, locked }) { return <section className="card setupPanel"><div className="panelHeader"><h2>Member Manager</h2><div className="actionRow"><input ref={importRef} hidden type="file" accept=".csv,text/csv" onChange={handleImport}/><button className="secondaryBtn" onClick={()=>importRef.current?.click()}><FileUp size={17}/> Import CSV</button><button className="secondaryBtn" onClick={exportMembers}><Download size={17}/> Export Members</button><button className="secondaryBtn" onClick={exportRosters}><Download size={17}/> Export Rosters</button><button className="goldBtn" onClick={addMember}><Plus size={17}/> Add Member</button></div></div><div className="toolsRow"><label className="searchBox"><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search name, notes, or tags"/></label><select value={sort} onChange={(e)=>setSort(e.target.value)}><option value="rating">Sort by Rating</option><option value="name">Sort by Name</option></select></div><div className="memberCards">{availableMembers.map((m)=><article className="memberCard" key={m.id}><div className="memberAvatar">{m.photo?<img src={m.photo} alt={m.name}/>:<ImagePlus size={24}/>}</div><input className="memberName" value={m.name} onChange={(e)=>updateMember(m.id,'name',e.target.value)}/><input type="number" min="0" max="10" step="0.1" value={m.rating} onChange={(e)=>updateMember(m.id,'rating',Number(e.target.value))}/><input value={m.tags} onChange={(e)=>updateMember(m.id,'tags',e.target.value)} placeholder="Tags"/><textarea value={m.note} onChange={(e)=>updateMember(m.id,'note',e.target.value)} placeholder="Notes"/><button disabled={locked} className="goldBtn" onClick={()=>draftMember(m.id)}>Draft</button><button className="dangerBtn" onClick={()=>deleteMember(m.id)}><Trash2 size={16}/></button></article>)}</div></section>; }
function DraftHistory({ history, members, teams }) { const ordered=[...history].sort((a,b)=>b.pickNumber-a.pickNumber); return <section className="card setupPanel"><h2>Draft History</h2><div className="historyList">{ordered.length===0&&<p>No picks have been made yet.</p>}{ordered.map((p)=>{const m=members.find((x)=>x.id===p.memberId);const t=teams.find((x)=>x.id===p.teamId);return <div className="historyRow" key={`${p.pickNumber}-${p.memberId}`}><strong>Pick {p.pickNumber}</strong><span>{t?.name}</span><span>{m?.name}</span><b>{m?.rating}</b></div>})}</div></section>; }
function Analytics({ teams, members }) { const stats=teams.map((team)=>{const roster=members.filter((m)=>m.draftedTeamId===team.id); return {team, roster, avg: roster.length?Number(getAverageRating(roster)):0};}).sort((a,b)=>b.avg-a.avg); return <section className="card setupPanel"><h2>Team Analytics</h2><div className="analyticsGrid">{stats.map(({team,roster,avg})=><article className="analyticsCard" key={team.id}><strong>{team.name}</strong><span>{roster.length} members</span><b>{roster.length?avg.toFixed(1):'—'}</b><div className="meter"><i style={{width:`${Math.min(avg*10,100)}%`}}/></div></article>)}</div></section>; }
function TeamGrid({ teams, members }) { return <div className="teamOverview">{teams.map((team,index)=>{const roster=members.filter((m)=>m.draftedTeamId===team.id).sort((a,b)=>a.pickNumber-b.pickNumber); const avg=getAverageRating(roster); const total=roster.reduce((s,m)=>s+Number(m.rating||0),0).toFixed(1); return <section className={`teamCard ${team.color}`} key={team.id}><div className="teamTop"><span>{index+1}</span><h3>{team.name}</h3></div><div className="teamStats"><div><small>Avg Rating</small><b>{avg}</b></div><div><small>Members</small><b>{roster.length}</b></div><div><small>Total Rating</small><b>{roster.length?total:'—'}</b></div></div><div className="meter"><i style={{width:`${roster.length?Math.min(Number(avg)*10,100):0}%`}}/></div><p><span>Captain</span>{team.captain}</p><p><span>Lieutenant</span>{team.lieutenant}</p></section>})}</div>; }
