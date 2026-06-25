export function ClockPanel({
  currentTeam,
  round,
  draftedCount,
  timerMinutes,
  timerRemainder,
  timerRunning,
  setTimerRunning,
  setTimerSeconds,
  timerPercent,
  mobile = false,
}) {
  return (
    <div className={`onClock ${mobile ? 'mobileOnClock' : ''}`}>
      <div className="teamPuck">
        <span>Team</span>
        <strong>{currentTeam?.name?.replace(/[^0-9]/g, '') || currentTeam?.name?.slice(-1) || '—'}</strong>
      </div>
      <div className="clockInfo">
        <h1>{currentTeam?.name}</h1>
        <h2>Is On The Clock</h2>
        <p>Round {round} · Pick {draftedCount + 1}</p>
      </div>
      <div className="timerBox">
        <span>Time Remaining</span>
        <strong>{timerMinutes}:{timerRemainder}</strong>
        <div className="timerControls">
          <button type="button" onClick={() => setTimerRunning((prev) => !prev)}>{timerRunning ? 'Pause' : 'Start'}</button>
          <button type="button" onClick={() => setTimerSeconds(90)}>Reset</button>
        </div>
        <div className="miniBar"><i style={{ width: `${timerPercent}%` }} /></div>
      </div>
    </div>
  );
}
