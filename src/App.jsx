
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  BarChart3, Bell, CheckCircle2, Clock3, Download, FileUp, HelpCircle, ImagePlus, Lock,
  Plus, RotateCcw, Save, Search, Settings, Shuffle, Star, Trash2, Trophy, Undo2,
  Unlock, Users, Zap, X
} from 'lucide-react';

const STORAGE_KEY = 'lions-club-draft-phase-2b';
const SUPABASE_TABLE = 'draft_app_state';
const SUPABASE_ROW_ID = 'main';
const COLORS = ['gold', 'blue', 'green', 'purple', 'red'];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
    rating: '',
    note: '',
    photo: '',
    tags: '',
    draftedTeamId: null,
    pickNumber: null,
    draftedRound: null,
  }));
}

function makeSeason(name = '2026 Draft') {
  const teams = makeDefaultTeams();
  return { id: crypto.randomUUID?.() || `season-${Date.now()}`, name, teams, draftOrder: teams, members: makeDefaultMembers(), history: [], locked: false };
}

function makeDefaultState() {
  const season = makeSeason();
  return { activeSeasonId: season.id, seasons: [season] };
}

function normalizeState(parsed) {
  if (!parsed?.seasons?.length) return makeDefaultState();
  const seasons = parsed.seasons.map((season) => {
    const teams = (season.teams?.length ? season.teams : makeDefaultTeams()).map((team, index) => ({ color: COLORS[index % COLORS.length], ...team }));
    return {
      ...season,
      teams,
      draftOrder: season.draftOrder?.length ? season.draftOrder.map((orderTeam) => teams.find((team) => team.id === orderTeam.id) || orderTeam) : teams,
      members: (season.members?.length ? season.members : []).map((member) => ({
        tags: '',
        photo: '',
        note: '',
        rating: member.rating ?? '',
        draftedTeamId: null,
        pickNumber: null,
        draftedRound: null,
        ...member,
      })),
      history: season.history || [],
      locked: Boolean(season.locked),
    };
  });
  return { activeSeasonId: seasons.some((season) => season.id === parsed.activeSeasonId) ? parsed.activeSeasonId : seasons[0].id, seasons };
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('lions-club-draft-fantasy') || localStorage.getItem('lions-club-draft-phase-2a');
    return raw ? normalizeState(JSON.parse(raw)) : makeDefaultState();
  } catch {
    return makeDefaultState();
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

function getTeamNumber(team) {
  const match = String(team?.name || '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function isLiveDraftTeam(team) {
  const number = getTeamNumber(team);
  return number !== 13;
}

function getLiveDraftOrder(draftOrder) {
  return draftOrder.filter(isLiveDraftTeam);
}

function scoreForRound(round) {
  if (!round) return '';
  return Math.max(1, 11 - Math.min(round, 10));
}

function getAverageRating(roster) {
  const scored = roster.map((member) => Number(member.rating)).filter((value) => Number.isFinite(value) && value > 0);
  if (!scored.length) return '—';
  return (scored.reduce((sum, value) => sum + value, 0) / scored.length).toFixed(1);
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
  const hasHeader = headers.some((header) => ['name', 'member', 'rating', 'score', 'photo', 'tags'].includes(header));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const indexFor = (...names) => {
    const index = headers.findIndex((header) => names.includes(header));
    return index >= 0 ? index : null;
  };
  const nameIndex = hasHeader ? indexFor('name', 'member', 'member name', 'full name') : 0;
  const ratingIndex = hasHeader ? indexFor('rating', 'score') : 1;
  const photoIndex = hasHeader ? indexFor('photo', 'photo url', 'image', 'image url') : 2;
  const tagsIndex = hasHeader ? indexFor('tags', 'tag') : 3;
  return dataRows.map((row, index) => ({
    id: crypto.randomUUID?.() || `member-import-${Date.now()}-${index}`,
    name: row[nameIndex ?? 0]?.trim() || '',
    rating: row[ratingIndex ?? -1] || '',
    note: '',
    photo: row[photoIndex ?? -1] || '',
    tags: row[tagsIndex ?? -1] || '',
    draftedTeamId: null,
    pickNumber: null,
    draftedRound: null,
  })).filter((member) => member.name);
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

export default function App() {
  const [state, setState] = useState(loadLocalState);
  const [remoteReady, setRemoteReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState(supabase ? 'Connecting...' : 'Local only');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [activePanel, setActivePanel] = useState('draft');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('seasons');
  const [mobilePage, setMobilePage] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [timerRunning, setTimerRunning] = useState(true);
  const importRef = useRef(null);
  const saveTimer = useRef(null);

  const activeSeason = state.seasons.find((season) => season.id === state.activeSeasonId) || state.seasons[0];
  const teams = activeSeason.teams;
  const members = activeSeason.members;
  const draftOrder = activeSeason.draftOrder;
  const liveDraftOrder = getLiveDraftOrder(draftOrder);
  const history = activeSeason.history;

  useEffect(() => {
    let cancelled = false;
    async function loadRemoteState() {
      if (!supabase) {
        setRemoteReady(true);
        return;
      }
      setSyncStatus('Loading...');
      const { data, error } = await supabase.from(SUPABASE_TABLE).select('data').eq('id', SUPABASE_ROW_ID).maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error(error);
        setSyncStatus('Supabase load error');
        setRemoteReady(true);
        return;
      }
      if (data?.data) {
        setState(normalizeState(data.data));
        setSyncStatus('Connected');
      } else {
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
    if (!supabase) {
      setSyncStatus('Saved locally');
      return;
    }
    setSyncStatus('Saving...');
    const { error } = await supabase.from(SUPABASE_TABLE).upsert({ id: SUPABASE_ROW_ID, data: state, updated_at: new Date().toISOString() });
    setSyncStatus(error ? 'Supabase save error' : 'Connected');
  };

  const updateSeason = (updater) => {
    setState((prev) => ({ ...prev, seasons: prev.seasons.map((season) => (season.id === prev.activeSeasonId ? updater(season) : season)) }));
  };

  const draftedCount = members.filter((member) => member.pickNumber).length;
  const currentTeam = getCurrentTeam(liveDraftOrder, draftedCount);
  const round = Math.floor(draftedCount / Math.max(liveDraftOrder.length, 1)) + 1;
  const liveDraftMemberCount = members.filter((member) => !member.draftedTeamId || member.pickNumber).length;
  const draftPercent = liveDraftMemberCount ? Math.round((draftedCount / liveDraftMemberCount) * 100) : 0;
  const totalRounds = Math.ceil(liveDraftMemberCount / Math.max(liveDraftOrder.length, 1));

  useEffect(() => {
    setTimerSeconds(90);
    setTimerRunning(true);
  }, [draftedCount]);

  useEffect(() => {
    if (!timerRunning || activeSeason.locked) return undefined;
    const interval = window.setInterval(() => {
      setTimerSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning, activeSeason.locked]);

  const timerMinutes = Math.floor(timerSeconds / 60);
  const timerRemainder = String(timerSeconds % 60).padStart(2, '0');
  const timerPercent = Math.max(0, Math.min(100, (timerSeconds / 90) * 100));

  const availableMembers = useMemo(() => {
    return members
      .filter((member) => !member.draftedTeamId)
      .filter((member) => `${member.name} ${member.tags}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : Number(b.rating || 0) - Number(a.rating || 0)));
  }, [members, query, sort]);

  const lastPicks = [...history].sort((a, b) => b.pickNumber - a.pickNumber).slice(0, 4);

  const teamStats = teams.map((team) => {
    const roster = members.filter((member) => member.draftedTeamId === team.id);
    const avg = roster.length ? Number(getAverageRating(roster)) || 0 : 0;
    return { team, roster, avg, total: roster.reduce((sum, member) => sum + Number(member.rating || 0), 0) };
  });
  const draftedStats = teamStats.filter((stat) => stat.roster.length);
  const strongestTeam = draftedStats.length ? [...draftedStats].sort((a, b) => b.avg - a.avg)[0] : null;
  const weakestTeam = draftedStats.length ? [...draftedStats].sort((a, b) => a.avg - b.avg)[0] : null;
  const balancedTeam = draftedStats.length ? [...draftedStats].sort((a, b) => Math.abs(5 - a.avg) - Math.abs(5 - b.avg))[0] : null;

  const draftMember = (memberId) => {
    if (!currentTeam || activeSeason.locked) return;
    const pickNumber = draftedCount + 1;
    const draftedRound = Math.floor(draftedCount / Math.max(liveDraftOrder.length, 1)) + 1;
    const rating = scoreForRound(draftedRound);
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.id === memberId ? { ...member, draftedTeamId: currentTeam.id, pickNumber, draftedRound, rating } : member
      )),
      history: [...season.history, { memberId, teamId: currentTeam.id, pickNumber, draftedRound, timestamp: new Date().toISOString() }],
    }));
  };

  const undoLastPick = () => {
    if (activeSeason.locked) return;
    const last = history[history.length - 1];
    if (!last) return;
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.id === last.memberId ? { ...member, draftedTeamId: null, pickNumber: null, draftedRound: null, rating: '' } : member
      )),
      history: season.history.slice(0, -1),
    }));
  };

  const updateMember = (id, field, value) => {
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (member.id === id ? { ...member, [field]: value } : member)),
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

  const setDraftOrderPosition = (teamId, position) => {
    if (activeSeason.locked || history.length) {
      window.alert('Draft order can only be changed before draft picks begin and while the draft is unlocked.');
      return;
    }

    updateSeason((season) => {
      const target = season.teams.find((team) => team.id === teamId);
      if (!target || !isLiveDraftTeam(target)) return season;

      const liveOrder = season.draftOrder.filter(isLiveDraftTeam);
      const nonLiveOrder = season.draftOrder.filter((team) => !isLiveDraftTeam(team));
      const withoutTarget = liveOrder.filter((team) => team.id !== teamId);
      const nextLive = [...withoutTarget];
      nextLive.splice(Math.max(0, Math.min(position - 1, nextLive.length)), 0, target);

      return { ...season, draftOrder: [...nextLive, ...nonLiveOrder] };
    });
  };

  const assignMemberToTeam13 = (memberId) => {
    const team13 = teams[12];
    if (!team13) return;

    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.id === memberId
          ? { ...member, draftedTeamId: team13.id, pickNumber: null, draftedRound: null, rating: '' }
          : member
      )),
    }));
  };

  const unassignPreassignedMember = (memberId) => {
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.id === memberId && !member.pickNumber
          ? { ...member, draftedTeamId: null, pickNumber: null, draftedRound: null, rating: '' }
          : member
      )),
    }));
  };

  const randomizeOrder = () => {
    if (activeSeason.locked) return;
    if (history.length && !window.confirm('Randomizing will clear current picks for this season. Continue?')) return;
    updateSeason((season) => ({
      ...season,
      draftOrder: [...shuffleTeams(season.teams.filter(isLiveDraftTeam)), ...season.teams.filter((team) => !isLiveDraftTeam(team))],
      members: season.members.map((member) => (
        member.pickNumber ? { ...member, draftedTeamId: null, pickNumber: null, draftedRound: null, rating: '' } : member
      )),
      history: [],
    }));
  };

  const resetDraft = () => {
    if (!window.confirm('Reset all picks for this season? Members and teams will remain.')) return;
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.pickNumber ? { ...member, draftedTeamId: null, pickNumber: null, draftedRound: null, rating: '' } : member
      )),
      history: [],
    }));
  };

  const addSeason = () => {
    const name = newSeasonName.trim() || `${new Date().getFullYear()} Draft`;
    const season = makeSeason(name);
    setState((prev) => ({ activeSeasonId: season.id, seasons: [...prev.seasons, season] }));
    setNewSeasonName('');
  };

  const deleteSeason = (seasonId) => {
    if (state.seasons.length <= 1) {
      window.alert('At least one season is required.');
      return;
    }
    const target = state.seasons.find((season) => season.id === seasonId);
    if (!window.confirm(`Delete ${target?.name || 'this season'}? This cannot be undone.`)) return;
    setState((prev) => {
      const seasons = prev.seasons.filter((season) => season.id !== seasonId);
      return { activeSeasonId: prev.activeSeasonId === seasonId ? seasons[0].id : prev.activeSeasonId, seasons };
    });
  };

  const renameSeason = (name) => updateSeason((season) => ({ ...season, name }));
  const toggleLock = () => updateSeason((season) => ({ ...season, locked: !season.locked }));

  const addMember = () => {
    updateSeason((season) => ({
      ...season,
      members: [...season.members, { id: crypto.randomUUID?.() || `member-${Date.now()}`, name: `New Member ${season.members.length + 1}`, rating: '', note: '', photo: '', tags: '', draftedTeamId: null, pickNumber: null, draftedRound: null }],
    }));
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const imported = importMembersFromCsv(text);
    if (!imported.length) {
      window.alert('No valid members found. Use columns like Name, Rating, Photo, Tags.');
      return;
    }
    const mode = window.confirm(`Import ${imported.length} members. Press OK to replace current members, or Cancel to append them.`);
    updateSeason((season) => ({ ...season, members: mode ? imported : [...season.members, ...imported], history: [] }));
    event.target.value = '';
  };

  const exportMembers = () => {
    const header = ['Name', 'Rating', 'Photo', 'Tags', 'Drafted Team', 'Pick Number', 'Drafted Round'];
    const lines = members.map((member) => {
      const team = teams.find((item) => item.id === member.draftedTeamId);
      return [member.name, member.rating, member.photo, member.tags, team?.name || '', member.pickNumber || '', member.draftedRound || ''].map(toCsvValue).join(',');
    });
    downloadText(`${activeSeason.name.replaceAll(' ', '-')}-members.csv`, [header.join(','), ...lines].join('\n'));
  };

  const exportRosters = () => {
    const header = ['Team', 'Captain', 'Lt', 'Member', 'Rating', 'Pick Number', 'Round', 'Tags'];
    const lines = teams.flatMap((team) => members.filter((member) => member.draftedTeamId === team.id).sort((a, b) => a.pickNumber - b.pickNumber).map((member) => [team.name, team.captain, team.lieutenant, member.name, member.rating, member.pickNumber, member.draftedRound, member.tags].map(toCsvValue).join(',')));
    downloadText(`${activeSeason.name.replaceAll(' ', '-')}-rosters.csv`, [header.join(','), ...lines].join('\n'));
  };

  const mobilePages = ['Clock', 'Progress', 'Members', 'Settings'];

  const handleMobileTouchEnd = (event) => {
    if (touchStartX === null) return;
    const touchEndX = event.changedTouches?.[0]?.clientX ?? touchStartX;
    const distance = touchStartX - touchEndX;

    if (Math.abs(distance) > 45) {
      setMobilePage((page) => {
        if (distance > 0) return Math.min(page + 1, mobilePages.length - 1);
        return Math.max(page - 1, 0);
      });
    }

    setTouchStartX(null);
  };

  return (
    <div className="appFrame">
      <aside className="sideNav">
        <div className="logoBadge">
          <img className="clubLogo" src="/lions-logo.png" alt="Lions Club logo" onLoad={(event) => { event.currentTarget.nextElementSibling.style.display = 'none'; }} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
          <div className="logoFallback">
            <div className="logoCircle">L</div>
            <span>Lions<br />International</span>
          </div>
        </div>
        <nav>
          <button className={activePanel === 'draft' ? 'active' : ''} onClick={() => setActivePanel('draft')}><Zap size={18} /> Draft Room</button>
          <button className={activePanel === 'teams' ? 'active' : ''} onClick={() => setActivePanel('teams')}><Users size={18} /> Teams</button>
          <button className={activePanel === 'members' ? 'active' : ''} onClick={() => setActivePanel('members')}><Users size={18} /> Members</button>
          <button className={activePanel === 'history' ? 'active' : ''} onClick={() => setActivePanel('history')}><Clock3 size={18} /> Draft History</button>
          <button className={activePanel === 'analytics' ? 'active' : ''} onClick={() => setActivePanel('analytics')}><BarChart3 size={18} /> Analytics</button>
          <button className={settingsOpen ? 'active' : ''} onClick={() => setSettingsOpen(true)}><Settings size={18} /> Settings</button>
        </nav>
        <div className="syncPanel">
          <strong>{syncStatus === 'Connected' ? '✓ Supabase' : syncStatus}</strong>
          <span>{supabase ? 'Connected' : 'Local mode'}</span>
        </div>
      </aside>

      <main className="mainStage">
        <header className="topBar">
          <button className="outlineBtn" type="button" onClick={randomizeOrder}><Shuffle size={16} /> Start New Draft</button>
          <div className="topIcons">
            <Bell size={20} />
            <HelpCircle size={20} />
            <button className="settingsButton" onClick={() => setSettingsOpen(true)}><Settings size={17} /> Settings</button>
          </div>
        </header>

        {activePanel === 'draft' && (
          <>
            <MobileDraftPager
              mobilePages={mobilePages}
              mobilePage={mobilePage}
              setMobilePage={setMobilePage}
              touchStartX={touchStartX}
              setTouchStartX={setTouchStartX}
              handleMobileTouchEnd={handleMobileTouchEnd}
              currentTeam={currentTeam}
              round={round}
              draftedCount={draftedCount}
              members={members}
              liveDraftMemberCount={liveDraftMemberCount}
              totalRounds={totalRounds}
              draftPercent={draftPercent}
              timerMinutes={timerMinutes}
              timerRemainder={timerRemainder}
              timerRunning={timerRunning}
              setTimerRunning={setTimerRunning}
              setTimerSeconds={setTimerSeconds}
              timerPercent={timerPercent}
              lastPicks={lastPicks}
              teams={teams}
              draftOrder={liveDraftOrder}
              availableMembers={availableMembers}
              query={query}
              setQuery={setQuery}
              draftMember={draftMember}
              locked={activeSeason.locked}
              activeSeason={activeSeason}
            />

            <div className="desktopDraft">
              <section className="dashboardGrid">
              <div className="clockPanel">
                <span className="sectionTitle">On The Clock</span>
                <div className="onClock">
                  <div className="teamPuck">
                    <span>Team</span>
                    <strong>{currentTeam?.name?.replace(/[^0-9]/g, '') || currentTeam?.name?.slice(-1) || '—'}</strong>
                  </div>
                  <div className="clockInfo">
                    <h1>{currentTeam?.name}</h1>
                    <h2>Is On The Clock</h2>
                    <p>Pick {draftedCount + 1}</p>
                  </div>
                  <div className="timerBox">
                    <span>Round {round}</span>
                    <small>Pick {draftedCount + 1}</small>
                    <strong>{timerMinutes}:{timerRemainder}</strong>
                    <em>Time Remaining</em>
                    <div className="timerControls">
                      <button type="button" onClick={() => setTimerRunning((prev) => !prev)}>{timerRunning ? 'Pause' : 'Start'}</button>
                      <button type="button" onClick={() => setTimerSeconds(90)}>Reset</button>
                    </div>
                    <div className="miniBar"><i style={{ width: `${timerPercent}%` }} /></div>
                  </div>
                </div>

                <div className="progressPanel card">
                  <div className="panelHeader"><h3>Draft Progress</h3><span>{draftedCount} of {liveDraftMemberCount} live picks</span></div>
                  <p>Round {round} of {totalRounds || 1} <b>{draftPercent}%</b></p>
                  <div className="roundGrid">
                    {Array.from({ length: Math.min(totalRounds || 1, 24) }, (_, i) => (
                      <span className={i + 1 === round ? 'current' : i + 1 < round ? 'done' : ''} key={i}>{i + 1}</span>
                    ))}
                  </div>
                </div>

                <RecentPicks picks={lastPicks} members={members} teams={teams} />
              </div>

              <div className="rightColumn">
                <SnakeOrder draftOrder={liveDraftOrder} draftedCount={draftedCount} />
                <DraftSettings activeSeason={activeSeason} teams={teams} liveDraftOrder={liveDraftOrder} totalRounds={totalRounds} />
              </div>
            </section>

            <section className="splitBoard">
              <AvailableMembersPanel availableMembers={availableMembers} query={query} setQuery={setQuery} draftMember={draftMember} locked={activeSeason.locked} setActivePanel={setActivePanel} />
              <TeamOverviewTable teams={teams} members={members} totalRounds={totalRounds} />
            </section>

            <SummaryStrip strongestTeam={strongestTeam} weakestTeam={weakestTeam} balancedTeam={balancedTeam} />
            </div>
          </>
        )}

        {activePanel === 'teams' && <TeamSetup teams={teams} updateTeam={updateTeam} />}
        {activePanel === 'members' && <MemberManager members={members} availableMembers={availableMembers} query={query} setQuery={setQuery} sort={sort} setSort={setSort} addMember={addMember} updateMember={updateMember} deleteMember={deleteMember} draftMember={draftMember} handleImport={handleImport} importRef={importRef} exportMembers={exportMembers} exportRosters={exportRosters} locked={activeSeason.locked} />}
        {activePanel === 'history' && <DraftHistory history={history} members={members} teams={teams} />}
        {activePanel === 'analytics' && <Analytics teams={teams} members={members} />}
      </main>

      {settingsOpen && (
        <SettingsDrawer
          state={state}
          setState={setState}
          activeSeason={activeSeason}
          newSeasonName={newSeasonName}
          setNewSeasonName={setNewSeasonName}
          addSeason={addSeason}
          deleteSeason={deleteSeason}
          renameSeason={renameSeason}
          toggleLock={toggleLock}
          forceSave={forceSave}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          draftOrder={liveDraftOrder}
          teams={teams}
          members={members}
          availableMembers={availableMembers}
          setDraftOrderPosition={setDraftOrderPosition}
          assignMemberToTeam13={assignMemberToTeam13}
          unassignPreassignedMember={unassignPreassignedMember}
          close={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}


function MobileDraftPager({
  mobilePages,
  mobilePage,
  setMobilePage,
  setTouchStartX,
  handleMobileTouchEnd,
  currentTeam,
  round,
  draftedCount,
  members,
  liveDraftMemberCount,
  totalRounds,
  draftPercent,
  timerMinutes,
  timerRemainder,
  timerRunning,
  setTimerRunning,
  setTimerSeconds,
  timerPercent,
  lastPicks,
  teams,
  draftOrder,
  availableMembers,
  query,
  setQuery,
  draftMember,
  locked,
  activeSeason,
}) {
  return (
    <section
      className="mobileDraftPager"
      onTouchStart={(event) => setTouchStartX(event.touches?.[0]?.clientX ?? null)}
      onTouchEnd={handleMobileTouchEnd}
    >
      <div className="mobilePagerTop">
        <strong>{mobilePages[mobilePage]}</strong>
        <div className="mobileDots">
          {mobilePages.map((page, index) => (
            <button
              key={page}
              className={index === mobilePage ? 'active' : ''}
              type="button"
              onClick={() => setMobilePage(index)}
              aria-label={`Go to ${page}`}
            />
          ))}
        </div>
      </div>

      {mobilePage === 0 && (
        <section className="mobilePage mobileClockPage">
          <span className="sectionTitle">On The Clock</span>
          <div className="onClock mobileOnClock">
            <div className="teamPuck">
              <span>Team</span>
              <strong>{currentTeam?.name?.replace(/[^0-9]/g, '') || currentTeam?.name?.slice(-1) || '—'}</strong>
            </div>
            <div className="clockInfo">
              <h1>{currentTeam?.name}</h1>
              <h2>Is On The Clock</h2>
              <p>Round {round} · Pick {draftedCount + 1}</p>
            </div>
            <div className="timerBox">
              <span>Time Remaining</span>
              <strong>{timerMinutes}:{timerRemainder}</strong>
              <div className="timerControls">
                <button type="button" onClick={() => setTimerRunning((prev) => !prev)}>{timerRunning ? 'Pause' : 'Start'}</button>
                <button type="button" onClick={() => setTimerSeconds(90)}>Reset</button>
              </div>
              <div className="miniBar"><i style={{ width: `${timerPercent}%` }} /></div>
            </div>
          </div>
        </section>
      )}

      {mobilePage === 1 && (
        <section className="mobilePage mobileProgressPage">
          <div className="progressPanel card">
            <div className="panelHeader"><h3>Draft Progress</h3><span>{draftedCount} of {liveDraftMemberCount}</span></div>
            <p>Round {round} of {totalRounds || 1} <b>{draftPercent}%</b></p>
            <div className="roundGrid mobileRoundGrid">
              {Array.from({ length: Math.min(totalRounds || 1, 24) }, (_, i) => (
                <span className={i + 1 === round ? 'current' : i + 1 < round ? 'done' : ''} key={i}>{i + 1}</span>
              ))}
            </div>
          </div>
          <RecentPicks picks={lastPicks} members={members} teams={teams} />
          <SnakeOrder draftOrder={draftOrder} draftedCount={draftedCount} />
        </section>
      )}

      {mobilePage === 2 && (
        <section className="mobilePage mobileMembersPage">
          <AvailableMembersPanel
            availableMembers={availableMembers}
            query={query}
            setQuery={setQuery}
            draftMember={draftMember}
            locked={locked}
            setActivePanel={() => {}}
          />
        </section>
      )}

      {mobilePage === 3 && (
        <section className="mobilePage mobileSettingsPage">
          <DraftSettings activeSeason={activeSeason} teams={teams} liveDraftOrder={draftOrder} totalRounds={totalRounds} />
          <TeamOverviewTable teams={teams} members={members} totalRounds={totalRounds} />
        </section>
      )}
    </section>
  );
}


function SnakeOrder({ draftOrder, draftedCount }) {
  const currentRoundIndex = Math.floor(draftedCount / Math.max(draftOrder.length, 1));
  const picksMadeInRound = draftedCount % Math.max(draftOrder.length, 1);
  const roundsToShow = [currentRoundIndex, currentRoundIndex + 1, currentRoundIndex + 2];

  return (
    <section className="card sideCard">
      <h3>Snake Draft Order</h3>
      {roundsToShow.map((roundIndex) => {
        const order = roundIndex % 2 === 0 ? draftOrder : [...draftOrder].reverse();
        const visibleOrder = roundIndex === currentRoundIndex ? order.slice(picksMadeInRound) : order;

        return (
          <div className="snakeRound" key={roundIndex}>
            <span>Round {roundIndex + 1}</span>
            <div>
              {visibleOrder.map((team) => (
                <b title={team.name} key={`${roundIndex}-${team.id}`}>{getTeamNumber(team) || team.name}</b>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function DraftSettings({ activeSeason, teams, liveDraftOrder, totalRounds }) {
  return (
    <section className="card sideCard">
      <h3>Draft Settings</h3>
      <div className="settingsRows">
        <p><span>Season</span><b>{activeSeason.name}</b></p>
        <p><span>Status</span><b>{activeSeason.locked ? 'Locked' : 'Active'}</b></p>
        <p><span>Live Draft Teams</span><b>{liveDraftOrder.length}</b></p>
        <p><span>Rounds</span><b>{totalRounds || 1}</b></p>
        <p><span>Picks Per Round</span><b>{liveDraftOrder.length}</b></p>
      </div>
    </section>
  );
}

function RecentPicks({ picks, members, teams }) {
  return (
    <section className="recentPanel card">
      <h3>Recent Picks</h3>
      <div className="recentGrid">
        {picks.length === 0 && <p>No picks yet.</p>}
        {picks.map((pick) => {
          const member = members.find((item) => item.id === pick.memberId);
          const team = teams.find((item) => item.id === pick.teamId);
          return (
            <div className="recentPick" key={`${pick.pickNumber}-${pick.memberId}`}>
              <b>{pick.pickNumber}</b>
              <span>{member?.name}</span>
              <small>{team?.name}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AvailableMembersPanel({ availableMembers, query, setQuery, draftMember, locked, setActivePanel }) {
  return (
    <section className="card splitPanel">
      <h3>Available Members <small>(Un-drafted)</small></h3>
      <label className="searchBox"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members..." /></label>
      <div className="availableTable">
        <div className="tableHead"><span>#</span><span>Name</span><span>Status</span><span>Score</span><span></span></div>
        {availableMembers.slice(0, 18).map((member, index) => (
          <div className="tableRow" key={member.id}>
            <span>{index + 1}</span>
            <b>{member.name}</b>
            <span>Available</span>
            <span>{member.rating || '—'}</span>
            <button disabled={locked} onClick={() => draftMember(member.id)}>Draft</button>
          </div>
        ))}
      </div>
      <button className="linkBtn" onClick={() => setActivePanel('members')}>View all members →</button>
    </section>
  );
}

function TeamOverviewTable({ teams, members, totalRounds }) {
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

function SummaryStrip({ strongestTeam, weakestTeam, balancedTeam }) {
  return (
    <section className="summaryStrip">
      <div><Trophy size={24} /><span>Strongest Team</span><b>{strongestTeam ? `${strongestTeam.team.name} (${strongestTeam.avg.toFixed(1)})` : '—'}</b></div>
      <div><Star size={24} /><span>Most Balanced</span><b>{balancedTeam ? `${balancedTeam.team.name} (${balancedTeam.avg.toFixed(1)})` : '—'}</b></div>
      <div><BarChart3 size={24} /><span>Weakest Team</span><b>{weakestTeam ? `${weakestTeam.team.name} (${weakestTeam.avg.toFixed(1)})` : '—'}</b></div>
    </section>
  );
}

function SettingsDrawer({ state, setState, activeSeason, newSeasonName, setNewSeasonName, addSeason, deleteSeason, renameSeason, toggleLock, forceSave, settingsTab, setSettingsTab, draftOrder, teams, members, availableMembers, setDraftOrderPosition, assignMemberToTeam13, unassignPreassignedMember, close }) {
  return (
    <aside className="settingsDrawer">
      <div className="drawerTop"><h2>Settings</h2><button onClick={close}><X size={20} /></button></div>
      <div className="drawerTabs">
        <button className={settingsTab === 'seasons' ? 'active' : ''} onClick={() => setSettingsTab('seasons')}>Seasons</button>
        <button className={settingsTab === 'draft' ? 'active' : ''} onClick={() => setSettingsTab('draft')}>Draft Settings</button>
        <button className={settingsTab === 'prefs' ? 'active' : ''} onClick={() => setSettingsTab('prefs')}>Preferences</button>
      </div>
      {settingsTab === 'seasons' && (
        <>
          <h3>Manage Seasons</h3>
          <p>Create, rename or delete draft seasons.</p>
          <input value={newSeasonName} onChange={(event) => setNewSeasonName(event.target.value)} placeholder="2027 Draft" />
          <button className="goldWide" onClick={addSeason}><Plus size={18} /> New Season</button>
          <div className="seasonRows">
            {state.seasons.map((season) => (
              <div key={season.id} className="seasonRow">
                <button onClick={() => setState((prev) => ({ ...prev, activeSeasonId: season.id }))}>{season.name}</button>
                {season.id === state.activeSeasonId && <span>Active</span>}
                <button className="miniDanger" onClick={() => deleteSeason(season.id)}>Delete</button>
              </div>
            ))}
          </div>
          <label>Rename Active Season<input value={activeSeason.name} onChange={(event) => renameSeason(event.target.value)} /></label>
        </>
      )}
      {settingsTab === 'draft' && (
        <div className="settingsStack">
          <button className="secondaryBtn" onClick={toggleLock}>{activeSeason.locked ? <Unlock size={17} /> : <Lock size={17} />} {activeSeason.locked ? 'Unlock Draft' : 'Lock Draft'}</button>
          <button className="secondaryBtn" onClick={forceSave}><Save size={17} /> Save Now</button>
          <p>Scores are blank until a member is drafted. Their 2026 score is assigned by the round they are drafted in.</p>

          <DraftOrderSetup teams={teams} draftOrder={draftOrder} setDraftOrderPosition={setDraftOrderPosition} />

          <Team13Preassign
            team13={teams[12]}
            members={members}
            availableMembers={availableMembers}
            assignMemberToTeam13={assignMemberToTeam13}
            unassignPreassignedMember={unassignPreassignedMember}
          />
        </div>
      )}
      {settingsTab === 'prefs' && <div className="settingsStack"><p>Logo uploads and advanced preferences can be added later.</p></div>}
    </aside>
  );
}


function DraftOrderSetup({ teams, draftOrder, setDraftOrderPosition }) {
  const liveTeams = teams.filter(isLiveDraftTeam);
  return (
    <section className="drawerSection">
      <h3>Initial Draft Order</h3>
      <p>Use this when numbers are drawn from a hat. Assign each team to its first-round pick position before the draft begins.</p>
      <div className="draftOrderSetup">
        {draftOrder.map((team, index) => (
          <div className="draftOrderSetupRow" key={team.id}>
            <span>Pick {index + 1}</span>
            <strong>{team.name}</strong>
            <select value={index + 1} onChange={(event) => setDraftOrderPosition(team.id, Number(event.target.value))}>
              {liveTeams.map((_, pickIndex) => <option key={pickIndex + 1} value={pickIndex + 1}>Move to pick {pickIndex + 1}</option>)}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}

function Team13Preassign({ team13, members, availableMembers, assignMemberToTeam13, unassignPreassignedMember }) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const assigned = members
    .filter((member) => member.draftedTeamId === team13?.id && !member.pickNumber)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="drawerSection">
      <h3>{team13?.name || 'Team 13'} Pre-Assignments</h3>
      <p>Use this for members assigned to Team 13 before the live draft begins. These members will not consume draft picks.</p>
      <div className="preassignControls">
        <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
          <option value="">Select available member</option>
          {availableMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
        <button
          type="button"
          className="goldBtn"
          disabled={!selectedMemberId}
          onClick={() => {
            assignMemberToTeam13(selectedMemberId);
            setSelectedMemberId('');
          }}
        >
          Assign
        </button>
      </div>
      <div className="preassignedList">
        {assigned.length === 0 && <span>No pre-assigned members yet.</span>}
        {assigned.map((member) => (
          <div key={member.id}>
            <b>{member.name}</b>
            <button type="button" onClick={() => unassignPreassignedMember(member.id)}>Remove</button>
          </div>
        ))}
      </div>
    </section>
  );
}


function TeamSetup({ teams, updateTeam }) {
  return (
    <section className="card setupPanel">
      <h2>Team Setup</h2>
      <p>Edit team names, captains, lieutenants, and team colors.</p>
      <div className="teamSetupGrid">
        {teams.map((team) => (
          <article className="setupCard" key={team.id}>
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

function MemberManager({ availableMembers, query, setQuery, sort, setSort, addMember, updateMember, deleteMember, draftMember, handleImport, importRef, exportMembers, exportRosters, locked }) {
  return (
    <section className="card setupPanel">
      <div className="panelHeader">
        <h2>Member Manager</h2>
        <div className="actionRow">
          <input ref={importRef} hidden type="file" accept=".csv,text/csv" onChange={handleImport} />
          <button className="secondaryBtn" onClick={() => importRef.current?.click()}><FileUp size={17} /> Import CSV</button>
          <button className="secondaryBtn" onClick={exportMembers}><Download size={17} /> Export Members</button>
          <button className="secondaryBtn" onClick={exportRosters}><Download size={17} /> Export Rosters</button>
          <button className="goldBtn" onClick={addMember}><Plus size={17} /> Add Member</button>
        </div>
      </div>
      <div className="toolsRow">
        <label className="searchBox"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or tags" /></label>
        <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Sort by Name</option><option value="rating">Sort by Score</option></select>
      </div>
      <div className="memberCards">
        {availableMembers.map((member) => (
          <article className="memberCard" key={member.id}>
            <div className="memberAvatar">{member.photo ? <img src={member.photo} alt={member.name} /> : <ImagePlus size={24} />}</div>
            <input className="memberName" value={member.name} onChange={(event) => updateMember(member.id, 'name', event.target.value)} />
            <input value={member.rating || ''} onChange={(event) => updateMember(member.id, 'rating', event.target.value)} placeholder="Score" />
            <input value={member.tags} onChange={(event) => updateMember(member.id, 'tags', event.target.value)} placeholder="Tags" />
            <button disabled={locked} className="goldBtn" onClick={() => draftMember(member.id)}>Draft</button>
            <button className="dangerBtn" onClick={() => deleteMember(member.id)}><Trash2 size={16} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}

function DraftHistory({ history, members, teams }) {
  const ordered = [...history].sort((a, b) => b.pickNumber - a.pickNumber);
  return (
    <section className="card setupPanel">
      <h2>Draft History</h2>
      <div className="historyList">
        {ordered.length === 0 && <p>No picks have been made yet.</p>}
        {ordered.map((pick) => {
          const member = members.find((item) => item.id === pick.memberId);
          const team = teams.find((item) => item.id === pick.teamId);
          return <div className="historyRow" key={`${pick.pickNumber}-${pick.memberId}`}><strong>Pick {pick.pickNumber}</strong><span>{team?.name}</span><span>{member?.name}</span><b>{member?.rating || '—'}</b></div>;
        })}
      </div>
    </section>
  );
}

function Analytics({ teams, members }) {
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
