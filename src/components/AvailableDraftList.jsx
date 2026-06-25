import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export function AvailableDraftList({ members, teams, currentTeam, draftMember, locked }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name-asc');
  const [selectedMember, setSelectedMember] = useState(null);

  const availableMembers = useMemo(() => {
    const filtered = members
      .filter((member) => !member.draftedTeamId)
      .filter((member) => member.name.toLowerCase().includes(query.toLowerCase()));

    return [...filtered].sort((a, b) => {
      if (sort === 'name-desc') return b.name.localeCompare(a.name);
      if (sort === 'score-desc') return Number(b.rating || 0) - Number(a.rating || 0) || a.name.localeCompare(b.name);
      if (sort === 'score-asc') return Number(a.rating || 0) - Number(b.rating || 0) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }, [members, query, sort]);

  const selectedTeam = selectedMember?.draftedTeamId
    ? teams.find((team) => team.id === selectedMember.draftedTeamId)
    : null;

  const closeMemberWindow = () => setSelectedMember(null);

  const openMemberWindow = (member) => {
    setSelectedMember(member);
    window.history.pushState({ availableDraftMemberWindow: member.id }, '');
  };

  useEffect(() => {
    if (!selectedMember) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMemberWindow();
    };

    const handlePopState = () => closeMemberWindow();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedMember]);

  const handleDraftSelectedMember = () => {
    if (!selectedMember || locked || !currentTeam) return;
    draftMember(selectedMember.id);
    closeMemberWindow();
  };

  return (
    <section className="card setupPanel availableDraftListPage">
      <div className="panelHeader availableDraftHeader">
        <div>
          <h2>Available Draft List</h2>
          <p>{availableMembers.length} available members</p>
        </div>
        <div className="availableDraftTools">
          <label className="searchBox compactSearchBox"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name" /></label>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="score-desc">Score High-Low</option>
            <option value="score-asc">Score Low-High</option>
          </select>
        </div>
      </div>

      <div className="availableDraftColumns">
        {availableMembers.map((member) => (
          <button className="availableDraftRow" type="button" key={member.id} onClick={() => openMemberWindow(member)}>
            <span>{member.name}</span>
            <b>{member.rating || '—'}</b>
          </button>
        ))}
      </div>

      {selectedMember && (
        <div className="memberModalOverlay" onClick={closeMemberWindow} role="presentation">
          <div className="memberDraftModal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="member-draft-modal-title">
            <div className="memberDraftModalHeader">
              <div>
                <span>Available Member</span>
                <h2 id="member-draft-modal-title">{selectedMember.name}</h2>
              </div>
              <button type="button" className="modalCloseButton" onClick={closeMemberWindow} aria-label="Close member window">×</button>
            </div>

            <div className="memberDraftDetails">
              <div>
                <span>Score</span>
                <strong>{selectedMember.rating || '—'}</strong>
              </div>
              <div>
                <span>Current Team</span>
                <strong>{selectedTeam?.name || 'Available'}</strong>
              </div>
              <div>
                <span>On The Clock</span>
                <strong>{currentTeam?.name || 'Draft Complete'}</strong>
              </div>
            </div>

            <div className="memberDraftActions">
              <button type="button" className="secondaryButton" onClick={closeMemberWindow}>Close</button>
              <button type="button" className="primaryButton" onClick={handleDraftSelectedMember} disabled={locked || !currentTeam}>
                Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
