import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Avatar, Button, Chip, Skeleton, ToggleButtonGroup, ToggleButton,
  Divider, Stack,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, Assignment, SportsScore, Leaderboard,
  Image as ImageIcon,
} from '@mui/icons-material';
import { tournamentApi } from '../../api/tournamentApi';
import { matchApi } from '../../api/matchApi';
import { Tournament } from '../../types';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { SchedulePickerDialog } from '../../components/SchedulePickerDialog';

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

  useEffect(() => {
    if (!loaded) return;
    setLoading(true);

    Promise.all([
      tournamentApi.findAll(),
      matchApi.findAll(),
    ]).then(([allTournaments, allMatches]) => {
      let relevant: Tournament[];

      if (restrictByTeam && teamIds.size > 0) {
        // Collect tournament IDs from matches involving manager's teams
        const tournamentIdSet = new Set<number>();
        for (const m of allMatches) {
          if (
            m.tournamentId != null &&
            (teamIds.has(m.homeTeamId!) || teamIds.has(m.oppositionTeamId!))
          ) {
            tournamentIdSet.add(m.tournamentId);
          }
        }
        relevant = allTournaments.filter(t => t.tournamentId != null && tournamentIdSet.has(t.tournamentId));
      } else {
        relevant = allTournaments;
      }

      setTournaments(relevant);
    }).finally(() => setLoading(false));
  }, [loaded, restrictByTeam, teamIds]);

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <EmojiEvents color="primary" />
        <Typography variant="h5" sx={{ mr: 'auto' }}>Team Tournaments</Typography>
        <Chip label={`${filtered.length} tournament${filtered.length !== 1 ? 's' : ''}`} size="small" variant="outlined" />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, v) => v && setView(v)}
        >
          <ToggleButton value="active">Current &amp; Upcoming</ToggleButton>
          <ToggleButton value="past">Past</ToggleButton>
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
              />
            </Grid>
          ))}
        </Grid>
      )}

      <SchedulePickerDialog
        tournament={schedulePicker}
        onClose={() => setSchedulePicker(null)}
      />
    </Box>
  );
};

interface TournamentCardProps {
  tournament: Tournament;
  onNavigate: ReturnType<typeof useNavigate>;
  onFullSchedule: (t: Tournament) => void;
}

const statusMeta: Record<'live' | 'upcoming' | 'past', { label: string; color: 'success' | 'primary' | 'default' }> = {
  live:     { label: 'Live',     color: 'success' },
  upcoming: { label: 'Upcoming', color: 'primary' },
  past:     { label: 'Past',     color: 'default' },
};

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament: t, onNavigate, onFullSchedule }) => {
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
      </CardActions>
    </Card>
  );
};
