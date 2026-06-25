import { Lock, Plus, Save, Unlock, X } from 'lucide-react';
import { isLiveDraftTeam } from '../utils/draftLogic.js';
import { useState } from 'react';

export function SettingsDrawer({
  state,
  setState,
  activeSeason,
  newSeasonName,
  setNewSeasonName,
  addSeason,
  deleteSeason,
  renameSeason,
  toggleLock,
  forceSave,
  settingsTab,
  setSettingsTab,
  draftOrder,
  teams,
  members,
  availableMembers,
  setDraftOrderPosition,
  updateDraftSettings,
  assignMemberToTeam13,
  unassignPreassignedMember,
  close,
}) {
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

          <DraftSettingsControls activeSeason={activeSeason} updateDraftSettings={updateDraftSettings} />

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

function DraftSettingsControls({ activeSeason, updateDraftSettings }) {
  const timerSeconds = activeSeason.draftSettings?.timerSeconds ?? 90;
  const manualRounds = activeSeason.draftSettings?.manualRounds ?? '';

  return (
    <section className="drawerSection">
      <h3>Draft Timing & Rounds</h3>
      <p>Leave rounds blank to calculate automatically from the number of live draft members divided by the 12 live draft teams.</p>

      <label>
        Pick Timer Seconds
        <input
          type="number"
          min="5"
          step="5"
          value={timerSeconds}
          onChange={(event) => updateDraftSettings('timerSeconds', Math.max(5, Number(event.target.value) || 90))}
        />
      </label>

      <label>
        Manual Number of Rounds
        <input
          type="number"
          min="1"
          step="1"
          value={manualRounds}
          placeholder="Auto"
          onChange={(event) => updateDraftSettings('manualRounds', event.target.value ? Math.max(1, Number(event.target.value)) : '')}
        />
      </label>
    </section>
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
