import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Avatar, Chip, CircularProgress, Alert,
  Card, CardContent, Grid, Divider, CardActions,
} from '@mui/material';
import {
  ArrowBack, SportsCricket, CalendarMonth, LocationOn, EmojiEvents, Star, ScoreboardOutlined, YouTube,
} from '@mui/icons-material';
import { tournamentApi } from '../../api/tournamentApi';
import { matchApi } from '../../api/matchApi';
import { Tournament, MatchResultSummary } from '../../types';

export const TournamentResults: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [results, setResults] = useState<MatchResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    Promise.all([
      tournamentApi.findById(+tournamentId),
      matchApi.findResultsByTournament(+tournamentId),
    ])
      .then(([t, r]) => { setTournament(t); setResults(r); })
      .catch(() => setError('Failed to load results.'))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} size="small">Back</Button>
        {tournament?.logoUrl && (
          <Avatar src={tournament.logoUrl} variant="rounded" sx={{ width: 40, height: 40 }} />
        )}
        <Box>
          <Typography variant="h5" sx={{ lineHeight: 1.2 }}>{tournament?.name} — Results</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            {tournament?.cricketFormat && (
              <Chip
                icon={<SportsCricket sx={{ fontSize: '14px !important' }} />}
                label={tournament.cricketFormat}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {tournament?.startDate && (
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                {tournament.startDate}{tournament.endDate ? ` — ${tournament.endDate}` : ''}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {results.length === 0 && (
        <Typography color="text.secondary">No completed results yet.</Typography>
      )}

      <Grid container spacing={2}>
        {results.map(r => (
          <Grid item xs={12} sm={6} md={4} key={r.matchId}>
            <ResultCard result={r} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const ResultCard: React.FC<{ result: MatchResultSummary }> = ({ result: r }) => {
  const homeBattedFirst = r.sideBattingFirstName === r.homeTeamName;

  const scoreHome = homeBattedFirst
    ? formatScore(r.scoreBattingFirst, r.wicketsLostBattingFirst, r.oversBattingFirst)
    : formatScore(r.scoreBattingSecond, r.wicketsLostBattingSecond, r.oversBattingSecond);

  const scoreAway = homeBattedFirst
    ? formatScore(r.scoreBattingSecond, r.wicketsLostBattingSecond, r.oversBattingSecond)
    : formatScore(r.scoreBattingFirst, r.wicketsLostBattingFirst, r.oversBattingFirst);

  const homeWon = r.winningTeamName === r.homeTeamName;
  const awayWon = r.winningTeamName === r.oppositionTeamName;

  return (
    <Card variant="outlined">
      <CardContent>
        {/* Date & venue */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          {r.matchDate && (
            <Chip icon={<CalendarMonth sx={{ fontSize: '13px !important' }} />} label={String(r.matchDate)} size="small" variant="outlined" />
          )}
          {r.fieldName && (
            <Chip icon={<LocationOn sx={{ fontSize: '13px !important' }} />} label={r.fieldName} size="small" variant="outlined" />
          )}
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Scorecard */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <ScoreRow
            teamName={r.homeTeamName ?? ''}
            score={scoreHome}
            won={homeWon}
          />
          <ScoreRow
            teamName={r.oppositionTeamName ?? ''}
            score={scoreAway}
            won={awayWon}
          />
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Outcome */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {r.matchDrawn ? (
            <Chip label="Match Drawn" size="small" color="default" />
          ) : r.winningTeamName ? (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <EmojiEvents sx={{ fontSize: 16, color: 'warning.main' }} />
              <Typography variant="body2" fontWeight={600}>{r.winningTeamName}</Typography>
              {r.wonWithBonusPoint && <Chip label="Bonus Point" size="small" color="success" variant="outlined" />}
              {r.decidedOnDLS && <Chip label="DLS" size="small" color="info" variant="outlined" />}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No result</Typography>
          )}

          {r.matchOutcomeDescription && (
            <Typography variant="caption" color="text.secondary">{r.matchOutcomeDescription}</Typography>
          )}

          {r.manOfTheMatchName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <Star sx={{ fontSize: 14, color: 'warning.main' }} />
              <Typography variant="caption" color="text.secondary">
                Player of the Match: <strong>{r.manOfTheMatchName}</strong>
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
      {(r.scoringUrl || r.youtubeUrl) && (
        <CardActions sx={{ pt: 0 }}>
          {r.scoringUrl && (
            <Button
              size="small"
              startIcon={<ScoreboardOutlined />}
              href={r.scoringUrl}
              target="_blank"
              rel="noopener noreferrer"
              component="a"
            >
              Live Scoring
            </Button>
          )}
          {r.youtubeUrl && (
            <Button
              size="small"
              startIcon={<YouTube />}
              href={r.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              component="a"
              sx={{ color: '#FF0000', '&:hover': { bgcolor: 'rgba(255,0,0,0.04)' } }}
            >
              Watch
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
};

const ScoreRow: React.FC<{ teamName: string; score: string; won: boolean }> = ({ teamName, score, won }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant="body2" fontWeight={won ? 700 : 400} color={won ? 'text.primary' : 'text.secondary'}>
      {teamName}
    </Typography>
    <Typography variant="body2" fontWeight={won ? 700 : 400} color={won ? 'text.primary' : 'text.secondary'}>
      {score}
    </Typography>
  </Box>
);

function formatScore(
  runs?: number,
  wickets?: number,
  overs?: string,
): string {
  if (runs == null) return '—';
  const w = wickets != null && wickets < 10 ? `/${wickets}` : '';
  const o = overs ? ` (${overs})` : '';
  return `${runs}${w}${o}`;
}
