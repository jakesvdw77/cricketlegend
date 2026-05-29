import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CardActions, Button, Avatar,
  Chip, Divider, Skeleton, Stack, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress,
} from '@mui/material';
import {
  ArrowBack, CalendarMonth, AccessTime, LocationOn, EmojiEvents,
  SportsScore, Groups, HowToVote, CheckCircle, Cancel, Remove,
  Assignment, WhatsApp,
} from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { Match, MatchResult } from '../../types';
import WhatsAppTemplate from '../admin/templates/WhatsAppTemplate';

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly',
  POOL: 'Pool',
  PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16',
  QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final',
  FINAL: 'Final',
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const fmtTime = (t?: string) => {
  if (!t) return null;
  const [h, m] = t.split(':');
  const d = new Date(); d.setHours(+h, +m);
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
};

const isUpcoming = (m: Match) => !m.matchCompleted;

const matchSortAsc = (a: Match, b: Match) => {
  const da = (a.matchDate ?? '') + (a.scheduledStartTime ?? '');
  const db = (b.matchDate ?? '') + (b.scheduledStartTime ?? '');
  return da.localeCompare(db);
};

const matchSortDesc = (a: Match, b: Match) => -matchSortAsc(a, b);

function resultLine(m: Match, teamId: number): { label: string; color: 'success' | 'error' | 'default' } {
  if (m.noResult) return { label: 'No Result', color: 'default' };
  if (m.matchDrawn) return { label: 'Draw', color: 'default' };
  if (m.forfeited) return { label: 'Forfeited', color: 'default' };
  if (!m.matchCompleted) return { label: 'Upcoming', color: 'default' };
  const desc = m.matchOutcomeDescription ?? '';
  const myTeamName = m.homeTeamId === teamId ? m.homeTeamName ?? '' : m.oppositionTeamName ?? '';
  const won = desc.toLowerCase().includes('won') && desc.toLowerCase().includes(myTeamName.toLowerCase());
  return won
    ? { label: 'Won', color: 'success' }
    : { label: desc || 'Completed', color: 'error' };
}

function ScoreBlock({ m: m }: { m: Match }) {
  const s1 = m.scoreBattingFirst;
  const w1 = m.wicketsLostBattingFirst;
  const o1 = m.oversBattingFirst;
  const s2 = m.scoreBattingSecond;
  const w2 = m.wicketsLostBattingSecond;
  const o2 = m.oversBattingSecond;
  if (s1 == null && s2 == null) return null;
  const fmt = (s?: number, w?: number, o?: string) =>
    s != null ? `${s}/${w ?? 0}${o ? ` (${o})` : ''}` : null;
  return (
    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
      {[fmt(s1, w1, o1), fmt(s2, w2, o2)].filter(Boolean).join(' — ')}
    </Typography>
  );
}

// ── Next Match Hero ────────────────────────────────────────────────────────────

