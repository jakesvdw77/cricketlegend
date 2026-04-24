import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Box, Typography, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Chip, Divider, Avatar, Stack,
} from '@mui/material';
import {
  SportsCricket, LocationOn, EmojiEvents, AccessTime, CalendarMonth,
} from '@mui/icons-material';
import { matchApi } from '../api/matchApi';
import { Match } from '../types';

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { 'en-US': enUS } });

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: Match;
}

const STAGE_LABELS: Record<string, string> = {
  POOL: 'Pool', SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

const toDate = (match: Match): Date => {
  const base = match.matchDate ?? new Date().toISOString().slice(0, 10);
  const time = match.scheduledStartTime ?? '10:00:00';
  return new Date(`${base}T${time}`);
};

const toEndDate = (match: Match): Date => {
  const start = toDate(match);
  return new Date(start.getTime() + 4 * 60 * 60 * 1000);
};

export const MySchedule: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Match | null>(null);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    matchApi.getMySchedule()
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, []);

  const events: CalendarEvent[] = matches.map(m => ({
    id: m.matchId!,
    title: `${m.homeTeamName ?? '—'} vs ${m.oppositionTeamName ?? '—'}`,
    start: toDate(m),
    end: toEndDate(m),
    resource: m,
  }));

  const onSelectEvent = useCallback((event: CalendarEvent) => setSelected(event.resource), []);
  const onNavigate = useCallback((d: Date) => setDate(d), []);
  const onView = useCallback((v: View) => setView(v), []);

  const eventStyleGetter = () => ({
    style: {
      backgroundColor: '#1a5276',
      borderRadius: 4,
      color: '#fff',
      border: 'none',
      fontSize: 12,
      padding: '2px 6px',
    },
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CalendarMonth color="primary" />
        <Typography variant="h5">My Schedule</Typography>
        <Chip label={`${matches.length} match${matches.length !== 1 ? 'es' : ''}`} size="small" variant="outlined" sx={{ ml: 1 }} />
      </Box>

      {matches.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 8 }}>
          <SportsCricket sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography color="text.secondary">You have not been added to any match squads yet.</Typography>
        </Box>
      ) : (
        <Box sx={{
          flex: 1,
          minHeight: 560,
          '& .rbc-toolbar': { mb: 1 },
          '& .rbc-toolbar button': {
            color: 'primary.main',
            borderColor: 'divider',
            borderRadius: 1,
          },
          '& .rbc-toolbar button.rbc-active': {
            bgcolor: 'primary.main',
            color: '#fff',
          },
          '& .rbc-today': { bgcolor: 'primary.light', opacity: 0.15 },
          '& .rbc-header': { fontWeight: 'bold', fontSize: 13 },
          '& .rbc-month-view': { borderRadius: 1 },
        }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            date={date}
            onNavigate={onNavigate}
            onView={onView}
            onSelectEvent={onSelectEvent}
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day']}
            style={{ height: 600 }}
            popup
          />
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
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelected(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
