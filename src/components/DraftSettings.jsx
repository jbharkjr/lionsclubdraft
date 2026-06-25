export function DraftSettings({ activeSeason, teams, liveDraftOrder, totalRounds }) {
  return (
    <section className="card sideCard">
      <h3>Draft Settings</h3>
      <div className="settingsRows">
        <p><span>Season</span><b>{activeSeason.name}</b></p>
        <p><span>Status</span><b>{activeSeason.locked ? 'Locked' : 'Active'}</b></p>
        <p><span>Live Draft Teams</span><b>{liveDraftOrder.length}</b></p>
        <p><span>Rounds</span><b>{totalRounds || 1}</b></p>
        <p><span>Picks Per Round</span><b>{liveDraftOrder.length}</b></p>
      </div>
    </section>
  );
}
