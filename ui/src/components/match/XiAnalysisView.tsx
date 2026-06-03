import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip,
  CircularProgress, Divider, Grid, IconButton,
  LinearProgress, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  AutoAwesome, Bolt, ContentCopy, EmojiEvents,
  Lightbulb, PhoneAndroid, PictureAsPdf, Refresh,
  ReportProblem, SportsScore,
} from '@mui/icons-material';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { matchApi } from '../../api/matchApi';
import { XiAnalysis } from '../../types';
import { generateXiAnalysisPdf, printAnalysisAsScreen } from '../../utils/matchPdf';
import { AnalysisCacheBanner } from '../AnalysisCacheBanner';

interface Props {
  matchId: number;
  teamId: number;
  teamName: string;
  matchTitle: string;
}

const ROLE_COLORS: Record<string, string> = {
  BAT: '#2e7d32', BOWL: '#1565c0', WK: '#6a1b9a', AR: '#e65100',
};
const PIE_COLORS = ['#1565c0', '#e65100', '#6a1b9a'];

const RatingBar: React.FC<{ label: string; value: number | null }> = ({ label, value }) => {
  const v = value ?? 0;
  const color = v >= 7.5 ? 'success' : v >= 5 ? 'warning' : 'error';
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" fontWeight={700} color={`${color}.main`}>
          {value != null ? `${v.toFixed(1)}/10` : '—'}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={v * 10} color={color}
        sx={{ height: 8, borderRadius: 4 }} />
    </Box>
  );
};

