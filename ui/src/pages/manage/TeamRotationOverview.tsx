import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Avatar, Chip, Tooltip, TableSortLabel, Tabs, Tab, Divider,
} from '@mui/material';
import {
  QueryStats, EmojiEvents, CheckCircle, Remove,
  SportsCricket, TrendingUp, TrendingDown, Equalizer, Psychology,
} from '@mui/icons-material';
import { LinearProgress } from '@mui/material';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { tournamentApi } from '../../api/tournamentApi';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { Match, MatchResult, MatchSide, Tournament, TournamentStatsReport } from '../../types';
import { AnalysisCacheBanner } from '../../components/AnalysisCacheBanner';

// ── Overs helpers ─────────────────────────────────────────────────────────────

function parseOversToBalls(overs?: string): number {
  if (!overs) return 0;
  const [whole, part] = overs.split('.');
  return (parseInt(whole, 10) || 0) * 6 + (parseInt(part, 10) || 0);
}

function formatBallsToOvers(balls: number): string {
  const complete = Math.floor(balls / 6);
  const remainder = balls % 6;
  return remainder === 0 ? `${complete}` : `${complete}.${remainder}`;
}

function fmtNum(n: number, decimals = 2): string {
  if (!isFinite(n) || isNaN(n)) return '—';
  return n.toFixed(decimals);
}

