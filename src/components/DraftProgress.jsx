export function DraftProgress({ draftedCount, liveDraftMemberCount, round, totalRounds, draftPercent, mobile = false }) {
  return (
    <div className="progressPanel card">
      <div className="panelHeader"><h3>Draft Progress</h3><span>{draftedCount} of {liveDraftMemberCount} live picks</span></div>
      <p>Round {round} of {totalRounds || 1} <b>{draftPercent}%</b></p>
      <div className={`roundGrid ${mobile ? 'mobileRoundGrid' : ''}`}>
        {Array.from({ length: Math.min(totalRounds || 1, 24) }, (_, i) => (
          <span className={i + 1 === round ? 'current' : i + 1 < round ? 'done' : ''} key={i}>{i + 1}</span>
        ))}
      </div>
    </div>
  );
}
