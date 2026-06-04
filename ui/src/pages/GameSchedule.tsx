import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Chip, Avatar, Divider, Stack,
  Card, CardContent, useTheme, useMediaQuery,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, AccessTime, LocationOn, SportsCricket,
  CheckCircle, Cancel, HelpOutline, Groups, HowToVote, AssignmentInd,
} from '@mui/icons-material';
import { matchApi } from '../api/matchApi';
import { pollApi } from '../api/pollApi';
import { playerApi } from '../api/playerApi';
import { Match, MatchSide, Player, PlayerAvailabilityEntry } from '../types';

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

const AVAILABILITY_LABEL: Record<string, string> = {
  YES: 'Available', NO: 'Not Available', UNSURE: 'Unsure',
};

const AVAILABILITY_COLOR: Record<string, 'success' | 'error' | 'warning'> = {
  YES: 'success', NO: 'error', UNSURE: 'warning',
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtTime = (t?: string) => {
  if (!t) return null;
  return t.substring(0, 5);
};

const sortKey = (m: Match) =>
  `${m.matchDate ?? '9999-12-31'}T${m.scheduledStartTime ?? '99:99:99'}`;

interface TournamentGroup {
  tournamentId: number | null;
  tournamentName: string;
  matches: Match[];
  earliestDate: string;
}

const groupByTournament = (matches: Match[]): TournamentGroup[] => {
  const map = new Map<string, TournamentGroup>();

  for (const m of matches) {
    const key = m.tournamentId != null ? String(m.tournamentId) : '__none__';
    if (!map.has(key)) {
      map.set(key, {
        tournamentId: m.tournamentId ?? null,
        tournamentName: m.tournamentName ?? 'Friendlies / No Tournament',
        matches: [],
        earliestDate: sortKey(m),
      });
    }
    const group = map.get(key)!;
    group.matches.push(m);
    if (sortKey(m) < group.earliestDate) group.earliestDate = sortKey(m);
  }

  for (const group of map.values()) {
    group.matches.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const isMatchFinal = (m: Match) =>
    !!(m.matchCompleted || m.forfeited || m.noResult || m.matchDrawn);

  const isUpcoming = (m: Match) =>
    !isMatchFinal(m) && (m.matchDate ?? '') >= todayStr;

  for (const [key, group] of map.entries()) {
    group.matches = group.matches.filter(isUpcoming);
    if (group.matches.length === 0) map.delete(key);
  }

  return [...map.values()]
    .sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));
};

