export function RecentPicks({ picks, members, teams }) {
  return (
    <section className="recentPanel card">
      <h3>Recent Picks</h3>
      <div className="recentGrid">
        {picks.length === 0 && <p>No picks yet.</p>}
        {picks.map((pick) => {
          const member = members.find((item) => item.id === pick.memberId);
          const team = teams.find((item) => item.id === pick.teamId);
          return (
            <div className="recentPick" key={`${pick.pickNumber}-${pick.memberId}`}>
              <b>{pick.pickNumber}</b>
              <span>{member?.name}</span>
              <small>{team?.name}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