function NextMatchHero({ match, teamId, onNavigate }: { match: Match; teamId: number; onNavigate: ReturnType<typeof useNavigate> }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const matchDay = match.matchDate ? new Date(match.matchDate + 'T00:00:00') : null;
  const daysUntil = matchDay ? Math.round((matchDay.getTime() - today.getTime()) / 86_400_000) : null;

  const countdownLabel = daysUntil == null ? null
    : daysUntil === 0 ? 'Today!'
    : daysUntil === 1 ? 'Tomorrow'
    : daysUntil > 1 ? `In ${daysUntil} days`
    : 'Result pending';

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 3,
        background: 'linear-gradient(135deg, #0d2b1a 0%, #1a5c35 100%)',
        color: '#e4f4df',
        borderColor: '#2a7a4a',
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.5 }}>
            Next Match
          </Typography>
          {countdownLabel && (
            <Chip
              label={countdownLabel}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit', fontWeight: 'bold' }}
            />
          )}
        </Box>

        {/* Teams row */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Avatar
              src={match.homeTeamLogoUrl}
              sx={{ width: 56, height: 56, mx: 'auto', mb: 0.75, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 22 }}
            >
              {match.homeTeamAbbreviation ?? match.homeTeamName?.charAt(0)}
            </Avatar>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
              {match.homeTeamName ?? '—'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>Home</Typography>
          </Box>

          <Typography variant="h5" fontWeight="bold" sx={{ opacity: 0.9, flexShrink: 0 }}>vs</Typography>

          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Avatar
              src={match.oppositionTeamLogoUrl}
              sx={{ width: 56, height: 56, mx: 'auto', mb: 0.75, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 22 }}
            >
              {match.oppositionTeamAbbreviation ?? match.oppositionTeamName?.charAt(0)}
            </Avatar>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
              {match.oppositionTeamName ?? '—'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>Away</Typography>
          </Box>
        </Stack>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 1.5 }} />

        {/* Meta */}
        <Stack spacing={0.75}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth sx={{ fontSize: 16, opacity: 0.75 }} />
            <Typography variant="body2">{fmtDate(match.matchDate)}</Typography>
            {fmtTime(match.scheduledStartTime) && (
              <>
                <AccessTime sx={{ fontSize: 16, opacity: 0.75, ml: 1 }} />
                <Typography variant="body2">{fmtTime(match.scheduledStartTime)}</Typography>
              </>
            )}
          </Box>
          {match.fieldName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOn sx={{ fontSize: 16, opacity: 0.75 }} />
              <Typography variant="body2">{match.fieldName}</Typography>
            </Box>
          )}
          {match.tournamentName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEvents sx={{ fontSize: 16, opacity: 0.75 }} />
              <Typography variant="body2">
                {match.tournamentName}
                {match.matchStage ? ` — ${STAGE_LABELS[match.matchStage] ?? match.matchStage}` : ''}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 1.5, gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Groups />}
          onClick={() => onNavigate(`/admin/matches/${match.matchId}/teamsheet`, { state: { teamId, returnTo: `/manage-club/teams/${teamId}/schedule` } })}
        >
          Team Sheet
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<HowToVote />}
          onClick={() => onNavigate(`/admin/matches/${match.matchId}/availability`, { state: { teamId, returnTo: `/manage-club/teams/${teamId}/schedule` } })}
        >
          Availability
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SportsScore />}
          onClick={() => onNavigate(`/admin/matches/${match.matchId}/result`)}
        >
          Result
        </Button>
      </CardActions>
    </Card>
  );
}

// ── Scorecard dialog ──────────────────────────────────────────────────────────