function fmtPct(n: number): string {
  if (!isFinite(n) || isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MatchColumn {
  key: string;
  matchId: number;
  teamId: number;
  teamName: string;
  match: Match;
  playingXiSet: Set<number>;
  announced: boolean;
}

interface PlayerRow {
  playerId: number;
  playerName: string;
  gamesPlayed: number;
}

interface BattingAccumulator {
  playerId: number;
  playerName: string;
  innings: number;
  runs: number;
  ballsFaced: number;
  dismissals: number;
  highestScore: number;
  highestScoreNotOut: boolean;
}

interface BowlingAccumulator {
  playerId: number;
  playerName: string;
  innings: number;
  totalBalls: number;
  runs: number;
  wickets: number;
  bestWickets: number;
  bestRuns: number;
}

interface TeamOverview {
  // Match record
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  noResults: number;
  bonusPoints: number;
  // Batting
  battingInnings: number;
  runsScored: number;
  wicketsLost: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  dotsBatting: number;
  highestScore: number;
  highestScoreWickets: number;
  lowestScore: number;
  lowestScoreWickets: number;
  oversPlayed: number; // in balls
  // Bowling
  bowlingInnings: number;
  wicketsTaken: number;
  runsConceded: number;
  ballsBowled: number;
  maidens: number;
  dotsBowling: number;
  bestWickets: number;
  bestRuns: number;
  // Extras conceded
  extrasWides: number;
  extrasNoBalls: number;
  extrasByes: number;
  extrasLegByes: number;
  extrasInnings: number;
}

function emptyOverview(): TeamOverview {
  return {
    matchesPlayed: 0, wins: 0, losses: 0, draws: 0, noResults: 0, bonusPoints: 0,
    battingInnings: 0, runsScored: 0, wicketsLost: 0, ballsFaced: 0,
    fours: 0, sixes: 0, dotsBatting: 0,
    highestScore: 0, highestScoreWickets: 0, lowestScore: Infinity, lowestScoreWickets: 0,
    oversPlayed: 0,
    bowlingInnings: 0, wicketsTaken: 0, runsConceded: 0, ballsBowled: 0,
    maidens: 0, dotsBowling: 0, bestWickets: 0, bestRuns: Infinity,
    extrasWides: 0, extrasNoBalls: 0, extrasByes: 0, extrasLegByes: 0, extrasInnings: 0,
  };
}

type SortDir = 'asc' | 'desc';
type BattingSortKey = 'playerName' | 'innings' | 'runs' | 'average' | 'strikeRate' | 'highestScore';
type BowlingSortKey = 'playerName' | 'innings' | 'overs' | 'wickets' | 'strikeRate' | 'economy';

// ── Stat helpers ──────────────────────────────────────────────────────────────

function battingSortValue(row: BattingAccumulator, key: BattingSortKey): number | string {
  switch (key) {
    case 'playerName':   return row.playerName;
    case 'innings':      return row.innings;
    case 'runs':         return row.runs;
    case 'average':      return row.innings === 0 ? -1 : row.dismissals === 0 ? Infinity : row.runs / row.dismissals;
    case 'strikeRate':   return row.ballsFaced === 0 ? -1 : (row.runs / row.ballsFaced) * 100;
    case 'highestScore': return row.highestScore;
  }
}

const fmtBattingAverage = (r: BattingAccumulator) =>
  r.innings === 0 ? '—' : r.dismissals === 0 ? `${r.runs}*` : fmtNum(r.runs / r.dismissals);
const fmtBattingSR = (r: BattingAccumulator) =>
  r.ballsFaced === 0 ? '—' : fmtNum((r.runs / r.ballsFaced) * 100, 1);
const fmtHighestScore = (r: BattingAccumulator) =>
  r.innings === 0 ? '—' : `${r.highestScore}${r.highestScoreNotOut ? '*' : ''}`;

function bowlingSortValue(row: BowlingAccumulator, key: BowlingSortKey): number | string {
  switch (key) {
    case 'playerName': return row.playerName;
    case 'innings':    return row.innings;
    case 'overs':      return row.totalBalls;
    case 'wickets':    return row.wickets;
    case 'strikeRate': return row.wickets === 0 ? Infinity : row.totalBalls / row.wickets;
    case 'economy':    return row.totalBalls === 0 ? Infinity : (row.runs / row.totalBalls) * 6;
  }
}

const fmtBowlingSR = (r: BowlingAccumulator) => r.wickets === 0 ? '—' : fmtNum(r.totalBalls / r.wickets, 1);
const fmtEconomy    = (r: BowlingAccumulator) => r.totalBalls === 0 ? '—' : fmtNum((r.runs / r.totalBalls) * 6);
const fmtBestBowling = (r: BowlingAccumulator) => r.innings === 0 ? '—' : `${r.bestWickets}/${r.bestRuns}`;

function sortRows<T>(rows: T[], getValue: (r: T) => number | string, dir: SortDir): T[] {
  return [...rows].sort((a, b) => {
    const av = getValue(a), bv = getValue(b);
    if (typeof av === 'string' && typeof bv === 'string')
      return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return dir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
  });
}

const fmtDateShort = (d?: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
};

// ── Main component ────────────────────────────────────────────────────────────

export const TeamRotationOverview: React.FC = () => {
  const { teamIds: managerTeamIds, restrictByTeam, homeClubId, loaded: teamsLoaded } = useManagerTeams();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');

  const [columns, setColumns] = useState<MatchColumn[]>([]);
  const [playerMap, setPlayerMap] = useState<Map<number, string>>(new Map());
  const [dataLoading, setDataLoading] = useState(false);

  const [rotationSortDir, setRotationSortDir] = useState<SortDir>('desc');

  const [battingMap, setBattingMap]   = useState<Map<number, BattingAccumulator>>(new Map());
  const [bowlingMap, setBowlingMap]   = useState<Map<number, BowlingAccumulator>>(new Map());
  const [overview, setOverview]       = useState<TeamOverview | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsLoaded, setStatsLoaded]   = useState(false);

  const [battingSortKey, setBattingSortKey]   = useState<BattingSortKey>('runs');
  const [battingSortDir, setBattingSortDir]   = useState<SortDir>('desc');
  const [bowlingSortKey, setBowlingSortKey]   = useState<BowlingSortKey>('wickets');
  const [bowlingSortDir, setBowlingSortDir]   = useState<SortDir>('desc');

  // Tab 0 = Overview, 1 = Rotation, 2 = Batting, 3 = Bowling, 4 = AI Report
  const [activeTab, setActiveTab] = useState(0);

  const [aiReport, setAiReport]           = useState<TournamentStatsReport | null>(null);
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiRegenerating, setAiRegenerating] = useState(false);
  const [aiError, setAiError]             = useState<string | null>(null);

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
    if (tournaments.length === 1 && !selectedTournamentId) {
      setSelectedTournamentId(tournaments[0].tournamentId!);
    }
  }, [tournaments, selectedTournamentId]);

  // ── Load columns + squads when tournament changes ───────────────────────────

  useEffect(() => {
    if (!selectedTournamentId || !teamsLoaded) return;
    setDataLoading(true);
    setColumns([]); setPlayerMap(new Map());
    setBattingMap(new Map()); setBowlingMap(new Map());
    setOverview(null); setStatsLoaded(false);
    setAiReport(null); setAiError(null);

    const load = async () => {
      const [allTeams, tournamentMatches] = await Promise.all([
        teamApi.findAll(),
        matchApi.findByTournament(selectedTournamentId as number),
      ]);

      let relevantTeamIds: Set<number>;
      if (restrictByTeam) {
        relevantTeamIds = managerTeamIds;
      } else if (homeClubId != null) {
        relevantTeamIds = new Set(allTeams.filter(t => t.teamId != null && t.associatedClubId === homeClubId).map(t => t.teamId!));
      } else {
        relevantTeamIds = new Set(allTeams.map(t => t.teamId!).filter(Boolean));
      }

      const teamNameMap = new Map(allTeams.map(t => [t.teamId!, t.teamName]));
      const pairs: { match: Match; teamId: number; teamName: string }[] = [];
      for (const m of tournamentMatches) {
        if (m.homeTeamId != null && relevantTeamIds.has(m.homeTeamId))
          pairs.push({ match: m, teamId: m.homeTeamId, teamName: m.homeTeamName ?? teamNameMap.get(m.homeTeamId) ?? '' });
        if (m.oppositionTeamId != null && relevantTeamIds.has(m.oppositionTeamId))
          pairs.push({ match: m, teamId: m.oppositionTeamId, teamName: m.oppositionTeamName ?? teamNameMap.get(m.oppositionTeamId) ?? '' });
      }

      pairs.sort((a, b) => {
        const ka = `${a.match.matchDate ?? '9999-12-31'}T${a.match.scheduledStartTime ?? '99:99:99'}`;
        const kb = `${b.match.matchDate ?? '9999-12-31'}T${b.match.scheduledStartTime ?? '99:99:99'}`;
        return ka.localeCompare(kb);
      });

      const uniqueTeamIds = [...new Set(pairs.map(p => p.teamId))];
      const squads = await Promise.allSettled(uniqueTeamIds.map(tid => teamApi.getSquad(tid)));
      const playerIdToName = new Map<number, string>();
      squads.forEach(r => {
        if (r.status === 'fulfilled')
          for (const p of r.value)
            if (p.playerId != null) playerIdToName.set(p.playerId, `${p.name} ${p.surname}`);
      });

      const uniqueMatchIds = [...new Set(pairs.map(p => p.match.matchId!))];
      const teamsheets = await Promise.allSettled(uniqueMatchIds.map(mid => matchApi.getTeamSheet(mid)));
      const teamsheetMap = new Map<number, MatchSide[]>();
      teamsheets.forEach((r, i) => { if (r.status === 'fulfilled') teamsheetMap.set(uniqueMatchIds[i], r.value); });

      const cols: MatchColumn[] = pairs.map(p => {
        const sides = teamsheetMap.get(p.match.matchId!) ?? [];
        const side  = sides.find((s: MatchSide) => s.teamId === p.teamId);
        return {
          key: `${p.match.matchId}-${p.teamId}`,
          matchId: p.match.matchId!, teamId: p.teamId, teamName: p.teamName,
          match: p.match, playingXiSet: new Set(side?.playingXi ?? []),
          announced: side?.teamAnnounced ?? false,
        };
      });

      setColumns(cols);
      setPlayerMap(playerIdToName);
    };

    load().catch(() => {}).finally(() => setDataLoading(false));
  }, [selectedTournamentId, teamsLoaded, restrictByTeam, managerTeamIds, homeClubId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazy-load all stats (overview + batting + bowling) ──────────────────────
  // Triggers on tabs 0, 2, 3 (anything needing scorecard data)

  useEffect(() => {
    if (activeTab === 1 || columns.length === 0 || statsLoaded || statsLoading) return;
    setStatsLoading(true);

    const load = async () => {
      const uniqueMatchIds = [...new Set(columns.map(c => c.matchId))];
      const results = await Promise.allSettled(uniqueMatchIds.map(mid => matchApi.getResult(mid)));

      type Side = {
        teamId?: number;
        score?: number; wickets?: number; overs?: string;
        byes?: number; legByes?: number; wides?: number; noBalls?: number;
        batting: Array<{ playerId?: number; playerName?: string; batted?: boolean; score?: number; ballsFaced?: number; dismissed?: boolean; fours?: number; sixes?: number; dots?: number }>;
        bowling: Array<{ playerId?: number; playerName?: string; overs?: string; runs?: number; wickets?: number; maidens?: number; dots?: number; wides?: number; noBalls?: number }>;
      };

      const resultMap   = new Map<number, MatchResult>();
      const scorecardMap = new Map<number, Side[]>();

      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        resultMap.set(uniqueMatchIds[i], r.value);
        const sc = r.value.scoreCard;
        if (!sc) return;
        const sides = [sc.teamA, sc.teamB].filter(Boolean) as NonNullable<typeof sc.teamA>[];
        scorecardMap.set(uniqueMatchIds[i], sides.map(s => ({
          teamId: s.teamId, score: s.score, wickets: s.wickets, overs: s.overs,
          byes: s.byes, legByes: s.legByes, wides: s.wides, noBalls: s.noBalls,
          batting: s.batting ?? [], bowling: s.bowling ?? [],
        })));
      });

      // ── Batting & Bowling per-player ────────────────────────────────────────
      const batMap  = new Map<number, BattingAccumulator>();
      const bowlMap = new Map<number, BowlingAccumulator>();

      // ── Team overview (aggregate) ───────────────────────────────────────────
      const ov = emptyOverview();

      for (const col of columns) {
        const matchResult = resultMap.get(col.matchId);
        const sides       = scorecardMap.get(col.matchId);

        // Match record
        ov.matchesPlayed++;
        if (matchResult?.matchCompleted) {
          if (matchResult.noResult)       ov.noResults++;
          else if (matchResult.matchDrawn) ov.draws++;
          else if (matchResult.winningTeamId === col.teamId) {
            ov.wins++;
            if (matchResult.wonWithBonusPoint) ov.bonusPoints++;
          } else if (matchResult.winningTeamId) {
            ov.losses++;
          }
        }

        if (!sides) continue;
        const myBat  = sides.find(s => s.teamId === col.teamId);
        const myBowl = sides.find(s => s.teamId !== col.teamId);

        // ── Team batting overview ─────────────────────────────────────────────
        if (myBat) {
          const score = myBat.score ?? 0;
          const wkts  = myBat.wickets ?? 0;
          const balls = parseOversToBalls(myBat.overs);
          ov.battingInnings++;
          ov.runsScored  += score;
          ov.wicketsLost += wkts;
          ov.oversPlayed += balls;
          if (score > ov.highestScore) { ov.highestScore = score; ov.highestScoreWickets = wkts; }
          if (score < ov.lowestScore)  { ov.lowestScore  = score; ov.lowestScoreWickets  = wkts; }
          for (const b of myBat.batting) {
            if (!b.batted) continue;
            ov.fours        += b.fours    ?? 0;
            ov.sixes        += b.sixes    ?? 0;
            ov.ballsFaced   += b.ballsFaced ?? 0;
            ov.dotsBatting  += b.dots     ?? 0;
          }
        }

        // ── Team bowling overview ─────────────────────────────────────────────
        if (myBowl) {
          ov.bowlingInnings++;
          // Extras conceded by our team (stored on the innings we bowled in)
          ov.extrasWides   += myBowl.wides   ?? 0;
          ov.extrasNoBalls += myBowl.noBalls ?? 0;
          ov.extrasByes    += myBowl.byes    ?? 0;
          ov.extrasLegByes += myBowl.legByes ?? 0;
          ov.extrasInnings++;

          for (const b of myBowl.bowling) {
            const balls   = parseOversToBalls(b.overs);
            const wkts    = b.wickets ?? 0;
            const runs    = b.runs    ?? 0;
            ov.ballsBowled   += balls;
            ov.runsConceded  += runs;
            ov.wicketsTaken  += wkts;
            ov.maidens       += b.maidens ?? 0;
            ov.dotsBowling   += b.dots    ?? 0;
            if (wkts > ov.bestWickets || (wkts === ov.bestWickets && runs < ov.bestRuns)) {
              ov.bestWickets = wkts; ov.bestRuns = runs;
            }
          }
        }

        // ── Per-player batting ────────────────────────────────────────────────
        for (const entry of myBat?.batting ?? []) {
          if (!entry.batted || entry.playerId == null) continue;
          const name  = playerMap.get(entry.playerId) ?? entry.playerName ?? `Player ${entry.playerId}`;
          const score = entry.score ?? 0;
          const balls = entry.ballsFaced ?? 0;
          const out   = entry.dismissed ?? false;
          if (!batMap.has(entry.playerId))
            batMap.set(entry.playerId, { playerId: entry.playerId, playerName: name, innings: 0, runs: 0, ballsFaced: 0, dismissals: 0, highestScore: 0, highestScoreNotOut: false });
          const acc = batMap.get(entry.playerId)!;
          acc.innings++; acc.runs += score; acc.ballsFaced += balls;
          if (out) acc.dismissals++;
          if (score > acc.highestScore || (score === acc.highestScore && !out && !acc.highestScoreNotOut)) {
            acc.highestScore = score; acc.highestScoreNotOut = !out;
          }
        }

        // ── Per-player bowling ────────────────────────────────────────────────
        for (const entry of myBowl?.bowling ?? []) {
          if (entry.playerId == null) continue;
          const balls = parseOversToBalls(entry.overs);
          if (balls === 0 && (entry.wickets ?? 0) === 0) continue;
          const name  = playerMap.get(entry.playerId) ?? entry.playerName ?? `Player ${entry.playerId}`;
          const runs  = entry.runs    ?? 0;
          const wkts  = entry.wickets ?? 0;
          if (!bowlMap.has(entry.playerId))
            bowlMap.set(entry.playerId, { playerId: entry.playerId, playerName: name, innings: 0, totalBalls: 0, runs: 0, wickets: 0, bestWickets: 0, bestRuns: 0 });
          const acc = bowlMap.get(entry.playerId)!;
          acc.innings++; acc.totalBalls += balls; acc.runs += runs; acc.wickets += wkts;
          if (wkts > acc.bestWickets || (wkts === acc.bestWickets && runs < acc.bestRuns)) {
            acc.bestWickets = wkts; acc.bestRuns = runs;
          }
        }
      }

      // Clamp lowestScore
      if (ov.lowestScore === Infinity) ov.lowestScore = 0;
      if (ov.bestRuns === Infinity)    ov.bestRuns = 0;

      setOverview(ov);
      setBattingMap(batMap);
      setBowlingMap(bowlMap);
      setStatsLoaded(true);
    };

    load().catch(() => {}).finally(() => setStatsLoading(false));
  }, [activeTab, columns, statsLoaded, statsLoading, playerMap]);

  // ── AI report — lazy-load on tab 4, callable for regenerate ─────────────────

  const loadAiReport = (regen = false) => {
    if (!selectedTournamentId || !overview) return;
    if (regen) setAiRegenerating(true); else setAiLoading(true);
    setAiError(null);

    // Build top-performer strings from sorted rows
    const topBatters = [...battingMap.values()]
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 5)
      .map(r => `${r.playerName}: ${r.runs} runs, avg ${fmtBattingAverage(r)}, SR ${fmtBattingSR(r)}, HS ${fmtHighestScore(r)}`);

    const topBowlers = [...bowlingMap.values()]
      .sort((a, b) => b.wickets - a.wickets)
      .slice(0, 5)
      .map(r => `${r.playerName}: ${r.wickets} wkts, econ ${fmtEconomy(r)}, SR ${fmtBowlingSR(r)}, BB ${fmtBestBowling(r)}`);

    const decided   = overview.matchesPlayed - overview.noResults;
    const winPct    = decided > 0 ? (overview.wins / decided) * 100 : 0;
    const runRate   = overview.oversPlayed > 0 ? (overview.runsScored / overview.oversPlayed) * 6 : 0;
    const boundaryRuns = overview.fours * 4 + overview.sixes * 6;
    const boundaryPct  = overview.runsScored > 0 ? (boundaryRuns / overview.runsScored) * 100 : 0;
    const dotPctBat    = overview.ballsFaced > 0 ? (overview.dotsBatting / overview.ballsFaced) * 100 : 0;
    const aveConc      = overview.bowlingInnings > 0 ? overview.runsConceded / overview.bowlingInnings : 0;
    const economy      = overview.ballsBowled > 0 ? (overview.runsConceded / overview.ballsBowled) * 6 : 0;
    const bowlSR       = overview.wicketsTaken > 0 ? overview.ballsBowled / overview.wicketsTaken : 0;
    const dotPctBowl   = overview.ballsBowled > 0 ? (overview.dotsBowling / overview.ballsBowled) * 100 : 0;
    const totalExtras  = overview.extrasWides + overview.extrasNoBalls + overview.extrasByes + overview.extrasLegByes;
    const aveExtras    = overview.extrasInnings > 0 ? totalExtras / overview.extrasInnings : 0;
    const extrasPct    = overview.runsConceded > 0 ? (totalExtras / overview.runsConceded) * 100 : 0;
    const nrr          = (overview.oversPlayed > 0 && overview.ballsBowled > 0)
      ? (overview.runsScored / overview.oversPlayed * 6) - (overview.runsConceded / overview.ballsBowled * 6)
      : 0;

    const selectedTournament = tournaments.find(t => t.tournamentId === selectedTournamentId);

    const stats = {
      tournamentName: selectedTournament?.name ?? 'Tournament',
      matchesPlayed: overview.matchesPlayed, wins: overview.wins, losses: overview.losses,
      draws: overview.draws, noResults: overview.noResults,
      winPct, nrr,
      battingInnings: overview.battingInnings, runsScored: overview.runsScored,
      wicketsLost: overview.wicketsLost, fours: overview.fours, sixes: overview.sixes,
      aveScore: overview.battingInnings > 0 ? overview.runsScored / overview.battingInnings : 0,
      runRate, boundaryPct, dotPctBat,
      highestScore: overview.highestScore, highestScoreWickets: overview.highestScoreWickets,
      lowestScore: overview.lowestScore, lowestScoreWickets: overview.lowestScoreWickets,
      bowlingInnings: overview.bowlingInnings, wicketsTaken: overview.wicketsTaken,
      runsConceded: overview.runsConceded, maidens: overview.maidens,
      aveConc, economy,
      bowlingStrikeRate: isFinite(bowlSR) ? bowlSR : 0,
      dotPctBowl,
      bestBowling: overview.bestWickets > 0 ? `${overview.bestWickets}/${overview.bestRuns}` : '—',
      extrasWides: overview.extrasWides, extrasNoBalls: overview.extrasNoBalls,
      extrasByes: overview.extrasByes, extrasLegByes: overview.extrasLegByes,
      extrasTotal: totalExtras, aveExtras, extrasPct,
      topBatters, topBowlers,
    };

    tournamentApi.getStatsAnalysis(selectedTournamentId as number, stats, regen)
      .then(setAiReport)
      .catch(e => setAiError(e?.response?.data?.message ?? e?.message ?? 'Failed to generate report'))
      .finally(() => { setAiLoading(false); setAiRegenerating(false); });
  };

  useEffect(() => {
    if (activeTab !== 4 || !overview || aiReport || aiLoading) return;
    loadAiReport(false);
  }, [activeTab, overview, aiReport, aiLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived rows ────────────────────────────────────────────────────────────

  const playerRows = useMemo((): PlayerRow[] =>
    sortRows(
      [...playerMap.entries()].map(([playerId, playerName]) => ({
        playerId, playerName,
        gamesPlayed: columns.filter(c => c.playingXiSet.has(playerId)).length,
      })),
      r => r.gamesPlayed, rotationSortDir,
    ),
  [playerMap, columns, rotationSortDir]);

  const battingRows = useMemo(() =>
    sortRows([...battingMap.values()], r => battingSortValue(r, battingSortKey), battingSortDir),
  [battingMap, battingSortKey, battingSortDir]);

  const bowlingRows = useMemo(() =>
    sortRows([...bowlingMap.values()], r => bowlingSortValue(r, bowlingSortKey), bowlingSortDir),
  [bowlingMap, bowlingSortKey, bowlingSortDir]);

  const handleBattingSort = (key: BattingSortKey) => {
    if (battingSortKey === key) setBattingSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setBattingSortKey(key); setBattingSortDir('desc'); }
  };
  const handleBowlingSort = (key: BowlingSortKey) => {
    if (bowlingSortKey === key) setBowlingSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setBowlingSortKey(key); setBowlingSortDir('desc'); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!teamsLoaded || tournamentsLoading)
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <QueryStats color="primary" />
        <Typography variant="h5">Team Stats</Typography>
      </Box>

      <FormControl sx={{ mb: 3, minWidth: 320 }} size="small">
        <InputLabel>Tournament</InputLabel>
        <Select
          value={selectedTournamentId}
          label="Tournament"
          onChange={e => {
            setSelectedTournamentId(e.target.value as number);
            setColumns([]); setPlayerMap(new Map());
            setBattingMap(new Map()); setBowlingMap(new Map());
            setOverview(null); setStatsLoaded(false);
            setAiReport(null); setAiError(null); setActiveTab(0);
          }}
        >
          {tournaments.map(t => <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>)}
        </Select>
      </FormControl>

      {!selectedTournamentId && (
        <Alert severity="info" icon={<EmojiEvents />}>Select a tournament to view team stats.</Alert>
      )}

      {dataLoading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>}

      {!dataLoading && !!selectedTournamentId && (
        columns.length === 0
          ? <Alert severity="info">No matches found for your teams in this tournament.</Alert>
          : <>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                <Tab label="Overview" />
                <Tab label="Player Rotation" />
                <Tab label="Batting Stats" />
                <Tab label="Bowling Stats" />
                <Tab label="AI Report" icon={<Psychology fontSize="small" />} iconPosition="start" />
              </Tabs>

              {/* ── Tab 0: Overview ── */}
              {activeTab === 0 && (
                statsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
                ) : !overview ? (
                  <Alert severity="info">No scorecard data found for this tournament yet.</Alert>
                ) : (
                  <TeamOverviewTab ov={overview} />
                )
              )}

              {/* ── Tab 1: Player Rotation ── */}
              {activeTab === 1 && (
                playerRows.length === 0
                  ? <Alert severity="info">No squad data found.</Alert>
                  : <RotationTable columns={columns} playerRows={playerRows} sortDir={rotationSortDir} onToggleSort={() => setRotationSortDir(d => d === 'desc' ? 'asc' : 'desc')} />
              )}

              {/* ── Tab 2: Batting Stats ── */}
              {activeTab === 2 && (
                statsLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
                : battingRows.length === 0 ? <Alert severity="info">No batting scorecards recorded yet.</Alert>
                : <BattingStatsTable rows={battingRows} sortKey={battingSortKey} sortDir={battingSortDir} onSort={handleBattingSort} />
              )}

              {/* ── Tab 3: Bowling Stats ── */}
              {activeTab === 3 && (
                statsLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
                : bowlingRows.length === 0 ? <Alert severity="info">No bowling scorecards recorded yet.</Alert>
                : <BowlingStatsTable rows={bowlingRows} sortKey={bowlingSortKey} sortDir={bowlingSortDir} onSort={handleBowlingSort} />
              )}

              {/* ── Tab 4: AI Report ── */}
              {activeTab === 4 && (
                !overview ? (
                  <Alert severity="warning">
                    Overview data is required before generating an AI report. Please wait for the Overview tab to load first.
                  </Alert>
                ) : aiLoading ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Psychology sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.7 }} />
                    <Typography variant="h6" gutterBottom>Generating AI Report…</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Analysing tournament statistics — this may take up to 30 seconds.
                    </Typography>
                    <LinearProgress sx={{ maxWidth: 320, mx: 'auto', borderRadius: 2 }} />
                  </Box>
                ) : aiError ? (
                  <Alert severity="error" action={
                    <Box component="span" sx={{ cursor: 'pointer', fontWeight: 'bold', ml: 1 }} onClick={() => loadAiReport(false)}>Retry</Box>
                  }>{aiError}</Alert>
                ) : aiReport ? (
                  <AiReportTab report={aiReport} regenerating={aiRegenerating} onRegenerate={() => loadAiReport(true)} />
                ) : null
              )}
            </>
      )}
    </Box>
  );
};

