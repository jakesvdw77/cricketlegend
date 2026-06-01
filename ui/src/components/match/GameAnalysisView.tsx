import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, Grid, IconButton, LinearProgress, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  AutoAwesome, Bolt, ContentCopy, EmojiEvents, Lightbulb,
  PhoneAndroid, PictureAsPdf, Refresh, SportsScore, Star, ThumbUp,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { matchApi } from '../../api/matchApi';
import { MatchAnalysis } from '../../types';
import { generateAnalysisPdf, printAnalysisAsScreen } from '../../utils/matchPdf';

interface Props {
  matchId: number;
  teamId: number;
  teamName: string;
  matchTitle: string;
}

const RATING_COLOR = (v: number) => v >= 7.5 ? 'success' : v >= 5 ? 'warning' : 'error';
const PIE_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4', '#795548'];

const RatingBar: React.FC<{ label: string; value: number | null }> = ({ label, value }) => {
  const v = value ?? 0;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" fontWeight={700} color={`${RATING_COLOR(v)}.main`}>
          {value != null ? `${v.toFixed(1)}/10` : '—'}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={v * 10}
        color={RATING_COLOR(v)}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
};

const CompareTable: React.FC<{
  myName: string;
  oppName: string;
  rows: Array<{ label: string; myVal: string | number; oppVal: string | number; highlight?: 'my' | 'opp' | 'none' }>;
}> = ({ myName, oppName, rows }) => (
  <Box sx={{ width: '100%' }}>
    {/* Header row */}
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', mb: 1 }}>
      <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ pr: 1, textAlign: 'right' }} noWrap>
        {myName}
      </Typography>
      <Box sx={{ width: 16 }} />
      <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ pl: 1 }} noWrap>
        {oppName}
      </Typography>
    </Box>
    <Divider sx={{ mb: 1 }} />
    {rows.map(({ label, myVal, oppVal, highlight = 'none' }) => (
      <Box
        key={label}
        sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', py: 0.5 }}
      >
        <Typography
          variant="body2"
          fontWeight={highlight === 'my' ? 800 : 400}
          color={highlight === 'my' ? 'success.main' : 'text.primary'}
          sx={{ textAlign: 'right', pr: 1 }}
        >
          {myVal}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', px: 0.5, whiteSpace: 'nowrap' }}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={highlight === 'opp' ? 800 : 400}
          color={highlight === 'opp' ? 'success.main' : 'text.primary'}
          sx={{ pl: 1 }}
        >
          {oppVal}
        </Typography>
      </Box>
    ))}
  </Box>
);