function ScorecardDialog({ match, onClose }: { match: Match | null; onClose: () => void }) {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!match?.matchId) return;
    setResult(null);
    setLoading(true);
    matchApi.getResult(match.matchId)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [match?.matchId]);

  const open = !!match;

  const firstTeamName  = result?.sideBattingFirstName ?? match?.homeTeamName ?? '1st Innings';
  const secondTeamName = (result?.sideBattingFirstId === match?.homeTeamId
    ? match?.oppositionTeamName
    : match?.homeTeamName) ?? '2nd Innings';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WhatsApp sx={{ color: '#25D366' }} />
        Scorecard — {match?.homeTeamName} vs {match?.oppositionTeamName}
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {!loading && !result && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No result data available for this match.
          </Typography>
        )}
        {!loading && result && match && (
          <WhatsAppTemplate
            match={match}
            result={result}
            tournament={null}
            firstTeamName={firstTeamName}
            secondTeamName={secondTeamName}
            firstCard={result.scoreCard?.teamA ?? {}}
            secondCard={result.scoreCard?.teamB ?? {}}
            motmName={result.manOfTheMatchName ?? null}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Compact match row ──────────────────────────────────────────────────────────

function MatchRow({ match, teamId, onNavigate, onScorecard }: {
  match: Match;
  teamId: number;
  onNavigate: ReturnType<typeof useNavigate>;
  onScorecard: (m: Match) => void;
}) {
  const isHome = match.homeTeamId === teamId;
  const opponent = isHome ? match.oppositionTeamName : match.homeTeamName;
  const opponentLogo = isHome ? match.oppositionTeamLogoUrl : match.homeTeamLogoUrl;
  const result = match.matchCompleted ? resultLine(match, teamId) : null;
  const upcoming = !match.matchCompleted;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        ...(result && { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }),
      }}
      onClick={result ? () => onNavigate(`/admin/matches/${match.matchId}/result`) : undefined}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar src={opponentLogo} sx={{ width: 36, height: 36, flexShrink: 0, fontSize: 14 }}>
          {opponent?.charAt(0)}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" fontWeight="bold" noWrap>
              {isHome ? 'vs' : '@'} {opponent}
            </Typography>
            {match.matchStage && (
              <Chip label={STAGE_LABELS[match.matchStage] ?? match.matchStage} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {fmtDate(match.matchDate)}{fmtTime(match.scheduledStartTime) ? ` · ${fmtTime(match.scheduledStartTime)}` : ''}
            {match.fieldName ? ` · ${match.fieldName}` : ''}
          </Typography>
          {match.matchCompleted && <ScoreBlock m={match} />}
          {match.matchOutcomeDescription && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{match.matchOutcomeDescription}</Typography>
          )}
        </Box>

        {result && (
          <Chip
            label={result.label}
            color={result.color}
            size="small"
            icon={result.color === 'success' ? <CheckCircle /> : result.color === 'error' ? <Cancel /> : <Remove />}
            sx={{ flexShrink: 0 }}
          />
        )}
      </Box>

      {upcoming && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button size="small" variant="outlined" startIcon={<Groups />}
            onClick={() => onNavigate(`/admin/matches/${match.matchId}/teamsheet`, { state: { teamId, returnTo: `/manage-club/teams/${teamId}/schedule` } })}>
            Team Sheet
          </Button>
          <Button size="small" variant="outlined" startIcon={<HowToVote />}
            onClick={() => onNavigate(`/admin/matches/${match.matchId}/availability`, { state: { teamId, returnTo: `/manage-club/teams/${teamId}/schedule` } })}>
            Availability
          </Button>
        </Box>
      )}
      {!upcoming && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button size="small" variant="outlined" startIcon={<Assignment />}
            onClick={e => { e.stopPropagation(); onNavigate(`/matches/${match.matchId}/teamsheet`, { state: { teamId, returnTo: `/manage-club/teams/${teamId}/schedule` } }); }}>
            Team Sheet
          </Button>
          <Button size="small" variant="outlined" startIcon={<WhatsApp sx={{ color: '#25D366' }} />}
            onClick={e => { e.stopPropagation(); onScorecard(match); }}>
            Scorecard
          </Button>
        </Box>
      )}
    </Paper>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export const ManageClubSchedule: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const teamName: string = (location.state as any)?.teamName ?? 'Team';

  const id = Number(teamId);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [scorecardMatch, setScorecardMatch] = useState<Match | null>(null);

  useEffect(() => {
    matchApi.findAll()
      .then(all => setMatches(
        all.filter(m => m.homeTeamId === id || m.oppositionTeamId === id)
      ))
      .finally(() => setLoading(false));
  }, [id]);

  const upcoming = matches.filter(isUpcoming).sort(matchSortAsc);
  const past = matches.filter(m => !isUpcoming(m)).sort(matchSortDesc);
  const nextMatch = upcoming[0] ?? null;
  const futureRest = upcoming.slice(1);

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/manage-club/teams')}>Back</Button>
          <Typography variant="h5">Schedule</Typography>
        </Box>
        <Skeleton variant="rounded" height={280} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={72} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={72} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={72} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/manage-club/teams')}>Back</Button>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" noWrap>Schedule</Typography>
          <Typography variant="caption" color="text.secondary">{teamName}</Typography>
        </Box>
        <Chip label={`${matches.length} match${matches.length !== 1 ? 'es' : ''}`} size="small" variant="outlined" />
      </Box>

      {matches.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <CalendarMonth sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6">No matches scheduled</Typography>
          <Typography variant="body2">Matches will appear here once they are added.</Typography>
        </Box>
      ) : (
        <>
          {/* Next match hero */}
          {nextMatch ? (
            <NextMatchHero match={nextMatch} teamId={id} onNavigate={navigate} />
          ) : (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">No upcoming matches.</Typography>
            </Paper>
          )}

          {/* Remaining upcoming */}
          {futureRest.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                Upcoming
              </Typography>
              <Stack spacing={1}>
                {futureRest.map(m => (
                  <MatchRow key={m.matchId} match={m} teamId={id} onNavigate={navigate} onScorecard={setScorecardMatch} />
                ))}
              </Stack>
            </Box>
          )}

          {/* Past results */}
          {past.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                Results
              </Typography>
              <Stack spacing={1}>
                {past.map(m => (
                  <MatchRow key={m.matchId} match={m} teamId={id} onNavigate={navigate} onScorecard={setScorecardMatch} />
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}

      <ScorecardDialog match={scorecardMatch} onClose={() => setScorecardMatch(null)} />
    </Box>
  );
};
