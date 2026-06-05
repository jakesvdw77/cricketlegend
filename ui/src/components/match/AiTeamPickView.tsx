import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip,
  CircularProgress, Divider, Grid, IconButton,
  Stack, Tooltip, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, ToggleButtonGroup, ToggleButton, Paper,
} from '@mui/material';
import {
  Bolt, CheckCircle, ContentCopy,
  EmojiEvents, Groups, PhoneAndroid,
  PictureAsPdf, Refresh, Warning, RotateRight, EmojiEvents as Trophy,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Legend,
} from 'recharts';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { AiTeamPick, Player } from '../../types';
import { generateTeamPickPdf, printAnalysisAsScreen } from '../../utils/matchPdf';
import { AnalysisCacheBanner } from '../AnalysisCacheBanner';

interface Props {
  matchId: number;
  teamId: number;
  teamName: string;
  matchTitle: string;
  onApply?: (xiPlayerIds: number[], twelfthManId: number | null) => void;
}

const ROLE_COLORS: Record<string, string> = {
  BAT: '#2e7d32', BOWL: '#1565c0', WK: '#6a1b9a', AR: '#e65100',
};
const AVAIL_COLORS: Record<string, string> = {
  Available: '#4caf50', 'No Response': '#90a4ae', Unsure: '#ff9800', Unavailable: '#f44336',
};

type PickStrategy = 'STRONGEST' | 'ROTATION';

// Client-side fallback: match an AI-generated name string to a squad player.
// Tries progressively looser strategies so minor name differences don't break the apply flow.
function resolveByName(aiName: string, squad: Player[], usedIds: Set<number>): number | null {
  const norm = (s: string) => s.toLowerCase().replace(/[.\s]+/g, ' ').trim();
  const target = norm(aiName);
  const available = squad.filter(p => p.playerId != null && !usedIds.has(p.playerId!));

  for (const p of available)
    if (norm(`${p.name} ${p.surname}`) === target) return p.playerId!;
  for (const p of available)
    if (norm(`${p.surname} ${p.name}`) === target) return p.playerId!;
  for (const p of available)
    if (norm(`${p.name.charAt(0)} ${p.surname}`) === target) return p.playerId!;
  for (const p of available)
    if (target.includes(norm(p.name)) && target.includes(norm(p.surname))) return p.playerId!;
  const bySurname = available.filter(p => norm(p.surname) === target);
  if (bySurname.length === 1) return bySurname[0].playerId!;

  return null;
}

const STRATEGY_META: Record<PickStrategy, { label: string; description: string }> = {
  STRONGEST: {
    label: 'Strongest XI',
    description: 'Picks the best available players purely on skill and availability — ignores rotation.',
  },
  ROTATION: {
    label: 'Player Rotation',
    description: 'Prioritises players with fewer appearances to share opportunity, while maintaining squad balance.',
  },
};