// ── Team Overview Dashboard ────────────────────────────────────────────────────

const StatItem: React.FC<{ label: string; value: string | number; sub?: string; accent?: boolean }> = ({ label, value, sub, accent }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
      {label}
    </Typography>
    <Typography variant="h6" fontWeight="bold" color={accent ? 'primary.main' : 'text.primary'} sx={{ lineHeight: 1.2 }}>
      {value}
    </Typography>
    {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
  </Box>
);

const SectionCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      {icon}
      <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
    </Box>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
);

const StatGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
    {children}
  </Box>
);

const TeamOverviewTab: React.FC<{ ov: TeamOverview }> = ({ ov }) => {
  const decided   = ov.matchesPlayed - ov.noResults;
  const winPct    = decided > 0 ? (ov.wins / decided) * 100 : 0;
  const aveRuns   = ov.battingInnings > 0 ? ov.runsScored / ov.battingInnings : 0;
  const runRate   = ov.oversPlayed > 0 ? (ov.runsScored / ov.oversPlayed) * 6 : 0;
  const boundaryRuns = ov.fours * 4 + ov.sixes * 6;
  const boundaryPct  = ov.runsScored > 0 ? (boundaryRuns / ov.runsScored) * 100 : 0;
  const dotPctBat    = ov.ballsFaced > 0 ? (ov.dotsBatting / ov.ballsFaced) * 100 : 0;

  const aveConc   = ov.bowlingInnings > 0 ? ov.runsConceded / ov.bowlingInnings : 0;
  const economy   = ov.ballsBowled > 0 ? (ov.runsConceded / ov.ballsBowled) * 6 : 0;
  const bowlSR    = ov.wicketsTaken > 0 ? ov.ballsBowled / ov.wicketsTaken : 0;
  const dotPctBowl = ov.ballsBowled > 0 ? (ov.dotsBowling / ov.ballsBowled) * 100 : 0;

  const totalExtras = ov.extrasWides + ov.extrasNoBalls + ov.extrasByes + ov.extrasLegByes;
  const aveExtras   = ov.extrasInnings > 0 ? totalExtras / ov.extrasInnings : 0;
  const extrasPct   = ov.runsConceded > 0 ? (totalExtras / ov.runsConceded) * 100 : 0;

  const nrr = (ov.oversPlayed > 0 && ov.ballsBowled > 0)
    ? (ov.runsScored / ov.oversPlayed * 6) - (ov.runsConceded / ov.ballsBowled * 6)
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Hero strip ── */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          {[
            { label: 'Played',  value: ov.matchesPlayed },
            { label: 'Won',     value: ov.wins,          sub: `${fmtPct(winPct)} win rate` },
            { label: 'Lost',    value: ov.losses },
            { label: 'Drawn',   value: ov.draws },
            { label: 'No Result', value: ov.noResults },
            { label: 'Bonus Pts', value: ov.bonusPoints },
          ].map(s => (
            <Box key={s.label} sx={{ textAlign: 'center', px: 1.5 }}>
              <Typography variant="h4" fontWeight="bold" color="primary.main">{s.value}</Typography>
              <Typography variant="caption" color="text.secondary" display="block">{s.label}</Typography>
              {s.sub && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{s.sub}</Typography>}
            </Box>
          ))}
          {nrr !== null && (
            <Box sx={{ textAlign: 'center', px: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                {nrr >= 0 ? <TrendingUp color="success" fontSize="small" /> : <TrendingDown color="error" fontSize="small" />}
                <Typography variant="h4" fontWeight="bold" color={nrr >= 0 ? 'success.main' : 'error.main'}>
                  {nrr >= 0 ? '+' : ''}{nrr.toFixed(3)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" display="block">NRR</Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Highest / Lowest ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, borderColor: 'success.light' }}>
          <Typography variant="caption" color="success.main" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Highest Team Score
          </Typography>
          <Typography variant="h4" fontWeight="bold" color="success.main" sx={{ mt: 0.5 }}>
            {ov.highestScore}/{ov.highestScoreWickets}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderColor: 'warning.light' }}>
          <Typography variant="caption" color="warning.main" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Lowest Team Score
          </Typography>
          <Typography variant="h4" fontWeight="bold" color="warning.main" sx={{ mt: 0.5 }}>
            {ov.lowestScore}/{ov.lowestScoreWickets}
          </Typography>
        </Paper>
      </Box>

      {/* ── Batting + Bowling ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>

        <SectionCard title="Batting" icon={<Equalizer color="primary" fontSize="small" />}>
          <StatGrid>
            <StatItem label="Total Runs"      value={ov.runsScored.toLocaleString()} />
            <StatItem label="Innings"         value={ov.battingInnings} />
            <StatItem label="Ave Score / Inn" value={fmtNum(aveRuns, 1)} accent />
            <StatItem label="Ave Run Rate"    value={fmtNum(runRate)} sub="runs per over" accent />
            <StatItem label="Wickets Lost"    value={ov.wicketsLost} />
            <StatItem label="Balls Faced"     value={ov.ballsFaced.toLocaleString()} sub={formatBallsToOvers(ov.ballsFaced) + ' overs'} />
            <StatItem label="Fours"           value={ov.fours} />
            <StatItem label="Sixes"           value={ov.sixes} />
            <StatItem label="Boundary Runs"   value={boundaryRuns.toLocaleString()} sub={fmtPct(boundaryPct) + ' of total'} />
            <StatItem label="Dot Ball %"      value={fmtPct(dotPctBat)} />
          </StatGrid>
        </SectionCard>

        <SectionCard title="Bowling" icon={<SportsCricket color="secondary" fontSize="small" />}>
          <StatGrid>
            <StatItem label="Total Wickets"    value={ov.wicketsTaken} />
            <StatItem label="Innings Bowled"   value={ov.bowlingInnings} />
            <StatItem label="Ave Conceded/Inn" value={fmtNum(aveConc, 1)} />
            <StatItem label="Economy"          value={fmtNum(economy)} sub="runs per over" accent />
            <StatItem label="Bowling SR"       value={isFinite(bowlSR) && bowlSR > 0 ? fmtNum(bowlSR, 1) : '—'} sub="balls per wicket" accent />
            <StatItem label="Overs Bowled"     value={formatBallsToOvers(ov.ballsBowled)} />
            <StatItem label="Maidens"          value={ov.maidens} />
            <StatItem label="Best Bowling"     value={ov.bestWickets > 0 ? `${ov.bestWickets}/${ov.bestRuns}` : '—'} />
            <StatItem label="Runs Conceded"    value={ov.runsConceded.toLocaleString()} />
            <StatItem label="Dot Ball %"       value={fmtPct(dotPctBowl)} />
          </StatGrid>
        </SectionCard>
      </Box>

      {/* ── Extras ── */}
      <SectionCard title="Extras Conceded" icon={<QueryStats color="action" fontSize="small" />}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 2 }}>
          <StatItem label="Wides"       value={ov.extrasWides} />
          <StatItem label="No-Balls"    value={ov.extrasNoBalls} />
          <StatItem label="Byes"        value={ov.extrasByes} />
          <StatItem label="Leg-Byes"    value={ov.extrasLegByes} />
          <StatItem label="Total Extras" value={totalExtras} accent />
          <StatItem label="Ave / Inn"   value={fmtNum(aveExtras, 1)} />
          <StatItem label="Extras %"    value={fmtPct(extrasPct)} sub="of runs conceded" />
        </Box>
      </SectionCard>

    </Box>
  );
};

