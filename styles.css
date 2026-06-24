import { useMemo, useState } from 'react';
import { Shuffle, Undo2, Search, Star, Users, Trophy, ImagePlus, CheckCircle2 } from 'lucide-react';

const initialTeams = Array.from({ length: 13 }, (_, i) => ({
  id: `team-${i + 1}`,
  name: `Team ${i + 1}`,
  captain: `Captain ${i + 1}`,
  lieutenant: `Lt. ${i + 1}`,
  color: ['gold', 'green', 'blue', 'purple', 'red'][i % 5],
}));

const initialMembers = Array.from({ length: 52 }, (_, i) => ({
  id: `member-${i + 1}`,
  name: `Member ${i + 1}`,
  rating: Number((Math.random() * 4 + 5).toFixed(1)),
  note: i % 4 === 0 ? 'Good attendance / reliable helper' : '',
  photo: '',
  draftedTeamId: null,
  pickNumber: null,
}));

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

export default function App() {
  const [teams] = useState(initialTeams);
  const [draftOrder, setDraftOrder] = useState(initialTeams);
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('rating');
  const [history, setHistory] = useState([]);

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
    if (!currentTeam) return;
    const pickNumber = draftedCount + 1;
    setMembers((prev) => prev.map((member) => (
      member.id === memberId
        ? { ...member, draftedTeamId: currentTeam.id, pickNumber }
        : member
    )));
    setHistory((prev) => [...prev, { memberId, teamId: currentTeam.id, pickNumber }]);
  };

  const undoLastPick = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setMembers((prev) => prev.map((member) => (
      member.id === last.memberId
        ? { ...member, draftedTeamId: null, pickNumber: null }
        : member
    )));
    setHistory((prev) => prev.slice(0, -1));
  };

  const updateMember = (id, field, value) => {
    setMembers((prev) => prev.map((member) => (
      member.id === id ? { ...member, [field]: value } : member
    )));
  };

  const randomizeOrder = () => {
    const next = shuffleTeams(teams);
    setDraftOrder(next);
    setMembers((prev) => prev.map((member) => ({ ...member, draftedTeamId: null, pickNumber: null })));
    setHistory([]);
  };

  return (
    <main className="appShell">
      <header className="hero">
        <div>
          <p className="eyebrow">Lions Club</p>
          <h1>Team Draft Board</h1>
          <p className="subtle">Snake-style fantasy draft for 13 teams, captains, lieutenants, member notes, ratings, and photos.</p>
        </div>
        <button className="primaryBtn" type="button" onClick={randomizeOrder}>
          <Shuffle size={18} /> Randomize Draft
        </button>
      </header>

      <section className="currentPick card">
        <div>
          <span className="label">Current Pick</span>
          <h2>{currentTeam?.name}</h2>
          <p>{currentTeam?.captain} / {currentTeam?.lieutenant}</p>
        </div>
        <div className="pickStats">
          <strong>Round {round}</strong>
          <span>Pick {draftedCount + 1}</span>
        </div>
        <button className="secondaryBtn" type="button" onClick={undoLastPick}>
          <Undo2 size={17} /> Undo
        </button>
      </section>

      <section className="layoutGrid">
        <div className="card memberPanel">
          <div className="panelHeader">
            <h2>Available Members</h2>
            <span>{availableMembers.length} left</span>
          </div>
          <div className="toolsRow">
            <label className="searchBox">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or notes" />
            </label>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="rating">Sort by Rating</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
          <div className="memberList">
            {availableMembers.map((member) => (
              <article className="memberCard" key={member.id}>
                <div className="avatar">
                  {member.photo ? <img src={member.photo} alt={member.name} /> : <ImagePlus size={22} />}
                </div>
                <div className="memberInfo">
                  <input className="memberName" value={member.name} onChange={(event) => updateMember(member.id, 'name', event.target.value)} />
                  <textarea value={member.note} onChange={(event) => updateMember(member.id, 'note', event.target.value)} placeholder="Add note..." />
                  <div className="memberMeta">
                    <label>
                      <Star size={15} />
                      <input type="number" min="0" max="10" step="0.1" value={member.rating} onChange={(event) => updateMember(member.id, 'rating', Number(event.target.value))} />
                    </label>
                    <button type="button" onClick={() => draftMember(member.id)}>
                      <CheckCircle2 size={16} /> Draft
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="teamsPanel">
          <div className="card orderCard">
            <h2><Trophy size={20} /> Draft Order</h2>
            {draftOrder.map((team, index) => (
              <div className="orderRow" key={team.id}>
                <span>{index + 1}</span>
                <strong>{team.name}</strong>
              </div>
            ))}
          </div>
          <div className="teamGrid">
            {teams.map((team) => {
              const roster = members
                .filter((member) => member.draftedTeamId === team.id)
                .sort((a, b) => a.pickNumber - b.pickNumber);
              const avg = roster.length
                ? (roster.reduce((sum, member) => sum + Number(member.rating || 0), 0) / roster.length).toFixed(1)
                : '—';

              return (
                <section className={`teamCard ${team.color}`} key={team.id}>
                  <div className="teamTop">
                    <h3>{team.name}</h3>
                    <span><Users size={14} /> {roster.length}</span>
                  </div>
                  <p>{team.captain} / {team.lieutenant}</p>
                  <small>Avg Rating: {avg}</small>
                  <ol>
                    {roster.map((member) => (
                      <li key={member.id}>
                        <span>{member.name}</span>
                        <b>{member.rating}</b>
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
