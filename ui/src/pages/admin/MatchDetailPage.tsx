import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Tab, Tabs, Avatar,
  CircularProgress, Stack, Divider,
  Tooltip, IconButton, Alert, Chip,
} from '@mui/material';
import {
  ArrowBack, CalendarMonth, AccessTime, LocationOn,
  EmojiEvents, Groups, HowToVote, SportsScore,
  Share, CheckCircle, RecordVoiceOver,
} from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { Match } from '../../types';
import { Teamsheet } from './Teamsheet';
import { MatchAvailabilityManager } from './MatchAvailabilityManager';
import { MatchResultCaptureContent } from './MatchResultCapture';
import { MatchSharePanel } from '../../components/match/MatchSharePanel';

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
};

const fmtTime = (t?: string) => (t ? t.substring(0, 5) : null);

// ── Main page ─────────────────────────────────────────────────────────────────

export const MatchDetailPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as { teamId?: number; returnTo?: string; initialTab?: number };
  const teamId: number | undefined = state.teamId;
  const returnTo: string = state.returnTo ?? '/manage-club/schedule';

  const id = Number(matchId);
  const [match, setMatch] = useState<Match | null>(null);
  const [tab, setTab] = useState<number>(state.initialTab ?? 0);
  const [shareOpen, setShareOpen] = useState(false);
  const [availCount, setAvailCount] = useState<{ confirmed: number; total: number; pollOpen: boolean } | null>(null);
  const [teamAnnounced, setTeamAnnounced] = useState(false);

  useEffect(() => {
    matchApi.findById(id).then(setMatch).catch(() => {});
    matchApi.getTeamSheet(id)
      .then(sides => {
        const relevant = teamId
          ? sides.find(s => s.teamId === teamId)
          : sides[0];
        setTeamAnnounced(relevant?.teamAnnounced ?? false);
      })
      .catch(() => {});
  }, [id, teamId]);


  return (
    <Box sx={{ pb: 4 }}>
      {/* Back button */}
      <Box sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBack />} size="small" onClick={() => navigate(returnTo)}>
          Back
        </Button>
      </Box>

      {/* Match header */}
      {match ? (
        <Box
          onClick={() => navigate(`/matches/${id}/teamsheet`)}
          sx={{
            mb: 2, p: 2, borderRadius: 2, position: 'relative',
            background: 'linear-gradient(135deg, #0d2b1a 0%, #1a5c35 100%)',
            color: '#e4f4df',
            cursor: 'pointer',
            '&:hover': { opacity: 0.9 },
          }}
        >
          {/* Share icon — top-right corner */}
          <Tooltip title="Share match">
            <IconButton
              size="small"
              onClick={e => { e.stopPropagation(); setShareOpen(true); }}
              sx={{
                position: 'absolute', top: 8, right: 8,
                color: 'rgba(255,255,255,0.75)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', opacity: 1 },
              }}
            >
              <Share fontSize="small" />
            </IconButton>
          </Tooltip>

          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            {/* Home team */}
            <Box sx={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
              <Avatar
                src={match.homeTeamLogoUrl}
                sx={{ width: 48, height: 48, mx: 'auto', mb: 0.5, bgcolor: 'rgba(255,255,255,0.15)', fontSize: 18 }}
              >
                {match.homeTeamAbbreviation ?? match.homeTeamName?.charAt(0)}
              </Avatar>
              <Typography variant="body2" fontWeight="bold" noWrap>{match.homeTeamName}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Home</Typography>
            </Box>

            <Typography variant="h6" fontWeight="bold" sx={{ opacity: 0.85, flexShrink: 0 }}>vs</Typography>

            {/* Away team */}
            <Box sx={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
              <Avatar
                src={match.oppositionTeamLogoUrl}
                sx={{ width: 48, height: 48, mx: 'auto', mb: 0.5, bgcolor: 'rgba(255,255,255,0.15)', fontSize: 18 }}
              >
                {match.oppositionTeamAbbreviation ?? match.oppositionTeamName?.charAt(0)}
              </Avatar>
              <Typography variant="body2" fontWeight="bold" noWrap>{match.oppositionTeamName}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Away</Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 1.5 }} />

          <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarMonth sx={{ fontSize: 14, opacity: 0.75 }} />
              <Typography variant="caption">{fmtDate(match.matchDate)}</Typography>
            </Box>
            {fmtTime(match.scheduledStartTime) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime sx={{ fontSize: 14, opacity: 0.75 }} />
                <Typography variant="caption">{fmtTime(match.scheduledStartTime)}</Typography>
              </Box>
            )}
            {match.fieldName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOn sx={{ fontSize: 14, opacity: 0.75 }} />
                <Typography variant="caption">{match.fieldName}</Typography>
              </Box>
            )}
            {match.tournamentName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EmojiEvents sx={{ fontSize: 14, opacity: 0.75 }} />
                <Typography variant="caption">
                  {match.tournamentName}
                  {match.matchStage ? ` — ${STAGE_LABELS[match.matchStage] ?? match.matchStage}` : ''}
                </Typography>
              </Box>
            )}
          </Stack>

          {!match.matchCompleted && (teamAnnounced || availCount?.pollOpen) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
              {teamAnnounced ? (
                <Chip
                  icon={<RecordVoiceOver sx={{ fontSize: '16px !important' }} />}
                  label="Team Announced"
                  color="info"
                  variant="outlined"
                  sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'inherit', borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', height: 32, px: 0.5 }}
                />
              ) : (
                <Chip
                  icon={<CheckCircle sx={{ fontSize: '16px !important' }} />}
                  label={`${availCount!.confirmed} / ${availCount!.total} confirmed available`}
                  color={availCount!.confirmed > 0 ? 'success' : 'default'}
                  variant="outlined"
                  sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'inherit', borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', height: 32, px: 0.5 }}
                />
              )}
            </Box>
          )}

          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, opacity: 0.5, fontSize: '0.65rem', letterSpacing: 0.5 }}>
            Tap to view both sides
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        centered
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab icon={<HowToVote fontSize="small" />} iconPosition="start" label="Availability" />
        <Tab icon={<Groups fontSize="small" />} iconPosition="start" label="Team Sheet" />
        <Tab icon={<SportsScore fontSize="small" />} iconPosition="start" label="Result" disabled={!match?.matchCompleted} />
      </Tabs>

      {/* Tab content */}
      {tab === 0 && (
        <MatchAvailabilityManager
          embedded
          preselectedTeamIdProp={teamId}
          onAvailabilityCount={(confirmed, total, pollOpen) => setAvailCount({ confirmed, total, pollOpen })}
        />
      )}
      {tab === 1 && (
        <Teamsheet embedded restrictToTeamIdProp={teamId} onAnnouncedChange={setTeamAnnounced} />
      )}
      {tab === 2 && (
        <MatchResultCaptureContent
          matchId={id}
          onBack={() => navigate(returnTo)}
          sticky={false}
        />
      )}

      {match && (
        <MatchSharePanel
          open={shareOpen}
          match={match}
          teamId={teamId}
          onClose={() => setShareOpen(false)}
        />
      )}
    </Box>
  );
};
