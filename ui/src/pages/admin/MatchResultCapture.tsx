import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Divider, MenuItem, TextField,
  Switch, FormControlLabel, Alert, CircularProgress, Chip,
} from '@mui/material';
import {
  ArrowBack, Save, EmojiEvents, SportsCricket, CalendarMonth, LocationOn, Leaderboard,
} from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { Match, MatchResult, Player, MatchSide } from '../../types';

const empty: MatchResult = {
  matchCompleted: false,
  matchDrawn: false,
  decidedOnDLS: false,
  wonWithBonusPoint: false,
  scoreBattingFirst: undefined,
  wicketsLostBattingFirst: undefined,
  oversBattingFirst: '',
  scoreBattingSecond: undefined,
  wicketsLostBattingSecond: undefined,
  oversBattingSecond: '',
  matchOutcomeDescription: '',
};

export const MatchResultCapture: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<Match | null>(null);
  const [result, setResult] = useState<MatchResult>(empty);
  const [teamSheets, setTeamSheets] = useState<MatchSide[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    const id = +matchId;
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
    }).catch(() => setError('Failed to load match data.'))
      .finally(() => setLoading(false));
  }, [matchId]);

  const set = (patch: Partial<MatchResult>) => {
    setSaved(false);
    setResult(r => ({ ...r, ...patch }));
  };

  const save = async () => {
    if (!matchId) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await matchApi.saveResult(+matchId, result);
      setResult(saved);
      setSaved(true);
    } catch {
      setError('Failed to save result. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }
  if (!match) {
    return <Alert severity="error">Match not found.</Alert>;
  }

  // Build player lists for man of the match (from team sheets, fallback to all players)
  const xiPlayerIds = new Set(teamSheets.flatMap(s => s.playingXi ?? []));
  const motmPlayers: Player[] = xiPlayerIds.size > 0
    ? allPlayers.filter(p => xiPlayerIds.has(p.playerId!))
    : allPlayers;

  const teams = [
    { id: match.homeTeamId, name: match.homeTeamName },
    { id: match.oppositionTeamId, name: match.oppositionTeamName },
  ].filter(t => t.id);

  const firstInningsTeam = teams.find(t => t.id === result.sideBattingFirstId);
  const secondInningsTeam = teams.find(t => t.id !== result.sideBattingFirstId && t.id != null);

  const num = (val: number | undefined) => val ?? '';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} size="small">Back</Button>
        <Typography variant="h5">Capture Result</Typography>
      </Box>

      {/* Match summary banner */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {match.homeTeamName} <Typography component="span" color="text.secondary">vs</Typography> {match.oppositionTeamName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {match.tournamentName && (
            <Chip icon={<EmojiEvents />} label={match.tournamentName} size="small" color="primary" variant="outlined" />
          )}
          {match.matchDate && (
            <Chip icon={<CalendarMonth />} label={String(match.matchDate)} size="small" variant="outlined" />
          )}
          {match.fieldName && (
            <Chip icon={<LocationOn />} label={match.fieldName} size="small" variant="outlined" />
          )}
          {match.umpire && (
            <Chip icon={<SportsCricket />} label={`Umpire: ${match.umpire}`} size="small" variant="outlined" />
          )}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {saved && <Alert severity="success" sx={{ mb: 2 }}>Result saved successfully.</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* Match Status */}
        <Section title="Match Status">
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Switch checked={!!result.matchCompleted} onChange={e => set({ matchCompleted: e.target.checked })} color="success" />}
              label="Match Completed"
            />
            <FormControlLabel
              control={<Switch checked={!!result.matchDrawn} disabled={!result.matchCompleted} onChange={e => set({ matchDrawn: e.target.checked, winningTeamId: undefined })} />}
              label="Match Drawn"
            />
            <FormControlLabel
              control={<Switch checked={!!result.decidedOnDLS} disabled={!result.matchCompleted} onChange={e => set({ decidedOnDLS: e.target.checked })} />}
              label="Decided on DLS"
            />
            <FormControlLabel
              control={<Switch checked={!!result.wonWithBonusPoint} disabled={!result.matchCompleted || !!result.matchDrawn} onChange={e => set({ wonWithBonusPoint: e.target.checked })} />}
              label="Won with Bonus Point"
            />
          </Box>
        </Section>

        {/* Innings */}
        <Section title="Innings">
          <TextField
            select
            label="Side Batting First"
            value={result.sideBattingFirstId ?? ''}
            onChange={e => set({ sideBattingFirstId: +e.target.value })}
            disabled={!result.matchCompleted}
            sx={{ minWidth: 220, mb: 2 }}
          >
            {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>

          {/* 1st Innings */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            1st Innings{firstInningsTeam ? ` — ${firstInningsTeam.name}` : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Score" type="number" size="small" sx={{ width: 110 }}
              value={num(result.scoreBattingFirst)}
              disabled={!result.matchCompleted}
              onChange={e => set({ scoreBattingFirst: e.target.value ? +e.target.value : undefined })}
            />
            <TextField
              label="Wickets" type="number" size="small" sx={{ width: 100 }}
              value={num(result.wicketsLostBattingFirst)}
              disabled={!result.matchCompleted}
              inputProps={{ min: 0, max: 10 }}
              onChange={e => set({ wicketsLostBattingFirst: e.target.value ? +e.target.value : undefined })}
            />
            <TextField
              label="Overs" size="small" sx={{ width: 100 }}
              value={result.oversBattingFirst ?? ''}
              disabled={!result.matchCompleted}
              placeholder="e.g. 20.0"
              onChange={e => set({ oversBattingFirst: e.target.value })}
            />
          </Box>

          {/* 2nd Innings */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            2nd Innings{secondInningsTeam ? ` — ${secondInningsTeam.name}` : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Score" type="number" size="small" sx={{ width: 110 }}
              value={num(result.scoreBattingSecond)}
              disabled={!result.matchCompleted}
              onChange={e => set({ scoreBattingSecond: e.target.value ? +e.target.value : undefined })}
            />
            <TextField
              label="Wickets" type="number" size="small" sx={{ width: 100 }}
              value={num(result.wicketsLostBattingSecond)}
              disabled={!result.matchCompleted}
              inputProps={{ min: 0, max: 10 }}
              onChange={e => set({ wicketsLostBattingSecond: e.target.value ? +e.target.value : undefined })}
            />
            <TextField
              label="Overs" size="small" sx={{ width: 100 }}
              value={result.oversBattingSecond ?? ''}
              disabled={!result.matchCompleted}
              placeholder="e.g. 18.3"
              onChange={e => set({ oversBattingSecond: e.target.value })}
            />
          </Box>
        </Section>

        {/* Result */}
        <Section title="Result">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Winning Team"
              value={result.winningTeamId ?? ''}
              disabled={!result.matchCompleted || !!result.matchDrawn}
              onChange={e => set({ winningTeamId: e.target.value ? +e.target.value : undefined })}
              helperText={result.matchDrawn ? 'Not applicable for a draw' : ''}
              sx={{ maxWidth: 300 }}
            >
              <MenuItem value=""><em>— No result / abandoned —</em></MenuItem>
              {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>

            <TextField
              select
              label="Man of the Match"
              value={result.manOfTheMatchId ?? ''}
              disabled={!result.matchCompleted}
              onChange={e => set({ manOfTheMatchId: e.target.value ? +e.target.value : undefined })}
              sx={{ maxWidth: 300 }}
            >
              <MenuItem value=""><em>— None —</em></MenuItem>
              {motmPlayers.map(p => (
                <MenuItem key={p.playerId} value={p.playerId}>{p.name} {p.surname}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Match Outcome Description"
              multiline
              rows={2}
              value={result.matchOutcomeDescription ?? ''}
              disabled={!result.matchCompleted}
              onChange={e => set({ matchOutcomeDescription: e.target.value })}
              placeholder="e.g. Team A won by 32 runs"
              sx={{ maxWidth: 500 }}
            />
          </Box>
        </Section>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Result'}
          </Button>
          {saved && match?.tournamentId && (
            <Button
              variant="outlined"
              startIcon={<Leaderboard />}
              onClick={() => navigate(`/tournaments/${match.tournamentId}/standings`)}
            >
              View Updated Standings
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Typography variant="subtitle1" fontWeight={600} gutterBottom>{title}</Typography>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
);