// ── AI Report Tab ─────────────────────────────────────────────────────────────

const RatingBar: React.FC<{ value: number }> = ({ value }) => {
  const color = value >= 7.5 ? 'success' : value >= 5 ? 'warning' : 'error';
  return (
    <Box sx={{ mt: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">Overall Rating</Typography>
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
  report: TournamentStatsReport;
  regenerating: boolean;
  onRegenerate: () => void;
}

const AiReportTab: React.FC<AiReportTabProps> = ({ report, regenerating, onRegenerate }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {report.generatedAt && (
      <AnalysisCacheBanner
        generatedAt={report.generatedAt}
        regenerating={regenerating}
        onRegenerate={onRegenerate}
      />
    )}

    {/* Summary + rating */}
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Psychology color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight="bold">Tournament Summary</Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.7 }}>{report.summary}</Typography>
      {report.overallRating != null && <RatingBar value={report.overallRating} />}
    </Paper>

    {/* Batting + Bowling side by side */}
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

    {/* Extras */}
    {report.extrasAnalysis && (
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Discipline & Extras</Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{report.extrasAnalysis}</Typography>
      </Paper>
    )}

    {/* Key performers */}
    {report.keyPerformers?.length > 0 && (
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Key Performers</Typography>
        <Divider sx={{ mb: 1.5 }} />
        <BulletList items={report.keyPerformers} />
      </Paper>
    )}

    {/* Strengths + Areas for improvement */}
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

    {/* Recommendations */}
    {report.recommendations?.length > 0 && (
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Recommendations</Typography>
        <Divider sx={{ mb: 1.5 }} />
        <BulletList items={report.recommendations} />
      </Paper>
    )}
  </Box>
);

// ── Rotation Table ─────────────────────────────────────────────────────────────

interface RotationTableProps {
  columns: MatchColumn[];
  playerRows: PlayerRow[];
  sortDir: SortDir;
  onToggleSort: () => void;
}

const RotationTable: React.FC<RotationTableProps> = ({ columns, playerRows, sortDir, onToggleSort }) => (
  <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold', minWidth: 180, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}>
            Player
          </TableCell>
          <TableCell align="center" sortDirection={sortDir} sx={{ minWidth: 90, fontWeight: 'bold', zIndex: 2, bgcolor: 'background.paper' }}>
            <TableSortLabel active direction={sortDir} onClick={onToggleSort}>Games</TableSortLabel>
          </TableCell>
          {columns.map(col => (
            <TableCell key={col.key} align="center" sx={{ minWidth: 110, verticalAlign: 'top', pb: 1 }}>
              <Typography variant="caption" fontWeight="bold" display="block" noWrap>{fmtDateShort(col.match.matchDate)}</Typography>
              <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.65rem' }}>
                vs {col.match.homeTeamId === col.teamId ? col.match.oppositionTeamName : col.match.homeTeamName}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.65rem' }}>{col.teamName}</Typography>
              {!col.announced && <Chip label="No XI" size="small" variant="outlined" sx={{ fontSize: '0.55rem', height: 16, mt: 0.25 }} />}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {playerRows.map(row => (
          <TableRow key={row.playerId} hover>
            <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>{row.playerName.charAt(0)}</Avatar>
                <Typography variant="body2" noWrap>{row.playerName}</Typography>
              </Box>
            </TableCell>
            <TableCell align="center">
              <Chip label={row.gamesPlayed} size="small" color={row.gamesPlayed > 0 ? 'primary' : 'default'} variant={row.gamesPlayed > 0 ? 'filled' : 'outlined'} />
            </TableCell>
            {columns.map(col => (
              <TableCell key={col.key} align="center">
                {col.playingXiSet.has(row.playerId)
                  ? <Tooltip title="Played"><CheckCircle fontSize="small" color="success" /></Tooltip>
                  : <Tooltip title={col.announced ? 'Not selected' : 'XI not announced'}><Remove fontSize="small" sx={{ color: 'text.disabled' }} /></Tooltip>}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

// ── Batting Stats Table ────────────────────────────────────────────────────────

interface BattingStatsTableProps { rows: BattingAccumulator[]; sortKey: BattingSortKey; sortDir: SortDir; onSort: (k: BattingSortKey) => void; }

const BATTING_COLS: { key: BattingSortKey; label: string; tooltip: string }[] = [
  { key: 'innings',      label: 'Inn',  tooltip: 'Innings batted' },
  { key: 'runs',         label: 'Runs', tooltip: 'Total runs scored' },
  { key: 'average',      label: 'Ave',  tooltip: 'Batting average (runs ÷ dismissals). * = never dismissed' },
  { key: 'strikeRate',   label: 'SR',   tooltip: 'Strike rate (runs per 100 balls faced)' },
  { key: 'highestScore', label: 'HS',   tooltip: 'Highest score (* = not out)' },
];

const BattingStatsTable: React.FC<BattingStatsTableProps> = ({ rows, sortKey, sortDir, onSort }) => (
  <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold', minWidth: 180, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}>
            <TableSortLabel active={sortKey === 'playerName'} direction={sortKey === 'playerName' ? sortDir : 'asc'} onClick={() => onSort('playerName')}>Player</TableSortLabel>
          </TableCell>
          {BATTING_COLS.map(col => (
            <TableCell key={col.key} align="center" sortDirection={sortKey === col.key ? sortDir : false} sx={{ minWidth: 72, fontWeight: 'bold' }}>
              <Tooltip title={col.tooltip}>
                <TableSortLabel active={sortKey === col.key} direction={sortKey === col.key ? sortDir : 'desc'} onClick={() => onSort(col.key)}>{col.label}</TableSortLabel>
              </Tooltip>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.playerId} hover>
            <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>{row.playerName.charAt(0)}</Avatar>
                <Typography variant="body2" noWrap>{row.playerName}</Typography>
              </Box>
            </TableCell>
            <TableCell align="center"><Typography variant="body2">{row.innings}</Typography></TableCell>
            <TableCell align="center"><Typography variant="body2" fontWeight={sortKey === 'runs' ? 'bold' : 'normal'}>{row.runs}</Typography></TableCell>
            <TableCell align="center"><Typography variant="body2">{fmtBattingAverage(row)}</Typography></TableCell>
            <TableCell align="center"><Typography variant="body2">{fmtBattingSR(row)}</Typography></TableCell>
            <TableCell align="center"><Typography variant="body2" fontWeight="medium">{fmtHighestScore(row)}</Typography></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

// ── Bowling Stats Table ────────────────────────────────────────────────────────

interface BowlingStatsTableProps { rows: BowlingAccumulator[]; sortKey: BowlingSortKey; sortDir: SortDir; onSort: (k: BowlingSortKey) => void; }

const BOWLING_COLS: { key: BowlingSortKey; label: string; tooltip: string }[] = [
  { key: 'innings',    label: 'Inn',  tooltip: 'Innings bowled' },
  { key: 'overs',     label: 'Ovs',  tooltip: 'Total overs bowled' },
  { key: 'wickets',   label: 'Wkts', tooltip: 'Total wickets taken' },
  { key: 'strikeRate',label: 'SR',   tooltip: 'Bowling strike rate (balls per wicket). Lower is better.' },
  { key: 'economy',   label: 'Econ', tooltip: 'Economy rate (runs conceded per over). Lower is better.' },
];

const BowlingStatsTable: React.FC<BowlingStatsTableProps> = ({ rows, sortKey, sortDir, onSort }) => (
  <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold', minWidth: 180, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}>
            <TableSortLabel active={sortKey === 'playerName'} direction={sortKey === 'playerName' ? sortDir : 'asc'} onClick={() => onSort('playerName')}>Player</TableSortLabel>
          </TableCell>
          {BOWLING_COLS.map(col => (
            <TableCell key={col.key} align="center" sortDirection={sortKey === col.key ? sortDir : false} sx={{ minWidth: 72, fontWeight: 'bold' }}>
              <Tooltip title={col.tooltip}>
                <TableSortLabel active={sortKey === col.key} direction={sortKey === col.key ? sortDir : 'desc'} onClick={() => onSort(col.key)}>{col.label}</TableSortLabel>
              </Tooltip>
            </TableCell>
          ))}
          <TableCell align="center" sx={{ minWidth: 72, fontWeight: 'bold' }}>
            <Tooltip title="Best bowling figures in a single innings"><span>BB</span></Tooltip>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.playerId} hover>
            <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'secondary.main' }}>{row.playerName.charAt(0)}</Avatar>
                <Typography variant="body2" noWrap>{row.playerName}</Typography>
              </Box>
            </TableCell>
            <TableCell align="center"><Typography variant="body2">{row.innings}</Typography></TableCell>
            <TableCell align="center"><Typography variant="body2">{formatBallsToOvers(row.totalBalls)}</Typography></TableCell>
            <TableCell align="center"><Typography variant="body2" fontWeight={sortKey === 'wickets' ? 'bold' : 'normal'}>{row.wickets}</Typography></TableCell>
            <TableCell align="center"><Typography variant="body2">{fmtBowlingSR(row)}</Typography></TableCell>
            <TableCell align="center"><Typography variant="body2">{fmtEconomy(row)}</Typography></TableCell>
            <TableCell align="center"><Typography variant="body2" fontWeight="medium">{fmtBestBowling(row)}</Typography></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);
