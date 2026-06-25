import { useMemo, useRef, useState } from 'react';
import { AvailableMembersPanel } from './components/AvailableMembersPanel.jsx';
import { Analytics } from './components/Analytics.jsx';
import { ClockPanel } from './components/ClockPanel.jsx';
import { DraftHistory } from './components/DraftHistory.jsx';
import { DraftProgress } from './components/DraftProgress.jsx';
import { DraftSettings } from './components/DraftSettings.jsx';
import { MemberManager } from './components/MemberManager.jsx';
import { MobileDraftPager } from './components/MobileDraftPager.jsx';
import { RecentPicks } from './components/RecentPicks.jsx';
import { SettingsDrawer } from './components/SettingsDrawer.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { SnakeOrder } from './components/SnakeOrder.jsx';
import { SummaryStrip } from './components/SummaryStrip.jsx';
import { TeamOverviewTable } from './components/TeamOverviewTable.jsx';
import { TeamSetup } from './components/TeamSetup.jsx';
import { TopBar } from './components/TopBar.jsx';
import { useDraftTimer } from './hooks/useDraftTimer.js';
import { useMobilePager } from './hooks/useMobilePager.js';
import { useSupabaseDraftState } from './hooks/useSupabaseDraftState.js';
import { downloadText, importMembersFromCsv, toCsvValue } from './utils/csv.js';
import {
  getAverageRating,
  getCurrentTeam,
  getLiveDraftOrder,
  isLiveDraftTeam,
  makeSeason,
  scoreForRound,
  shuffleTeams,
} from './utils/draftLogic.js';

