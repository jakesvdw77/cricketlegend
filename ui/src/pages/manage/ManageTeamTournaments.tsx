import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Avatar, Button, Chip, Skeleton, ToggleButtonGroup, ToggleButton,
  Divider, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemAvatar, ListItemButton, ListItemText, CircularProgress,
  IconButton, Tooltip,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, Assignment, SportsScore, Leaderboard,
  Image as ImageIcon, Groups, SportsCricket, Share, ArrowBack,
} from '@mui/icons-material';
import { TournamentSharePanel } from '../../components/match/TournamentSharePanel';
import { tournamentApi } from '../../api/tournamentApi';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { Tournament, TournamentTeam, Player } from '../../types';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { SchedulePickerDialog } from '../../components/SchedulePickerDialog';
import { playerDescription } from '../../utils/playerDescription';

const fmtDate = (d?: string) => {
  if (!d) return null;
  return new Date(d.replace(/\//g, '-') + 'T00:00:00').toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

const today = () => new Date().toISOString().slice(0, 10);
const nd = (d?: string) => d?.replace(/\//g, '-');

function tournamentStatus(t: Tournament): 'live' | 'upcoming' | 'past' {
  const d = today();
  const start = nd(t.startDate);
  const end   = nd(t.endDate);
  if (end && end < d) return 'past';
  if (start && start > d) return 'upcoming';
  return 'live';
}

export const ManageTeamTournaments: React.FC = () => {
  const navigate = useNavigate();
  const { teamIds, restrictByTeam, loaded } = useManagerTeams();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'active' | 'past'>('active');
  const [schedulePicker, setSchedulePicker] = useState<Tournament | null>(null);
  const [squadPick, setSquadPick] = useState<{ teamId: number; teamName: string; tournamentName: string } | null>(null);
  const [shareTournament, setShareTournament] = useState<Tournament | null>(null);
  const [squadPickerTournament, setSquadPickerTournament] = useState<Tournament | null>(null);
  const [squadPickerTeams, setSquadPickerTeams] = useState<TournamentTeam[]>([]);
  const [squadPickerLoading, setSquadPickerLoading] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    setLoading(true);

    Promise.all([
      tournamentApi.findAll(),
      matchApi.findAll(),
    ]).then(([allTournaments, allMatches]) => {
      let relevant: Tournament[];

      if (restrictByTeam && teamIds.size > 0) {
        const tournamentIdSet = new Set<number>();
        for (const m of allMatches) {
          if (m.tournamentId != null) {
            if (teamIds.has(m.homeTeamId!)) tournamentIdSet.add(m.tournamentId);
            if (teamIds.has(m.oppositionTeamId!)) tournamentIdSet.add(m.tournamentId);
          }
        }
        relevant = allTournaments.filter(t => t.tournamentId != null && tournamentIdSet.has(t.tournamentId));
      } else {
        relevant = allTournaments;
      }

      setTournaments(relevant);
    }).finally(() => setLoading(false));
  }, [loaded, restrictByTeam, teamIds]);

  const openSquadPicker = (t: Tournament) => {
    setSquadPickerTournament(t);
    setSquadPickerTeams([]);
    setSquadPickerLoading(true);
    tournamentApi.findById(t.tournamentId!)
      .then(full => {
        const teams = (full.pools ?? []).flatMap(p => p.teams ?? [])
          .filter((t, i, arr) => t.teamId && arr.findIndex(x => x.teamId === t.teamId) === i);
        setSquadPickerTeams(teams);
      })
      .catch(() => {})
      .finally(() => setSquadPickerLoading(false));
  };

  const filtered = useMemo(() => {
    return tournaments
      .filter(t => view === 'past' ? tournamentStatus(t) === 'past' : tournamentStatus(t) !== 'past')
      .sort((a, b) => {
        if (view === 'past') return (nd(b.endDate) ?? '').localeCompare(nd(a.endDate) ?? '');
        return (nd(a.startDate) ?? '').localeCompare(nd(b.startDate) ?? '');
      });
  }, [tournaments, view]);

  if (loading || !loaded) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 3 }}>Team Tournaments</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3].map(i => (
            <Grid item xs={12} sm={6} key={i}>
              <Skeleton variant="rounded" height={240} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <EmojiEvents color="primary" sx={{ flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>Team Tournaments</Typography>
          <Chip label={`${filtered.length} tournament${filtered.length !== 1 ? 's' : ''}`} size="small" variant="outlined" sx={{ ml: 0.5 }} />
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, v) => v && setView(v)}
        >
          <ToggleButton value="active" sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}>Current &amp; Upcoming</ToggleButton>
          <ToggleButton value="past" sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}>Past</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <EmojiEvents sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6">No {view === 'past' ? 'past' : 'active or upcoming'} tournaments</Typography>
          <Typography variant="body2">
            {view === 'past'
              ? 'No completed tournaments found for your teams.'
              : 'No current or upcoming tournaments found for your teams.'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filtered.map(t => (
            <Grid item xs={12} sm={6} key={t.tournamentId}>
              <TournamentCard
                tournament={t}
                onNavigate={navigate}
                onFullSchedule={t => setSchedulePicker(t)}
                onSquad={openSquadPicker}
                onShare={t => setShareTournament(t)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <SchedulePickerDialog
        tournament={schedulePicker}
        onClose={() => setSchedulePicker(null)}
      />

      <TournamentSharePanel
        open={!!shareTournament}
        tournament={shareTournament ?? { name: '' } as Tournament}
        onClose={() => setShareTournament(null)}
      />

      {squadPick && (
        <TournamentSquadDialog
          teamId={squadPick.teamId}
          tournamentName={squadPick.tournamentName}
          onClose={() => setSquadPick(null)}
        />
      )}

      {/* Squad team picker */}
      <Dialog open={!!squadPickerTournament} onClose={() => setSquadPickerTournament(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Groups fontSize="small" color="primary" />
          Select a Team
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {squadPickerLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
          ) : (
            <List disablePadding>
              {squadPickerTeams.map(team => (
                <ListItemButton
                  key={team.teamId}
                  onClick={() => {
                    setSquadPickerTournament(null);
                    setSquadPick({ teamId: team.teamId!, teamName: team.teamName ?? '', tournamentName: squadPickerTournament?.name ?? '' });
                  }}
                >
                  <ListItemAvatar>
                    <Avatar src={team.logoUrl} sx={{ width: 36, height: 36, fontSize: 14 }}>
                      {team.teamName?.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={team.teamName} />
                </ListItemButton>
              ))}
              {!squadPickerLoading && squadPickerTeams.length === 0 && (
                <ListItem>
                  <ListItemText primary="No teams found in this tournament." />
                </ListItem>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSquadPickerTournament(null)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

interface TournamentCardProps {
  tournament: Tournament;
  onNavigate: ReturnType<typeof useNavigate>;
  onFullSchedule: (t: Tournament) => void;
  onSquad: (t: Tournament) => void;
  onShare: (t: Tournament) => void;
}

const statusMeta: Record<'live' | 'upcoming' | 'past', { label: string; color: 'success' | 'primary' | 'default' }> = {
  live:     { label: 'Live',     color: 'success' },
  upcoming: { label: 'Upcoming', color: 'primary' },
  past:     { label: 'Past',     color: 'default' },
};

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament: t, onNavigate, onFullSchedule, onSquad, onShare }) => {
  const status = tournamentStatus(t);
  const { label, color } = statusMeta[status];

  const dateRange = (() => {
    const s = fmtDate(t.startDate);
    const e = fmtDate(t.endDate);
    if (s && e) return `${s} — ${e}`;
    if (s) return `From ${s}`;
    return null;
  })();

  const meta = [t.cricketFormat, t.ageGroup, t.tournamentGender]
    .filter(Boolean)
    .map(v => String(v).replace(/_/g, ' '))
    .join(' · ');

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2.5 }}>
          <Avatar
            src={t.logoUrl}
            variant="rounded"
            sx={{ width: 64, height: 64, flexShrink: 0, bgcolor: 'primary.main', fontSize: 26 }}
          >
            <EmojiEvents />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.3, mb: 0.75 }}>
              {t.name}
            </Typography>
            <Chip label={label} color={color} size="small" />
          </Box>
          <Tooltip title="Share">
            <IconButton size="small" onClick={() => onShare(t)} sx={{ mt: -0.5, flexShrink: 0 }}>
              <Share fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Meta */}
        <Stack spacing={0.75}>
          {dateRange && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarMonth sx={{ fontSize: 17, color: 'text.secondary', flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">{dateRange}</Typography>
            </Box>
          )}
          {meta && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEvents sx={{ fontSize: 17, color: 'text.secondary', flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{meta}</Typography>
            </Box>
          )}
          {t.winningTeamName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Leaderboard sx={{ fontSize: 17, color: 'text.secondary', flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">Winner: {t.winningTeamName}</Typography>
            </Box>
          )}
        </Stack>
      </CardContent>

      <Divider />

      <CardActions sx={{ px: 2, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Button
          size="small"
          startIcon={<Assignment />}
          onClick={() => onNavigate('/manage-club/team-schedule', {
            state: {
              filterTournamentId: t.tournamentId,
              tournamentName: t.name,
              returnTo: '/manage-club/team-tournaments',
            },
          })}
        >
          Team Schedule
        </Button>
        <Button
          size="small"
          startIcon={<ImageIcon />}
          disabled={!t.tournamentId}
          onClick={() => onFullSchedule(t)}
        >
          Full Schedule
        </Button>
        <Button
          size="small"
          startIcon={<SportsScore />}
          onClick={() => onNavigate('/manage-club/team-results', {
            state: { returnTo: '/manage-club/team-tournaments' },
          })}
        >
          Results
        </Button>
        {t.tournamentId && (
          <Button
            size="small"
            startIcon={<Leaderboard />}
            onClick={() => onNavigate(`/tournaments/${t.tournamentId}/standings`)}
          >
            Standings
          </Button>
        )}
        {t.tournamentId && (
          <Button
            size="small"
            startIcon={<Groups />}
            onClick={() => onSquad(t)}
          >
            Squad
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

// ── Tournament Squad Dialog ────────────────────────────────────────────────────

export interface TournamentSquadDialogProps {
  teamId: number;
  tournamentName: string;
  onClose: () => void;
}

export const TournamentSquadDialog: React.FC<TournamentSquadDialogProps> = ({ teamId, tournamentName, onClose }) => {
  const [squad, setSquad] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState('');
  const [captainId, setCaptainId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      teamApi.findById(teamId),
      teamApi.getSquad(teamId),
    ]).then(([team, players]) => {
      setTeamName(team.teamName ?? '');
      setCaptainId(team.captainId);
      setSquad([...players].sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)));
    }).finally(() => setLoading(false));
  }, [teamId]);

  return (
    <Dialog open onClose={onClose} fullScreen>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton edge="start" onClick={onClose} sx={{ mr: 0.5 }}>
          <ArrowBack />
        </IconButton>
        <Groups fontSize="small" color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
            {teamName || 'Squad'}
          </Typography>
          <Typography variant="caption" color="text.secondary">{tournamentName}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : squad.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Groups sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
            <Typography variant="body2">No squad members found.</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
              <Chip
                size="small"
                icon={<Groups sx={{ fontSize: '14px !important' }} />}
                label={`${squad.length} player${squad.length !== 1 ? 's' : ''}`}
                variant="outlined"
              />
            </Box>
            <List dense disablePadding>
              {squad.map((p, idx) => {
                const isCaptain = p.playerId === captainId;
                const desc = playerDescription(p);
                return (
                  <React.Fragment key={p.playerId}>
                    {idx > 0 && <Divider component="li" />}
                    <ListItem sx={{ px: 2, py: 1 }}>
                      <ListItemAvatar sx={{ minWidth: 46 }}>
                        <Avatar src={p.profilePictureUrl} sx={{ width: 36, height: 36, fontSize: 14 }}>
                          {p.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography variant="body2" fontWeight={isCaptain ? 600 : 400}>
                              {p.name} {p.surname}
                              {p.shirtNumber != null && (
                                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                  #{p.shirtNumber}
                                </Typography>
                              )}
                            </Typography>
                            {isCaptain && <Chip label="C" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />}
                            {p.wicketKeeper && <Typography component="span" sx={{ fontSize: 14, lineHeight: 1 }}>🧤</Typography>}
                            {p.bowlingType && p.bowlingType !== 'NONE' && !p.partTimeBowler && (
                              <SportsCricket sx={{ fontSize: 14, color: 'text.secondary' }} />
                            )}
                          </Box>
                        }
                        secondary={desc || undefined}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
