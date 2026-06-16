import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Divider, FormControl,
  InputLabel, LinearProgress, MenuItem, Paper, Select, Tab, TableSortLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  ArrowBack, Equalizer, Group, Leaderboard, Person, Psychology, QueryStats, SportsCricket,
} from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { tournamentApi } from '../../api/tournamentApi';
import { playerApi } from '../../api/playerApi';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { MatchResult, MatchSide, PlayerStatsReport, Tournament } from '../../types';
import { AnalysisCacheBanner } from '../../components/AnalysisCacheBanner';
import { formatEnum } from '../../utils/formatEnum';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function parseOversToBalls(overs?: string): number {
  if (!overs) return 0;
  const [whole, part] = overs.split('.');
  return (parseInt(whole, 10) || 0) * 6 + (parseInt(part, 10) || 0);
}

export function formatBallsToOvers(balls: number): string {
  const complete = Math.floor(balls / 6);
  const remainder = balls % 6;
  return remainder === 0 ? `${complete}` : `${complete}.${remainder}`;
}

export function fmtNum(n: number, decimals = 2): string {
  if (!isFinite(n) || isNaN(n)) return '—';
  return n.toFixed(decimals);
}

export function fmtPct(n: number): string {
  if (!isFinite(n) || isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}

export const fmtDateShort = (d?: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MatchEntry {
  matchId: number;
  matchDate?: string;
  opponent: string;
  result?: string;
  batting?: {
    score: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    dismissed: boolean;
    dismissalType?: string;
    dots: number;
  };
  bowling?: {
    balls: number;
    runs: number;
    wickets: number;
    maidens: number;
    dots: number;
    wides: number;
    noBalls: number;
  };
}

export interface PlayerAggregate {
  // Batting
  battingInnings: number;
  runs: number;
  ballsFaced: number;
  dismissals: number;
  fours: number;
  sixes: number;
  dotsBat: number;
  highestScore: number;
  highestScoreNotOut: boolean;
  // Bowling
  bowlingInnings: number;
  totalBalls: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
  dotsBowl: number;
  wides: number;
  noBalls: number;
  bestWickets: number;
  bestRuns: number;
}

export function emptyAggregate(): PlayerAggregate {
  return {
    battingInnings: 0, runs: 0, ballsFaced: 0, dismissals: 0, fours: 0, sixes: 0, dotsBat: 0,
    highestScore: 0, highestScoreNotOut: false,
    bowlingInnings: 0, totalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0, dotsBowl: 0,
    wides: 0, noBalls: 0, bestWickets: 0, bestRuns: 0,
  };
}

export function computeAggregate(entries: MatchEntry[]): PlayerAggregate {
  const agg = emptyAggregate();
  for (const e of entries) {
    if (e.batting) {
      agg.battingInnings++;
      agg.runs += e.batting.score;
      agg.ballsFaced += e.batting.ballsFaced;
      agg.fours += e.batting.fours;
      agg.sixes += e.batting.sixes;
      agg.dotsBat += e.batting.dots;
      if (e.batting.dismissed) agg.dismissals++;
      const notOut = !e.batting.dismissed;
      if (e.batting.score > agg.highestScore ||
        (e.batting.score === agg.highestScore && notOut && !agg.highestScoreNotOut)) {
        agg.highestScore = e.batting.score;
        agg.highestScoreNotOut = notOut;
      }
    }
    if (e.bowling) {
      agg.bowlingInnings++;
      agg.totalBalls += e.bowling.balls;
      agg.runsConceded += e.bowling.runs;
      agg.wickets += e.bowling.wickets;
      agg.maidens += e.bowling.maidens;
      agg.dotsBowl += e.bowling.dots;
      agg.wides += e.bowling.wides;
      agg.noBalls += e.bowling.noBalls;
      if (e.bowling.wickets > agg.bestWickets ||
        (e.bowling.wickets === agg.bestWickets && e.bowling.runs < agg.bestRuns)) {
        agg.bestWickets = e.bowling.wickets;
        agg.bestRuns = e.bowling.runs;
      }
    }
  }
  return agg;
}

export type SortDir = 'asc' | 'desc';
export type BatSortKey = 'matchDate' | 'score' | 'ballsFaced' | 'fours' | 'sixes';
export type BowlSortKey = 'matchDate' | 'overs' | 'wickets' | 'runs' | 'economy';

export function sortEntries<T>(rows: T[], get: (r: T) => number | string, dir: SortDir): T[] {
  return [...rows].sort((a, b) => {
    const av = get(a), bv = get(b);
    if (typeof av === 'string' && typeof bv === 'string')
      return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return dir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
  });
}

// ── Squad summary card (player list) ─────────────────────────────────────────

export interface SquadPlayer {
  playerId: number;
  name: string;
  surname: string;
  battingStance?: string;
  bowlingType?: string;
  wicketKeeper?: boolean;
  gamesPlayed: number;
}

// ── Main component ────────────────────────────────────────────────────────────

export const PlayerStatsOverview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as { tournamentId?: number; teamId?: number; fromMyStats?: boolean } | null;
  const { teamIds: managerTeamIds, restrictByTeam, homeClubId, loaded: teamsLoaded } = useManagerTeams();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>(routeState?.tournamentId ?? '');
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>(routeState?.teamId ?? '');
  const [availableTeams, setAvailableTeams] = useState<{ teamId: number; teamName: string }[]>([]);

  const [squadPlayers, setSquadPlayers] = useState<SquadPlayer[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Per-player match entries keyed by playerId
  const [matchEntriesMap, setMatchEntriesMap] = useState<Map<number, MatchEntry[]>>(new Map());

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // ── Load tournaments ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!teamsLoaded) return;
    Promise.all([tournamentApi.findAll(), matchApi.findAll()])
      .then(([allTournaments, allMatches]) => {
        if (!restrictByTeam) { setTournaments(allTournaments); return; }
        const ids = new Set<number>();
        for (const m of allMatches) {
          if (m.tournamentId != null) {
            if (m.homeTeamId != null && managerTeamIds.has(m.homeTeamId)) ids.add(m.tournamentId);
            if (m.oppositionTeamId != null && managerTeamIds.has(m.oppositionTeamId)) ids.add(m.tournamentId);
          }
        }
        setTournaments(allTournaments.filter(t => t.tournamentId != null && ids.has(t.tournamentId)));
      }).finally(() => setTournamentsLoading(false));
  }, [teamsLoaded, restrictByTeam, managerTeamIds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tournaments.length === 1 && !selectedTournamentId)
      setSelectedTournamentId(tournaments[0].tournamentId!);
  }, [tournaments, selectedTournamentId]);

  // ── Load squad + match data when tournament+team selected ────────────────────

  useEffect(() => {
    if (!selectedTournamentId || !selectedTeamId || !teamsLoaded) return;
    setDataLoading(true);
    setSquadPlayers([]);
    setMatchEntriesMap(new Map());
    setSelectedPlayerId(null);

    const load = async () => {
      const [squad, tournamentMatches] = await Promise.all([
        teamApi.getSquad(selectedTeamId as number),
        matchApi.findByTournament(selectedTournamentId as number),
      ]);

      const teamMatches = tournamentMatches.filter(
        m => m.homeTeamId === selectedTeamId || m.oppositionTeamId === selectedTeamId,
      );

      // Load teamsheets + scorecards in parallel
      const matchIds = teamMatches.map(m => m.matchId!).filter(Boolean);
      const [sidesResults, resultResults] = await Promise.all([
        Promise.allSettled(matchIds.map(mid => matchApi.getTeamSheet(mid))),
        Promise.allSettled(matchIds.map(mid => matchApi.getResult(mid))),
      ]);

      const sidesMap = new Map<number, MatchSide[]>();
      sidesResults.forEach((r, i) => { if (r.status === 'fulfilled') sidesMap.set(matchIds[i], r.value); });

      const resultMap = new Map<number, MatchResult>();
      resultResults.forEach((r, i) => { if (r.status === 'fulfilled') resultMap.set(matchIds[i], r.value); });

      // Build per-player match entries
      const entriesMap = new Map<number, MatchEntry[]>();

      // Track games played per player (via playing XI)
      const gamesPlayedMap = new Map<number, number>();
      for (const sqPlayer of squad) {
        if (sqPlayer.playerId != null) {
          entriesMap.set(sqPlayer.playerId, []);
          gamesPlayedMap.set(sqPlayer.playerId, 0);
        }
      }

      for (const match of teamMatches) {
        const mid = match.matchId!;
        const matchResult = resultMap.get(mid);
        const sc = matchResult?.scoreCard;
        if (!sc) continue;

        type Side = {
          teamId?: number;
          score?: number; wickets?: number; overs?: string;
          batting: Array<{ playerId?: number; playerName?: string; batted?: boolean; score?: number; ballsFaced?: number; dismissed?: boolean; dismissalType?: string; fours?: number; sixes?: number; dots?: number }>;
          bowling: Array<{ playerId?: number; playerName?: string; overs?: string; runs?: number; wickets?: number; maidens?: number; dots?: number; wides?: number; noBalls?: number }>;
        };

        const sides = [sc.teamA, sc.teamB].filter(Boolean) as NonNullable<typeof sc.teamA>[];
        const mySide  = sides.find(s => s.teamId === selectedTeamId) as Side | undefined;
        const oppSide = sides.find(s => s.teamId !== selectedTeamId) as Side | undefined;

        // Opponent name
        const opponent = match.homeTeamId === selectedTeamId
          ? (match.oppositionTeamName ?? 'Opposition')
          : (match.homeTeamName ?? 'Opposition');

        // Result string
        let resultStr: string | undefined;
        if (matchResult?.matchCompleted) {
          if (matchResult.noResult) resultStr = 'NR';
          else if (matchResult.matchDrawn) resultStr = 'D';
          else if (matchResult.winningTeamId === selectedTeamId) resultStr = 'W';
          else resultStr = 'L';
        }

        // Track playing XI for games-played count
        const teamSheetSides = sidesMap.get(mid) ?? [];
        const mySideSheet = teamSheetSides.find(s => s.teamId === selectedTeamId);
        for (const pid of mySideSheet?.playingXi ?? []) {
          gamesPlayedMap.set(pid, (gamesPlayedMap.get(pid) ?? 0) + 1);
        }

        // Per-player batting
        for (const b of mySide?.batting ?? []) {
          if (!b.batted || b.playerId == null) continue;
          const existing = entriesMap.get(b.playerId) ?? [];
          const entry: MatchEntry = {
            matchId: mid,
            matchDate: match.matchDate,
            opponent,
            result: resultStr,
            batting: {
              score: b.score ?? 0,
              ballsFaced: b.ballsFaced ?? 0,
              fours: b.fours ?? 0,
              sixes: b.sixes ?? 0,
              dismissed: b.dismissed ?? false,
              dismissalType: b.dismissalType as string | undefined,
              dots: b.dots ?? 0,
            },
          };
          // Merge bowling if same match already added (shouldn't happen for batting)
          const existingForMatch = existing.find(e => e.matchId === mid);
          if (existingForMatch) {
            existingForMatch.batting = entry.batting;
          } else {
            existing.push(entry);
          }
          entriesMap.set(b.playerId, existing);
        }

        // Per-player bowling
        for (const b of oppSide?.bowling ?? []) {
          if (b.playerId == null) continue;
          const balls = parseOversToBalls(b.overs);
          if (balls === 0 && (b.wickets ?? 0) === 0) continue;
          const existing = entriesMap.get(b.playerId) ?? [];
          const bowlingData = {
            balls,
            runs: b.runs ?? 0,
            wickets: b.wickets ?? 0,
            maidens: b.maidens ?? 0,
            dots: b.dots ?? 0,
            wides: b.wides ?? 0,
            noBalls: b.noBalls ?? 0,
          };
          const existingForMatch = existing.find(e => e.matchId === mid);
          if (existingForMatch) {
            existingForMatch.bowling = bowlingData;
          } else {
            existing.push({ matchId: mid, matchDate: match.matchDate, opponent, result: resultStr, bowling: bowlingData });
          }
          entriesMap.set(b.playerId, existing);
        }
      }

      // Sort entries by date
      entriesMap.forEach((entries, pid) => {
        entriesMap.set(pid, entries.sort((a, b) =>
          (a.matchDate ?? '').localeCompare(b.matchDate ?? ''),
        ));
      });

      // Build squad player list — only show players with data OR who are in squad
      const squadList: SquadPlayer[] = squad
        .filter(p => p.playerId != null)
        .map(p => ({
          playerId: p.playerId!,
          name: p.name ?? '',
          surname: p.surname ?? '',
          battingStance: p.battingStance,
          bowlingType: p.bowlingType,
          wicketKeeper: p.wicketKeeper,
          gamesPlayed: gamesPlayedMap.get(p.playerId!) ?? 0,
        }))
        .filter(p => (entriesMap.get(p.playerId)?.length ?? 0) > 0 || p.gamesPlayed > 0)
        .sort((a, b) => b.gamesPlayed - a.gamesPlayed || a.surname.localeCompare(b.surname));

      setSquadPlayers(squadList);
      setMatchEntriesMap(entriesMap);

      // Set available teams for dropdown (first time only)
      const allTeams = await teamApi.findAll();
      const teams = allTeams
        .filter(t => t.teamId != null && (restrictByTeam ? managerTeamIds.has(t.teamId) : homeClubId == null || t.associatedClubId === homeClubId))
        .map(t => ({ teamId: t.teamId!, teamName: t.teamName }))
        .sort((a, b) => a.teamName.localeCompare(b.teamName));
      setAvailableTeams(teams);
    };

    load().catch(() => {}).finally(() => setDataLoading(false));
  }, [selectedTournamentId, selectedTeamId, teamsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load available teams when tournament is first selected (before team is chosen)
  useEffect(() => {
    if (!selectedTournamentId || !teamsLoaded || availableTeams.length > 0) return;
    const loadTeams = async () => {
      const [allTeams, allMatches] = await Promise.all([teamApi.findAll(), matchApi.findByTournament(selectedTournamentId as number)]);
      const tournamentTeamIds = new Set<number>();
      for (const m of allMatches) {
        if (m.homeTeamId) tournamentTeamIds.add(m.homeTeamId);
        if (m.oppositionTeamId) tournamentTeamIds.add(m.oppositionTeamId);
      }
      const teams = allTeams
        .filter(t => t.teamId != null
          && tournamentTeamIds.has(t.teamId)
          && (restrictByTeam ? managerTeamIds.has(t.teamId) : homeClubId == null || t.associatedClubId === homeClubId))
        .map(t => ({ teamId: t.teamId!, teamName: t.teamName }))
        .sort((a, b) => a.teamName.localeCompare(b.teamName));
      setAvailableTeams(teams);
      if (teams.length === 1) setSelectedTeamId(teams[0].teamId);
    };
    loadTeams().catch(() => {});
  }, [selectedTournamentId, teamsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPlayer = useMemo(
    () => squadPlayers.find(p => p.playerId === selectedPlayerId) ?? null,
    [squadPlayers, selectedPlayerId],
  );

  const playerEntries = useMemo(
    () => (selectedPlayerId ? matchEntriesMap.get(selectedPlayerId) ?? [] : []),
    [matchEntriesMap, selectedPlayerId],
  );

  const playerAggregate = useMemo((): PlayerAggregate => {
    const agg = emptyAggregate();
    for (const e of playerEntries) {
      if (e.batting) {
        agg.battingInnings++;
        agg.runs += e.batting.score;
        agg.ballsFaced += e.batting.ballsFaced;
        agg.fours += e.batting.fours;
        agg.sixes += e.batting.sixes;
        agg.dotsBat += e.batting.dots;
        if (e.batting.dismissed) agg.dismissals++;
        const notOut = !e.batting.dismissed;
        if (e.batting.score > agg.highestScore ||
          (e.batting.score === agg.highestScore && notOut && !agg.highestScoreNotOut)) {
          agg.highestScore = e.batting.score;
          agg.highestScoreNotOut = notOut;
        }
      }
      if (e.bowling) {
        agg.bowlingInnings++;
        agg.totalBalls += e.bowling.balls;
        agg.runsConceded += e.bowling.runs;
        agg.wickets += e.bowling.wickets;
        agg.maidens += e.bowling.maidens;
        agg.dotsBowl += e.bowling.dots;
        agg.wides += e.bowling.wides;
        agg.noBalls += e.bowling.noBalls;
        if (e.bowling.wickets > agg.bestWickets ||
          (e.bowling.wickets === agg.bestWickets && e.bowling.runs < agg.bestRuns)) {
          agg.bestWickets = e.bowling.wickets;
          agg.bestRuns = e.bowling.runs;
        }
      }
    }
    return agg;
  }, [playerEntries]);

  const selectedTournamentName = useMemo(
    () => tournaments.find(t => t.tournamentId === selectedTournamentId)?.name ?? 'Tournament',
    [tournaments, selectedTournamentId],
  );

  const selectedTeamName = useMemo(
    () => availableTeams.find(t => t.teamId === selectedTeamId)?.teamName ?? 'Team',
    [availableTeams, selectedTeamId],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!teamsLoaded || tournamentsLoading)
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person color="primary" />
          <Typography variant="h5">Player Stats</Typography>
        </Box>
        {routeState?.fromMyStats && (
          <Button variant="outlined" startIcon={<Leaderboard />} size="small" onClick={() => navigate('/my-stats')}>
            My Stats
          </Button>
        )}
      </Box>

      {/* ── Controls ── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 280 }} size="small">
          <InputLabel>Tournament</InputLabel>
          <Select
            value={selectedTournamentId}
            label="Tournament"
            onChange={e => {
              setSelectedTournamentId(e.target.value as number);
              setSelectedTeamId('');
              setAvailableTeams([]);
              setSquadPlayers([]);
              setMatchEntriesMap(new Map());
              setSelectedPlayerId(null);
            }}
          >
            {tournaments.map(t => <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>)}
          </Select>
        </FormControl>

        {availableTeams.length > 0 && (
          <FormControl sx={{ minWidth: 220 }} size="small">
            <InputLabel>Team</InputLabel>
            <Select
              value={selectedTeamId}
              label="Team"
              onChange={e => {
                setSelectedTeamId(e.target.value as number);
                setSquadPlayers([]);
                setMatchEntriesMap(new Map());
                setSelectedPlayerId(null);
              }}
            >
              {availableTeams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Box>

      {!selectedTournamentId && (
        <Alert severity="info" icon={<QueryStats />}>Select a tournament to view player stats.</Alert>
      )}

      {selectedTournamentId && !selectedTeamId && (
        <Alert severity="info">Select a team to view its players.</Alert>
      )}

      {dataLoading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>}

      {!dataLoading && selectedTournamentId && selectedTeamId && !selectedPlayerId && (
        squadPlayers.length === 0
          ? <Alert severity="info">No players with scorecard data found for this team in this tournament.</Alert>
          : <PlayerGrid players={squadPlayers} onSelect={setSelectedPlayerId} />
      )}

      {!dataLoading && selectedPlayerId && selectedPlayer && (
        <PlayerDetailPanel
          player={selectedPlayer}
          entries={playerEntries}
          aggregate={playerAggregate}
          tournamentId={selectedTournamentId as number}
          tournamentName={selectedTournamentName}
          teamName={selectedTeamName}
          onBack={() => setSelectedPlayerId(null)}
        />
      )}
    </Box>
  );
};

// ── Embeddable squad stats content (used by MyPlayerStats hub) ───────────────

interface PlayerStatsContentProps {
  tournamentId: number;
  teamId: number;
  tournamentName: string;
  teamName: string;
}

export const PlayerStatsContent: React.FC<PlayerStatsContentProps> = ({
  tournamentId, teamId, tournamentName, teamName,
}) => {
  const [squadPlayers, setSquadPlayers] = useState<SquadPlayer[]>([]);
  const [matchEntriesMap, setMatchEntriesMap] = useState<Map<number, MatchEntry[]>>(new Map());
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  useEffect(() => {
    setDataLoading(true);
    setSquadPlayers([]);
    setMatchEntriesMap(new Map());
    setSelectedPlayerId(null);

    const load = async () => {
      const [squad, tournamentMatches] = await Promise.all([
        teamApi.getSquad(teamId),
        matchApi.findByTournament(tournamentId),
      ]);

      const teamMatches = tournamentMatches.filter(
        m => m.homeTeamId === teamId || m.oppositionTeamId === teamId,
      );
      const matchIds = teamMatches.map(m => m.matchId!).filter(Boolean);

      const [sidesResults, resultResults] = await Promise.all([
        Promise.allSettled(matchIds.map(mid => matchApi.getTeamSheet(mid))),
        Promise.allSettled(matchIds.map(mid => matchApi.getResult(mid))),
      ]);

      const sidesMap = new Map<number, import('../../types').MatchSide[]>();
      sidesResults.forEach((r, i) => { if (r.status === 'fulfilled') sidesMap.set(matchIds[i], r.value); });

      const resultMap = new Map<number, import('../../types').MatchResult>();
      resultResults.forEach((r, i) => { if (r.status === 'fulfilled') resultMap.set(matchIds[i], r.value); });

      const entriesMap = new Map<number, MatchEntry[]>();
      const gamesPlayedMap = new Map<number, number>();
      for (const p of squad) {
        if (p.playerId != null) { entriesMap.set(p.playerId, []); gamesPlayedMap.set(p.playerId, 0); }
      }

      for (const match of teamMatches) {
        const mid = match.matchId!;
        const matchResult = resultMap.get(mid);
        const sc = matchResult?.scoreCard;
        if (!sc) continue;

        const sides = [sc.teamA, sc.teamB].filter(Boolean) as NonNullable<typeof sc.teamA>[];
        const mySide  = sides.find(s => s.teamId === teamId);
        const oppSide = sides.find(s => s.teamId !== teamId);
        const opponent = match.homeTeamId === teamId
          ? (match.oppositionTeamName ?? 'Opposition')
          : (match.homeTeamName ?? 'Opposition');

        let resultStr: string | undefined;
        if (matchResult?.matchCompleted) {
          if (matchResult.noResult) resultStr = 'NR';
          else if (matchResult.matchDrawn) resultStr = 'D';
          else if (matchResult.winningTeamId === teamId) resultStr = 'W';
          else resultStr = 'L';
        }

        const mySideSheet = (sidesMap.get(mid) ?? []).find(s => s.teamId === teamId);
        for (const pid of mySideSheet?.playingXi ?? []) {
          gamesPlayedMap.set(pid, (gamesPlayedMap.get(pid) ?? 0) + 1);
        }

        for (const b of mySide?.batting ?? []) {
          if (!b.batted || b.playerId == null) continue;
          const existing = entriesMap.get(b.playerId) ?? [];
          const entry: MatchEntry = {
            matchId: mid, matchDate: match.matchDate, opponent, result: resultStr,
            batting: { score: b.score ?? 0, ballsFaced: b.ballsFaced ?? 0, fours: b.fours ?? 0, sixes: b.sixes ?? 0, dismissed: b.dismissed ?? false, dismissalType: b.dismissalType as string | undefined, dots: b.dots ?? 0 },
          };
          const existingForMatch = existing.find(e => e.matchId === mid);
          if (existingForMatch) existingForMatch.batting = entry.batting;
          else existing.push(entry);
          entriesMap.set(b.playerId, existing);
        }

        for (const b of oppSide?.bowling ?? []) {
          if (b.playerId == null) continue;
          const balls = parseOversToBalls(b.overs);
          if (balls === 0 && (b.wickets ?? 0) === 0) continue;
          const existing = entriesMap.get(b.playerId) ?? [];
          const bowlingData = { balls, runs: b.runs ?? 0, wickets: b.wickets ?? 0, maidens: b.maidens ?? 0, dots: b.dots ?? 0, wides: b.wides ?? 0, noBalls: b.noBalls ?? 0 };
          const existingForMatch = existing.find(e => e.matchId === mid);
          if (existingForMatch) existingForMatch.bowling = bowlingData;
          else existing.push({ matchId: mid, matchDate: match.matchDate, opponent, result: resultStr, bowling: bowlingData });
          entriesMap.set(b.playerId, existing);
        }
      }

      entriesMap.forEach((entries, pid) => {
        entriesMap.set(pid, entries.sort((a, b) => (a.matchDate ?? '').localeCompare(b.matchDate ?? '')));
      });

      const squadList: SquadPlayer[] = squad
        .filter(p => p.playerId != null)
        .map(p => ({
          playerId: p.playerId!,
          name: p.name ?? '',
          surname: p.surname ?? '',
          battingStance: p.battingStance,
          bowlingType: p.bowlingType,
          wicketKeeper: p.wicketKeeper,
          gamesPlayed: gamesPlayedMap.get(p.playerId!) ?? 0,
        }))
        .filter(p => (entriesMap.get(p.playerId)?.length ?? 0) > 0 || p.gamesPlayed > 0)
        .sort((a, b) => b.gamesPlayed - a.gamesPlayed || a.surname.localeCompare(b.surname));

      setSquadPlayers(squadList);
      setMatchEntriesMap(entriesMap);
    };

    load().catch(() => {}).finally(() => setDataLoading(false));
  }, [tournamentId, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPlayer = useMemo(
    () => squadPlayers.find(p => p.playerId === selectedPlayerId) ?? null,
    [squadPlayers, selectedPlayerId],
  );
  const playerEntries = useMemo(
    () => (selectedPlayerId ? matchEntriesMap.get(selectedPlayerId) ?? [] : []),
    [matchEntriesMap, selectedPlayerId],
  );
  const playerAggregate = useMemo(() => computeAggregate(playerEntries), [playerEntries]);

  if (dataLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;

  if (!dataLoading && squadPlayers.length === 0)
    return <Alert severity="info">No players with scorecard data found for this team in this tournament.</Alert>;

  if (selectedPlayerId && selectedPlayer) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} size="small" onClick={() => setSelectedPlayerId(null)} sx={{ mb: 1.5 }}>
          Back to Players
        </Button>
        <PlayerDetailPanel
          player={selectedPlayer}
          entries={playerEntries}
          aggregate={playerAggregate}
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          teamName={teamName}
          onBack={() => setSelectedPlayerId(null)}
          hideBack
        />
      </Box>
    );
  }

  return <PlayerGrid players={squadPlayers} onSelect={setSelectedPlayerId} />;
};

// ── Player grid ───────────────────────────────────────────────────────────────

const PlayerGrid: React.FC<{ players: SquadPlayer[]; onSelect: (id: number) => void }> = ({ players, onSelect }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
    {players.map(p => (
      <Paper
        key={p.playerId}
        variant="outlined"
        sx={{ p: 2, cursor: 'pointer', transition: 'box-shadow 0.15s', '&:hover': { boxShadow: 3 } }}
        onClick={() => onSelect(p.playerId)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
            {(p.name.charAt(0) + p.surname.charAt(0)).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight="bold" noWrap>{p.name} {p.surname}</Typography>
            <Chip label={`${p.gamesPlayed} game${p.gamesPlayed !== 1 ? 's' : ''}`} size="small" color={p.gamesPlayed > 0 ? 'primary' : 'default'} variant="outlined" sx={{ mt: 0.25 }} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {p.battingStance && <Chip label={formatEnum(p.battingStance)} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
          {p.bowlingType && <Chip label={formatEnum(p.bowlingType)} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
          {p.wicketKeeper && <Chip label="WK" size="small" color="info" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
        </Box>
      </Paper>
    ))}
  </Box>
);

// ── Player detail panel ────────────────────────────────────────────────────────

export interface DetailPanelProps {
  player: SquadPlayer;
  entries: MatchEntry[];
  aggregate: PlayerAggregate;
  tournamentId: number;
  tournamentName: string;
  teamName: string;
  onBack: () => void;
  hideBack?: boolean;
  onTeamStats?: () => void;
  headerRight?: React.ReactNode;
  view?: 'stats' | 'teammates' | 'teams';
}

export const PlayerDetailPanel: React.FC<DetailPanelProps> = ({
  player, entries, aggregate, tournamentId, tournamentName, teamName, onBack, hideBack = false, onTeamStats, headerRight, view = 'stats',
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [aiReport, setAiReport] = useState<PlayerStatsReport | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRegenerating, setAiRegenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [batSortKey, setBatSortKey] = useState<BatSortKey>('matchDate');
  const [batSortDir, setBatSortDir] = useState<SortDir>('asc');
  const [bowlSortKey, setBowlSortKey] = useState<BowlSortKey>('matchDate');
  const [bowlSortDir, setBowlSortDir] = useState<SortDir>('asc');

  const fmtHS = () =>
    aggregate.battingInnings === 0 ? '—' : `${aggregate.highestScore}${aggregate.highestScoreNotOut ? '*' : ''}`;

  const battingAverage = aggregate.dismissals === 0
    ? (aggregate.battingInnings > 0 ? `${aggregate.runs}*` : '—')
    : fmtNum(aggregate.runs / aggregate.dismissals);

  const strikeRate = aggregate.ballsFaced === 0 ? '—' : fmtNum((aggregate.runs / aggregate.ballsFaced) * 100, 1);
  const dotPctBat = aggregate.ballsFaced === 0 ? '—' : fmtPct((aggregate.dotsBat / aggregate.ballsFaced) * 100);

  const economy = aggregate.totalBalls === 0 ? '—' : fmtNum((aggregate.runsConceded / aggregate.totalBalls) * 6);
  const bowlingSR = aggregate.wickets === 0 ? '—' : fmtNum(aggregate.totalBalls / aggregate.wickets, 1);
  const dotPctBowl = aggregate.totalBalls === 0 ? '—' : fmtPct((aggregate.dotsBowl / aggregate.totalBalls) * 100);
  const bestBowling = aggregate.bowlingInnings === 0 ? '—' : `${aggregate.bestWickets}/${aggregate.bestRuns}`;

  const loadAiReport = (regen = false) => {
    if (regen) setAiRegenerating(true); else setAiLoading(true);
    setAiError(null);

    const recentBatting = entries
      .filter(e => e.batting)
      .slice(-5)
      .map(e => {
        const b = e.batting!;
        const scoreStr = `${b.score}${b.dismissed ? '' : '*'}`;
        return `vs ${e.opponent} (${fmtDateShort(e.matchDate)}): ${scoreStr} off ${b.ballsFaced}b, ${b.fours}×4, ${b.sixes}×6${e.result ? ` [${e.result}]` : ''}`;
      });

    const recentBowling = entries
      .filter(e => e.bowling)
      .slice(-5)
      .map(e => {
        const b = e.bowling!;
        const eco = b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : '—';
        return `vs ${e.opponent} (${fmtDateShort(e.matchDate)}): ${b.wickets}/${b.runs} in ${formatBallsToOvers(b.balls)} overs, econ ${eco}${e.result ? ` [${e.result}]` : ''}`;
      });

    const stats = {
      playerName: `${player.name} ${player.surname}`,
      tournamentName,
      teamName,
      battingStance: player.battingStance ? formatEnum(player.battingStance) : undefined,
      bowlingType: player.bowlingType ? formatEnum(player.bowlingType) : undefined,
      battingInnings: aggregate.battingInnings,
      runs: aggregate.runs,
      dismissals: aggregate.dismissals,
      notOuts: aggregate.battingInnings - aggregate.dismissals,
      battingAverage: aggregate.dismissals > 0 ? aggregate.runs / aggregate.dismissals : aggregate.runs,
      strikeRate: aggregate.ballsFaced > 0 ? (aggregate.runs / aggregate.ballsFaced) * 100 : 0,
      highestScore: aggregate.highestScore,
      highestScoreNotOut: aggregate.highestScoreNotOut,
      fours: aggregate.fours,
      sixes: aggregate.sixes,
      dotPctBat: aggregate.ballsFaced > 0 ? (aggregate.dotsBat / aggregate.ballsFaced) * 100 : 0,
      bowlingInnings: aggregate.bowlingInnings,
      oversBowled: formatBallsToOvers(aggregate.totalBalls),
      wickets: aggregate.wickets,
      runsConceded: aggregate.runsConceded,
      economy: aggregate.totalBalls > 0 ? (aggregate.runsConceded / aggregate.totalBalls) * 6 : 0,
      bowlingSR: aggregate.wickets > 0 ? aggregate.totalBalls / aggregate.wickets : 0,
      bestBowling: aggregate.bowlingInnings > 0 ? `${aggregate.bestWickets}/${aggregate.bestRuns}` : undefined,
      maidens: aggregate.maidens,
      dotPctBowl: aggregate.totalBalls > 0 ? (aggregate.dotsBowl / aggregate.totalBalls) * 100 : 0,
      recentBatting,
      recentBowling,
    };

    playerApi.getStatsAnalysis(player.playerId, tournamentId, stats, regen)
      .then(setAiReport)
      .catch(e => setAiError(e?.response?.data?.message ?? e?.message ?? 'Failed to generate report'))
      .finally(() => { setAiLoading(false); setAiRegenerating(false); });
  };

  useEffect(() => {
    if (activeTab !== 3 || aiReport || aiLoading) return;
    loadAiReport(false);
  }, [activeTab, aiReport, aiLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sorted match tables
  const batEntries = useMemo(() => {
    const withBat = entries.filter(e => e.batting);
    return sortEntries(withBat, e => {
      switch (batSortKey) {
        case 'matchDate': return e.matchDate ?? '';
        case 'score': return e.batting!.score;
        case 'ballsFaced': return e.batting!.ballsFaced;
        case 'fours': return e.batting!.fours;
        case 'sixes': return e.batting!.sixes;
      }
    }, batSortDir);
  }, [entries, batSortKey, batSortDir]);

  const bowlEntries = useMemo(() => {
    const withBowl = entries.filter(e => e.bowling);
    return sortEntries(withBowl, e => {
      switch (bowlSortKey) {
        case 'matchDate': return e.matchDate ?? '';
        case 'overs': return e.bowling!.balls;
        case 'wickets': return e.bowling!.wickets;
        case 'runs': return e.bowling!.runs;
        case 'economy': return e.bowling!.balls > 0 ? (e.bowling!.runs / e.bowling!.balls) * 6 : 0;
      }
    }, bowlSortDir);
  }, [entries, bowlSortKey, bowlSortDir]);

  const handleBatSort = (key: BatSortKey) => {
    if (batSortKey === key) setBatSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setBatSortKey(key); setBatSortDir(key === 'matchDate' ? 'asc' : 'desc'); }
  };

  const handleBowlSort = (key: BowlSortKey) => {
    if (bowlSortKey === key) setBowlSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setBowlSortKey(key); setBowlSortDir(key === 'matchDate' ? 'asc' : 'desc'); }
  };

  return (
    <Box>
      {/* ── Header ── */}
      {!hideBack && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <ToggleButtonGroup
            value={view}
            exclusive
            size="small"
            onChange={(_, v) => {
              if (!v || v === view) return;
              if (v === 'teammates') onBack();
              if (v === 'teams' && onTeamStats) onTeamStats();
            }}
          >
            <ToggleButton value="stats" sx={{ px: 1.5, gap: 0.75, textTransform: 'none', fontWeight: 600 }}>
              <Person fontSize="small" /> My Stats
            </ToggleButton>
            <ToggleButton value="teammates" sx={{ px: 1.5, gap: 0.75, textTransform: 'none', fontWeight: 600 }}>
              <Group fontSize="small" /> My Teammates
            </ToggleButton>
            {onTeamStats && (
              <ToggleButton value="teams" sx={{ px: 1.5, gap: 0.75, textTransform: 'none', fontWeight: 600 }}>
                <Equalizer fontSize="small" /> My Teams
              </ToggleButton>
            )}
          </ToggleButtonGroup>
          {headerRight && <Box>{headerRight}</Box>}
        </Box>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, fontSize: 20 }}>
            {(player.name.charAt(0) + player.surname.charAt(0)).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6">{player.name} {player.surname}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              <Chip label={`${player.gamesPlayed} game${player.gamesPlayed !== 1 ? 's' : ''}`} size="small" color="primary" />
              {player.battingStance && <Chip label={formatEnum(player.battingStance)} size="small" variant="outlined" />}
              {player.bowlingType && <Chip label={formatEnum(player.bowlingType)} size="small" variant="outlined" />}
              {player.wicketKeeper && <Chip label="WK" size="small" color="info" variant="outlined" />}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── Tabs ── */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Tab label="Overall" />
        <Tab label="Batting" />
        <Tab label="Bowling" />
        <Tab label="AI Analysis" icon={<Psychology fontSize="small" />} iconPosition="start" />
      </Tabs>

      {/* ── Tab 0: Overall ── */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Hero strip */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center' }}>
              {[
                { label: 'Matches', value: player.gamesPlayed },
                { label: 'Runs', value: aggregate.runs, sub: `Ave ${battingAverage}` },
                { label: 'HS', value: fmtHS() },
                { label: 'Wickets', value: aggregate.wickets, sub: `Econ ${economy}` },
                { label: 'Best', value: bestBowling },
              ].map(s => (
                <Box key={s.label} sx={{ textAlign: 'center', px: 1.5, py: 0.5 }}>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">{s.label}</Typography>
                  {s.sub && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{s.sub}</Typography>}
                </Box>
              ))}
            </Box>
          </Paper>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {/* Batting card */}
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Equalizer color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight="bold">Batting</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {aggregate.battingInnings === 0 ? (
                <Typography variant="body2" color="text.secondary">Did not bat in this tournament.</Typography>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  {[
                    { label: 'Innings', value: aggregate.battingInnings },
                    { label: 'Runs', value: aggregate.runs },
                    { label: 'Average', value: battingAverage },
                    { label: 'Strike Rate', value: strikeRate },
                    { label: 'Highest Score', value: fmtHS() },
                    { label: 'Not Outs', value: aggregate.battingInnings - aggregate.dismissals },
                    { label: 'Fours', value: aggregate.fours },
                    { label: 'Sixes', value: aggregate.sixes },
                    { label: 'Dot Ball %', value: dotPctBat },
                  ].map(s => (
                    <Box key={s.label}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem', mb: 0.25 }}>
                        {s.label}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">{s.value}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>

            {/* Bowling card */}
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <SportsCricket color="secondary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight="bold">Bowling</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {aggregate.bowlingInnings === 0 ? (
                <Typography variant="body2" color="text.secondary">Did not bowl in this tournament.</Typography>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  {[
                    { label: 'Innings', value: aggregate.bowlingInnings },
                    { label: 'Overs', value: formatBallsToOvers(aggregate.totalBalls) },
                    { label: 'Wickets', value: aggregate.wickets },
                    { label: 'Runs', value: aggregate.runsConceded },
                    { label: 'Economy', value: economy },
                    { label: 'Bowling SR', value: bowlingSR },
                    { label: 'Best Bowling', value: bestBowling },
                    { label: 'Maidens', value: aggregate.maidens },
                    { label: 'Dot Ball %', value: dotPctBowl },
                  ].map(s => (
                    <Box key={s.label}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem', mb: 0.25 }}>
                        {s.label}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">{s.value}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      )}

      {/* ── Tab 1: Batting ── */}
      {activeTab === 1 && (
        batEntries.length === 0
          ? <Alert severity="info">No batting data recorded in this tournament.</Alert>
          : (
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 140 }}>
                      <TableSortLabel active={batSortKey === 'matchDate'} direction={batSortKey === 'matchDate' ? batSortDir : 'asc'} onClick={() => handleBatSort('matchDate')}>Match</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>Opponent</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 56 }}>Res</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 72 }}>
                      <TableSortLabel active={batSortKey === 'score'} direction={batSortKey === 'score' ? batSortDir : 'desc'} onClick={() => handleBatSort('score')}>Runs</TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 72 }}>
                      <Tooltip title="Balls faced"><TableSortLabel active={batSortKey === 'ballsFaced'} direction={batSortKey === 'ballsFaced' ? batSortDir : 'desc'} onClick={() => handleBatSort('ballsFaced')}>Balls</TableSortLabel></Tooltip>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 56 }}>SR</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 56 }}>
                      <TableSortLabel active={batSortKey === 'fours'} direction={batSortKey === 'fours' ? batSortDir : 'desc'} onClick={() => handleBatSort('fours')}>4s</TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 56 }}>
                      <TableSortLabel active={batSortKey === 'sixes'} direction={batSortKey === 'sixes' ? batSortDir : 'desc'} onClick={() => handleBatSort('sixes')}>6s</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>Dismissal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batEntries.map(e => {
                    const b = e.batting!;
                    const sr = b.ballsFaced > 0 ? ((b.score / b.ballsFaced) * 100).toFixed(1) : '—';
                    return (
                      <TableRow key={`bat-${e.matchId}`} hover>
                        <TableCell><Typography variant="body2">{fmtDateShort(e.matchDate)}</Typography></TableCell>
                        <TableCell><Typography variant="body2" noWrap>{e.opponent}</Typography></TableCell>
                        <TableCell align="center">
                          {e.result && (
                            <Chip
                              label={e.result}
                              size="small"
                              color={e.result === 'W' ? 'success' : e.result === 'L' ? 'error' : 'default'}
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold">
                            {b.score}{b.dismissed ? '' : '*'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center"><Typography variant="body2">{b.ballsFaced}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2">{sr}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2">{b.fours}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2">{b.sixes}</Typography></TableCell>
                        <TableCell>
                          {b.dismissed
                            ? <Chip size="small" label={b.dismissalType ?? 'out'} variant="outlined" />
                            : <Chip size="small" label="not out" color="success" variant="outlined" />}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals row */}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell colSpan={3}><Typography variant="body2" fontWeight="bold">Totals</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2" fontWeight="bold">{aggregate.runs}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{aggregate.ballsFaced}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{strikeRate}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{aggregate.fours}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{aggregate.sixes}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        Ave: {battingAverage} | HS: {fmtHS()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )
      )}

      {/* ── Tab 2: Bowling ── */}
      {activeTab === 2 && (
        bowlEntries.length === 0
          ? <Alert severity="info">No bowling data recorded in this tournament.</Alert>
          : (
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 140 }}>
                      <TableSortLabel active={bowlSortKey === 'matchDate'} direction={bowlSortKey === 'matchDate' ? bowlSortDir : 'asc'} onClick={() => handleBowlSort('matchDate')}>Match</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>Opponent</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 56 }}>Res</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 72 }}>
                      <TableSortLabel active={bowlSortKey === 'overs'} direction={bowlSortKey === 'overs' ? bowlSortDir : 'desc'} onClick={() => handleBowlSort('overs')}>Ovs</TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 72 }}>
                      <TableSortLabel active={bowlSortKey === 'wickets'} direction={bowlSortKey === 'wickets' ? bowlSortDir : 'desc'} onClick={() => handleBowlSort('wickets')}>Wkts</TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 72 }}>
                      <TableSortLabel active={bowlSortKey === 'runs'} direction={bowlSortKey === 'runs' ? bowlSortDir : 'asc'} onClick={() => handleBowlSort('runs')}>Runs</TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 72 }}>
                      <TableSortLabel active={bowlSortKey === 'economy'} direction={bowlSortKey === 'economy' ? bowlSortDir : 'asc'} onClick={() => handleBowlSort('economy')}>Econ</TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 56 }}>Mdns</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 56 }}>Wd</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 56 }}>NB</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bowlEntries.map(e => {
                    const b = e.bowling!;
                    const eco = b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : '—';
                    return (
                      <TableRow key={`bowl-${e.matchId}`} hover>
                        <TableCell><Typography variant="body2">{fmtDateShort(e.matchDate)}</Typography></TableCell>
                        <TableCell><Typography variant="body2" noWrap>{e.opponent}</Typography></TableCell>
                        <TableCell align="center">
                          {e.result && (
                            <Chip
                              label={e.result}
                              size="small"
                              color={e.result === 'W' ? 'success' : e.result === 'L' ? 'error' : 'default'}
                            />
                          )}
                        </TableCell>
                        <TableCell align="center"><Typography variant="body2">{formatBallsToOvers(b.balls)}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2" fontWeight="bold">{b.wickets}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2">{b.runs}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2">{eco}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2">{b.maidens}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2">{b.wides}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2">{b.noBalls}</Typography></TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals row */}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell colSpan={3}><Typography variant="body2" fontWeight="bold">Totals</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{formatBallsToOvers(aggregate.totalBalls)}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2" fontWeight="bold">{aggregate.wickets}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{aggregate.runsConceded}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{economy}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{aggregate.maidens}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{aggregate.wides}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{aggregate.noBalls}</Typography></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )
      )}

      {/* ── Tab 3: AI Analysis ── */}
      {activeTab === 3 && (
        aiLoading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Psychology sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.7 }} />
            <Typography variant="h6" gutterBottom>Generating AI Report…</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Analysing player statistics — this may take up to 30 seconds.
            </Typography>
            <LinearProgress sx={{ maxWidth: 320, mx: 'auto', borderRadius: 2 }} />
          </Box>
        ) : aiError ? (
          <Alert severity="error" action={
            <Box component="span" sx={{ cursor: 'pointer', fontWeight: 'bold', ml: 1 }} onClick={() => loadAiReport(false)}>Retry</Box>
          }>{aiError}</Alert>
        ) : aiReport ? (
          <PlayerAiReportTab report={aiReport} regenerating={aiRegenerating} onRegenerate={() => loadAiReport(true)} />
        ) : null
      )}
    </Box>
  );
};

