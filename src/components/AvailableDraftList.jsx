import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export function AvailableDraftList({ members }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name-asc');

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
          <div className="availableDraftRow" key={member.id}>
            <span>{member.name}</span>
            <b>{member.rating || '—'}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
