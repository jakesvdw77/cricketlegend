import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Divider, MenuItem, TextField,
  Switch, FormControlLabel, Alert, CircularProgress, Chip,
  Tabs, Tab, Autocomplete,
} from '@mui/material';
import {
  ArrowBack, Save, EmojiEvents, SportsCricket, CalendarMonth, LocationOn, Leaderboard,
  AutoFixHigh, Sync, Upload,
} from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { tournamentApi } from '../../api/tournamentApi';
import { teamApi } from '../../api/teamApi';
import { Match, MatchResult, Player, MatchSide, TeamScorecard, TossWinner, TossDecision, Tournament, ResultVisibility } from '../../types';
import WhatsAppTemplate from './templates/WhatsAppTemplate';
import FacebookTemplate from './templates/FacebookTemplate';
import ScorecardTemplate from './templates/ScorecardTemplate';
import BroadcastScorecardTemplate from './templates/BroadcastScorecardTemplate';
import { TemplateProps, TeamFilter } from './templates/types';
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

export const MatchResultCapture: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

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
  const [activeTab, setActiveTab] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('both');

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
    setResult(r => ({ ...r, ...patch }));
  };

  const setScoreCard = useCallback(
    (patch: Partial<{ teamA: TeamScorecard; teamB: TeamScorecard }>) => {
      setSaved(false);
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
        // Full ScorecardData: { teamA, teamB }
        if (parsed.teamA || parsed.teamB) {
          set({ scoreCard: { teamA: parsed.teamA ?? result.scoreCard?.teamA ?? {}, teamB: parsed.teamB ?? result.scoreCard?.teamB ?? {} } });
        // Single TeamScorecard: { batting, bowling, score, … }
        } else if (parsed.batting || parsed.bowling) {
          set({ scoreCard: { teamA: parsed, teamB: result.scoreCard?.teamB ?? {} } });
        } else {
          setImportError('Unrecognised JSON format. Expected { teamA, teamB } or a single innings object.');
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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (!match)  return <Alert severity="error">Match not found.</Alert>;

  const xiPlayerIds = new Set(teamSheets.flatMap(s => s.playingXi ?? []));
  const motmPlayers: Player[] = xiPlayerIds.size > 0
    ? allPlayers.filter(p => xiPlayerIds.has(p.playerId!))
    : allPlayers;

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

  const motmPlayer = motmPlayers.find(p => p.playerId === result.manOfTheMatchId);
  const motmName   = result.manOfTheMatchName
    ?? (motmPlayer ? `${motmPlayer.name} ${motmPlayer.surname}` : null);

  const firstTeamName  = firstInningsTeam?.name  ?? result.sideBattingFirstName ?? '1st Innings';
  const secondTeamName = secondInningsTeam?.name ?? '2nd Innings';

  const templateProps: TemplateProps = {
    match, result, tournament,
    firstTeamName, secondTeamName,
    firstCard, secondCard, motmName,
    teamFilter,
  };

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

      {/* Match banner */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
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
      </Paper>

      {error && <Alert severity="error"   sx={{ mb: 2 }}>{error}</Alert>}
      {saved  && <Alert severity="success" sx={{ mb: 2 }}>Result saved successfully.</Alert>}

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Match Details" />
        <Tab label="Scorecard" />
        <Tab label="Summary" />
      </Tabs>

      {/* ── Tab 0: Match Details ── */}
      {activeTab === 0 && (
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

          <Section title="Toss">
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                select label="Toss Won By" value={match.tossWonBy ?? ''}
                disabled={!!result.forfeited || !!result.noResult}
                onChange={e => patchMatch({ tossWonBy: e.target.value as TossWinner || undefined })}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value=""><em>— Unknown —</em></MenuItem>
                <MenuItem value="HOME">{match.homeTeamName ?? 'Home Team'}</MenuItem>
                <MenuItem value="OPPOSITION">{match.oppositionTeamName ?? 'Opposition'}</MenuItem>
              </TextField>
              <TextField
                select label="Toss Decision" value={match.tossDecision ?? ''}
                disabled={!!result.forfeited || !!result.noResult}
                onChange={e => patchMatch({ tossDecision: e.target.value as TossDecision || undefined })}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value=""><em>— Unknown —</em></MenuItem>
                <MenuItem value="BAT">Decided to bat first</MenuItem>
                <MenuItem value="BOWL">Decided to bowl first</MenuItem>
              </TextField>
            </Box>
          </Section>

          <Section title="Innings">
            {result.sideBattingFirstId
              ? <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={`Batting first: ${teams.find(t => t.id === result.sideBattingFirstId)?.name ?? '—'}`} color="primary" variant="outlined" />
                  <Chip label={`Batting second: ${teams.find(t => t.id !== result.sideBattingFirstId)?.name ?? '—'}`} color="secondary" variant="outlined" />
                </Box>
              : <Alert severity="warning" sx={{ mb: 2, maxWidth: 420 }}>Set the toss in the Toss section to determine who bats first.</Alert>
            }

            <Button
              variant="outlined"
              size="small"
              startIcon={<Sync />}
              disabled={!result.sideBattingFirstId || !!result.forfeited}
              onClick={() => {
                set({
                  scoreBattingFirst:         firstCard.score,
                  wicketsLostBattingFirst:   firstCard.wickets,
                  oversBattingFirst:         firstCard.overs ?? '',
                  scoreBattingSecond:        secondCard.score,
                  wicketsLostBattingSecond:  secondCard.wickets,
                  oversBattingSecond:        secondCard.overs ?? '',
                });
              }}
              sx={{ mb: 2 }}
            >
              Populate from scorecard
            </Button>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              1st Innings{firstInningsTeam ? ` — ${firstInningsTeam.name}` : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField label="Score"   type="number" size="small" sx={{ width: 110 }} value={num(result.scoreBattingFirst)}          disabled={!result.matchCompleted || !!result.forfeited} onChange={e => set({ scoreBattingFirst:          e.target.value ? +e.target.value : undefined })} />
              <TextField label="Wickets" type="number" size="small" sx={{ width: 100 }} value={num(result.wicketsLostBattingFirst)}     disabled={!result.matchCompleted || !!result.forfeited} inputProps={{ min: 0, max: 10 }} onChange={e => set({ wicketsLostBattingFirst:  e.target.value ? +e.target.value : undefined })} />
              <TextField label="Overs"              size="small" sx={{ width: 100 }} value={result.oversBattingFirst ?? ''}          disabled={!result.matchCompleted || !!result.forfeited} placeholder="e.g. 20.0" onChange={e => set({ oversBattingFirst: e.target.value })} />
            </Box>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              2nd Innings{secondInningsTeam ? ` — ${secondInningsTeam.name}` : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField label="Score"   type="number" size="small" sx={{ width: 110 }} value={num(result.scoreBattingSecond)}         disabled={!result.matchCompleted || !!result.forfeited} onChange={e => set({ scoreBattingSecond:         e.target.value ? +e.target.value : undefined })} />
              <TextField label="Wickets" type="number" size="small" sx={{ width: 100 }} value={num(result.wicketsLostBattingSecond)}    disabled={!result.matchCompleted || !!result.forfeited} inputProps={{ min: 0, max: 10 }} onChange={e => set({ wicketsLostBattingSecond: e.target.value ? +e.target.value : undefined })} />
              <TextField label="Overs"              size="small" sx={{ width: 100 }} value={result.oversBattingSecond ?? ''}         disabled={!result.matchCompleted || !!result.forfeited} placeholder="e.g. 18.3" onChange={e => set({ oversBattingSecond: e.target.value })} />
            </Box>
          </Section>

          <Section title="Result">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                sx={{ minWidth: 260 }}
              >
                <MenuItem value=""><em>— No result / abandoned —</em></MenuItem>
                {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </TextField>
              <TextField
                select
                label="Man of the Match"
                value={result.manOfTheMatchId ?? ''}
                disabled={!result.matchCompleted || !!result.forfeited}
                onChange={e => set({ manOfTheMatchId: e.target.value ? +e.target.value : undefined })}
                sx={{ minWidth: 280 }}
              >
                <MenuItem value=""><em>— None —</em></MenuItem>
                {motmPlayers.map(p => (
                  <MenuItem key={p.playerId} value={p.playerId}>{p.name} {p.surname}</MenuItem>
                ))}
              </TextField>
              </Box>

              <TextField
                select
                label="Publish Result"
                value={result.resultVisibility ?? 'NOT_PUBLISHED'}
                onChange={e => set({ resultVisibility: e.target.value as ResultVisibility })}
                sx={{ maxWidth: 380 }}
              >
                <MenuItem value="NOT_PUBLISHED">Do Not Publish Result</MenuItem>
                <MenuItem value="SUMMARY_ONLY">Make Summary Available</MenuItem>
                <MenuItem value="SCORECARD_AND_SUMMARY">Make Scorecard and Summary Available</MenuItem>
              </TextField>

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

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 500 }}>
                <TextField
                  label="Match Outcome Description" multiline rows={2}
                  value={result.matchOutcomeDescription ?? ''}
                  disabled={!result.matchCompleted || !!result.forfeited}
                  onChange={e => set({ matchOutcomeDescription: e.target.value })}
                  placeholder="e.g. Team A won by 32 runs"
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AutoFixHigh />}
                  disabled={!!result.forfeited || !!result.noResult}
                  onClick={() => {
                    const { scoreBattingFirst, scoreBattingSecond, wicketsLostBattingSecond } = result;

                    // DLS: determine winner from par score
                    if (result.decidedOnDLS && dlsPar != null && scoreBattingSecond != null) {
                      const firstTeam  = teams.find(t => t.id === result.sideBattingFirstId);
                      const secondTeam = teams.find(t => t.id !== result.sideBattingFirstId);
                      if (scoreBattingSecond > dlsPar) {
                        const wicketsLeft = 10 - (wicketsLostBattingSecond ?? 0);
                        const runMargin   = scoreBattingSecond - dlsPar;
                        // Still had wickets in hand when match was stopped → win by wickets
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

                    // Non-DLS: derive winner from scores
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
                  }}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Auto-calculate result
                </Button>
              </Box>
            </Box>
          </Section>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {saveButton}
            {saved && match?.tournamentId && (
              <Button variant="outlined" startIcon={<Leaderboard />} onClick={() => navigate(`/tournaments/${match.tournamentId}/standings`)}>
                View Updated Standings
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* ── Tab 1: Scorecard ── */}
      {activeTab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {!result.sideBattingFirstId && (
            <Alert severity="info">
              Please set the toss and batting order in Match Details before capturing the scorecard.
            </Alert>
          )}

          {/* Import */}
          <input
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportJson}
          />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Upload />}
              disabled={!!result.forfeited}
              onClick={() => { setImportError(null); importFileRef.current?.click(); }}
            >
              Import Scorecard JSON
            </Button>
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
          <Box>{saveButton}</Box>
        </Box>
      )}

      {/* ── Tab 2: Summary ── */}
      {activeTab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Template + team filter selectors */}
          <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>Template:</Typography>
              <TextField
                select size="small" value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value=""><em>— Select template —</em></MenuItem>
                <MenuItem value="whatsapp">📱 WhatsApp Template</MenuItem>
                <MenuItem value="facebook">📘 Facebook Template</MenuItem>
                <MenuItem value="scorecard">📺 Scorecard Template</MenuItem>
                <MenuItem value="broadcast">📡 Broadcast Scorecard</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>View:</Typography>
              <TextField
                select size="small" value={teamFilter}
                onChange={e => setTeamFilter(e.target.value as TeamFilter)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="both">Both Teams</MenuItem>
                <MenuItem value="first">{firstTeamName}</MenuItem>
                <MenuItem value="second">{secondTeamName}</MenuItem>
              </TextField>
            </Box>
          </Paper>

          {/* Active template — only rendered once a template is selected */}
          {selectedTemplate === '' && (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <Typography variant="body1">Select a template above to generate the match summary.</Typography>
            </Box>
          )}
          {selectedTemplate === 'whatsapp'   && <WhatsAppTemplate           key="whatsapp"   {...templateProps} />}
          {selectedTemplate === 'facebook'   && <FacebookTemplate           key="facebook"   {...templateProps} />}
          {selectedTemplate === 'scorecard'  && <ScorecardTemplate          key="scorecard"  {...templateProps} />}
          {selectedTemplate === 'broadcast'  && <BroadcastScorecardTemplate key="broadcast"  {...templateProps} />}
        </Box>
      )}
    </Box>
  );
};

// ── Module-level helpers ─────────────────────────────────────────────────────

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
      onInputChange={(_, val, reason) => {
        if (reason === 'reset') return;
        const player = playerList.find(p => `${p.name} ${p.surname}` === val);
        onSelect(val, player?.playerId);
      }}
      onChange={(_, val) => {
        const name = typeof val === 'string' ? val : '';
        const player = playerList.find(p => `${p.name} ${p.surname}` === name);
        onSelect(name, player?.playerId);
      }}
      renderInput={params => <TextField {...params} label="Player" size="small" sx={{ minWidth: 260 }} />}
      sx={{ minWidth: 260 }}
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
    label={label} type="number" size="small" sx={{ width }}
    value={value ?? ''} disabled={disabled}
    inputProps={{ min: 0 }}
    onChange={e => onChange(e.target.value ? +e.target.value : undefined)}
  />
);

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

// ── Section ──────────────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Typography variant="subtitle1" fontWeight={600} gutterBottom>{title}</Typography>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
);
