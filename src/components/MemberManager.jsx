import { useState } from 'react';
import { Download, FileUp, ImagePlus, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';

const normalizeMemberDraft = (member) => ({
  photo: member.photo || '',
  name: member.name || '',
  rating: member.rating || '',
  draftedTeamId: member.draftedTeamId || '',
  teamRole: member.teamRole || '',
});

export function MemberManager({
  members,
  teams,
  query,
  setQuery,
  sort,
  setSort,
  addMember,
  updateMember,
  updateMemberProfile,
  deleteMember,
  handleImport,
  importRef,
  exportMembers,
  exportRosters,
}) {
  const [editingRows, setEditingRows] = useState({});
  const [rowDrafts, setRowDrafts] = useState({});

  const filteredMembers = [...members]
    .filter((member) => member.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
      if (sort === 'team') return String(a.draftedTeamId || '').localeCompare(String(b.draftedTeamId || '')) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });

  const beginEdit = (member) => {
    setEditingRows((prev) => ({ ...prev, [member.id]: true }));
    setRowDrafts((prev) => ({ ...prev, [member.id]: normalizeMemberDraft(member) }));
  };

  const cancelEdit = (memberId) => {
    setEditingRows((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
    setRowDrafts((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  };

  const updateDraft = (memberId, field, value) => {
    setRowDrafts((prev) => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [field]: value,
      },
    }));
  };

  const saveEdit = (member) => {
    const draft = rowDrafts[member.id] || normalizeMemberDraft(member);
    updateMemberProfile(member.id, draft);
    cancelEdit(member.id);
  };

  const updateOpenMember = (member, field, value) => {
    if (member.pickNumber && !editingRows[member.id]) return;
    if (editingRows[member.id]) {
      updateDraft(member.id, field, value);
      return;
    }
    const nextDraft = {
      ...normalizeMemberDraft(member),
      [field]: value,
    };
    updateMemberProfile(member.id, nextDraft);
  };

  return (
    <section className="card setupPanel memberManagerPanel">
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
        <label className="searchBox"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name" /></label>
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="rating">Sort by Score</option>
          <option value="team">Sort by Team</option>
        </select>
      </div>
      <div className="memberCards memberManagerList">
        {filteredMembers.map((member) => {
          const isDrafted = Boolean(member.pickNumber);
          const isEditing = Boolean(editingRows[member.id]);
          const values = isEditing ? (rowDrafts[member.id] || normalizeMemberDraft(member)) : normalizeMemberDraft(member);
          const rowLocked = isDrafted && !isEditing;

          return (
            <article className={`memberCard memberManagerRow ${rowLocked ? 'lockedMemberRow' : ''}`} key={member.id}>
              <div className="memberAvatar">{values.photo ? <img src={values.photo} alt={values.name} /> : <ImagePlus size={24} />}</div>
              <input
                className="memberName"
                value={values.name}
                onChange={(event) => updateOpenMember(member, 'name', event.target.value)}
                placeholder="Name"
                disabled={rowLocked}
              />
              <input
                value={values.rating}
                onChange={(event) => updateOpenMember(member, 'rating', event.target.value)}
                placeholder="Score"
                disabled={rowLocked}
              />
              <select
                value={values.draftedTeamId}
                onChange={(event) => updateOpenMember(member, 'draftedTeamId', event.target.value)}
                disabled={rowLocked}
                title="Team Number"
              >
                <option value="">No Team</option>
                {teams.map((team, index) => (
                  <option key={team.id} value={team.id}>Team {index + 1}</option>
                ))}
              </select>
              <select
                value={values.teamRole}
                onChange={(event) => updateOpenMember(member, 'teamRole', event.target.value)}
                disabled={rowLocked || !values.draftedTeamId}
                title="Team Role"
              >
                <option value="">Member</option>
                <option value="captain">Captain</option>
                <option value="lieutenant">Lieutenant</option>
              </select>
              <div className="memberRowActions">
                {isDrafted && !isEditing && <button className="secondaryBtn" onClick={() => beginEdit(member)}><Pencil size={16} /> Edit</button>}
                {isEditing && <button className="goldBtn" onClick={() => saveEdit(member)}><Save size={16} /> Save</button>}
                {isEditing && <button className="secondaryBtn" onClick={() => cancelEdit(member.id)}><X size={16} /> Cancel</button>}
                {!isEditing && <button className="dangerBtn" onClick={() => deleteMember(member.id)}><Trash2 size={16} /></button>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
