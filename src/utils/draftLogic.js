import { COLORS } from '../constants.js';

export function makeDefaultTeams() {
  return Array.from({ length: 13 }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    captain: `Captain ${index + 1}`,
    lieutenant: `Lt. ${index + 1}`,
    color: COLORS[index % COLORS.length],
  }));
}

export function makeDefaultMembers() {
  return Array.from({ length: 52 }, (_, index) => ({
    id: `member-${index + 1}`,
    name: `Member ${index + 1}`,
    rating: '',
    note: '',
    photo: '',
    tags: '',
    draftedTeamId: null,
    pickNumber: null,
    draftedRound: null,
  }));
}

export function makeSeason(name = '2026 Draft') {
  const teams = makeDefaultTeams();
  return {
    id: crypto.randomUUID?.() || `season-${Date.now()}`,
    name,
    teams,
    draftOrder: teams,
    members: makeDefaultMembers(),
    history: [],
    locked: false,
    draftSettings: {
      timerSeconds: 90,
      manualRounds: '',
    },
  };
}

export function makeDefaultState() {
  const season = makeSeason();
  return { activeSeasonId: season.id, seasons: [season] };
}

export function normalizeState(parsed) {
  if (!parsed?.seasons?.length) return makeDefaultState();

  const seasons = parsed.seasons.map((season) => {
    const teams = (season.teams?.length ? season.teams : makeDefaultTeams()).map((team, index) => ({
      color: COLORS[index % COLORS.length],
      ...team,
    }));

    return {
      ...season,
      teams,
      draftOrder: season.draftOrder?.length
        ? season.draftOrder.map((orderTeam) => teams.find((team) => team.id === orderTeam.id) || orderTeam)
        : teams,
      members: (season.members?.length ? season.members : []).map((member) => ({
        tags: '',
        photo: '',
        note: '',
        rating: member.rating ?? '',
        draftedTeamId: null,
        pickNumber: null,
        draftedRound: null,
        ...member,
      })),
      history: season.history || [],
      locked: Boolean(season.locked),
      draftSettings: {
        timerSeconds: 90,
        manualRounds: '',
        ...(season.draftSettings || {}),
      },
    };
  });

  return {
    activeSeasonId: seasons.some((season) => season.id === parsed.activeSeasonId) ? parsed.activeSeasonId : seasons[0].id,
    seasons,
  };
}

export function shuffleTeams(teams) {
  const copy = [...teams];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getTeamNumber(team) {
  const match = String(team?.name || '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function isLiveDraftTeam(team) {
  const number = getTeamNumber(team);
  return number !== 13;
}

export function getLiveDraftOrder(draftOrder) {
  return draftOrder.filter(isLiveDraftTeam);
}

export function getCurrentTeam(order, pickCount) {
  if (!order.length) return null;
  const round = Math.floor(pickCount / order.length);
  const index = pickCount % order.length;
  return round % 2 === 0 ? order[index] : order[order.length - 1 - index];
}

export function scoreForRound(round) {
  if (!round) return '';
  return Math.max(1, 11 - Math.min(round, 10));
}

export function getAverageRating(roster) {
  const scored = roster.map((member) => Number(member.rating)).filter((value) => Number.isFinite(value) && value > 0);
  if (!scored.length) return '—';
  return (scored.reduce((sum, value) => sum + value, 0) / scored.length).toFixed(1);
}
