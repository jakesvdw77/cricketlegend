import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Divider, MenuItem, TextField,
  Switch, FormControlLabel, Alert, CircularProgress, Chip,
  Tabs, Tab, IconButton, Autocomplete,
} from '@mui/material';
import {
  ArrowBack, Save, EmojiEvents, SportsCricket, CalendarMonth, LocationOn, Leaderboard,
  Add, Delete, ContentCopy, Check, Refresh,
} from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { tournamentApi } from '../../api/tournamentApi';
import { Match, MatchResult, Player, MatchSide, BattingEntry, BowlingEntry, TeamScorecard, TossWinner, TossDecision, Tournament } from '../../types';

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
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [result, setResult] = useState<MatchResult>(empty);
  const [teamSheets, setTeamSheets] = useState<MatchSide[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [summaryText, setSummaryText] = useState('');
  const [copied, setCopied] = useState(false);

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
      if (m.tournamentId) {
        tournamentApi.findById(m.tournamentId).then(setTournament).catch(() => null);
      }
    }).catch(() => setError('Failed to load match data.'))
      .finally(() => setLoading(false));
  }, [matchId]);

  const set = (patch: Partial<MatchResult>) => {
    setSaved(false);
    setResult(r => ({ ...r, ...patch }));
  };

  const setScoreCard = (patch: Partial<{ teamA: TeamScorecard; teamB: TeamScorecard }>) =>
    set({ scoreCard: { ...result.scoreCard, ...patch } });

  const patchMatch = (patch: Partial<Match>) => {
    setSaved(false);
    setMatch(m => m ? { ...m, ...patch } : m);
  };

  const save = async () => {
    if (!matchId || !match) return;
    setSaving(true);
    setError(null);
    try {
      await matchApi.update(+matchId, match);
      const saved = await matchApi.saveResult(+matchId, result);
      setResult(saved);
      setSaved(true);
    } catch {
      setError('Failed to save. Please try again.');
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

  // Player lists for performer selection — if team sheet exists use those XIa, else fall back to all players
  const playersFor = (teamId?: number): Player[] => {
    const sheet = teamSheets.find(s => s.teamId === teamId);
    if (!sheet?.playingXi?.length) return allPlayers;
    return sheet.playingXi
      .map(id => allPlayers.find(p => p.playerId === id))
      .filter(Boolean) as Player[];
  };

  const firstInningsPlayers = playersFor(result.sideBattingFirstId);
  const secondInningsPlayers = playersFor(secondInningsTeam?.id);

  const firstCard: TeamScorecard = result.scoreCard?.teamA ?? {};
  const secondCard: TeamScorecard = result.scoreCard?.teamB ?? {};

  const generateSummary = () => {
    const DIV  = '━'.repeat(50);
    const THIN = '─'.repeat(50);
    const lines: string[] = [];
    const add = (s = '') => lines.push(s);

    // ── Header ──────────────────────────────────────────
    add(DIV);
    add('🏏  MATCH SUMMARY');
    add(DIV);
    add();
    add(`${match.homeTeamName ?? '?'}  vs  ${match.oppositionTeamName ?? '?'}`);
    const meta = [
      match.matchDate    && `📅 ${match.matchDate}`,
      match.fieldName    && `📍 ${match.fieldName}`,
      match.tournamentName && `🏆 ${match.tournamentName}`,
    ].filter(Boolean).join('   ');
    if (meta)         add(meta);
    if (match.umpire) add(`🧑‍⚖️ Umpire: ${match.umpire}`);

    // ── Tournament ──────────────────────────────────────
    if (tournament) {
      add();
      add(DIV);
      add('🏆  TOURNAMENT');
      add(DIV);
      add(`${tournament.name}`);

      const tournamentDetails = [
        tournament.cricketFormat && `Format: ${tournament.cricketFormat}`,
        tournament.ageGroup      && `Age Group: ${tournament.ageGroup.replace(/_/g, ' ')}`,
        tournament.tournamentGender && `Category: ${tournament.tournamentGender}`,
      ].filter(Boolean);
      tournamentDetails.forEach(d => add(d as string));

      const stageLabelMap: Record<string, string> = {
        POOL: 'Pool Stage', SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
      };
      if (match.matchStage) add(`Stage: ${stageLabelMap[match.matchStage] ?? match.matchStage}`);

      const dates = [
        tournament.startDate && `From: ${tournament.startDate}`,
        tournament.endDate   && `To:   ${tournament.endDate}`,
      ].filter(Boolean);
      if (dates.length) { add(); dates.forEach(d => add(d as string)); }
    }

    // ── Toss ────────────────────────────────────────────
    const tossTeam =
      match.tossWonBy === 'HOME'       ? match.homeTeamName :
      match.tossWonBy === 'OPPOSITION' ? match.oppositionTeamName : null;
    const tossDecisionLabel =
      match.tossDecision === 'BAT'  ? 'bat first' :
      match.tossDecision === 'BOWL' ? 'bowl first' : null;

    if (tossTeam || tossDecisionLabel) {
      add();
      add(DIV);
      add('🪙  TOSS');
      add(DIV);
      if (tossTeam && tossDecisionLabel) {
        add(`${tossTeam} won the toss and elected to ${tossDecisionLabel}.`);
      } else if (tossTeam) {
        add(`${tossTeam} won the toss.`);
      }
    }

    // ── Scorecard ────────────────────────────────────────
    add();
    add(DIV);
    add('📊  SCORECARD');
    add(DIV);

    const formatInnings = (
      heading: string,
      score?: number, wkts?: number, overs?: string,
      card?: TeamScorecard,
    ) => {
      add();
      add(heading);

      if (score != null) {
        add(`${score}/${wkts ?? '?'}  (${overs ?? '?'} overs)`);
      }

      const batting = (card?.batting ?? []).filter(b => b.playerName);
      if (batting.length) {
        add();
        add('  🏏 Batting');
        batting.forEach(b => {
          const stats = [
            b.score     != null && `${b.score} runs`,
            b.ballsFaced != null && `${b.ballsFaced} balls`,
            b.fours     != null && `${b.fours} fours`,
            b.sixes     != null && `${b.sixes} sixes`,
          ].filter(Boolean).join(' | ');
          add(`  • ${b.playerName}${stats ? `  —  ${stats}` : ''}`);
        });
      }

      const bowling = (card?.bowling ?? []).filter(b => b.playerName);
      if (bowling.length) {
        add();
        add('  🎯 Bowling');
        bowling.forEach(b => {
          const stats = [
            b.overs              && `${b.overs} ov`,
            b.maidens   != null  && `${b.maidens}m`,
            b.runs      != null  && `${b.runs}r`,
            b.wickets   != null  && `${b.wickets}w`,
          ].filter(Boolean).join('  ');
          add(`  • ${b.playerName}${stats ? `  —  ${stats}` : ''}`);
        });
      }
    };

    const firstTeamName  = firstInningsTeam?.name  ?? result.sideBattingFirstName ?? '1st Innings';
    const secondTeamName = secondInningsTeam?.name ?? '2nd Innings';

    formatInnings(
      `1ST INNINGS — ${firstTeamName}`,
      result.scoreBattingFirst, result.wicketsLostBattingFirst, result.oversBattingFirst, firstCard,
    );

    add();
    add(THIN);

    formatInnings(
      `2ND INNINGS — ${secondTeamName}`,
      result.scoreBattingSecond, result.wicketsLostBattingSecond, result.oversBattingSecond, secondCard,
    );

    // ── Result ───────────────────────────────────────────
    add();
    add(DIV);
    add('🏆  RESULT');
    add(DIV);

    if (result.matchDrawn) {
      add('Match Drawn');
    } else {
      const winnerName = result.winningTeamName
        ?? teams.find(t => t.id === result.winningTeamId)?.name;
      if (winnerName) add(`🥇 Winner: ${winnerName}`);
    }

    if (result.decidedOnDLS)     add('  (Decided on DLS method)');
    if (result.wonWithBonusPoint) add('  (Won with bonus point)');

    if (result.matchOutcomeDescription) {
      add();
      add(result.matchOutcomeDescription);
    }

    const motmPlayer = motmPlayers.find(p => p.playerId === result.manOfTheMatchId);
    const motmName = result.manOfTheMatchName
      ?? (motmPlayer ? `${motmPlayer.name} ${motmPlayer.surname}` : null);
    if (motmName) {
      add();
      add(`🌟 Man of the Match: ${motmName}`);
    }

    add();
    add(DIV);

    setSummaryText(lines.join('\n'));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summaryText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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

      <Tabs
        value={activeTab}
        onChange={(_, v) => { setActiveTab(v); if (v === 2) generateSummary(); }}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Match Details" />
        <Tab label="Performers" />
        <Tab label="Summary" />
      </Tabs>

      {/* ── Tab 0: Match Details ── */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Section title="Toss">
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                select
                label="Toss Won By"
                value={match.tossWonBy ?? ''}
                onChange={e => patchMatch({ tossWonBy: e.target.value as TossWinner || undefined })}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value=""><em>— Unknown —</em></MenuItem>
                <MenuItem value="HOME">{match.homeTeamName ?? 'Home Team'}</MenuItem>
                <MenuItem value="OPPOSITION">{match.oppositionTeamName ?? 'Opposition'}</MenuItem>
              </TextField>
              <TextField
                select
                label="Toss Decision"
                value={match.tossDecision ?? ''}
                onChange={e => patchMatch({ tossDecision: e.target.value as TossDecision || undefined })}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value=""><em>— Unknown —</em></MenuItem>
                <MenuItem value="BAT">Decided to bat first</MenuItem>
                <MenuItem value="BOWL">Decided to bowl first</MenuItem>
              </TextField>
            </Box>
          </Section>

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
            {saveButton}
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
      )}

      {/* ── Tab 1: Performers ── */}
      {activeTab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {!result.sideBattingFirstId && (
            <Alert severity="info">
              Please set "Side Batting First" in the Match Details tab before capturing performers.
            </Alert>
          )}

          <InningsPerformersPanel
            inningsLabel={`1st Innings${firstInningsTeam ? ` — ${firstInningsTeam.name} batting` : ''}`}
            batters={firstCard.batting ?? []}
            bowlers={firstCard.bowling ?? []}
            batterOptions={firstInningsPlayers}
            bowlerOptions={secondInningsPlayers}
            onBattersChange={batting => setScoreCard({ teamA: { ...firstCard, batting } })}
            onBowlersChange={bowling => setScoreCard({ teamA: { ...firstCard, bowling } })}
            disabled={!result.sideBattingFirstId}
          />

          <InningsPerformersPanel
            inningsLabel={`2nd Innings${secondInningsTeam ? ` — ${secondInningsTeam.name} batting` : ''}`}
            batters={secondCard.batting ?? []}
            bowlers={secondCard.bowling ?? []}
            batterOptions={secondInningsPlayers}
            bowlerOptions={firstInningsPlayers}
            onBattersChange={batting => setScoreCard({ teamB: { ...secondCard, batting } })}
            onBowlersChange={bowling => setScoreCard({ teamB: { ...secondCard, bowling } })}
            disabled={!result.sideBattingFirstId}
          />

          <Box>{saveButton}</Box>
        </Box>
      )}

      {/* ── Tab 2: Summary ── */}
      {activeTab === 2 && (
        <Box>
          {/* Toolbar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={copied ? <Check /> : <ContentCopy />}
              color={copied ? 'success' : 'primary'}
              onClick={copyToClipboard}
              disabled={!summaryText}
              sx={{ minWidth: 160 }}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={generateSummary}
            >
              Regenerate
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              Edit the text below before copying
            </Typography>
          </Box>

          <TextField
            multiline
            fullWidth
            minRows={24}
            value={summaryText}
            onChange={e => setSummaryText(e.target.value)}
            placeholder="Switch to this tab to generate the summary…"
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.6 } }}
            sx={{
              '& .MuiOutlinedInput-root': { bgcolor: 'grey.50', alignItems: 'flex-start' },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

// ── Module-level helpers (must NOT be defined inside another component) ──────

interface PlayerAutoProps {
  playerList: Player[];
  value: string;
  onSelect: (name: string, playerId?: number) => void;
  disabled: boolean;
}

const PlayerAutocomplete: React.FC<PlayerAutoProps> = ({ playerList, value, onSelect, disabled }) => {
  const options = playerList.map(p => `${p.name} ${p.surname}`);
  return (
    <Autocomplete
      freeSolo
      options={options}
      inputValue={value}
      disabled={disabled}
      // onInputChange fires on every keystroke AND on 'reset' (after selection) / 'clear'.
      // We ignore 'reset' so that selecting from the dropdown doesn't immediately wipe the field.
      onInputChange={(_, val, reason) => {
        if (reason === 'reset') return;
        const player = playerList.find(p => `${p.name} ${p.surname}` === val);
        onSelect(val, player?.playerId);
      }}
      // onChange fires when the user picks an option from the dropdown list.
      onChange={(_, val) => {
        const name = typeof val === 'string' ? val : '';
        const player = playerList.find(p => `${p.name} ${p.surname}` === name);
        onSelect(name, player?.playerId);
      }}
      renderInput={(params) => (
        <TextField {...params} label="Player" size="small" sx={{ minWidth: 200 }} />
      )}
      sx={{ minWidth: 200 }}
    />
  );
};

interface NumFieldProps {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  width?: number;
  disabled: boolean;
}

const NumField: React.FC<NumFieldProps> = ({ label, value, onChange, width = 80, disabled }) => (
  <TextField
    label={label}
    type="number"
    size="small"
    sx={{ width }}
    value={value ?? ''}
    disabled={disabled}
    inputProps={{ min: 0 }}
    onChange={e => onChange(e.target.value ? +e.target.value : undefined)}
  />
);

// ── InningsPerformersPanel ──────────────────────────────────────────────────

interface InningsPerformersPanelProps {
  inningsLabel: string;
  batters: BattingEntry[];
  bowlers: BowlingEntry[];
  batterOptions: Player[];
  bowlerOptions: Player[];
  onBattersChange: (entries: BattingEntry[]) => void;
  onBowlersChange: (entries: BowlingEntry[]) => void;
  disabled: boolean;
}

const InningsPerformersPanel: React.FC<InningsPerformersPanelProps> = ({
  inningsLabel, batters, bowlers,
  batterOptions, bowlerOptions,
  onBattersChange, onBowlersChange,
  disabled,
}) => {
  const updateBatter = (i: number, patch: Partial<BattingEntry>) => {
    const next = [...batters];
    next[i] = { ...next[i], ...patch };
    onBattersChange(next);
  };

  const updateBowler = (i: number, patch: Partial<BowlingEntry>) => {
    const next = [...bowlers];
    next[i] = { ...next[i], ...patch };
    onBowlersChange(next);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>{inningsLabel}</Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Batting performers */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Batting Performers</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
        {batters.map((b, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <PlayerAutocomplete
              playerList={batterOptions}
              value={b.playerName ?? ''}
              disabled={disabled}
              onSelect={(name, playerId) => updateBatter(i, { playerName: name, playerId })}
            />
            <NumField label="Runs" value={b.score} disabled={disabled} onChange={v => updateBatter(i, { score: v })} />
            <NumField label="Balls" value={b.ballsFaced} disabled={disabled} onChange={v => updateBatter(i, { ballsFaced: v })} />
            <NumField label="4s" value={b.fours} disabled={disabled} onChange={v => updateBatter(i, { fours: v })} width={70} />
            <NumField label="6s" value={b.sixes} disabled={disabled} onChange={v => updateBatter(i, { sixes: v })} width={70} />
            <IconButton size="small" color="error" disabled={disabled} onClick={() => onBattersChange(batters.filter((_, idx) => idx !== i))}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Button size="small" startIcon={<Add />} disabled={disabled} onClick={() => onBattersChange([...batters, {}])} sx={{ mb: 2 }}>
        Add Batter
      </Button>

      <Divider sx={{ mb: 2 }} />

      {/* Bowling performers */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Bowling Performers</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
        {bowlers.map((b, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <PlayerAutocomplete
              playerList={bowlerOptions}
              value={b.playerName ?? ''}
              disabled={disabled}
              onSelect={(name, playerId) => updateBowler(i, { playerName: name, playerId })}
            />
            <TextField
              label="Overs" size="small" sx={{ width: 90 }}
              value={b.overs ?? ''}
              disabled={disabled}
              placeholder="e.g. 4.5"
              onChange={e => updateBowler(i, { overs: e.target.value })}
            />
            <NumField label="Maidens" value={b.maidens} disabled={disabled} onChange={v => updateBowler(i, { maidens: v })} width={90} />
            <NumField label="Dots" value={b.dots} disabled={disabled} onChange={v => updateBowler(i, { dots: v })} width={75} />
            <NumField label="Runs" value={b.runs} disabled={disabled} onChange={v => updateBowler(i, { runs: v })} />
            <NumField label="Wkts" value={b.wickets} disabled={disabled} onChange={v => updateBowler(i, { wickets: v })} width={75} />
            <IconButton size="small" color="error" disabled={disabled} onClick={() => onBowlersChange(bowlers.filter((_, idx) => idx !== i))}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Button size="small" startIcon={<Add />} disabled={disabled} onClick={() => onBowlersChange([...bowlers, {}])}>
        Add Bowler
      </Button>
    </Paper>
  );
};

// ── Section ─────────────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Typography variant="subtitle1" fontWeight={600} gutterBottom>{title}</Typography>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
);