export const XiAnalysisView: React.FC<Props> = ({ matchId, teamId, teamName, matchTitle }) => {
  const [analysis, setAnalysis] = useState<XiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const load = useCallback((regen = false) => {
    if (regen) setRegenerating(true); else setLoading(true);
    setError(null);
    matchApi.getXiAnalysis(matchId, teamId, regen)
      .then(setAnalysis)
      .catch(e => setError(e?.response?.data?.message ?? e?.message ?? 'Failed to generate analysis'))
      .finally(() => { setLoading(false); setRegenerating(false); });
  }, [matchId, teamId]);

  useEffect(() => { load(); }, [load]);

  const copyJson = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(JSON.stringify(analysis.chartData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportPdf = () => {
    if (!analysis) return;
    setExporting(true);
    try {
      const url = generateXiAnalysisPdf(analysis, teamName, matchTitle);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xi-analysis-${teamName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const printScreen = async () => {
    if (!analysis || !contentRef.current) return;
    setPrinting(true);
    try {
      await printAnalysisAsScreen(contentRef.current, teamName, matchTitle);
    } finally {
      setPrinting(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
      <CircularProgress size={48} />
      <Typography variant="body2" color="text.secondary">Analysing {teamName} XI…</Typography>
      <Typography variant="caption" color="text.disabled">This may take up to 15 seconds</Typography>
    </Box>
  );

  if (error) return (
    <Box sx={{ py: 3 }}>
      <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      <Button startIcon={<Refresh />} variant="outlined" onClick={() => load()}>Try Again</Button>
    </Box>
  );

  if (!analysis) return null;

  const { chartData } = analysis;
  const bowlData = chartData.bowlingVariety.filter(b => b.count > 0);

  return (
    <Box sx={{ pb: 2 }} ref={contentRef}>
      {analysis.generatedAt && (
        <AnalysisCacheBanner
          generatedAt={analysis.generatedAt}
          regenerating={regenerating}
          onRegenerate={() => load(true)}
        />
      )}
      {/* Toolbar */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AutoAwesome color="primary" fontSize="small" />
          <Typography variant="subtitle2" color="text.secondary">
            AI XI Analysis — {teamName}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title={copied ? 'Copied!' : 'Copy chart data JSON'}>
            <IconButton size="small" onClick={copyJson}><ContentCopy fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Export structured PDF">
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

      {/* Summary */}
      <Card variant="outlined" sx={{ mb: 2, bgcolor: 'action.hover' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="body2">{analysis.xiSummary}</Typography>
        </CardContent>
      </Card>

      {/* Radar + Bowling variety */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>XI Strength Profile</Typography>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={chartData.xiStrengthRadar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 9 }} />
                  <Radar name="Score" dataKey="score" stroke="#1565c0" fill="#2196f3" fillOpacity={0.4} />
                  <RTooltip formatter={(v: number) => [`${v?.toFixed(1)}/10`, 'Score']} contentStyle={{ fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Bowling Variety</Typography>
              {bowlData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={bowlData} dataKey="count" nameKey="label"
                      cx="50%" cy="50%" outerRadius={60} innerRadius={28}>
                      {bowlData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v: number, name: string) => [v, name]} contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="caption" color="text.disabled">No bowling data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Batting positions */}
      {chartData.battingPositionBreakdown.filter(b => b.count > 0).length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Batting Position Distribution</Typography>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData.battingPositionBreakdown.filter(b => b.count > 0)}
                margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <RTooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" name="Players" fill="#2e7d32" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Player roles table */}
      {chartData.playerRoles.length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Playing XI Breakdown</Typography>
            <Stack spacing={0.5}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '28px 1fr 56px 60px 1fr', gap: 1, px: 1, pb: 0.5 }}>
                <Typography variant="caption" color="text.disabled" fontWeight={700}>#</Typography>
                <Typography variant="caption" color="text.disabled" fontWeight={700}>Player</Typography>
                <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textAlign: 'center' }}>Role</Typography>
                <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textAlign: 'center' }}>Rating</Typography>
                <Typography variant="caption" color="text.disabled" fontWeight={700}>Key Contribution</Typography>
              </Box>
              <Divider />
              {[...chartData.playerRoles]
                .sort((a, b) => (a.battingPosition ?? 99) - (b.battingPosition ?? 99))
                .map((p, i) => (
                  <Box key={i} sx={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 56px 60px 1fr', gap: 1,
                    px: 1, py: 0.75, borderRadius: 1,
                    bgcolor: i % 2 === 0 ? 'action.hover' : 'transparent',
                    alignItems: 'center',
                  }}>
                    <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center' }}>
                      {p.battingPosition ?? '—'}
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                    <Box sx={{ textAlign: 'center' }}>
                      <Chip size="small" label={p.role}
                        sx={{ bgcolor: ROLE_COLORS[p.role] ?? '#555', color: '#fff', fontSize: 10, height: 20 }} />
                    </Box>
                    <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'center' }}
                      color={p.rating != null ? (p.rating >= 7.5 ? 'success.main' : p.rating >= 5 ? 'warning.main' : 'error.main') : 'text.disabled'}>
                      {p.rating != null ? p.rating.toFixed(1) : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{p.keyContribution}</Typography>
                  </Box>
                ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Batting order + Bowling plan */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <SportsScore fontSize="small" color="success" />
                <Typography variant="subtitle2">Suggested Batting Order</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {analysis.battingOrderSuggestion}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <EmojiEvents fontSize="small" color="primary" />
                <Typography variant="subtitle2">Bowling Plan</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {analysis.bowlingPlanSuggestion}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Skill ratings */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>XI Ratings</Typography>
          <Stack spacing={1.5}>
            {chartData.xiStrengthRadar.map(r => (
              <RatingBar key={r.skill} label={r.skill} value={r.score} />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Strengths + Concerns */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Bolt fontSize="small" color="success" />
                <Typography variant="subtitle2">Strengths</Typography>
              </Stack>
              <Stack spacing={1}>
                {analysis.strengths.map((s, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <Bolt sx={{ fontSize: 13, color: 'success.main', mt: 0.3, flexShrink: 0 }} />
                    <Typography variant="body2" color="text.secondary">{s}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <ReportProblem fontSize="small" color="warning" />
                <Typography variant="subtitle2">Concerns</Typography>
              </Stack>
              <Stack spacing={1}>
                {analysis.concerns.map((c, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <ReportProblem sx={{ fontSize: 13, color: 'warning.main', mt: 0.3, flexShrink: 0 }} />
                    <Typography variant="body2" color="text.secondary">{c}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Lightbulb fontSize="small" color="primary" />
              <Typography variant="subtitle2">Tactical Recommendations</Typography>
            </Stack>
            <Stack spacing={1}>
              {analysis.recommendations.map((r, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                  <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ mt: 0.2, flexShrink: 0 }}>
                    {i + 1}.
                  </Typography>
                  <Typography variant="body2">{r}</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
