import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Avatar,
  Chip, Divider, Skeleton, Stack, Paper, IconButton, Tooltip,
} from '@mui/material';
import {
  ArrowBack, CalendarMonth, AccessTime, LocationOn, EmojiEvents,
  HowToVote, CheckCircle, Cancel, Remove,
  People, AssignmentInd, Share,
} from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { pollApi } from '../../api/pollApi';
import { Match } from '../../types';
import { ShareMatchDialog } from './ManageTeamResults';
import { MatchSharePanel } from '../../components/match/MatchSharePanel';

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
    : { label: 'Lost', color: 'error' };
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

  const detailUrl = `/admin/matches/${match.matchId}/detail`;
  const detailState = { teamId, returnTo: `/manage-club/teams/${teamId}/schedule` };

  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [pollOpen, setPollOpen] = useState<boolean | null>(null);
  const [announced, setAnnounced] = useState<boolean | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!match.matchId) return;
    pollApi.getPoll(match.matchId, teamId)
      .then(poll => {
        if (!poll) return;
        setPollOpen(poll.open ?? false);
        setConfirmedCount(poll.availability?.filter((a: any) => a.status === 'YES').length ?? 0);
        setTotalCount(poll.availability?.length ?? 0);
      })
      .catch(() => {});
    matchApi.getTeamSheet(match.matchId)
      .then(sides => {
        const side = sides.find(s => s.teamId === teamId);
        setAnnounced(side?.teamAnnounced ?? false);
      })
      .catch(() => {});
  }, [match.matchId, teamId]);

  return (
    <>
    <Card
      variant="outlined"
      onClick={() => onNavigate(detailUrl, { state: detailState })}
      sx={{
        mb: 3, cursor: 'pointer',
        background: 'linear-gradient(135deg, #0d2b1a 0%, #1a5c35 100%)',
        color: '#e4f4df',
        borderColor: '#2a7a4a',
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: '#4caf50' },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.5 }}>
            Next Match
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {countdownLabel && (
              <Chip
                label={countdownLabel}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit', fontWeight: 'bold' }}
              />
            )}
            <IconButton
              size="small"
              onClick={e => { e.stopPropagation(); setShareOpen(true); }}
              sx={{ color: 'rgba(255,255,255,0.75)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
            >
              <Share fontSize="small" />
            </IconButton>
          </Box>
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
        {pollOpen !== null && (
          <Box
            onClick={e => { e.stopPropagation(); onNavigate(detailUrl, { state: { ...detailState, initialTab: 0 } }); }}
            sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
              bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1, px: 1.5, py: 0.75,
              border: '1px solid rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
              transition: 'background-color 0.15s',
            }}
          >
            <People sx={{ fontSize: 16, opacity: 0.8 }} />
            <Typography variant="body2" sx={{ flex: 1 }}>Availability</Typography>
            <Chip
              label={pollOpen ? 'Poll Open' : 'Poll Closed'}
              size="small"
              color={pollOpen ? 'success' : 'default'}
              variant="outlined"
              sx={{ pointerEvents: 'none', mr: confirmedCount !== null ? 0.5 : 0 }}
            />
            {confirmedCount !== null && totalCount !== null && (
              <Chip
                label={`${confirmedCount} / ${totalCount}`}
                size="small"
                color={confirmedCount > 0 ? 'success' : 'default'}
                sx={{ fontWeight: 'bold', pointerEvents: 'none' }}
              />
            )}
          </Box>
        )}
        {announced !== null && (
          <Box
            onClick={e => { e.stopPropagation(); onNavigate(detailUrl, { state: { ...detailState, initialTab: 1 } }); }}
            sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
              bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1, px: 1.5, py: 0.75,
              border: '1px solid rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
              transition: 'background-color 0.15s',
            }}
          >
            <AssignmentInd sx={{ fontSize: 16, opacity: 0.8 }} />
            <Typography variant="body2" sx={{ flex: 1 }}>Team Sheet</Typography>
            <Chip
              label={announced ? 'Announced' : 'Not Announced'}
              size="small"
              color={announced ? 'success' : 'default'}
              sx={{ fontWeight: 'bold', pointerEvents: 'none' }}
            />
          </Box>
        )}
        </Stack>
      </CardContent>
    </Card>
    <MatchSharePanel open={shareOpen} match={match} teamId={teamId} onClose={() => setShareOpen(false)} />
    </>
  );
}

