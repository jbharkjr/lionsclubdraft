import { Search } from 'lucide-react';

export function AvailableMembersPanel({ availableMembers, query, setQuery, draftMember, locked, setActivePanel }) {
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