export const AiTeamPickView: React.FC<Props> = ({ matchId, teamId, teamName, matchTitle, onApply }) => {
  const [strategy, setStrategy] = useState<PickStrategy>('STRONGEST');
  const [pick, setPick] = useState<AiTeamPick | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const squadRef   = useRef<Player[]>([]);

  const load = useCallback((regen = false, strat: PickStrategy = strategy) => {
    if (regen) setRegenerating(true); else setLoading(true);
    setError(null);

    const squadPromise = squadRef.current.length > 0
      ? Promise.resolve(squadRef.current)
      : teamApi.getSquad(teamId).then(sq => { squadRef.current = sq; return sq; });

    Promise.all([matchApi.getAiTeamPick(matchId, teamId, regen, strat), squadPromise])
      .then(([rawPick, squad]) => {
        let p = rawPick;
        if (p.resolvedXiPlayerIds.length < 11) {
          const usedIds = new Set<number>();
          const clientIds: number[] = [];
          for (const xi of p.selectedXi) {
            const id = resolveByName(xi.name, squad, usedIds);
            if (id != null) { clientIds.push(id); usedIds.add(id); }
          }
          if (clientIds.length >= 11) {
            p = { ...p, resolvedXiPlayerIds: clientIds };
            if (p.twelfthMan && !p.resolvedTwelfthManId) {
              const twelfthId = resolveByName(p.twelfthMan.name, squad, usedIds);
              if (twelfthId) p = { ...p, resolvedTwelfthManId: twelfthId };
            }
          }
        }
        setPick(p);
      })
      .catch(e => setError(e?.response?.data?.message ?? e?.message ?? 'Failed to generate team pick'))
      .finally(() => { setLoading(false); setRegenerating(false); });
  }, [matchId, teamId, strategy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleStrategyChange = (_: React.MouseEvent, val: PickStrategy | null) => {
    if (!val || val === strategy) return;
    setStrategy(val);
    setPick(null);
    setError(null);
    load(false, val);
  };

  const copyJson = () => {
    if (!pick) return;
    navigator.clipboard.writeText(JSON.stringify(pick, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportPdf = () => {
    if (!pick) return;
    setExporting(true);
    try {
      const url = generateTeamPickPdf(pick, teamName, matchTitle);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xi-pick-${teamName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const printScreen = async () => {
    if (!pick || !contentRef.current) return;
    setPrinting(true);
    try {
      await printAnalysisAsScreen(contentRef.current, teamName, matchTitle);
    } finally {
      setPrinting(false);
    }
  };

  const handleApply = () => {
    if (!pick || !onApply) return;
    onApply(pick.resolvedXiPlayerIds, pick.resolvedTwelfthManId);
    setApplyConfirmOpen(false);
  };

  // ── Strategy selector — always visible ──────────────────────────────────────
  const strategySelector = (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 'bold' }}>
        Selection Strategy
      </Typography>
      <ToggleButtonGroup
        value={strategy}
        exclusive
        onChange={handleStrategyChange}
        size="small"
        fullWidth
        disabled={loading || regenerating}
      >
        <ToggleButton value="STRONGEST" sx={{ gap: 0.75, py: 1 }}>
          <Trophy fontSize="small" />
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="caption" fontWeight="bold" display="block">Strongest XI</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Best players, merit only</Typography>
          </Box>
        </ToggleButton>
        <ToggleButton value="ROTATION" sx={{ gap: 0.75, py: 1 }}>
          <RotateRight fontSize="small" />
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="caption" fontWeight="bold" display="block">Player Rotation</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Prioritise fewer appearances</Typography>
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
        {STRATEGY_META[strategy].description}
      </Typography>
    </Paper>
  );

  if (loading) return (
    <>
      {strategySelector}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
        <CircularProgress size={48} />
        <Typography variant="body2" color="text.secondary">
          {strategy === 'ROTATION' ? 'Balancing rotation & squad strength for ' : 'Selecting the strongest XI for '}{teamName}…
        </Typography>
        <Typography variant="caption" color="text.disabled">Considering availability, form & balance — up to 15 seconds</Typography>
      </Box>
    </>
  );

  if (error) return (
    <>
      {strategySelector}
      <Box sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button startIcon={<Refresh />} variant="outlined" onClick={() => load()}>Try Again</Button>
      </Box>
    </>
  );

  if (!pick) return <>{strategySelector}</>;

  const xi = [...(pick.selectedXi ?? [])].sort((a, b) => (a.battingPosition ?? 99) - (b.battingPosition ?? 99));
  const pieData = pick.chartData.availabilitySummary.map(a => ({
    name: a.label, value: a.count, fill: AVAIL_COLORS[a.label] ?? '#90a4ae',
  }));

  return (
    <Box sx={{ pb: 2 }} ref={contentRef}>
      {strategySelector}
      {pick.generatedAt && (
        <AnalysisCacheBanner
          generatedAt={pick.generatedAt}
          regenerating={regenerating}
          onRegenerate={() => load(true)}
        />
      )}
      {/* Toolbar */}
      <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={copied ? 'Copied!' : 'Copy JSON'}>
            <IconButton size="small" onClick={copyJson}><ContentCopy fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Export PDF">
            <IconButton size="small" onClick={exportPdf} disabled={exporting}><PictureAsPdf fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Print screen as PDF">
            <IconButton size="small" onClick={printScreen} disabled={printing}>
              {printing ? <CircularProgress size={14} /> : <PhoneAndroid fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Regenerate">
            <IconButton size="small" onClick={() => load(true)}><Refresh fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Apply CTA */}
      {onApply && (
        <Card
          variant="outlined"
          sx={{ mb: 2, borderColor: pick.resolvedXiPlayerIds.length >= 11 ? 'success.main' : 'divider', bgcolor: pick.resolvedXiPlayerIds.length >= 11 ? 'success.main' : 'action.disabledBackground', color: pick.resolvedXiPlayerIds.length >= 11 ? '#fff' : 'text.disabled', cursor: pick.resolvedXiPlayerIds.length >= 11 ? 'pointer' : 'default' }}
          onClick={pick.resolvedXiPlayerIds.length >= 11 ? () => setApplyConfirmOpen(true) : undefined}
        >
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <CheckCircle />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {pick.resolvedXiPlayerIds.length >= 11
                    ? `Apply AI Selection to ${teamName}`
                    : 'Cannot apply — player names could not be resolved'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  {pick.resolvedXiPlayerIds.length >= 11
                    ? `${pick.resolvedXiPlayerIds.length} players in batting order will be set as the playing XI`
                    : 'Try regenerating the pick'}
                </Typography>
              </Box>
              {pick.resolvedXiPlayerIds.length >= 11 && (
                <Typography variant="caption" fontWeight={700} sx={{ opacity: 0.9 }}>TAP TO APPLY →</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Rationale */}
      <Card variant="outlined" sx={{ mb: 2, bgcolor: 'action.hover' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="body2">{pick.selectionRationale}</Typography>
          {pick.fairnessNote && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
              {pick.fairnessNote}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Batting order + Charts */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* XI batting order */}
        <Grid item xs={12} sm={7}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Groups fontSize="small" color="primary" />
                <Typography variant="subtitle2">Selected XI — Batting Order</Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '28px 1fr 48px', gap: 1, px: 1, pb: 0.5 }}>
                  <Typography variant="caption" color="text.disabled" fontWeight={700}>#</Typography>
                  <Typography variant="caption" color="text.disabled" fontWeight={700}>Player</Typography>
                  <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textAlign: 'center' }}>Role</Typography>
                </Box>
                <Divider />
                {xi.map((p, i) => (
                  <Box key={i} sx={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 48px', gap: 1,
                    px: 1, py: 0.5, borderRadius: 1,
                    bgcolor: i % 2 === 0 ? 'action.hover' : 'transparent',
                    alignItems: 'center',
                  }}>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {p.battingPosition}
                    </Typography>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {p.selectionReason}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Chip size="small" label={p.role}
                        sx={{ bgcolor: ROLE_COLORS[p.role] ?? '#555', color: '#fff', fontSize: 10, height: 20 }} />
                    </Box>
                  </Box>
                ))}
                {pick.twelfthMan && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: '28px 1fr 48px', gap: 1, px: 1, py: 0.5, alignItems: 'center', opacity: 0.7 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>12</Typography>
                      <Box>
                        <Typography variant="body2">{pick.twelfthMan.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{pick.twelfthMan.selectionReason}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Chip size="small" label={pick.twelfthMan.role}
                          sx={{ bgcolor: ROLE_COLORS[pick.twelfthMan.role] ?? '#555', color: '#fff', fontSize: 10, height: 20 }} />
                      </Box>
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Availability pie */}
        <Grid item xs={12} sm={5}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Squad Availability</Typography>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={65} innerRadius={32}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RTooltip formatter={(v: number, name: string) => [v, name]} contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tournament appearances */}
      {pick.chartData.tournamentAppearances.length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Tournament Appearances (eligible players)</Typography>
            <ResponsiveContainer width="100%" height={Math.max(160, pick.chartData.tournamentAppearances.length * 22)}>
              <BarChart
                data={pick.chartData.tournamentAppearances}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 120, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="player" tick={{ fontSize: 10 }} width={120} />
                <RTooltip
                  formatter={(v: number, _: string, entry: any) => [v, entry.payload.selected ? '★ Selected' : 'Not selected']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="matches" name="Matches played" radius={[0, 4, 4, 0]}>
                  {pick.chartData.tournamentAppearances.map((entry, i) => (
                    <Cell key={i} fill={entry.selected ? '#2e7d32' : '#90a4ae'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 10, height: 10, bgcolor: '#2e7d32', borderRadius: 0.5 }} />
                <Typography variant="caption">Selected in XI</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 10, height: 10, bgcolor: '#90a4ae', borderRadius: 0.5 }} />
                <Typography variant="caption">Not selected</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Bowling rotation + Plans */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <EmojiEvents fontSize="small" color="primary" />
                <Typography variant="subtitle2">Bowling Rotation Plan</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {pick.bowlingRotation}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Warning fontSize="small" color="warning" />
                <Typography variant="subtitle2">Fairness & Rotation Note</Typography>
              </Stack>
              {pick.fairnessNote ? (
                <Typography variant="body2" color="text.secondary">{pick.fairnessNote}</Typography>
              ) : (
                <Typography variant="caption" color="text.disabled">No specific rotation concerns for this match.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Apply confirmation dialog */}
      <Dialog open={applyConfirmOpen} onClose={() => setApplyConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CheckCircle color="success" />
            <Typography variant="h6">Apply AI Selection?</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will overwrite the current playing XI with the {pick.resolvedXiPlayerIds.length} players
            recommended by the AI, in the suggested batting order.
            {pick.resolvedTwelfthManId && ' The 12th man will also be set.'}
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }} icon={<Bolt />}>
            Any existing XI selection will be replaced.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<CheckCircle />} onClick={handleApply}>
            Apply XI
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