// ── Compact match row ──────────────────────────────────────────────────────────

function MatchRow({ match, teamId, onNavigate, onShare }: {
  match: Match;
  teamId: number;
  onNavigate: ReturnType<typeof useNavigate>;
  onShare: (m: Match) => void;
}) {
  const [upcomingShareOpen, setUpcomingShareOpen] = useState(false);
  const isHome = match.homeTeamId === teamId;
  const opponent = isHome ? match.oppositionTeamName : match.homeTeamName;
  const opponentLogo = isHome ? match.oppositionTeamLogoUrl : match.homeTeamLogoUrl;
  const result = match.matchCompleted ? resultLine(match, teamId) : null;
  const upcoming = !match.matchCompleted;

  const detailState = { teamId, returnTo: `/manage-club/teams/${teamId}/schedule` };
  const toDetail = (tab: number) =>
    onNavigate(`/admin/matches/${match.matchId}/detail`, { state: { ...detailState, initialTab: tab } });

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5, cursor: 'pointer', position: 'relative',
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={() => toDetail(result ? 2 : 0)}
    >
      {result && (
        <Chip
          label={result.label}
          color={result.color}
          size="small"
          icon={result.color === 'success' ? <CheckCircle /> : result.color === 'error' ? <Cancel /> : <Remove />}
          sx={{ position: 'absolute', top: 8, left: 8, fontSize: '0.78rem', height: 26 }}
        />
      )}
      {!upcoming && (
        <Button size="small" startIcon={<Share />}
          sx={{ position: 'absolute', top: 4, right: 4, minWidth: 0 }}
          onClick={e => { e.stopPropagation(); onShare(match); }}>
          Share
        </Button>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: result ? 3.5 : 0 }}>
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
          {upcoming && (
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75, justifyContent: 'flex-end' }}>
              <Button size="small" startIcon={<HowToVote />}
                onClick={e => { e.stopPropagation(); toDetail(0); }}>
                Availability
              </Button>
              <Button size="small" startIcon={<AssignmentInd />}
                onClick={e => { e.stopPropagation(); toDetail(1); }}>
                Team Sheet
              </Button>
              <Tooltip title="Share match">
                <IconButton size="small" onClick={e => { e.stopPropagation(); setUpcomingShareOpen(true); }} sx={{ color: 'text.secondary' }}>
                  <Share fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Box>
      {upcoming && upcomingShareOpen && (
        <MatchSharePanel
          open={upcomingShareOpen}
          match={match}
          teamId={teamId}
          onClose={() => setUpcomingShareOpen(false)}
        />
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
  const [shareMatch, setShareMatch] = useState<Match | null>(null);

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
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/manage-club/teams')} />
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/manage-club/teams')} sx={{ flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" noWrap sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>Schedule</Typography>
          <Typography variant="caption" color="text.secondary">{teamName}</Typography>
        </Box>
        <Chip label={`${matches.length} match${matches.length !== 1 ? 'es' : ''}`} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
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
                  <MatchRow key={m.matchId} match={m} teamId={id} onNavigate={navigate} onShare={setShareMatch} />
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
                  <MatchRow key={m.matchId} match={m} teamId={id} onNavigate={navigate} onShare={setShareMatch} />
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}

      <ShareMatchDialog match={shareMatch} teamId={id} teamName={teamName} onClose={() => setShareMatch(null)} />
    </Box>
  );
};
