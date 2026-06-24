import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ImagePlus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shuffle,
  Star,
  Trophy,
  Undo2,
  Users,
} from 'lucide-react';

const STORAGE_KEY = 'lions-club-draft-phase-2a';
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
    draftedTeamId: null,
    pickNumber: null,
  }));
}

function makeSeason(name = '2026 Draft') {
  return {
    id: crypto.randomUUID?.() || `season-${Date.now()}`,
    name,
    teams: makeDefaultTeams(),
    draftOrder: makeDefaultTeams(),
    members: makeDefaultMembers(),
    history: [],
    locked: false,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const season = makeSeason();
      return { activeSeasonId: season.id, seasons: [season] };
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.seasons?.length) throw new Error('Invalid saved draft data');
    return parsed;
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

export default function App() {
  const [state, setState] = useState(loadState);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('rating');
  const [activePanel, setActivePanel] = useState('draft');
  const [newSeasonName, setNewSeasonName] = useState('');

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
  const round = Math.floor(draftedCount / teams.length) + 1;

  const availableMembers = useMemo(() => {
    return members
      .filter((member) => !member.draftedTeamId)
      .filter((member) => `${member.name} ${member.note}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.rating - a.rating));
  }, [members, query, sort]);

  const draftMember = (memberId) => {
    if (!currentTeam || activeSeason.locked) return;
    const pickNumber = draftedCount + 1;
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.id === memberId ? { ...member, draftedTeamId: currentTeam.id, pickNumber } : member
      )),
      history: [...season.history, { memberId, teamId: currentTeam.id, pickNumber }],
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

  const updateTeam = (id, field, value) => {
    updateSeason((season) => {
      const teamsNext = season.teams.map((team) => (team.id === id ? { ...team, [field]: value } : team));
      const draftOrderNext = season.draftOrder.map((team) => {
        const updated = teamsNext.find((candidate) => candidate.id === team.id);
        return updated || team;
      });
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
          draftedTeamId: null,
          pickNumber: null,
        },
      ],
    }));
  };

  return (
    <main className="appShell">
      <header className="hero">
        <div>
          <p className="eyebrow">Lions Club</p>
          <h1>Team Draft Board</h1>
          <p className="subtle">Season-based snake draft with editable teams, notes, ratings, and saved browser progress.</p>
        </div>
        <div className="heroActions">
          <button className="primaryBtn" type="button" onClick={randomizeOrder}><Shuffle size={18} /> Randomize Draft</button>
          <button className="secondaryBtn" type="button" onClick={resetDraft}><RotateCcw size={17} /> Reset Picks</button>
        </div>
      </header>

      <section className="toolbar card">
        <div className="seasonTools">
          <label>
            Season
            <select value={state.activeSeasonId} onChange={(event) => setState((prev) => ({ ...prev, activeSeasonId: event.target.value }))}>
              {state.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
            </select>
          </label>
          <label>
            Rename Active Season
            <input value={activeSeason.name} onChange={(event) => renameSeason(event.target.value)} />
          </label>
          <label>
            New Season
            <input value={newSeasonName} onChange={(event) => setNewSeasonName(event.target.value)} placeholder="2027 Draft" />
          </label>
          <button className="secondaryBtn" type="button" onClick={addSeason}><Plus size={17} /> Add Season</button>
          <button className="secondaryBtn" type="button" onClick={toggleLock}><Save size={17} /> {activeSeason.locked ? 'Unlock Draft' : 'Lock Draft'}</button>
        </div>
        <div className="tabs">
          <button type="button" className={activePanel === 'draft' ? 'active' : ''} onClick={() => setActivePanel('draft')}>Draft Board</button>
          <button type="button" className={activePanel === 'teams' ? 'active' : ''} onClick={() => setActivePanel('teams')}>Team Setup</button>
          <button type="button" className={activePanel === 'members' ? 'active' : ''} onClick={() => setActivePanel('members')}>Member Manager</button>
        </div>
      </section>

      <section className="currentPick card">
        <div>
          <span className="label">Current Pick</span>
          <h2>{currentTeam?.name}</h2>
          <p>{currentTeam?.captain} / {currentTeam?.lieutenant}</p>
        </div>
        <div className="pickStats">
          <strong>Round {round}</strong>
          <span>Pick {draftedCount + 1}</span>
          <small>{draftedCount} drafted / {members.length} total</small>
        </div>
        <button className="secondaryBtn" type="button" onClick={undoLastPick}><Undo2 size={17} /> Undo</button>
      </section>

      {activePanel === 'draft' && (
        <section className="layoutGrid">
          <div className="card memberPanel">
            <div className="panelHeader">
              <h2>Available Members</h2>
              <span>{availableMembers.length} left</span>
            </div>
            <div className="toolsRow">
              <label className="searchBox"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or notes" /></label>
              <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="rating">Sort by Rating</option><option value="name">Sort by Name</option></select>
            </div>
            <div className="memberList">
              {availableMembers.map((member) => (
                <article className="memberCard" key={member.id}>
                  <div className="avatar">{member.photo ? <img src={member.photo} alt={member.name} /> : <ImagePlus size={22} />}</div>
                  <div className="memberInfo">
                    <input className="memberName" value={member.name} onChange={(event) => updateMember(member.id, 'name', event.target.value)} />
                    <textarea value={member.note} onChange={(event) => updateMember(member.id, 'note', event.target.value)} placeholder="Add note..." />
                    <div className="memberMeta">
                      <label><Star size={15} /><input type="number" min="0" max="10" step="0.1" value={member.rating} onChange={(event) => updateMember(member.id, 'rating', Number(event.target.value))} /></label>
                      <button type="button" disabled={activeSeason.locked} onClick={() => draftMember(member.id)}><CheckCircle2 size={16} /> Draft</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="teamsPanel">
            <div className="card orderCard">
              <h2><Trophy size={20} /> Draft Order</h2>
              {draftOrder.map((team, index) => <div className="orderRow" key={team.id}><span>{index + 1}</span><strong>{team.name}</strong></div>)}
            </div>
            <TeamGrid teams={teams} members={members} />
          </div>
        </section>
      )}

      {activePanel === 'teams' && (
        <section className="card setupPanel">
          <h2>Team Setup</h2>
          <p className="helperText">Edit team names, captains, lieutenants, and team colors. Draft order will stay linked to these teams.</p>
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
      )}

      {activePanel === 'members' && (
        <section className="card setupPanel">
          <div className="panelHeader"><h2>Member Manager</h2><button className="primaryBtn" type="button" onClick={addMember}><Plus size={17} /> Add Member</button></div>
          <p className="helperText">Temporary browser-saved member list. CSV import and Supabase database come next.</p>
          <div className="memberManagerList">
            {members.map((member) => (
              <article className="managerRow" key={member.id}>
                <input value={member.name} onChange={(event) => updateMember(member.id, 'name', event.target.value)} />
                <input type="number" min="0" max="10" step="0.1" value={member.rating} onChange={(event) => updateMember(member.id, 'rating', Number(event.target.value))} />
                <input value={member.photo} onChange={(event) => updateMember(member.id, 'photo', event.target.value)} placeholder="Photo URL" />
                <textarea value={member.note} onChange={(event) => updateMember(member.id, 'note', event.target.value)} placeholder="Notes" />
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function TeamGrid({ teams, members }) {
  return (
    <div className="teamGrid">
      {teams.map((team) => {
        const roster = members
          .filter((member) => member.draftedTeamId === team.id)
          .sort((a, b) => a.pickNumber - b.pickNumber);
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