export const GameAnalysisView: React.FC<Props> = ({ matchId, teamId, teamName, matchTitle }) => {
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    matchApi.getAnalysis(matchId, teamId)
      .then(setAnalysis)
      .catch(e => setError(e?.response?.data?.message ?? e?.message ?? 'Failed to generate analysis'))
      .finally(() => setLoading(false));
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
      const url = generateAnalysisPdf(analysis, teamName, matchTitle);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis-${teamName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
        <CircularProgress size={48} />
        <Typography variant="body2" color="text.secondary">
          Analysing match data for {teamName}…
        </Typography>
        <Typography variant="caption" color="text.disabled">This may take up to 15 seconds</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button startIcon={<Refresh />} variant="outlined" onClick={load}>Try Again</Button>
      </Box>
    );
  }

  if (!analysis) return null;

  const { teamPerformance, keyInsights, playerHighlights, recommendations, chartData } = analysis;
  const { myTeam, opposition } = chartData.teamComparison;

  return (
    <Box sx={{ pb: 2 }} ref={contentRef}>
      {/* Header strip */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AutoAwesome color="primary" fontSize="small" />
          <Typography variant="subtitle2" color="text.secondary">AI Analysis — {teamName}</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title={copied ? 'Copied!' : 'Copy chart data JSON'}>
            <IconButton size="small" onClick={copyJson}>
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export structured PDF">
            <IconButton size="small" onClick={exportPdf} disabled={exporting}>
              <PictureAsPdf fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print screen as PDF">
            <IconButton size="small" onClick={printScreen} disabled={printing}>
              {printing ? <CircularProgress size={14} /> : <PhoneAndroid fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Regenerate">
            <IconButton size="small" onClick={load}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Match summary */}
      <Card variant="outlined" sx={{ mb: 2, bgcolor: 'action.hover' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="body2">{analysis.matchSummary}</Typography>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Performance ratings */}
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <SportsScore fontSize="small" color="primary" />
                <Typography variant="subtitle2">Performance Ratings</Typography>
              </Stack>
              <Stack spacing={1.5}>
                <RatingBar label="Batting" value={teamPerformance.battingRating} />
                <RatingBar label="Bowling" value={teamPerformance.bowlingRating} />
                <RatingBar label="Overall" value={teamPerformance.overallRating} />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                {teamPerformance.verdict}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Team comparison */}
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <EmojiEvents fontSize="small" color="primary" />
                <Typography variant="subtitle2">Match Comparison</Typography>
              </Stack>
              <CompareTable
                myName={myTeam.name}
                oppName={opposition.name}
                rows={[
                  {
                    label: 'Runs',
                    myVal: myTeam.runs ?? '—',
                    oppVal: opposition.runs ?? '—',
                    highlight: (myTeam.runs != null && opposition.runs != null)
                      ? myTeam.runs > opposition.runs ? 'my' : myTeam.runs < opposition.runs ? 'opp' : 'none'
                      : 'none',
                  },
                  {
                    label: 'Wickets',
                    myVal: myTeam.wickets ?? '—',
                    oppVal: opposition.wickets ?? '—',
                    highlight: (myTeam.wickets != null && opposition.wickets != null)
                      ? myTeam.wickets < opposition.wickets ? 'my' : myTeam.wickets > opposition.wickets ? 'opp' : 'none'
                      : 'none',
                  },
                  {
                    label: 'Run Rate',
                    myVal: myTeam.runRate != null ? myTeam.runRate.toFixed(2) : '—',
                    oppVal: opposition.runRate != null ? opposition.runRate.toFixed(2) : '—',
                    highlight: (myTeam.runRate != null && opposition.runRate != null)
                      ? myTeam.runRate > opposition.runRate ? 'my' : myTeam.runRate < opposition.runRate ? 'opp' : 'none'
                      : 'none',
                  },
                  { label: 'Overs', myVal: myTeam.overs ?? '—', oppVal: opposition.overs ?? '—' },
                ]}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Batting contributions chart */}
      {chartData.battingContributions.length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Batting Contributions</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={chartData.battingContributions}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 80, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="player" tick={{ fontSize: 11 }} width={80} />
                <RTooltip
                  formatter={(val: number, name: string) => [val, name === 'runs' ? 'Runs' : 'Balls']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="runs" name="runs" fill="#4caf50" radius={[0, 4, 4, 0]}>
                  {chartData.battingContributions.map((entry, i) => (
                    <Cell key={i} fill={entry.isTopPerformer ? '#2e7d32' : '#4caf50'} />
                  ))}
                </Bar>
                <Bar dataKey="balls" name="balls" fill="#90caf9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }} flexWrap="wrap">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 10, height: 10, bgcolor: '#2e7d32', borderRadius: 0.5 }} />
                <Typography variant="caption">Top performer</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 10, height: 10, bgcolor: '#4caf50', borderRadius: 0.5 }} />
                <Typography variant="caption">Runs</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 10, height: 10, bgcolor: '#90caf9', borderRadius: 0.5 }} />
                <Typography variant="caption">Balls faced</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Bowling analysis chart */}
      {chartData.bowlingAnalysis.length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Bowling Performance</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={chartData.bowlingAnalysis}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 80, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="player" tick={{ fontSize: 11 }} width={80} />
                <RTooltip
                  formatter={(val: number, name: string) => [val, name === 'wickets' ? 'Wickets' : 'Runs conceded']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="wickets" name="wickets" fill="#1565c0" radius={[0, 4, 4, 0]}>
                  {chartData.bowlingAnalysis.map((entry, i) => (
                    <Cell key={i} fill={entry.isTopPerformer ? '#0d47a1' : '#1565c0'} />
                  ))}
                </Bar>
                <Bar dataKey="runs" name="runs" fill="#ef9a9a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {chartData.bowlingAnalysis.map(b => (
                <Chip
                  key={b.player}
                  size="small"
                  label={`${b.player}: ${b.economy.toFixed(1)} econ`}
                  variant="outlined"
                  color={b.isTopPerformer ? 'primary' : 'default'}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Dismissal breakdown */}
        {chartData.dismissalBreakdown.length > 0 && (
          <Grid item xs={12} sm={5}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>How We Got Out</Typography>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={chartData.dismissalBreakdown}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      label={({ type, count }: { type: string; count: number }) => `${type} (${count})`}
                      labelLine={false}
                    >
                      {chartData.dismissalBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Key insights */}
        <Grid item xs={12} sm={chartData.dismissalBreakdown.length > 0 ? 7 : 12}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Lightbulb fontSize="small" color="warning" />
                <Typography variant="subtitle2">Key Insights</Typography>
              </Stack>
              <Stack spacing={1}>
                {keyInsights.map((insight, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <Bolt sx={{ fontSize: 14, color: 'warning.main', mt: 0.3, flexShrink: 0 }} />
                    <Typography variant="body2" color="text.secondary">{insight}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Player highlights */}
      {playerHighlights.length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Star fontSize="small" color="primary" />
              <Typography variant="subtitle2">Player Highlights</Typography>
            </Stack>
            <Stack spacing={1}>
              {playerHighlights.map((p, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                  <Chip
                    size="small"
                    label={p.role}
                    color={p.role === 'BAT' ? 'success' : 'primary'}
                    sx={{ fontSize: 10, height: 20, flexShrink: 0 }}
                  />
                  {p.isStandout && (
                    <EmojiEvents sx={{ fontSize: 14, color: 'warning.main', mt: 0.3, flexShrink: 0 }} />
                  )}
                  <Typography variant="body2">
                    <strong>{p.name}</strong> — {p.achievement}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <ThumbUp fontSize="small" color="success" />
              <Typography variant="subtitle2">Recommendations</Typography>
            </Stack>
            <Stack spacing={1}>
              {recommendations.map((rec, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                  <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ mt: 0.2, flexShrink: 0 }}>
                    {i + 1}.
                  </Typography>
                  <Typography variant="body2">{rec}</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
