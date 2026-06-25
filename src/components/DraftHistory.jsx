export function DraftHistory({ history, members, teams }) {
  const ordered = [...history].sort((a, b) => b.pickNumber - a.pickNumber);

  return (
    <section className="card setupPanel historyPanel">
      <h2>Draft History</h2>
      <div className="historyList">
        {ordered.length === 0 && <p>No picks have been made yet.</p>}
        {ordered.map((pick) => {
          const member = members.find((item) => item.id === pick.memberId);
          const team = teams.find((item) => item.id === pick.teamId);
          return <div className="historyRow" key={`${pick.pickNumber}-${pick.memberId}`}><strong>Pick {pick.pickNumber}</strong><span>{team?.name}</span><span>{member?.name}</span><b>{member?.rating || '—'}</b></div>;
        })}
      </div>
    </section>
  );
}
