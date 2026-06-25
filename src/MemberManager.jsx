import { COLORS } from '../constants.js';

export function TeamSetup({ teams, updateTeam }) {
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