// ── AI Report tab ─────────────────────────────────────────────────────────────

const RatingBar: React.FC<{ value: number }> = ({ value }) => {
  const color = value >= 7.5 ? 'success' : value >= 5 ? 'warning' : 'error';
  return (
    <Box sx={{ mt: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">Player Rating</Typography>
        <Typography variant="caption" fontWeight={700} color={`${color}.main`}>{value.toFixed(1)} / 10</Typography>
      </Box>
      <LinearProgress variant="determinate" value={value * 10} color={color} sx={{ height: 8, borderRadius: 4 }} />
    </Box>
  );
};

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
    {items.map((item, i) => (
      <Typography key={i} component="li" variant="body2" sx={{ mb: 0.5 }}>{item}</Typography>
    ))}
  </Box>
);

interface AiReportTabProps {
  report: PlayerStatsReport;
  regenerating: boolean;
  onRegenerate: () => void;
}

const PlayerAiReportTab: React.FC<AiReportTabProps> = ({ report, regenerating, onRegenerate }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {report.generatedAt && (
      <AnalysisCacheBanner
        generatedAt={report.generatedAt}
        regenerating={regenerating}
        onRegenerate={onRegenerate}
      />
    )}

    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Psychology color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight="bold">Player Summary</Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.7 }}>{report.summary}</Typography>
      {report.playerRating != null && <RatingBar value={report.playerRating} />}
    </Paper>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Batting Analysis</Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{report.battingAnalysis}</Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Bowling Analysis</Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{report.bowlingAnalysis}</Typography>
      </Paper>
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      {report.strengths?.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderColor: 'success.light' }}>
          <Typography variant="subtitle2" fontWeight="bold" color="success.main" gutterBottom>Strengths</Typography>
          <Divider sx={{ mb: 1.5 }} />
          <BulletList items={report.strengths} />
        </Paper>
      )}
      {report.areasForImprovement?.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderColor: 'warning.light' }}>
          <Typography variant="subtitle2" fontWeight="bold" color="warning.main" gutterBottom>Areas for Improvement</Typography>
          <Divider sx={{ mb: 1.5 }} />
          <BulletList items={report.areasForImprovement} />
        </Paper>
      )}
    </Box>

    {report.recommendations?.length > 0 && (
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Recommendations</Typography>
        <Divider sx={{ mb: 1.5 }} />
        <BulletList items={report.recommendations} />
      </Paper>
    )}
  </Box>
);
