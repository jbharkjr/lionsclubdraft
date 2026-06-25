import { Download, FileUp, ImagePlus, Plus, Search, Trash2 } from 'lucide-react';

export function MemberManager({
  availableMembers,
  query,
  setQuery,
  sort,
  setSort,
  addMember,
  updateMember,
  deleteMember,
  draftMember,
  handleImport,
  importRef,
  exportMembers,
  exportRosters,
  locked,
}) {
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
