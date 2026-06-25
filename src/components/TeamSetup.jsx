import { COLORS } from '../constants.js';

export function TeamSetup({ teams, updateTeam }) {
  return (
    <section className="card setupPanel">
      <h2>Team Setup</h2>
      <p>Edit team names and colors. Captains and lieutenants are populated from Member Manager.</p>
      <div className="teamSetupGrid">
        {teams.map((team) => (
          <article className="setupCard" key={team.id}>
            <label>Team Name<input value={team.name} onChange={(event) => updateTeam(team.id, 'name', event.target.value)} /></label>
            <label>Captain<input value={team.captain || ''} readOnly placeholder="Select in Member Manager" /></label>
            <label>Lt.<input value={team.lieutenant || ''} readOnly placeholder="Select in Member Manager" /></label>
            <label>Color<select value={team.color} onChange={(event) => updateTeam(team.id, 'color', event.target.value)}>{COLORS.map((color) => <option key={color} value={color}>{color}</option>)}</select></label>
          </article>
        ))}
      </div>
    </section>
  );
}
