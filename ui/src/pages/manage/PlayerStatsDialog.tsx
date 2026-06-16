import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, CircularProgress, Dialog, DialogContent, DialogTitle,
  FormControl, IconButton, InputLabel, MenuItem, Select, Typography,
} from '@mui/material';
import { Close, Leaderboard } from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { tournamentApi } from '../../api/tournamentApi';
import { Player, Tournament } from '../../types';
import {
  MatchEntry, SquadPlayer,
  computeAggregate, parseOversToBalls,
  PlayerDetailPanel,
} from './PlayerStatsOverview';

interface Props {
  open: boolean;
  player: Player | null;
  onClose: () => void;
}

export const PlayerStatsDialog: React.FC<Props> = ({ open, player, onClose }) => {
  const playerId = player?.playerId ?? null;
  const playerName = player ? `${player.name} ${player.surname}` : '';
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [entries, setEntries] = useState<MatchEntry[]>([]);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [teamName, setTeamName] = useState('');
  const [, setTeamId] = useState<number | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTournamentsLoading(true);
    tournamentApi.findAll()
      .then(setTournaments)
      .catch(() => {})
      .finally(() => setTournamentsLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) { setSelectedTournamentId(''); setEntries([]); setGamesPlayed(0); setTeamName(''); setTeamId(null); }
  }, [open]);

  useEffect(() => {
    if (!selectedTournamentId || !playerId) return;
    setDataLoading(true);
    setEntries([]);
    setGamesPlayed(0);
    setTeamName('');
    setTeamId(null);

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
        const myTeamSheet: { teamId?: number; playingXi?: number[] } | undefined = teamSheetSides.find(s => s.playingXi?.includes(playerId));
        let myTeamId: number | undefined = myTeamSheet?.teamId;

        if (!myTeamId) {
          const sideWithBat = sides.find(s => s.batting?.some(b => b.playerId === playerId && b.batted));
          myTeamId = sideWithBat?.teamId;
        }

        if (!myTeamId) {
          const sideWithMyBowl = sides.find(s => s.bowling?.some(b => b.playerId === playerId));
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

        if (myTeamSheet?.playingXi?.includes(playerId)) played++;

        let resultStr: string | undefined;
        if (matchResult?.matchCompleted) {
          if (matchResult.noResult) resultStr = 'NR';
          else if (matchResult.matchDrawn) resultStr = 'D';
          else if (matchResult.winningTeamId === myTeamId) resultStr = 'W';
          else resultStr = 'L';
        }

        const entry: MatchEntry = { matchId: mid, matchDate: match.matchDate, opponent, result: resultStr };

        const batEntry = mySide?.batting?.find(b => b.playerId === playerId);
        if (batEntry?.batted) {
          entry.batting = {
            score: batEntry.score ?? 0,
            ballsFaced: batEntry.ballsFaced ?? 0,
            fours: batEntry.fours ?? 0,
            sixes: batEntry.sixes ?? 0,
            dismissed: batEntry.dismissed ?? false,
            dismissalType: batEntry.dismissalType as string | undefined,
            dots: batEntry.dots ?? 0,
          };
        }

        const bowlEntry = oppSide?.bowling?.find(b => b.playerId === playerId);
        if (bowlEntry) {
          const balls = parseOversToBalls(bowlEntry.overs);
          if (balls > 0 || (bowlEntry.wickets ?? 0) > 0) {
            entry.bowling = {
              balls,
              runs: bowlEntry.runs ?? 0,
              wickets: bowlEntry.wickets ?? 0,
              maidens: bowlEntry.maidens ?? 0,
              dots: bowlEntry.dots ?? 0,
              wides: bowlEntry.wides ?? 0,
              noBalls: bowlEntry.noBalls ?? 0,
            };
          }
        }

        if (entry.batting || entry.bowling) matchEntries.push(entry);
      }

      matchEntries.sort((a, b) => (a.matchDate ?? '').localeCompare(b.matchDate ?? ''));
      setEntries(matchEntries);
      setGamesPlayed(played);
      setTeamName(myTeamNameFound);
      setTeamId(myTeamIdFound);
    };

    load().catch(() => {}).finally(() => setDataLoading(false));
  }, [selectedTournamentId, playerId]);

  const aggregate = useMemo(() => computeAggregate(entries), [entries]);

  const squadPlayer = useMemo((): SquadPlayer | null => {
    if (!playerId || !player) return null;
    return {
      playerId,
      name: player.name ?? '',
      surname: player.surname ?? '',
      battingStance: player.battingStance,
      bowlingType: player.bowlingType,
      wicketKeeper: player.wicketKeeper,
      gamesPlayed,
    };
  }, [player, playerId, gamesPlayed]);

  const selectedTournamentName = useMemo(
    () => tournaments.find(t => t.tournamentId === selectedTournamentId)?.name ?? 'Tournament',
    [tournaments, selectedTournamentId],
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        <Leaderboard color="primary" sx={{ flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6">{playerName} — Stats</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>

      <DialogContent>
        {tournamentsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
        ) : (
          <Box>
            <FormControl sx={{ minWidth: 280, mb: 3 }} size="small">
              <InputLabel>Tournament</InputLabel>
              <Select
                value={selectedTournamentId}
                label="Tournament"
                onChange={e => {
                  setSelectedTournamentId(e.target.value as number);
                  setEntries([]);
                  setGamesPlayed(0);
                  setTeamName('');
                  setTeamId(null);
                }}
              >
                {tournaments.map(t => (
                  <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {dataLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
            )}

            {!dataLoading && selectedTournamentId && squadPlayer && entries.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No scorecard data found for {playerName} in this tournament.
              </Typography>
            )}

            {!dataLoading && squadPlayer && entries.length > 0 && (
              <PlayerDetailPanel
                player={squadPlayer}
                entries={entries}
                aggregate={aggregate}
                tournamentId={selectedTournamentId as number}
                tournamentName={selectedTournamentName}
                teamName={teamName}
                onBack={onClose}
                hideBack
              />
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
