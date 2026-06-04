import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Divider, MenuItem, TextField,
  Switch, FormControlLabel, Alert, CircularProgress, Chip,
  Autocomplete, Collapse, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import {
  ArrowBack, Save, EmojiEvents, SportsCricket, CalendarMonth, LocationOn, Leaderboard,
  AutoFixHigh, Sync, Upload, ExpandMore, ExpandLess, Casino,
} from '@mui/icons-material';
import { useSidebarLock } from '../../context/SidebarContext';
import { useAuth } from '../../hooks/useAuth';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { tournamentApi } from '../../api/tournamentApi';
import { teamApi } from '../../api/teamApi';
import { Match, MatchResult, Player, MatchSide, TeamScorecard, TossWinner, TossDecision, Tournament, ResultVisibility } from '../../types';
import ScorecardCaptureTab from '../../components/match/ScorecardCaptureTab';

const empty: MatchResult = {
  matchCompleted: false,
  matchDrawn: false,
  forfeited: false,
  noResult: false,
  decidedOnDLS: false,
  decidedBySuperOver: false,
  wonWithBonusPoint: false,
  scoreBattingFirst: undefined,
  wicketsLostBattingFirst: undefined,
  oversBattingFirst: '',
  scoreBattingSecond: undefined,
  wicketsLostBattingSecond: undefined,
  oversBattingSecond: '',
  matchOutcomeDescription: '',
  resultVisibility: 'NOT_PUBLISHED',
};

export interface MatchResultCaptureContentProps {
  matchId: number;
  onBack: () => void;
  sticky?: boolean;
}