const MatchRow: React.FC<{ match: Match; onSelect: (m: Match) => void }> = ({ match: m, onSelect }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card variant="outlined" sx={{ mb: 1.5, cursor: 'pointer', transition: 'background-color 0.15s', '&:hover': { bgcolor: 'action.hover' } }}
      onClick={() => onSelect(m)}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>

          {/* Teams */}
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar src={m.homeTeamLogoUrl} sx={{ width: 28, height: 28, fontSize: 13 }}>
                {m.homeTeamName?.charAt(0)}
              </Avatar>
              <Typography variant="body2" fontWeight="bold" noWrap>
                {m.homeTeamAbbreviation ?? m.homeTeamName ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">vs</Typography>
              <Avatar src={m.oppositionTeamLogoUrl} sx={{ width: 28, height: 28, fontSize: 13 }}>
                {m.oppositionTeamName?.charAt(0)}
              </Avatar>
              <Typography variant="body2" fontWeight="bold" noWrap>
                {m.oppositionTeamAbbreviation ?? m.oppositionTeamName ?? '—'}
              </Typography>
            </Stack>
          </Box>

          {/* Meta */}
          <Stack direction={isMobile ? 'column' : 'row'} spacing={1} alignItems={{ sm: 'center' }} flexShrink={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarMonth sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption">{fmtDate(m.matchDate)}</Typography>
            </Box>

            {fmtTime(m.scheduledStartTime) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption">{fmtTime(m.scheduledStartTime)}</Typography>
              </Box>
            )}

            {m.fieldName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {m.fieldIconUrl
                  ? <Avatar src={m.fieldIconUrl} variant="rounded" sx={{ width: 14, height: 14 }} />
                  : <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />}
                <Typography variant="caption" noWrap sx={{ maxWidth: 160 }}>{m.fieldName}</Typography>
              </Box>
            )}

            {m.matchStage && (
              <Chip label={STAGE_LABELS[m.matchStage] ?? m.matchStage} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            )}

          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const GameSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Match detail dialog
  const [selected, setSelected] = useState<Match | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [teamSides, setTeamSides] = useState<MatchSide[]>([]);
  const [myAvailability, setMyAvailability] = useState<PlayerAvailabilityEntry | null | undefined>(undefined);
  const [pollTeamId, setPollTeamId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    matchApi.getMySchedule()
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
    playerApi.findMe().then(setMe).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected?.matchId) return;
    setDetailLoading(true);
    setTeamSides([]);
    setMyAvailability(undefined);
    setPollTeamId(null);

    const fetchDetails = async () => {
      const matchId = selected.matchId!;
      const sides = await matchApi.getTeamSheet(matchId).catch(() => [] as MatchSide[]);
      setTeamSides(sides);

      const teamIds = [selected.homeTeamId, selected.oppositionTeamId].filter(Boolean) as number[];
      const pollResults = await Promise.allSettled(
        teamIds.map(tid => pollApi.getPoll(matchId, tid))
      );
      const myId = me?.playerId;
      let found: PlayerAvailabilityEntry | null = null;
      let foundTeamId: number | null = null;
      for (let i = 0; i < pollResults.length; i++) {
        const r = pollResults[i];
        if (r.status === 'fulfilled' && r.value.open) {
          const entry = r.value.availability?.find(a => a.playerId === myId);
          if (entry) { found = entry; foundTeamId = teamIds[i]; break; }
        }
      }
      setMyAvailability(found);
      setPollTeamId(foundTeamId);
    };

    fetchDetails().catch(() => {}).finally(() => setDetailLoading(false));
  }, [selected, me]);

  const myId = me?.playerId;
  const selectionSide = myId != null
    ? teamSides.find(s => s.playingXi?.includes(myId) || s.twelfthManPlayerId === myId)
    : undefined;
  const isSelected = myId != null && selectionSide != null && selectionSide.playingXi?.includes(myId);
  const isTwelfthMan = myId != null && selectionSide?.twelfthManPlayerId === myId;
  const isAnnounced = teamSides.some(s => s.teamAnnounced);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const groups = groupByTournament(matches);
  const upcomingCount = groups.reduce((n, g) => n + g.matches.length, 0);

  if (upcomingCount === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 8 }}>
        <SportsCricket sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography color="text.secondary">No upcoming matches scheduled.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <SportsCricket color="primary" />
        <Typography variant="h5">My Games</Typography>
        <Chip label={`${upcomingCount} match${upcomingCount !== 1 ? 'es' : ''}`} size="small" variant="outlined" sx={{ ml: 1 }} />
      </Box>

      {groups.map((group, i) => (
        <Box key={group.tournamentId ?? '__none__'} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <EmojiEvents color="action" fontSize="small" />
            <Typography variant="subtitle1" fontWeight="bold">
              {group.tournamentName}
            </Typography>
            <Chip label={group.matches.length} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
          </Stack>

          {group.matches.map(m => (
            <MatchRow
              key={m.matchId}
              match={m}
              onSelect={setSelected}
            />
          ))}

          {i < groups.length - 1 && <Divider sx={{ mt: 2 }} />}
        </Box>
      ))}

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
                  <Avatar src={selected.homeTeamLogoUrl} sx={{ width: 48, height: 48, mx: 'auto', mb: 0.5 }}>
                    {selected.homeTeamName?.charAt(0)}
                  </Avatar>
                  <Typography variant="subtitle2" fontWeight="bold">{selected.homeTeamName}</Typography>
                  <Typography variant="caption" color="text.secondary">Home</Typography>
                </Box>
                <Typography variant="h5" color="text.secondary" fontWeight="bold">vs</Typography>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar src={selected.oppositionTeamLogoUrl} sx={{ width: 48, height: 48, mx: 'auto', mb: 0.5 }}>
                    {selected.oppositionTeamName?.charAt(0)}
                  </Avatar>
                  <Typography variant="subtitle2" fontWeight="bold">{selected.oppositionTeamName}</Typography>
                  <Typography variant="caption" color="text.secondary">Away</Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonth fontSize="small" color="action" />
                  <Typography variant="body2">
                    <strong>Date:</strong> {selected.matchDate}
                  </Typography>
                </Box>

                {selected.scheduledStartTime && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Start:</strong> {selected.scheduledStartTime}
                      {selected.arrivalTime && ` (Arrive: ${selected.arrivalTime})`}
                    </Typography>
                  </Box>
                )}

                {selected.fieldName && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {selected.fieldIconUrl
                      ? <Avatar src={selected.fieldIconUrl} variant="rounded" sx={{ width: 20, height: 20, mt: '2px', flexShrink: 0 }} />
                      : <LocationOn fontSize="small" color="action" sx={{ mt: '2px', flexShrink: 0 }} />}
                    <Box>
                      <Typography variant="body2">
                        <strong>Venue:</strong>&nbsp;
                        {selected.fieldGoogleMapsUrl ? (
                          <Typography
                            component="a"
                            href={selected.fieldGoogleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="body2"
                            sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {selected.fieldName}
                          </Typography>
                        ) : selected.fieldName}
                      </Typography>
                      {selected.fieldAddress && (
                        <Typography variant="caption" color="text.secondary">{selected.fieldAddress}</Typography>
                      )}
                    </Box>
                  </Box>
                )}

                {selected.tournamentName && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEvents fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Tournament:</strong> {selected.tournamentName}
                      {selected.matchStage && ` — ${STAGE_LABELS[selected.matchStage] ?? selected.matchStage}`}
                    </Typography>
                  </Box>
                )}

                {selected.umpire && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SportsCricket fontSize="small" color="action" />
                    <Typography variant="body2"><strong>Umpire:</strong> {selected.umpire}</Typography>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {myAvailability?.status === 'YES' && <CheckCircle fontSize="small" color="success" />}
                      {myAvailability?.status === 'NO' && <Cancel fontSize="small" color="error" />}
                      {myAvailability?.status === 'UNSURE' && <HelpOutline fontSize="small" color="warning" />}
                      {!myAvailability?.status && <HelpOutline fontSize="small" color="action" />}
                      <Typography variant="body2"><strong>Your Availability</strong></Typography>
                    </Box>
                    {myAvailability === undefined ? (
                      <Chip label="No poll" size="small" variant="outlined" />
                    ) : myAvailability?.status ? (
                      <Chip
                        label={AVAILABILITY_LABEL[myAvailability.status]}
                        color={AVAILABILITY_COLOR[myAvailability.status]}
                        size="small"
                      />
                    ) : (
                      <Chip label="No response" size="small" variant="outlined" />
                    )}
                  </Box>

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
              {pollTeamId && selected?.matchId && (
                <Button
                  variant="contained"
                  startIcon={<HowToVote />}
                  onClick={() => { setSelected(null); navigate(`/poll/${selected.matchId}/${pollTeamId}`); }}
                >
                  View Poll
                </Button>
              )}
              {isAnnounced && selected?.matchId && (
                <Button
                  variant="contained"
                  startIcon={<AssignmentInd />}
                  onClick={() => { setSelected(null); navigate(`/matches/${selected.matchId}/teamsheet`); }}
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
