import { AvailableMembersPanel } from './AvailableMembersPanel.jsx';
import { ClockPanel } from './ClockPanel.jsx';
import { DraftProgress } from './DraftProgress.jsx';
import { DraftSettings } from './DraftSettings.jsx';
import { RecentPicks } from './RecentPicks.jsx';
import { SnakeOrder } from './SnakeOrder.jsx';
import { TeamOverviewTable } from './TeamOverviewTable.jsx';

export function MobileDraftPager({
  mobilePages,
  mobilePage,
  setMobilePage,
  setTouchStartX,
  handleMobileTouchEnd,
  currentTeam,
  round,
  draftedCount,
  members,
  liveDraftMemberCount,
  totalRounds,
  draftPercent,
  timerMinutes,
  timerRemainder,
  timerRunning,
  setTimerRunning,
  setTimerSeconds,
  timerPercent,
  lastPicks,
  teams,
  draftOrder,
  availableMembers,
  query,
  setQuery,
  draftMember,
  locked,
  activeSeason,
}) {
  return (
    <section
      className="mobileDraftPager"
      onTouchStart={(event) => setTouchStartX(event.touches?.[0]?.clientX ?? null)}
      onTouchEnd={handleMobileTouchEnd}
    >
      <div className="mobilePagerTop">
        <strong>{mobilePages[mobilePage]}</strong>
        <div className="mobileDots">
          {mobilePages.map((page, index) => (
            <button
              key={page}
              className={index === mobilePage ? 'active' : ''}
              type="button"
              onClick={() => setMobilePage(index)}
              aria-label={`Go to ${page}`}
            />
          ))}
        </div>
      </div>

      {mobilePage === 0 && (
        <section className="mobilePage mobileClockPage">
          <span className="sectionTitle">On The Clock</span>
          <ClockPanel
            currentTeam={currentTeam}
            round={round}
            draftedCount={draftedCount}
            timerMinutes={timerMinutes}
            timerRemainder={timerRemainder}
            timerRunning={timerRunning}
            setTimerRunning={setTimerRunning}
            setTimerSeconds={setTimerSeconds}
            timerPercent={timerPercent}
            mobile
          />
        </section>
      )}

      {mobilePage === 1 && (
        <section className="mobilePage mobileProgressPage">
          <DraftProgress draftedCount={draftedCount} liveDraftMemberCount={liveDraftMemberCount} round={round} totalRounds={totalRounds} draftPercent={draftPercent} mobile />
          <RecentPicks picks={lastPicks} members={members} teams={teams} />
          <SnakeOrder draftOrder={draftOrder} draftedCount={draftedCount} />
        </section>
      )}

      {mobilePage === 2 && (
        <section className="mobilePage mobileMembersPage">
          <AvailableMembersPanel availableMembers={availableMembers} query={query} setQuery={setQuery} draftMember={draftMember} locked={locked} setActivePanel={() => {}} />
        </section>
      )}

      {mobilePage === 3 && (
        <section className="mobilePage mobileSettingsPage">
          <DraftSettings activeSeason={activeSeason} teams={teams} liveDraftOrder={draftOrder} totalRounds={totalRounds} />
          <TeamOverviewTable teams={teams} members={members} totalRounds={totalRounds} />
        </section>
      )}
    </section>
  );
}
