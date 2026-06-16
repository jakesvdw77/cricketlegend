import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, CircularProgress, Chip, Menu, MenuItem, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { ArrowDropDown, Equalizer, Group, Leaderboard, Person } from '@mui/icons-material';
import { matchApi } from '../api/matchApi';
import { tournamentApi } from '../api/tournamentApi';
import { playerApi } from '../api/playerApi';
import { Player, Tournament } from '../types';
import {
  MatchEntry, SquadPlayer,
  computeAggregate, parseOversToBalls,
  PlayerDetailPanel, PlayerStatsContent,
} from './manage/PlayerStatsOverview';
import { TeamStatsPanel } from './manage/TeamRotationOverview';

type View = 'stats' | 'teammates' | 'teams';

export const MyPlayerStats: React.FC = () => {
  const [view, setView] = useState<View>('stats');

  // ── Current player ──────────────────────────────────────────────────────────
  const [me, setMe] = useState<Player | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  // ── Tournaments ─────────────────────────────────────────────────────────────
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>(() => {
    const saved = localStorage.getItem('myStats_tournamentId');
    return saved ? (parseInt(saved, 10) as number) : '';
  });
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // ── My Stats data ───────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<MatchEntry[]>([]);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [teamName, setTeamName] = useState('');
  const [myTeamId, setMyTeamId] = useState<number | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // ── Load current player ─────────────────────────────────────────────────────
  useEffect(() => {
    playerApi.findMe()
      .then(setMe)
      .catch(() => {})
      .finally(() => setMeLoading(false));
  }, []);

  // ── Load tournaments ────────────────────────────────────────────────────────
  useEffect(() => {
    tournamentApi.findAll()
      .then(setTournaments)
      .catch(() => {})
      .finally(() => setTournamentsLoading(false));
  }, []);

  // ── Load my match entries ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedTournamentId || !me?.playerId) return;
    setDataLoading(true);
    setEntries([]);
    setGamesPlayed(0);
    setTeamName('');
    setMyTeamId(null);

    const load = async () => {
      const tournamentMatches = await matchApi.findByTournament(selectedTournamentId as number);
      const matchIds = tournamentMatches.map(m => m.matchId!).filter(Boolean);

      const [sidesResults, resultResults] = await Promise.all([
        Promise.allSettled(matchIds.map(mid => matchApi.getTeamSheet(mid))),
        Promise.allSettled(matchIds.map(mid => matchApi.getResult(mid))),
      ]);

      const sidesMap = new Map<number, ReturnType<typeof Array.prototype.find>[]>();
      sidesResults.forEach((r, i) => { if (r.status === 'fulfilled') sidesMap.set(matchIds[i], r.value as any); });

      const matchEntries: MatchEntry[] = [];
      let myTeamNameFound = '';
      let myTeamIdFound: number | null = null;
      let played = 0;

      for (let i = 0; i < tournamentMatches.length; i++) {
        const match = tournamentMatches[i];
        const mid = match.matchId!;
        const resultResult = resultResults[i];
        if (resultResult.status !== 'fulfilled') continue;

        const matchResult = resultResult.value;
        const sc = matchResult?.scoreCard;
        if (!sc) continue;

        const sides = [sc.teamA, sc.teamB].filter(Boolean) as NonNullable<typeof sc.teamA>[];

        const teamSheetSides = (sidesMap.get(mid) ?? []) as Array<{ teamId?: number; playingXi?: number[] }>;
        const myTeamSheet = teamSheetSides.find(s => s.playingXi?.includes(me.playerId!));
        let myTeamId: number | undefined = myTeamSheet?.teamId;

        if (!myTeamId) {
          const sideWithBat = sides.find(s => s.batting?.some(b => b.playerId === me.playerId && b.batted));
          myTeamId = sideWithBat?.teamId;
        }
        if (!myTeamId) {
          const sideWithMyBowl = sides.find(s => s.bowling?.some(b => b.playerId === me.playerId));
          if (sideWithMyBowl) {
            const otherSide = sides.find(s => s !== sideWithMyBowl);
            myTeamId = otherSide?.teamId;
          }
        }
        if (!myTeamId) continue;

        const mySide  = sides.find(s => s.teamId === myTeamId);
        const oppSide = sides.find(s => s.teamId !== myTeamId);
        const isHome = match.homeTeamId === myTeamId;
        const opponent = isHome ? (match.oppositionTeamName ?? 'Opposition') : (match.homeTeamName ?? 'Opposition');

        if (!myTeamNameFound) {
          myTeamNameFound = isHome ? (match.homeTeamName ?? '') : (match.oppositionTeamName ?? '');
          myTeamIdFound = myTeamId;
        }

        if (myTeamSheet?.playingXi?.includes(me.playerId!)) played++;

        let resultStr: string | undefined;
        if (matchResult?.matchCompleted) {
          if (matchResult.noResult) resultStr = 'NR';
          else if (matchResult.matchDrawn) resultStr = 'D';
          else if (matchResult.winningTeamId === myTeamId) resultStr = 'W';
          else resultStr = 'L';
        }

        const entry: MatchEntry = { matchId: mid, matchDate: match.matchDate, opponent, result: resultStr };

        const batEntry = mySide?.batting?.find(b => b.playerId === me.playerId);
        if (batEntry?.batted) {
          entry.batting = {
            score: batEntry.score ?? 0, ballsFaced: batEntry.ballsFaced ?? 0,
            fours: batEntry.fours ?? 0, sixes: batEntry.sixes ?? 0,
            dismissed: batEntry.dismissed ?? false,
            dismissalType: batEntry.dismissalType as string | undefined,
            dots: batEntry.dots ?? 0,
          };
        }

        const bowlEntry = oppSide?.bowling?.find(b => b.playerId === me.playerId);
        if (bowlEntry) {
          const balls = parseOversToBalls(bowlEntry.overs);
          if (balls > 0 || (bowlEntry.wickets ?? 0) > 0) {
            entry.bowling = {
              balls, runs: bowlEntry.runs ?? 0, wickets: bowlEntry.wickets ?? 0,
              maidens: bowlEntry.maidens ?? 0, dots: bowlEntry.dots ?? 0,
              wides: bowlEntry.wides ?? 0, noBalls: bowlEntry.noBalls ?? 0,
            };
          }
        }

        if (entry.batting || entry.bowling) matchEntries.push(entry);
      }

      matchEntries.sort((a, b) => (a.matchDate ?? '').localeCompare(b.matchDate ?? ''));
      setEntries(matchEntries);
      setGamesPlayed(played);
      setTeamName(myTeamNameFound);
      setMyTeamId(myTeamIdFound);
    };

    load().catch(() => {}).finally(() => setDataLoading(false));
  }, [selectedTournamentId, me]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ─────────────────────────────────────────────────────────────────
  const aggregate = useMemo(() => computeAggregate(entries), [entries]);

  const squadPlayer = useMemo((): SquadPlayer | null => {
    if (!me?.playerId) return null;
    return {
      playerId: me.playerId,
      name: me.name ?? '',
      surname: me.surname ?? '',
      battingStance: me.battingStance,
      bowlingType: me.bowlingType,
      wicketKeeper: me.wicketKeeper,
      gamesPlayed,
    };
  }, [me, gamesPlayed]);

  const selectedTournamentName = useMemo(
    () => tournaments.find(t => t.tournamentId === selectedTournamentId)?.name ?? 'Tournament',
    [tournaments, selectedTournamentId],
  );

  const handleTournamentChange = (id: number) => {
    setMenuAnchor(null);
    if (id === selectedTournamentId) return;
    localStorage.setItem('myStats_tournamentId', String(id));
    setSelectedTournamentId(id);
    setEntries([]);
    setGamesPlayed(0);
    setTeamName('');
    setMyTeamId(null);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (meLoading || tournamentsLoading)
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  // ── Tournament chip (shared across all views) ───────────────────────────────
  const tournamentChip = (
    <>
      <Chip
        label={selectedTournamentId ? selectedTournamentName : 'Select tournament'}
        onClick={e => setMenuAnchor(e.currentTarget)}
        onDelete={e => setMenuAnchor(e.currentTarget as HTMLElement)}
        deleteIcon={<ArrowDropDown />}
        variant="outlined"
        color={selectedTournamentId ? 'primary' : 'default'}
        size="small"
        sx={{ fontWeight: 500 }}
      />
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {tournaments.map(t => (
          <MenuItem
            key={t.tournamentId}
            selected={t.tournamentId === selectedTournamentId}
            onClick={() => handleTournamentChange(t.tournamentId!)}
          >
            {t.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );

  return (
    <Box>
      {/* ── Persistent header: toggle + tournament chip ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <ToggleButtonGroup
          value={view}
          exclusive
          size="small"
          onChange={(_, v) => v && setView(v)}
        >
          <ToggleButton value="stats" sx={{ px: 1.5, gap: 0.75, textTransform: 'none', fontWeight: 600 }}>
            <Person fontSize="small" /> My Stats
          </ToggleButton>
          <ToggleButton value="teammates" sx={{ px: 1.5, gap: 0.75, textTransform: 'none', fontWeight: 600 }}>
            <Group fontSize="small" /> Players
          </ToggleButton>
          <ToggleButton value="teams" sx={{ px: 1.5, gap: 0.75, textTransform: 'none', fontWeight: 600 }}>
            <Equalizer fontSize="small" /> My Teams
          </ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Leaderboard color="primary" fontSize="small" />
          {tournamentChip}
        </Box>
      </Box>

      {/* ── No tournament selected ── */}
      {!selectedTournamentId && (
        <Alert severity="info">Select a tournament above to view stats.</Alert>
      )}

      {/* ── My Stats view ── */}
      {view === 'stats' && selectedTournamentId && (
        <>
          {dataLoading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>}
          {!dataLoading && squadPlayer && entries.length === 0 && (
            <Alert severity="info">No scorecard data found for you in this tournament.</Alert>
          )}
          {!dataLoading && squadPlayer && entries.length > 0 && (
            <PlayerDetailPanel
              player={squadPlayer}
              entries={entries}
              aggregate={aggregate}
              tournamentId={selectedTournamentId as number}
              tournamentName={selectedTournamentName}
              teamName={teamName}
              onBack={() => {}}
              hideBack
            />
          )}
        </>
      )}

      {/* ── My Teammates view ── */}
      {view === 'teammates' && selectedTournamentId && (
        <>
          {dataLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
          )}
          {!dataLoading && !myTeamId && (
            <Alert severity="info">No team data found for you in this tournament.</Alert>
          )}
          {!dataLoading && myTeamId && (
            <PlayerStatsContent
              tournamentId={selectedTournamentId as number}
              teamId={myTeamId}
              tournamentName={selectedTournamentName}
              teamName={teamName}
            />
          )}
        </>
      )}

      {/* ── My Teams view ── */}
      {view === 'teams' && selectedTournamentId && (
        <TeamStatsPanel
          embedded
          initialTournamentId={selectedTournamentId as number}
          lockedTeamId={myTeamId ?? undefined}
        />
      )}
    </Box>
  );
};
