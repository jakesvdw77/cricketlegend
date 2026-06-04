import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, Avatar, Divider,
} from '@mui/material';
import {
  HowToVote, CheckCircle, Cancel, HelpOutline, CalendarMonth, AccessTime,
  SportsCricket, LocationOn, EmojiEvents, Groups, AssignmentInd,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { pollApi } from '../../api/pollApi';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { AvailabilityStatus, MatchPoll, MatchSide, Player } from '../../types';

const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  YES: 'Available',
  NO: 'Not Available',
  UNSURE: 'Unsure',
};
const STATUS_COLORS: Record<AvailabilityStatus, 'success' | 'error' | 'warning'> = {
  YES: 'success',
  NO: 'error',
  UNSURE: 'warning',
};
const STATUS_ICONS: Record<AvailabilityStatus, React.ReactElement> = {
  YES: <CheckCircle fontSize="small" />,
  NO: <Cancel fontSize="small" />,
  UNSURE: <HelpOutline fontSize="small" />,
};

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

interface PollEntry {
  poll: MatchPoll;
  myStatus?: AvailabilityStatus;
}

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

const getMondayKey = (dateStr?: string): string => {
  if (!dateStr) return '9999-12-31';
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtWeekLabel = (mondayKey: string, todayMondayKey: string): string => {
  const mon = new Date(mondayKey + 'T00:00:00');
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
  const range = `${fmt(mon)} – ${fmt(sun)}`;
  return mondayKey === todayMondayKey ? `This Week  ·  ${range}` : range;
};

export const MyAvailability: React.FC = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Player | null>(null);

  // Match detail dialog
  const [selected, setSelected] = useState<PollEntry | null>(null);
  const [teamSides, setTeamSides] = useState<MatchSide[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [polls, player] = await Promise.all([
        pollApi.getMyOpenPolls(),
        playerApi.findMe(),
      ]);
      setMe(player);

      const seen = new Set<number>();
      const loaded: PollEntry[] = [];

      for (const poll of polls) {
        const matchId = poll.matchId!;
        if (seen.has(matchId)) continue;
        seen.add(matchId);
        const myEntry = poll.availability?.find(a => a.playerId === player.playerId);
        loaded.push({ poll, myStatus: myEntry?.status });
      }

      setEntries(loaded);
    };

    load().catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected?.poll.matchId) return;
    setDetailLoading(true);
    setTeamSides([]);
    matchApi.getTeamSheet(selected.poll.matchId)
      .then(setTeamSides)
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [selected]);

  const myId = me?.playerId;
  const selectionSide = selected && myId != null
    ? teamSides.find(s => s.playingXi?.includes(myId) || s.twelfthManPlayerId === myId)
    : undefined;
  const isSelected = myId != null && selectionSide != null && selectionSide.playingXi?.includes(myId);
  const isTwelfthMan = myId != null && selectionSide?.twelfthManPlayerId === myId;
  const isAnnounced = teamSides.some(s => s.teamAnnounced);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayMondayKey = getMondayKey(todayStr);

  const weekMap = new Map<string, PollEntry[]>();
  for (const entry of entries) {
    const key = getMondayKey(entry.poll.matchDate);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(entry);
  }
  const weeks = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <Box>
      <Typography variant="h5" gutterBottom>My Availability</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Open polls where your availability is requested.
      </Typography>

      {entries.length === 0 ? (
        <Alert severity="info" icon={<HowToVote />}>
          No open availability polls at the moment.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {weeks.map(([mondayKey, weekEntries]) => (
            <Box key={mondayKey}>
              <Typography
                variant="overline"
                sx={{ fontWeight: 'bold', letterSpacing: 1.5, color: 'text.secondary', display: 'block', mb: 1.5 }}
              >
                {fmtWeekLabel(mondayKey, todayMondayKey)}
              </Typography>

              {weekEntries.map((entry) => {
                const { poll, myStatus } = entry;
                return (
                  <Paper
                    key={poll.matchId}
                    sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', cursor: 'pointer', transition: 'background-color 0.15s', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => setSelected(entry)}
                  >
                    <Box>
                      <Typography fontWeight="medium">
                        {poll.homeTeamName} vs {poll.oppositionTeamName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.25, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarMonth sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">{fmtDate(poll.matchDate)}</Typography>
                        </Box>
                        {fmtTime(poll.scheduledStartTime) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">{fmtTime(poll.scheduledStartTime)}</Typography>
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                        {myStatus ? (
                          <Chip
                            icon={STATUS_ICONS[myStatus]}
                            label={`My response: ${STATUS_LABELS[myStatus]}`}
                            color={STATUS_COLORS[myStatus]}
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            icon={<HowToVote fontSize="small" />}
                            label="No response yet"
                            size="small"
                            variant="outlined"
                            color="default"
                          />
                        )}
                      </Box>
                    </Box>
                    <Button
                      variant={myStatus ? 'outlined' : 'contained'}
                      size="small"
                      startIcon={<HowToVote />}
                      onClick={(e) => { e.stopPropagation(); navigate(`/poll/${poll.matchId}/${poll.teamId}`); }}
                    >
                      {myStatus ? 'Change' : 'Respond'}
                    </Button>
                  </Paper>
                );
              })}
            </Box>
          ))}
        </Box>
      )}

      {/* Match detail dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SportsCricket />
                <Typography variant="h6">Match Details</Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {/* Teams */}
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mb: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar src={selected.poll.homeTeamLogoUrl} sx={{ width: 48, height: 48, mx: 'auto', mb: 0.5 }}>
                    {selected.poll.homeTeamName?.charAt(0)}
                  </Avatar>
                  <Typography variant="subtitle2" fontWeight="bold">{selected.poll.homeTeamName}</Typography>
                  <Typography variant="caption" color="text.secondary">Home</Typography>
                </Box>
                <Typography variant="h5" color="text.secondary" fontWeight="bold">vs</Typography>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar src={selected.poll.oppositionTeamLogoUrl} sx={{ width: 48, height: 48, mx: 'auto', mb: 0.5 }}>
                    {selected.poll.oppositionTeamName?.charAt(0)}
                  </Avatar>
                  <Typography variant="subtitle2" fontWeight="bold">{selected.poll.oppositionTeamName}</Typography>
                  <Typography variant="caption" color="text.secondary">Away</Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonth fontSize="small" color="action" />
                  <Typography variant="body2">
                    <strong>Date:</strong> {selected.poll.matchDate}
                  </Typography>
                </Box>

                {selected.poll.scheduledStartTime && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Start:</strong> {selected.poll.scheduledStartTime}
                      {selected.poll.arrivalTime && ` (Arrive: ${selected.poll.arrivalTime})`}
                    </Typography>
                  </Box>
                )}

                {selected.poll.fieldName && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {selected.poll.fieldIconUrl
                      ? <Avatar src={selected.poll.fieldIconUrl} variant="rounded" sx={{ width: 20, height: 20, mt: '2px', flexShrink: 0 }} />
                      : <LocationOn fontSize="small" color="action" sx={{ mt: '2px', flexShrink: 0 }} />}
                    <Box>
                      <Typography variant="body2">
                        <strong>Venue:</strong>&nbsp;
                        {selected.poll.fieldGoogleMapsUrl ? (
                          <Typography
                            component="a"
                            href={selected.poll.fieldGoogleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="body2"
                            sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {selected.poll.fieldName}
                          </Typography>
                        ) : selected.poll.fieldName}
                      </Typography>
                      {selected.poll.fieldAddress && (
                        <Typography variant="caption" color="text.secondary">{selected.poll.fieldAddress}</Typography>
                      )}
                    </Box>
                  </Box>
                )}

                {selected.poll.tournamentName && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEvents fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Tournament:</strong> {selected.poll.tournamentName}
                      {selected.poll.matchStage && ` — ${STAGE_LABELS[selected.poll.matchStage] ?? selected.poll.matchStage}`}
                    </Typography>
                  </Box>
                )}

                {selected.poll.umpire && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SportsCricket fontSize="small" color="action" />
                    <Typography variant="body2"><strong>Umpire:</strong> {selected.poll.umpire}</Typography>
                  </Box>
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />

              {detailLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {/* Availability */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {selected.myStatus === 'YES' && <CheckCircle fontSize="small" color="success" />}
                      {selected.myStatus === 'NO' && <Cancel fontSize="small" color="error" />}
                      {selected.myStatus === 'UNSURE' && <HelpOutline fontSize="small" color="warning" />}
                      {!selected.myStatus && <HelpOutline fontSize="small" color="action" />}
                      <Typography variant="body2"><strong>Your Availability</strong></Typography>
                    </Box>
                    {selected.myStatus ? (
                      <Chip
                        label={STATUS_LABELS[selected.myStatus]}
                        color={STATUS_COLORS[selected.myStatus]}
                        size="small"
                      />
                    ) : (
                      <Chip label="No response" size="small" variant="outlined" />
                    )}
                  </Box>

                  {/* Selection */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Groups fontSize="small" color="action" />
                      <Typography variant="body2"><strong>Team Selection</strong></Typography>
                    </Box>
                    {!isAnnounced ? (
                      <Chip label="Not yet announced" size="small" variant="outlined" />
                    ) : isSelected ? (
                      <Chip label="Selected" color="success" size="small" />
                    ) : isTwelfthMan ? (
                      <Chip label="12th Man" color="info" size="small" />
                    ) : (
                      <Chip label="Not selected" size="small" variant="outlined" />
                    )}
                  </Box>
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelected(null)}>Close</Button>
              <Button
                variant="outlined"
                startIcon={<HowToVote />}
                onClick={() => { setSelected(null); navigate(`/poll/${selected.poll.matchId}/${selected.poll.teamId}`); }}
              >
                {selected.myStatus ? 'Change' : 'Respond'}
              </Button>
              {isAnnounced && selected.poll.matchId && (
                <Button
                  variant="contained"
                  startIcon={<AssignmentInd />}
                  onClick={() => { setSelected(null); navigate(`/matches/${selected.poll.matchId}/teamsheet`); }}
                >
                  Team
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