export const MatchResultCaptureContent: React.FC<MatchResultCaptureContentProps> = ({ matchId, onBack, sticky = true }) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [match, setMatch]         = useState<Match | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [result, setResult]       = useState<MatchResult>(empty);
  const [teamSheets, setTeamSheets] = useState<MatchSide[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [homeSquad,  setHomeSquad]  = useState<Player[]>([]);
  const [awaySquad,  setAwaySquad]  = useState<Player[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [tossOpen, setTossOpen]         = useState(true);
  const [scoresOpen, setScoresOpen]     = useState(false);
  const [resultOpen, setResultOpen]     = useState(false);
  const [dirty, setDirty]               = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [unlinkedPlayers, setUnlinkedPlayers] = useState<UnlinkedPlayer[]>([]);
  const [unlinkedDialogOpen, setUnlinkedDialogOpen] = useState(false);

  useEffect(() => {
    const id = matchId;
    Promise.all([
      matchApi.findById(id),
      matchApi.getTeamSheet(id).catch(() => [] as MatchSide[]),
      matchApi.getResult(id).catch(() => null),
      playerApi.findAll(),
    ]).then(([m, sheets, existingResult, players]) => {
      setMatch(m);
      setTeamSheets(sheets);
      setAllPlayers(players);
      if (existingResult) setResult(existingResult);
      if (m.homeTeamId)       teamApi.getSquad(m.homeTeamId).then(setHomeSquad).catch(() => {});
      if (m.oppositionTeamId) teamApi.getSquad(m.oppositionTeamId).then(setAwaySquad).catch(() => {});
      if (m.tournamentId) {
        tournamentApi.findById(m.tournamentId).then(setTournament).catch(() => null);
      }
    }).catch(() => setError('Failed to load match data.'))
      .finally(() => setLoading(false));
  }, [matchId]);

  // Derive side batting first from toss whenever toss data changes
  useEffect(() => {
    if (!match?.tossWonBy || !match?.tossDecision) return;
    const { tossWonBy, tossDecision, homeTeamId, oppositionTeamId } = match;
    const derived = tossWonBy === 'HOME'
      ? (tossDecision === 'BAT' ? homeTeamId : oppositionTeamId)
      : (tossDecision === 'BAT' ? oppositionTeamId : homeTeamId);
    if (derived) setResult(r => ({ ...r, sideBattingFirstId: derived }));
  }, [match?.tossWonBy, match?.tossDecision]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<MatchResult>) => {
    setSaved(false);
    setDirty(true);
    setResult(r => ({ ...r, ...patch }));
  };

  const setScoreCard = useCallback(
    (patch: Partial<{ teamA: TeamScorecard; teamB: TeamScorecard }>) => {
      setSaved(false);
      setDirty(true);
      setResult(r => ({ ...r, scoreCard: { ...r.scoreCard, ...patch } }));
    },
    [],
  );
  const handleFirstCardChange  = useCallback((card: TeamScorecard) => setScoreCard({ teamA: card }), [setScoreCard]);
  const handleSecondCardChange = useCallback((card: TeamScorecard) => setScoreCard({ teamB: card }), [setScoreCard]);

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        let newScoreCard: { teamA?: TeamScorecard; teamB?: TeamScorecard } | null = null;
        // Full ScorecardData: { teamA, teamB }
        if (parsed.teamA || parsed.teamB) {
          newScoreCard = { teamA: parsed.teamA ?? result.scoreCard?.teamA ?? {}, teamB: parsed.teamB ?? result.scoreCard?.teamB ?? {} };
        // Single TeamScorecard: { batting, bowling, score, … }
        } else if (parsed.batting || parsed.bowling) {
          newScoreCard = { teamA: parsed, teamB: result.scoreCard?.teamB ?? {} };
        } else {
          setImportError('Unrecognised JSON format. Expected { teamA, teamB } or a single innings object.');
        }
        if (newScoreCard) {
          set({ scoreCard: newScoreCard });
          if (match) {
            const unlinked = detectUnlinkedPlayers(newScoreCard, result, match, homeSquad, awaySquad);
            if (unlinked.length > 0) {
              setUnlinkedPlayers(unlinked);
              setUnlinkedDialogOpen(true);
            }
          }
        }
      } catch {
        setImportError('Invalid JSON file.');
      } finally {
        // reset so the same file can be re-imported if needed
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleCreateAndLink = async (index: number, player: UnlinkedPlayer) => {
    if (!match) return;
    setUnlinkedPlayers(prev => prev.map((p, i) => i === index ? { ...p, creating: true } : p));
    try {
      const parts = player.name.trim().split(/\s+/);
      const firstName = parts[0];
      const surname   = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
      const created   = await playerApi.create({ name: firstName, surname } as Player);
      await teamApi.addToSquad(player.teamId, created.playerId!);

      // Update squad + allPlayers so autocompletes reflect the new player
      if (Number(player.teamId) === Number(match.homeTeamId)) {
        setHomeSquad(prev => [...prev, created]);
      } else {
        setAwaySquad(prev => [...prev, created]);
      }
      setAllPlayers(prev => [...prev, created]);

      // Patch playerId into all matching scorecard entries
      setSaved(false);
      setDirty(true);
      setResult(r => {
        const link = <T extends { playerName?: string; playerId?: number }>(entries: T[]): T[] =>
          entries.map(e => e.playerName === player.name ? { ...e, playerId: created.playerId } : e);
        return {
          ...r,
          scoreCard: {
            teamA: { ...r.scoreCard?.teamA, batting: link(r.scoreCard?.teamA?.batting ?? []), bowling: link(r.scoreCard?.teamA?.bowling ?? []) },
            teamB: { ...r.scoreCard?.teamB, batting: link(r.scoreCard?.teamB?.batting ?? []), bowling: link(r.scoreCard?.teamB?.bowling ?? []) },
          },
        };
      });

      setUnlinkedPlayers(prev => prev.map((p, i) => i === index ? { ...p, creating: false, created: true } : p));
    } catch {
      setUnlinkedPlayers(prev => prev.map((p, i) => i === index ? { ...p, creating: false } : p));
      setError('Failed to create player. Please try again.');
    }
  };

  const handleLinkExisting = async (index: number, player: UnlinkedPlayer, existing: Player) => {
    if (!match) return;
    setUnlinkedPlayers(prev => prev.map((p, i) => i === index ? { ...p, creating: true, findMode: false } : p));
    try {
      const squad = Number(player.teamId) === Number(match.homeTeamId) ? homeSquad : awaySquad;
      const alreadyInSquad = squad.some(s => s.playerId === existing.playerId);
      if (!alreadyInSquad) {
        await teamApi.addToSquad(player.teamId, existing.playerId!);
        if (Number(player.teamId) === Number(match.homeTeamId)) {
          setHomeSquad(prev => [...prev, existing]);
        } else {
          setAwaySquad(prev => [...prev, existing]);
        }
      }

      // Patch playerId + correct the playerName in scorecard entries
      const linkedName = `${existing.name} ${existing.surname}`;
      setSaved(false);
      setDirty(true);
      setResult(r => {
        const link = <T extends { playerName?: string; playerId?: number }>(entries: T[]): T[] =>
          entries.map(e => e.playerName === player.name ? { ...e, playerId: existing.playerId, playerName: linkedName } : e);
        return {
          ...r,
          scoreCard: {
            teamA: { ...r.scoreCard?.teamA, batting: link(r.scoreCard?.teamA?.batting ?? []), bowling: link(r.scoreCard?.teamA?.bowling ?? []) },
            teamB: { ...r.scoreCard?.teamB, batting: link(r.scoreCard?.teamB?.batting ?? []), bowling: link(r.scoreCard?.teamB?.bowling ?? []) },
          },
        };
      });

      setUnlinkedPlayers(prev => prev.map((p, i) => i === index ? { ...p, creating: false, created: true } : p));
    } catch {
      setUnlinkedPlayers(prev => prev.map((p, i) => i === index ? { ...p, creating: false } : p));
      setError('Failed to link player. Please try again.');
    }
  };

  const patchMatch = (patch: Partial<Match>) => {
    setSaved(false);
    setDirty(true);
    setMatch(m => m ? { ...m, ...patch } : m);
  };

  const save = async () => {
    if (!matchId || !match) return;
    setSaving(true);
    setError(null);
    try {
      if (isAdmin) await matchApi.update(+matchId, match);
      const saved = await matchApi.saveResult(+matchId, result);
      setResult(saved);
      setSaved(true);
      setDirty(false);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (!match)  return <Alert severity="error">Match not found.</Alert>;

  const teams = [
    { id: match.homeTeamId,        name: match.homeTeamName },
    { id: match.oppositionTeamId,  name: match.oppositionTeamName },
  ].filter(t => t.id);

  const firstInningsTeam  = teams.find(t => t.id === result.sideBattingFirstId);
  const secondInningsTeam = teams.find(t => t.id !== result.sideBattingFirstId && t.id != null);

  const squadFor = (teamId?: number): Player[] => {
    if (!teamId) return [];
    if (Number(teamId) === Number(match?.homeTeamId))       return homeSquad;
    if (Number(teamId) === Number(match?.oppositionTeamId)) return awaySquad;
    return [];
  };

  const playersFor = (teamId?: number): Player[] => {
    const sheet = teamSheets.find(s => Number(s.teamId) === Number(teamId));
    if (sheet?.playingXi?.length) {
      return sheet.playingXi
        .map(id => allPlayers.find(p => p.playerId === id))
        .filter(Boolean) as Player[];
    }
    return squadFor(teamId);
  };

  const firstInningsPlayers  = playersFor(result.sideBattingFirstId);
  const secondInningsPlayers = playersFor(secondInningsTeam?.id);

  const firstCard:  TeamScorecard = result.scoreCard?.teamA ?? {};
  const secondCard: TeamScorecard = result.scoreCard?.teamB ?? {};

  const scorecardNames = Array.from(new Set([
    ...(firstCard.batting  ?? []).map(b => b.playerName),
    ...(firstCard.bowling  ?? []).map(b => b.playerName),
    ...(secondCard.batting ?? []).map(b => b.playerName),
    ...(secondCard.bowling ?? []).map(b => b.playerName),
  ].filter(Boolean) as string[]));

  const firstTeamName  = firstInningsTeam?.name  ?? result.sideBattingFirstName ?? '1st Innings';
  const secondTeamName = secondInningsTeam?.name ?? '2nd Innings';

  // DLS par score: assumes team 1 completed their innings and team 2 got reduced overs
  const dlsPar: number | null = (() => {
    if (!result.decidedOnDLS || result.scoreBattingFirst == null) return null;
    const n1 = parseOvers(result.oversBattingFirst);
    const n2 = parseOvers(result.oversBattingSecond);
    if (!n1 || !n2) return null;
    return Math.round(result.scoreBattingFirst * dlsResourcePct(n2, 0) / dlsResourcePct(n1, 0));
  })();

  const calculateOutcome = (): string | null => {
    if (!result.matchCompleted) return 'Match Abandoned';
    if (result.matchDrawn) return 'Match drawn';
    const { scoreBattingFirst, scoreBattingSecond, wicketsLostBattingSecond, sideBattingFirstId, winningTeamId, decidedOnDLS, decidedBySuperOver } = result;
    if (!winningTeamId || scoreBattingFirst == null || scoreBattingSecond == null) return null;
    const winnerName = teams.find(t => t.id === winningTeamId)?.name ?? 'Unknown';
    let description: string;
    if (decidedBySuperOver) {
      description = `${winnerName} won (Super Over)`;
    } else if (winningTeamId === sideBattingFirstId) {
      const margin = scoreBattingFirst - scoreBattingSecond;
      description = `${winnerName} won by ${margin} run${margin !== 1 ? 's' : ''}`;
    } else {
      const wicketsLeft = 10 - (wicketsLostBattingSecond ?? 0);
      description = `${winnerName} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
    }
    return decidedOnDLS ? `${description} (DLS)` : description;
  };

  const num = (val: number | undefined) => val ?? '';

  const handleAutoCalculate = () => {
    const { scoreBattingFirst, scoreBattingSecond, wicketsLostBattingSecond } = result;

    if (result.decidedOnDLS && dlsPar != null && scoreBattingSecond != null) {
      const firstTeam  = teams.find(t => t.id === result.sideBattingFirstId);
      const secondTeam = teams.find(t => t.id !== result.sideBattingFirstId);
      if (scoreBattingSecond > dlsPar) {
        const wicketsLeft = 10 - (wicketsLostBattingSecond ?? 0);
        const runMargin   = scoreBattingSecond - dlsPar;
        const desc = (wicketsLeft > 0 && (wicketsLostBattingSecond ?? 0) < 10)
          ? `${secondTeam?.name} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''} (DLS)`
          : `${secondTeam?.name} won by ${runMargin} run${runMargin !== 1 ? 's' : ''} (DLS)`;
        set({ winningTeamId: secondTeam?.id, matchOutcomeDescription: desc });
      } else if (scoreBattingSecond < dlsPar) {
        const margin = dlsPar - scoreBattingSecond;
        set({ winningTeamId: firstTeam?.id, matchOutcomeDescription: `${firstTeam?.name} won by ${margin} run${margin !== 1 ? 's' : ''} (DLS)` });
      } else {
        set({ matchDrawn: true, winningTeamId: undefined, matchOutcomeDescription: 'Match drawn (DLS)' });
      }
      return;
    }

    if (scoreBattingFirst == null || scoreBattingSecond == null) {
      const outcome = calculateOutcome();
      if (outcome) set({ matchOutcomeDescription: outcome });
      return;
    }

    const firstTeam  = teams.find(t => t.id === result.sideBattingFirstId);
    const secondTeam = teams.find(t => t.id !== result.sideBattingFirstId);
    const superOver  = result.decidedBySuperOver ? ' (Super Over)' : '';
    const bonusEligible = !result.decidedBySuperOver;
    const hasBonusPoint = (winnerScore: number, loserScore: number) =>
      bonusEligible && loserScore > 0 && (winnerScore - loserScore) > 0.8 * loserScore;

    if (scoreBattingFirst === scoreBattingSecond) {
      set({ matchDrawn: true, winningTeamId: undefined, matchOutcomeDescription: 'Match drawn' });
    } else if (scoreBattingFirst > scoreBattingSecond) {
      const margin = scoreBattingFirst - scoreBattingSecond;
      set({ winningTeamId: firstTeam?.id, wonWithBonusPoint: hasBonusPoint(scoreBattingFirst, scoreBattingSecond), matchOutcomeDescription: `${firstTeam?.name} won by ${margin} run${margin !== 1 ? 's' : ''}${superOver}` });
    } else {
      const wicketsLeft = 10 - (wicketsLostBattingSecond ?? 0);
      set({ winningTeamId: secondTeam?.id, wonWithBonusPoint: hasBonusPoint(scoreBattingSecond, scoreBattingFirst), matchOutcomeDescription: `${secondTeam?.name} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}${superOver}` });
    }
  };

  // ── DEV ONLY: simulate a fictional result ────────────────────────────────────
  const simulateResult = () => {
    const maxOvers = (() => {
      const fmt = tournament?.cricketFormat ?? '';
      const n = parseInt(fmt.replace('T', ''), 10);
      return isNaN(n) ? 20 : n;
    })();

    const tossWonBy: TossWinner      = Math.random() < 0.5 ? 'HOME' : 'OPPOSITION';
    const tossDecision: TossDecision = Math.random() < 0.5 ? 'BAT' : 'BOWL';

    const batFirstId  = tossWonBy === 'HOME'
      ? (tossDecision === 'BAT' ? match.homeTeamId : match.oppositionTeamId)
      : (tossDecision === 'BAT' ? match.oppositionTeamId : match.homeTeamId);
    const batSecondId = batFirstId === match.homeTeamId ? match.oppositionTeamId : match.homeTeamId;

    const fullOvers = (max: number) => `${max}.0`;
    const partialOvers = (max: number) => {
      const o = Math.floor(Math.random() * (max - 1)) + 1;
      const b = Math.floor(Math.random() * 6);
      return `${o}.${b}`;
    };

    const minRPO = 4.5, maxRPO = 9.0;
    const score1 = Math.round((Math.random() * (maxRPO - minRPO) + minRPO) * maxOvers);
    const wkts1  = Math.floor(Math.random() * 11);

    const secondWins = Math.random() < 0.4;
    const score2 = secondWins
      ? score1 + Math.floor(Math.random() * 30) + 1
      : Math.max(0, score1 - Math.floor(Math.random() * 60));
    const wkts2  = secondWins ? Math.floor(Math.random() * 9) + 1 : 10;
    const overs2 = secondWins ? partialOvers(maxOvers) : fullOvers(maxOvers);

    const firstName  = (batFirstId  === match.homeTeamId ? match.homeTeamName  : match.oppositionTeamName) ?? 'Team A';
    const secondName = (batSecondId === match.homeTeamId ? match.homeTeamName  : match.oppositionTeamName) ?? 'Team B';

    let winningTeamId: number | undefined;
    let matchDrawn = false;
    let outcome: string;
    if (score1 > score2) {
      winningTeamId = batFirstId;
      const margin = score1 - score2;
      outcome = `${firstName} won by ${margin} run${margin !== 1 ? 's' : ''}`;
    } else if (score2 > score1) {
      winningTeamId = batSecondId;
      const left = 10 - wkts2;
      outcome = `${secondName} won by ${left} wicket${left !== 1 ? 's' : ''}`;
    } else {
      matchDrawn = true;
      outcome = 'Match drawn';
    }

    // Resolve player lists for each innings directly (before result state updates)
    const p1 = playersFor(batFirstId);   // team batting first
    const p2 = playersFor(batSecondId);  // team batting second

    const scoreCard: { teamA: TeamScorecard; teamB: TeamScorecard } = {
      // teamA = first innings: p1 bat, p2 bowl
      teamA: {
        teamId:  batFirstId,
        score:   score1,
        wickets: wkts1,
        overs:   fullOvers(maxOvers),
        batting: simBatting(p1, score1, wkts1),
        bowling: simBowling(p2, score1, wkts1, maxOvers),
      },
      // teamB = second innings: p2 bat, p1 bowl
      teamB: {
        teamId:  batSecondId,
        score:   score2,
        wickets: wkts2,
        overs:   overs2,
        batting: simBatting(p2, score2, wkts2),
        bowling: simBowling(p1, score2, wkts2, maxOvers),
      },
    };

    patchMatch({ tossWonBy, tossDecision });
    set({
      matchCompleted: true,
      matchDrawn,
      forfeited: false,
      noResult: false,
      sideBattingFirstId: batFirstId,
      scoreBattingFirst:        score1,
      wicketsLostBattingFirst:  wkts1,
      oversBattingFirst:        fullOvers(maxOvers),
      scoreBattingSecond:       score2,
      wicketsLostBattingSecond: wkts2,
      oversBattingSecond:       overs2,
      winningTeamId,
      matchOutcomeDescription: outcome,
      resultVisibility: 'NOT_PUBLISHED',
      scoreCard,
    });

    setTossOpen(true);
    setScoresOpen(true);
    setResultOpen(true);
    setScorecardOpen(true);
  };

  const simulateButton = (
    <Button
      variant="outlined"
      size="small"
      color="warning"
      startIcon={<Casino />}
      onClick={simulateResult}
      title="DEV ONLY — generates a fictional result"
    >
      Simulate
    </Button>
  );

  const saveButton = (
    <Button
      variant="contained"
      startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
      onClick={save}
      disabled={saving}
    >
      {saving ? 'Saving…' : 'Save'}
    </Button>
  );

  const syncScorecardButton = (
    <Button
      variant="outlined"
      size="small"
      startIcon={<Sync />}
      disabled={!result.sideBattingFirstId || !!result.forfeited}
      onClick={() => {
        set({
          scoreBattingFirst:        firstCard.score,
          wicketsLostBattingFirst:  firstCard.wickets,
          oversBattingFirst:        firstCard.overs ?? '',
          scoreBattingSecond:       secondCard.score,
          wicketsLostBattingSecond: secondCard.wickets,
          oversBattingSecond:       secondCard.overs ?? '',
        });
        setTossOpen(false);
        setScoresOpen(true);
        setResultOpen(false);
      }}
    >
      Scorecard
    </Button>
  );

  const autoCalculateButton = (
    <Button
      variant="outlined"
      size="small"
      startIcon={<AutoFixHigh />}
      disabled={!!result.forfeited || !!result.noResult}
      onClick={() => { handleAutoCalculate(); setTossOpen(false); setScoresOpen(false); setResultOpen(true); }}
    >
      Result
    </Button>
  );

  const viewStandingsButton = saved && match?.tournamentId ? (
    <Button variant="outlined" size="small" startIcon={<Leaderboard />} onClick={() => navigate(`/tournaments/${match.tournamentId}/standings`)}>
      View Standings
    </Button>
  ) : null;

  return (
    <Box>
      {/* Header — hidden when embedded (sticky=false) */}
      {sticky && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button startIcon={<ArrowBack />} onClick={() => dirty ? setConfirmLeave(true) : onBack()}>Back to Results</Button>
          <Typography variant="h5" sx={{ flex: 1 }}>Capture Result</Typography>
          {saveButton}
        </Box>
      )}

      <Dialog open={confirmLeave} onClose={() => setConfirmLeave(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <DialogContentText>You have unsaved changes. Would you like to save before leaving?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmLeave(false)}>Cancel</Button>
          <Button color="error" onClick={() => { setConfirmLeave(false); onBack(); }}>Discard</Button>
          <Button variant="contained" onClick={async () => { await save(); onBack(); }}>Save & Leave</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={unlinkedDialogOpen} onClose={() => setUnlinkedDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Unlinked Players Found</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            The following players from the imported scorecard are not in their team's squad. Create them as new players, or find an existing player if the name differs.
          </DialogContentText>
          {unlinkedPlayers.map((p, i) => (
            <Box key={i} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ flex: 1 }}>{p.name}</Typography>
                <Chip label={p.teamName} size="small" variant="outlined" />
                {p.created ? (
                  <Chip label="Linked" color="success" size="small" />
                ) : p.creating ? (
                  <CircularProgress size={20} />
                ) : p.findMode ? null : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => handleCreateAndLink(i, p)}>
                      Create & Link
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setUnlinkedPlayers(prev => prev.map((x, j) => j === i ? { ...x, findMode: true } : x))}
                    >
                      Find Player
                    </Button>
                  </Box>
                )}
              </Box>
              {p.findMode && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                  <Autocomplete
                    options={allPlayers}
                    getOptionLabel={op => `${op.name} ${op.surname}`}
                    size="small"
                    sx={{ flex: 1 }}
                    onChange={(_, val) => { if (val) handleLinkExisting(i, p, val as Player); }}
                    renderInput={params => <TextField {...params} label="Search existing players" size="small" />}
                  />
                  <Button
                    size="small"
                    onClick={() => setUnlinkedPlayers(prev => prev.map((x, j) => j === i ? { ...x, findMode: false } : x))}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlinkedDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Sticky banner — full version when standalone, compact action bar when embedded */}
      {sticky ? (
        <Box sx={{ position: 'sticky', top: { xs: 56, sm: 64 }, zIndex: 10, bgcolor: 'background.default', mb: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {match.homeTeamName} <Typography component="span" color="text.secondary">vs</Typography> {match.oppositionTeamName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {match.tournamentName      && <Chip icon={<EmojiEvents />}    label={match.tournamentName}            size="small" color="primary" variant="outlined" />}
                  {match.matchDate           && <Chip icon={<CalendarMonth />}  label={String(match.matchDate)}          size="small" variant="outlined" />}
                  {match.fieldName           && <Chip icon={<LocationOn />}     label={match.fieldName}                  size="small" variant="outlined" />}
                  {match.umpire              && <Chip icon={<SportsCricket />}  label={`Umpire: ${match.umpire}`}        size="small" variant="outlined" />}
                  {tournament?.cricketFormat && <Chip icon={<SportsCricket />}  label={tournament.cricketFormat}         size="small" variant="outlined" />}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {simulateButton}
                {syncScorecardButton}
                {autoCalculateButton}
                {viewStandingsButton}
              </Box>
            </Box>
          </Paper>
        </Box>
      ) : (
        /* Embedded: compact action row — no match info (already shown in parent header) */
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
          {simulateButton}
          {syncScorecardButton}
          {autoCalculateButton}
          {viewStandingsButton}
          <Box sx={{ flex: 1 }} />
          {saveButton}
        </Box>
      )}

      {error && <Alert severity="error"   sx={{ mb: 2 }}>{error}</Alert>}
      {saved  && <Alert severity="success" sx={{ mb: 2 }}>Result saved successfully.</Alert>}

      {/* ── Match Details ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          <Section title="Match Status">
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={<Switch checked={!!result.matchCompleted} disabled={!!result.forfeited || !!result.noResult} onChange={e => set({ matchCompleted: e.target.checked })} color="success" />}
                label="Match Completed"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={!!result.forfeited}
                    color="warning"
                    onChange={e => {
                      if (e.target.checked) {
                        set({ forfeited: true, noResult: false, matchCompleted: true, matchDrawn: false, decidedOnDLS: false, decidedBySuperOver: false, wonWithBonusPoint: false, winningTeamId: undefined, matchOutcomeDescription: '' });
                      } else {
                        set({ forfeited: false });
                      }
                    }}
                  />
                }
                label="Forfeited"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={!!result.noResult}
                    color="warning"
                    onChange={e => {
                      if (e.target.checked) {
                        set({ noResult: true, forfeited: false, matchCompleted: true, matchDrawn: false, decidedOnDLS: false, decidedBySuperOver: false, wonWithBonusPoint: false, winningTeamId: undefined, matchOutcomeDescription: 'Match Abandoned' });
                      } else {
                        set({ noResult: false, matchCompleted: false, matchOutcomeDescription: '' });
                      }
                    }}
                  />
                }
                label="No Result"
              />
              <FormControlLabel
                control={<Switch checked={!!result.matchDrawn} disabled={!!result.forfeited || !!result.noResult || !result.matchCompleted || !!result.decidedBySuperOver} onChange={e => set({ matchDrawn: e.target.checked, winningTeamId: undefined })} />}
                label="Match Drawn"
              />
              <FormControlLabel
                control={<Switch checked={!!result.decidedOnDLS} disabled={!!result.forfeited || !!result.noResult || !result.matchCompleted || !!result.decidedBySuperOver} onChange={e => set({ decidedOnDLS: e.target.checked })} />}
                label="Decided on DLS"
              />
              <FormControlLabel
                control={<Switch checked={!!result.decidedBySuperOver} disabled={!!result.forfeited || !!result.noResult || !result.matchCompleted} onChange={e => set({ decidedBySuperOver: e.target.checked, wonWithBonusPoint: false, matchDrawn: false, decidedOnDLS: false })} />}
                label="Super Over"
              />
              <FormControlLabel
                control={<Switch checked={!!result.wonWithBonusPoint} disabled={!!result.forfeited || !!result.noResult || !result.matchCompleted || !!result.matchDrawn || !!result.decidedBySuperOver} onChange={e => set({ wonWithBonusPoint: e.target.checked })} />}
                label="Won with Bonus Point"
              />
            </Box>
          </Section>

          <Section title="Toss" collapsible open={tossOpen} onToggle={() => setTossOpen(o => !o)}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                select label="Toss Won By" value={match.tossWonBy ?? ''}
                disabled={!!result.forfeited || !!result.noResult}
                onChange={e => patchMatch({ tossWonBy: e.target.value as TossWinner || undefined })}
                fullWidth
              >
                <MenuItem value=""><em>— Unknown —</em></MenuItem>
                <MenuItem value="HOME">{match.homeTeamName ?? 'Home Team'}</MenuItem>
                <MenuItem value="OPPOSITION">{match.oppositionTeamName ?? 'Opposition'}</MenuItem>
              </TextField>
              <TextField
                select label="Toss Decision" value={match.tossDecision ?? ''}
                disabled={!!result.forfeited || !!result.noResult}
                onChange={e => patchMatch({ tossDecision: e.target.value as TossDecision || undefined })}
                fullWidth
              >
                <MenuItem value=""><em>— Unknown —</em></MenuItem>
                <MenuItem value="BAT">Decided to bat first</MenuItem>
                <MenuItem value="BOWL">Decided to bowl first</MenuItem>
              </TextField>
            </Box>
          </Section>

          <Section title="Scores" collapsible open={scoresOpen} onToggle={() => setScoresOpen(o => !o)}>
            {result.sideBattingFirstId
              ? <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={`Batting first: ${teams.find(t => t.id === result.sideBattingFirstId)?.name ?? '—'}`} color="primary" variant="outlined" />
                  <Chip label={`Batting second: ${teams.find(t => t.id !== result.sideBattingFirstId)?.name ?? '—'}`} color="secondary" variant="outlined" />
                </Box>
              : <Alert severity="warning" sx={{ mb: 2, maxWidth: 420 }}>Set the toss in the Toss section to determine who bats first.</Alert>
            }

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              1st Innings{firstInningsTeam ? ` — ${firstInningsTeam.name}` : ''}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 2 }}>
              <TextField label="Score"   type="number" size="small" fullWidth value={num(result.scoreBattingFirst)}          disabled={!result.matchCompleted || !!result.forfeited} onChange={e => set({ scoreBattingFirst:          e.target.value ? +e.target.value : undefined })} />
              <TextField label="Wickets" type="number" size="small" fullWidth value={num(result.wicketsLostBattingFirst)}     disabled={!result.matchCompleted || !!result.forfeited} inputProps={{ min: 0, max: 10 }} onChange={e => set({ wicketsLostBattingFirst:  e.target.value ? +e.target.value : undefined })} />
              <TextField label="Overs"              size="small" fullWidth value={result.oversBattingFirst ?? ''}          disabled={!result.matchCompleted || !!result.forfeited} placeholder="e.g. 20.0" onChange={e => set({ oversBattingFirst: e.target.value })} />
            </Box>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              2nd Innings{secondInningsTeam ? ` — ${secondInningsTeam.name}` : ''}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              <TextField label="Score"   type="number" size="small" fullWidth value={num(result.scoreBattingSecond)}         disabled={!result.matchCompleted || !!result.forfeited} onChange={e => set({ scoreBattingSecond:         e.target.value ? +e.target.value : undefined })} />
              <TextField label="Wickets" type="number" size="small" fullWidth value={num(result.wicketsLostBattingSecond)}    disabled={!result.matchCompleted || !!result.forfeited} inputProps={{ min: 0, max: 10 }} onChange={e => set({ wicketsLostBattingSecond: e.target.value ? +e.target.value : undefined })} />
              <TextField label="Overs"              size="small" fullWidth value={result.oversBattingSecond ?? ''}         disabled={!result.matchCompleted || !!result.forfeited} placeholder="e.g. 18.3" onChange={e => set({ oversBattingSecond: e.target.value })} />
            </Box>
          </Section>

          <Section title="Match Result" collapsible open={resultOpen} onToggle={() => setResultOpen(o => !o)}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Three dropdowns in a row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                <TextField
                  select label="Winning Team" value={result.winningTeamId ?? ''}
                  disabled={!result.matchCompleted || !!result.matchDrawn}
                  onChange={e => {
                    const id = e.target.value ? +e.target.value : undefined;
                    if (result.forfeited) {
                      const name = teams.find(t => t.id === id)?.name ?? '';
                      set({ winningTeamId: id, matchOutcomeDescription: id ? `${name} won` : '' });
                    } else {
                      set({ winningTeamId: id });
                    }
                  }}
                  helperText={result.matchDrawn ? 'Not applicable for a draw' : result.forfeited ? 'Select the team that was awarded the win' : ''}
                >
                  <MenuItem value=""><em>— No result / abandoned —</em></MenuItem>
                  {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </TextField>
                <Autocomplete
                  freeSolo
                  disabled={!result.matchCompleted || !!result.forfeited}
                  options={scorecardNames}
                  inputValue={result.manOfTheMatchName ?? ''}
                  onInputChange={(_, val, reason) => {
                    if (reason === 'reset') return;
                    set({ manOfTheMatchName: val || undefined, manOfTheMatchId: undefined });
                  }}
                  onChange={(_, val) => {
                    set({ manOfTheMatchName: (val as string) || undefined, manOfTheMatchId: undefined });
                  }}
                  renderInput={params => <TextField {...params} label="Man of the Match" />}
                />
                <TextField
                  select
                  label="Publish Result"
                  value={result.resultVisibility ?? 'NOT_PUBLISHED'}
                  onChange={e => set({ resultVisibility: e.target.value as ResultVisibility })}
                >
                  <MenuItem value="NOT_PUBLISHED">Do Not Publish Result</MenuItem>
                  <MenuItem value="SUMMARY_ONLY">Make Summary Available</MenuItem>
                  <MenuItem value="SCORECARD_AND_SUMMARY">Make Scorecard and Summary Available</MenuItem>
                </TextField>
              </Box>

              {result.decidedOnDLS && (
                <Alert
                  severity={dlsPar == null ? 'warning' : 'info'}
                  sx={{ maxWidth: 500 }}
                >
                  {dlsPar == null
                    ? 'Enter 1st and 2nd innings overs to calculate the DLS par score.'
                    : (() => {
                        const s2 = result.scoreBattingSecond;
                        const margin = s2 != null ? s2 - dlsPar : null;
                        const verdict = margin == null ? '' : margin > 0 ? ` — surpassed par by ${margin}` : margin === 0 ? ' — level on par' : ` — fell ${Math.abs(margin)} short of par`;
                        return <>DLS Par Score: <strong>{dlsPar}</strong>{verdict}</>;
                      })()
                  }
                </Alert>
              )}

              {/* Description spans the full width of the 3-column grid */}
              <TextField
                label="Match Outcome Description" multiline rows={2}
                value={result.matchOutcomeDescription ?? ''}
                disabled={!result.matchCompleted || !!result.forfeited}
                onChange={e => set({ matchOutcomeDescription: e.target.value })}
                placeholder="e.g. Team A won by 32 runs"
              />
            </Box>
          </Section>
        </Box>

      {/* ── Scorecard (collapsed by default) ── */}
      <Section title="Scorecard" collapsible open={scorecardOpen} onToggle={() => setScorecardOpen(o => !o)}>
        <input
          ref={importFileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleImportJson}
        />
        {!result.sideBattingFirstId && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Set the toss in the Toss section above before capturing the scorecard.
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          {isAdmin && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Upload />}
              disabled={!!result.forfeited}
              onClick={() => { setImportError(null); importFileRef.current?.click(); }}
            >
              Import Scorecard JSON
            </Button>
          )}
          {importError && (
            <Alert severity="error" onClose={() => setImportError(null)} sx={{ py: 0 }}>
              {importError}
            </Alert>
          )}
        </Box>
        <ScorecardCaptureTab
          firstInningsLabel={`1st Innings — ${firstTeamName} batting`}
          secondInningsLabel={`2nd Innings — ${secondTeamName} batting`}
          firstCard={firstCard}
          secondCard={secondCard}
          firstBatterOptions={firstInningsPlayers}
          firstBowlerOptions={secondInningsPlayers}
          secondBatterOptions={secondInningsPlayers}
          secondBowlerOptions={firstInningsPlayers}
          disabled={!result.sideBattingFirstId || !!result.forfeited}
          onFirstCardChange={handleFirstCardChange}
          onSecondCardChange={handleSecondCardChange}
        />
      </Section>

      {/* ── Bottom save bar ── */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
        {simulateButton}
        {syncScorecardButton}
        {autoCalculateButton}
        {saveButton}
      </Box>

    </Box>
  );
};


// ── Scorecard simulation helpers ─────────────────────────────────────────────

const SIM_DISMISSALS = ['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED'] as const;
const SIM_DISMISSAL_WEIGHTS = [30, 45, 15, 7, 3];

function simDismissal(): string {
  const total = SIM_DISMISSAL_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SIM_DISMISSALS.length; i++) {
    r -= SIM_DISMISSAL_WEIGHTS[i];
    if (r <= 0) return SIM_DISMISSALS[i];
  }
  return 'BOWLED';
}

function simBatting(players: Player[], totalRuns: number, wickets: number): import('../../types').BattingEntry[] {
  if (players.length === 0) return [];
  const n = Math.min(players.length, 11);
  const batsmanCount = Math.min(wickets + 2, n);

  // descending weights — earlier batters get more runs
  const weights = Array.from({ length: batsmanCount }, (_, i) =>
    Math.max(0.3, (batsmanCount - i) * 1.5 + Math.random() * 2),
  );
  const weightTotal = weights.reduce((a, b) => a + b, 0);

  const entries: import('../../types').BattingEntry[] = [];
  let runsAssigned = 0;

  for (let i = 0; i < n; i++) {
    const p = players[i];
    const dismissed = i < wickets;
    const batted   = i < batsmanCount;

    if (!batted) {
      entries.push({ playerId: p.playerId, playerName: `${p.name} ${p.surname}`, battingPosition: i + 1, batted: false, score: 0, ballsFaced: 0, dismissed: false });
      continue;
    }

    const isLast = i === batsmanCount - 1;
    let score: number;
    if (isLast) {
      score = Math.max(0, totalRuns - runsAssigned);
    } else {
      const base = Math.round((weights[i] / weightTotal) * totalRuns);
      const jitter = Math.floor((Math.random() - 0.5) * base * 0.4);
      const cap = totalRuns - runsAssigned - (batsmanCount - i - 1);
      score = Math.max(0, Math.min(base + jitter, cap));
    }
    runsAssigned += score;

    const sr = 0.7 + Math.random() * 0.8;
    const balls = Math.max(score === 0 ? 1 : score, Math.round(score / sr));
    const fours = Math.max(0, Math.floor(score / 12 * Math.random() * 1.5));
    const sixes  = Math.max(0, Math.floor(score / 20 * Math.random()));
    const dots   = Math.max(0, balls - Math.ceil(score / 1.1));

    entries.push({
      playerId: p.playerId,
      playerName: `${p.name} ${p.surname}`,
      battingPosition: i + 1,
      batted: true,
      score,
      ballsFaced: balls,
      fours,
      sixes,
      dots,
      dismissed,
      dismissalType: dismissed ? simDismissal() : undefined,
      topPerformer: i < batsmanCount && score === Math.max(...entries.filter(e => e.batted).map(e => e.score ?? 0), score),
    });
  }
  return entries;
}

function simBowling(players: Player[], totalRuns: number, wickets: number, maxOvers: number): import('../../types').BowlingEntry[] {
  if (players.length === 0) return [];
  const numBowlers = Math.min(players.length, Math.floor(Math.random() * 3) + 4);
  const selected = [...players].sort(() => Math.random() - 0.5).slice(0, numBowlers);
  const maxBallsPerBowler = Math.ceil(maxOvers / 5) * 6;

  let ballsLeft   = maxOvers * 6;
  let runsLeft    = totalRuns;
  let wicketsLeft = wickets;

  return selected.map((p, i) => {
    const isLast = i === selected.length - 1;

    const fairBalls = Math.round(ballsLeft / (selected.length - i));
    const rawBalls  = isLast ? ballsLeft : Math.round(fairBalls * (0.7 + Math.random() * 0.6));
    const allocBalls = Math.min(rawBalls, maxBallsPerBowler, ballsLeft);
    // round to complete overs unless last bowler
    const useBalls = isLast ? allocBalls : Math.floor(allocBalls / 6) * 6;
    ballsLeft -= useBalls;

    const wkts = isLast ? wicketsLeft : (Math.random() < 0.45 ? Math.floor(Math.random() * Math.min(3, wicketsLeft + 1)) : 0);
    wicketsLeft = Math.max(0, wicketsLeft - wkts);

    const economy  = 4 + Math.random() * 5;
    const runsRaw  = Math.round((useBalls / 6) * economy);
    const runsAlloc = isLast ? Math.max(0, runsLeft) : Math.min(runsRaw, Math.max(0, runsLeft));
    runsLeft -= runsAlloc;

    const overs   = `${Math.floor(useBalls / 6)}.${useBalls % 6}`;
    const maidens = useBalls >= 12 && runsAlloc < 4 ? 1 : 0;

    return {
      playerId: p.playerId,
      playerName: `${p.name} ${p.surname}`,
      overs,
      runs:    Math.max(0, runsAlloc),
      wickets: Math.max(0, wkts),
      maidens,
      wides:   Math.floor(Math.random() * 3),
      noBalls: Math.random() < 0.25 ? 1 : 0,
      dots:    Math.max(0, useBalls - Math.ceil(runsAlloc / 1.3)),
      topPerformer: wkts >= 3,
    };
  });
}

// ── Route wrapper (reads URL params, locks sidebar) ──────────────────────────

export const MatchResultCapture: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  useSidebarLock();
  if (!matchId) return null;
  return <MatchResultCaptureContent matchId={+matchId} onBack={() => navigate(-1)} />;
};

// ── DLS calculation ──────────────────────────────────────────────────────────

// Standard DLS resource parameters (published approximation)
const DLS_PARAMS = [
  { z0: 100.0, b: 0.07645 }, // 0 wickets lost
  { z0: 93.4,  b: 0.08717 }, // 1
  { z0: 85.1,  b: 0.10558 }, // 2
  { z0: 74.9,  b: 0.13145 }, // 3
  { z0: 62.4,  b: 0.17185 }, // 4
  { z0: 49.0,  b: 0.20612 }, // 5
  { z0: 34.9,  b: 0.26954 }, // 6
  { z0: 22.8,  b: 0.34006 }, // 7
  { z0: 11.9,  b: 0.46341 }, // 8
  { z0: 4.7,   b: 0.68813 }, // 9
];

function dlsResourcePct(overs: number, wicketsLost: number): number {
  const w = Math.min(Math.max(Math.floor(wicketsLost), 0), 9);
  const { z0, b } = DLS_PARAMS[w];
  return z0 * (1 - Math.exp(-b * overs));
}

// Cricket overs notation: "18.3" = 18 overs + 3 balls = 18.5 decimal overs
function parseOvers(s: string | undefined): number | null {
  if (!s) return null;
  const [whole, balls = '0'] = s.split('.');
  const w = parseInt(whole, 10);
  const b = parseInt(balls, 10);
  if (isNaN(w) || isNaN(b) || b > 5) return null;
  return w + b / 6;
}

// ── Unlinked player detection ────────────────────────────────────────────────

interface UnlinkedPlayer {
  name: string;
  teamId: number;
  teamName: string;
  creating: boolean;
  created: boolean;
  findMode: boolean;
}

function detectUnlinkedPlayers(
  scoreCard: { teamA?: TeamScorecard; teamB?: TeamScorecard },
  result: MatchResult,
  match: Match,
  homeSquad: Player[],
  awaySquad: Player[],
): UnlinkedPlayer[] {
  const firstTeamId  = result.sideBattingFirstId ?? match.homeTeamId;
  const secondTeamId = Number(firstTeamId) === Number(match.homeTeamId) ? match.oppositionTeamId : match.homeTeamId;

  const getSquad = (id?: number) => {
    if (!id) return [];
    return Number(id) === Number(match.homeTeamId) ? homeSquad : awaySquad;
  };

  const firstSquadNames  = new Set(getSquad(firstTeamId).map(p => `${p.name} ${p.surname}`));
  const secondSquadNames = new Set(getSquad(secondTeamId).map(p => `${p.name} ${p.surname}`));

  // First team: batters in teamA innings + bowlers in teamB innings
  const firstTeamNames = new Set([
    ...(scoreCard.teamA?.batting ?? []).map(b => b.playerName).filter(Boolean) as string[],
    ...(scoreCard.teamB?.bowling ?? []).map(b => b.playerName).filter(Boolean) as string[],
  ]);

  // Second team: batters in teamB innings + bowlers in teamA innings
  const secondTeamNames = new Set([
    ...(scoreCard.teamB?.batting ?? []).map(b => b.playerName).filter(Boolean) as string[],
    ...(scoreCard.teamA?.bowling ?? []).map(b => b.playerName).filter(Boolean) as string[],
  ]);

  const firstTeamName  = Number(firstTeamId)  === Number(match.homeTeamId) ? match.homeTeamName  : match.oppositionTeamName;
  const secondTeamName = Number(secondTeamId) === Number(match.homeTeamId) ? match.homeTeamName  : match.oppositionTeamName;

  const unlinked: UnlinkedPlayer[] = [];
  for (const name of firstTeamNames) {
    if (!firstSquadNames.has(name) && firstTeamId) {
      unlinked.push({ name, teamId: firstTeamId, teamName: firstTeamName ?? 'Team A', creating: false, created: false, findMode: false });
    }
  }
  for (const name of secondTeamNames) {
    if (!secondSquadNames.has(name) && secondTeamId) {
      unlinked.push({ name, teamId: secondTeamId, teamName: secondTeamName ?? 'Team B', creating: false, created: false, findMode: false });
    }
  }

  // Deduplicate
  return unlinked.filter((p, i) => unlinked.findIndex(x => x.name === p.name && x.teamId === p.teamId) === i);
}

// ── Section ──────────────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean; open?: boolean; onToggle?: () => void }> = ({ title, children, collapsible, defaultOpen = true, open: controlledOpen, onToggle }) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const prevOpen = useRef(open);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = isControlled ? onToggle : () => setInternalOpen(o => !o);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
    prevOpen.current = open;
  }, [open]);

  return (
    <Paper ref={ref} variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: open ? 0 : undefined, cursor: collapsible ? 'pointer' : undefined }} onClick={collapsible ? toggle : undefined}>
        <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
        {collapsible && (
          <IconButton size="small" onClick={e => { e.stopPropagation(); toggle?.(); }}>
            {open ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
      </Box>
      <Collapse in={!collapsible || open}>
        <Divider sx={{ my: 2 }} />
        {children}
      </Collapse>
    </Paper>
  );
};