export default function App() {
  const { state, setState, syncStatus, forceSave } = useSupabaseDraftState();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [activePanel, setActivePanel] = useState('draft');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('seasons');
  const [newSeasonName, setNewSeasonName] = useState('');
  const importRef = useRef(null);

  const {
    mobilePages,
    mobilePage,
    setMobilePage,
    setTouchStartX,
    handleMobileTouchEnd,
  } = useMobilePager();

  const activeSeason = state.seasons.find((season) => season.id === state.activeSeasonId) || state.seasons[0];
  const teams = activeSeason.teams;
  const members = activeSeason.members;
  const draftOrder = activeSeason.draftOrder;
  const liveDraftOrder = getLiveDraftOrder(draftOrder);
  const history = activeSeason.history;

  const draftedCount = members.filter((member) => member.pickNumber).length;
  const currentTeam = getCurrentTeam(liveDraftOrder, draftedCount);
  const round = Math.floor(draftedCount / Math.max(liveDraftOrder.length, 1)) + 1;
  const liveDraftMemberCount = members.filter((member) => !member.draftedTeamId || member.pickNumber).length;
  const draftPercent = liveDraftMemberCount ? Math.round((draftedCount / liveDraftMemberCount) * 100) : 0;
  const autoTotalRounds = Math.ceil(liveDraftMemberCount / Math.max(liveDraftOrder.length, 1));
  const totalRounds = Number(activeSeason.draftSettings?.manualRounds) || autoTotalRounds;
  const timerDurationSeconds = Number(activeSeason.draftSettings?.timerSeconds) || 90;
  const lastPicks = [...history].sort((a, b) => b.pickNumber - a.pickNumber).slice(0, 4);

  const updateTimerState = (timer) => {
    updateSeason((season) => ({
      ...season,
      timer,
    }));
  };

  const timer = useDraftTimer(draftedCount, activeSeason.locked, activeSeason.timer, updateTimerState, timerDurationSeconds);

  const updateDraftSettings = (field, value) => {
    updateSeason((season) => ({
      ...season,
      draftSettings: {
        timerSeconds: 90,
        manualRounds: '',
        ...(season.draftSettings || {}),
        [field]: value,
      },
      timer: field === 'timerSeconds'
        ? {
            durationSeconds: Number(value) || 90,
            remainingSeconds: Number(value) || 90,
            startedAt: Date.now(),
            running: season.timer?.running ?? true,
            pickCount: draftedCount,
          }
        : season.timer,
    }));
  };

  const availableMembers = useMemo(() => {
    return members
      .filter((member) => !member.draftedTeamId)
      .filter((member) => `${member.name} ${member.tags}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : Number(b.rating || 0) - Number(a.rating || 0)));
  }, [members, query, sort]);

  const teamStats = teams.map((team) => {
    const roster = members.filter((member) => member.draftedTeamId === team.id);
    const avg = roster.length ? Number(getAverageRating(roster)) || 0 : 0;
    return { team, roster, avg };
  });
  const draftedStats = teamStats.filter((stat) => stat.roster.length);
  const strongestTeam = draftedStats.length ? [...draftedStats].sort((a, b) => b.avg - a.avg)[0] : null;
  const weakestTeam = draftedStats.length ? [...draftedStats].sort((a, b) => a.avg - b.avg)[0] : null;
  const balancedTeam = draftedStats.length ? [...draftedStats].sort((a, b) => Math.abs(5 - a.avg) - Math.abs(5 - b.avg))[0] : null;

  const updateSeason = (updater) => {
    setState((prev) => ({
      ...prev,
      seasons: prev.seasons.map((season) => (season.id === prev.activeSeasonId ? updater(season) : season)),
    }));
  };

  const draftMember = (memberId) => {
    if (!currentTeam || activeSeason.locked) return;

    const pickNumber = draftedCount + 1;
    const draftedRound = Math.floor(draftedCount / Math.max(liveDraftOrder.length, 1)) + 1;
    const rating = scoreForRound(draftedRound);

    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.id === memberId ? { ...member, draftedTeamId: currentTeam.id, pickNumber, draftedRound, rating } : member
      )),
      history: [...season.history, { memberId, teamId: currentTeam.id, pickNumber, draftedRound, timestamp: new Date().toISOString() }],
    }));
  };

  const updateMember = (id, field, value) => {
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (member.id === id ? { ...member, [field]: value } : member)),
    }));
  };

  const deleteMember = (id) => {
    if (!window.confirm('Delete this member from the active season?')) return;
    updateSeason((season) => ({
      ...season,
      members: season.members.filter((member) => member.id !== id),
      history: season.history.filter((pick) => pick.memberId !== id),
    }));
  };

  const updateTeam = (id, field, value) => {
    updateSeason((season) => {
      const teamsNext = season.teams.map((team) => (team.id === id ? { ...team, [field]: value } : team));
      const draftOrderNext = season.draftOrder.map((team) => teamsNext.find((candidate) => candidate.id === team.id) || team);
      return { ...season, teams: teamsNext, draftOrder: draftOrderNext };
    });
  };

  const randomizeOrder = () => {
    if (activeSeason.locked) return;
    if (history.length && !window.confirm('Randomizing will clear current picks for this season. Continue?')) return;

    updateSeason((season) => ({
      ...season,
      draftOrder: [...shuffleTeams(season.teams.filter(isLiveDraftTeam)), ...season.teams.filter((team) => !isLiveDraftTeam(team))],
      members: season.members.map((member) => (
        member.pickNumber ? { ...member, draftedTeamId: null, pickNumber: null, draftedRound: null, rating: '' } : member
      )),
      history: [],
    }));
  };

  const addSeason = () => {
    const name = newSeasonName.trim() || `${new Date().getFullYear()} Draft`;
    const season = makeSeason(name);
    setState((prev) => ({ activeSeasonId: season.id, seasons: [...prev.seasons, season] }));
    setNewSeasonName('');
  };

  const deleteSeason = (seasonId) => {
    if (state.seasons.length <= 1) {
      window.alert('At least one season is required.');
      return;
    }

    const target = state.seasons.find((season) => season.id === seasonId);
    if (!window.confirm(`Delete ${target?.name || 'this season'}? This cannot be undone.`)) return;

    setState((prev) => {
      const seasons = prev.seasons.filter((season) => season.id !== seasonId);
      return { activeSeasonId: prev.activeSeasonId === seasonId ? seasons[0].id : prev.activeSeasonId, seasons };
    });
  };

  const renameSeason = (name) => updateSeason((season) => ({ ...season, name }));
  const toggleLock = () => updateSeason((season) => ({ ...season, locked: !season.locked }));

  const addMember = () => {
    updateSeason((season) => ({
      ...season,
      members: [
        ...season.members,
        {
          id: crypto.randomUUID?.() || `member-${Date.now()}`,
          name: `New Member ${season.members.length + 1}`,
          rating: '',
          note: '',
          photo: '',
          tags: '',
          draftedTeamId: null,
          pickNumber: null,
          draftedRound: null,
        },
      ],
    }));
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const imported = importMembersFromCsv(text);

    if (!imported.length) {
      window.alert('No valid members found. Use columns like Name, Rating, Photo, Tags.');
      return;
    }

    const replace = window.confirm(`Import ${imported.length} members. Press OK to replace current members, or Cancel to append them.`);
    updateSeason((season) => ({ ...season, members: replace ? imported : [...season.members, ...imported], history: [] }));
    event.target.value = '';
  };

  const exportMembers = () => {
    const header = ['Name', 'Rating', 'Photo', 'Tags', 'Drafted Team', 'Pick Number', 'Drafted Round'];
    const lines = members.map((member) => {
      const team = teams.find((item) => item.id === member.draftedTeamId);
      return [member.name, member.rating, member.photo, member.tags, team?.name || '', member.pickNumber || '', member.draftedRound || ''].map(toCsvValue).join(',');
    });
    downloadText(`${activeSeason.name.replaceAll(' ', '-')}-members.csv`, [header.join(','), ...lines].join('\n'));
  };

  const exportRosters = () => {
    const header = ['Team', 'Captain', 'Lt', 'Member', 'Rating', 'Pick Number', 'Round', 'Tags'];
    const lines = teams.flatMap((team) => members
      .filter((member) => member.draftedTeamId === team.id)
      .sort((a, b) => (a.pickNumber || 9999) - (b.pickNumber || 9999))
      .map((member) => [team.name, team.captain, team.lieutenant, member.name, member.rating, member.pickNumber, member.draftedRound, member.tags].map(toCsvValue).join(',')));
    downloadText(`${activeSeason.name.replaceAll(' ', '-')}-rosters.csv`, [header.join(','), ...lines].join('\n'));
  };

  const setDraftOrderPosition = (teamId, position) => {
    if (activeSeason.locked || history.length) {
      window.alert('Draft order can only be changed before draft picks begin and while the draft is unlocked.');
      return;
    }

    updateSeason((season) => {
      const target = season.teams.find((team) => team.id === teamId);
      if (!target || !isLiveDraftTeam(target)) return season;

      const liveOrder = season.draftOrder.filter(isLiveDraftTeam);
      const nonLiveOrder = season.draftOrder.filter((team) => !isLiveDraftTeam(team));
      const withoutTarget = liveOrder.filter((team) => team.id !== teamId);
      const nextLive = [...withoutTarget];
      nextLive.splice(Math.max(0, Math.min(position - 1, nextLive.length)), 0, target);

      return { ...season, draftOrder: [...nextLive, ...nonLiveOrder] };
    });
  };

  const assignMemberToTeam13 = (memberId) => {
    const team13 = teams[12];
    if (!team13) return;

    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.id === memberId
          ? { ...member, draftedTeamId: team13.id, pickNumber: null, draftedRound: null, rating: '' }
          : member
      )),
    }));
  };

  const unassignPreassignedMember = (memberId) => {
    updateSeason((season) => ({
      ...season,
      members: season.members.map((member) => (
        member.id === memberId && !member.pickNumber
          ? { ...member, draftedTeamId: null, pickNumber: null, draftedRound: null, rating: '' }
          : member
      )),
    }));
  };

  return (
    <div className="appFrame">
      <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} syncStatus={syncStatus} />

      <main className="mainStage">
        <TopBar randomizeOrder={randomizeOrder} setSettingsOpen={setSettingsOpen} />

        {activePanel === 'draft' && (
          <>
            <MobileDraftPager
              mobilePages={mobilePages}
              mobilePage={mobilePage}
              setMobilePage={setMobilePage}
              setTouchStartX={setTouchStartX}
              handleMobileTouchEnd={handleMobileTouchEnd}
              currentTeam={currentTeam}
              round={round}
              draftedCount={draftedCount}
              members={members}
              liveDraftMemberCount={liveDraftMemberCount}
              totalRounds={totalRounds}
              draftPercent={draftPercent}
              {...timer}
              lastPicks={lastPicks}
              teams={teams}
              draftOrder={liveDraftOrder}
              availableMembers={availableMembers}
              query={query}
              setQuery={setQuery}
              draftMember={draftMember}
              locked={activeSeason.locked}
              activeSeason={activeSeason}
            />

            <div className="desktopDraft">
              <section className="dashboardGrid">
                <div className="clockPanel">
                  <span className="sectionTitle">On The Clock</span>
                  <ClockPanel currentTeam={currentTeam} round={round} draftedCount={draftedCount} {...timer} />
                  <DraftProgress draftedCount={draftedCount} liveDraftMemberCount={liveDraftMemberCount} round={round} totalRounds={totalRounds} draftPercent={draftPercent} />
                  <RecentPicks picks={lastPicks} members={members} teams={teams} />
                </div>

                <div className="rightColumn">
                  <SnakeOrder draftOrder={liveDraftOrder} draftedCount={draftedCount} />
                  <DraftSettings activeSeason={activeSeason} teams={teams} liveDraftOrder={liveDraftOrder} totalRounds={totalRounds} />
                </div>
              </section>

              <section className="splitBoard">
                <AvailableMembersPanel availableMembers={availableMembers} query={query} setQuery={setQuery} draftMember={draftMember} locked={activeSeason.locked} setActivePanel={setActivePanel} />
                <TeamOverviewTable teams={teams} members={members} totalRounds={totalRounds} />
              </section>

              <SummaryStrip strongestTeam={strongestTeam} weakestTeam={weakestTeam} balancedTeam={balancedTeam} />
            </div>
          </>
        )}

        {activePanel === 'teams' && <TeamSetup teams={teams} updateTeam={updateTeam} />}
        {activePanel === 'members' && (
          <MemberManager
            availableMembers={availableMembers}
            query={query}
            setQuery={setQuery}
            sort={sort}
            setSort={setSort}
            addMember={addMember}
            updateMember={updateMember}
            deleteMember={deleteMember}
            draftMember={draftMember}
            handleImport={handleImport}
            importRef={importRef}
            exportMembers={exportMembers}
            exportRosters={exportRosters}
            locked={activeSeason.locked}
          />
        )}
        {activePanel === 'history' && <DraftHistory history={history} members={members} teams={teams} />}
        {activePanel === 'analytics' && <Analytics teams={teams} members={members} />}
      </main>

      {settingsOpen && (
        <SettingsDrawer
          state={state}
          setState={setState}
          activeSeason={activeSeason}
          newSeasonName={newSeasonName}
          setNewSeasonName={setNewSeasonName}
          addSeason={addSeason}
          deleteSeason={deleteSeason}
          renameSeason={renameSeason}
          toggleLock={toggleLock}
          forceSave={forceSave}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          draftOrder={liveDraftOrder}
          teams={teams}
          members={members}
          availableMembers={availableMembers}
          setDraftOrderPosition={setDraftOrderPosition}
          updateDraftSettings={updateDraftSettings}
          assignMemberToTeam13={assignMemberToTeam13}
          unassignPreassignedMember={unassignPreassignedMember}
          close={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
