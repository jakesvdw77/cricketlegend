import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CheckCircle, Cancel, HelpOutline, Groups, HowToVote, AssignmentInd,
  FileDownload,
} from '@mui/icons-material';
import { matchApi } from '../api/matchApi';
import { pollApi } from '../api/pollApi';
import { playerApi } from '../api/playerApi';
import { eventApi } from '../api/eventApi';
import { Match, MatchSide, Player, PlayerAvailabilityEntry, AvailabilityStatus, ClubEvent } from '../types';

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { 'en-US': enUS } });

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  type: 'match' | 'birthday' | 'club_event';
  resource?: Match;
  clubEvent?: ClubEvent;
}

const CATEGORY_LABELS: Record<string, string> = {
  TEAM_PRACTISE: 'Team Practice',
  AWARD_CEREMONY: 'Award Ceremony',
  CAPPING_CEREMONY: 'Capping Ceremony',
  TEAM_MEETING: 'Team Meeting',
};

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', QUARTER_FINAL: 'Quarter-Final', SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  YES: 'Available', NO: 'Not Available', UNSURE: 'Unsure',
};

const AVAILABILITY_COLOR: Record<AvailabilityStatus, 'success' | 'error' | 'warning'> = {
  YES: 'success', NO: 'error', UNSURE: 'warning',
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
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Match | null>(null);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  // Detail state
  const [me, setMe] = useState<Player | null>(null);
  const [clubPlayers, setClubPlayers] = useState<Player[]>([]);
  const [clubEvents, setClubEvents] = useState<ClubEvent[]>([]);
  const [selectedClubEvent, setSelectedClubEvent] = useState<ClubEvent | null>(null);
  const [teamSides, setTeamSides] = useState<MatchSide[]>([]);
  const [myAvailability, setMyAvailability] = useState<PlayerAvailabilityEntry | null | undefined>(undefined);
  const [pollTeamId, setPollTeamId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    matchApi.getMySchedule()
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, []);

  // Fetch current player + club mates + club events
  useEffect(() => {
    playerApi.findMe().then(player => {
      setMe(player);
      if (player.homeClubId) {
        playerApi.findAll().then(all => {
          setClubPlayers(all.filter(p => p.homeClubId === player.homeClubId && p.dateOfBirth));
        }).catch(() => {});
      }
    }).catch(() => {});
    eventApi.getMyEvents().then(setClubEvents).catch(() => {});
  }, []);

  const matchEvents: CalendarEvent[] = matches.map(m => ({
    id: `match-${m.matchId}`,
    title: `🏏 ${m.homeTeamName ?? '—'} vs ${m.oppositionTeamName ?? '—'}`,
    start: toDate(m),
    end: toEndDate(m),
    type: 'match',
    resource: m,
  }));

  const thisYear = new Date().getFullYear();
  const birthdayEvents: CalendarEvent[] = clubPlayers.flatMap(p => {
    const dob = new Date(p.dateOfBirth!);
    return [thisYear, thisYear + 1].map(year => {
      const bday = new Date(year, dob.getMonth(), dob.getDate());
      return {
        id: `birthday-${p.playerId}-${year}`,
        title: `🎂 ${p.name} ${p.surname}`,
        start: bday,
        end: bday,
        allDay: true,
        type: 'birthday' as const,
      };
    });
  });

  const CATEGORY_EMOJI: Record<string, string> = {
    TEAM_PRACTISE: '🏏',
    AWARD_CEREMONY: '🏆',
    CAPPING_CEREMONY: '🎓',
    TEAM_MEETING: '📋',
  };

  const clubEventCalEvents: CalendarEvent[] = clubEvents.map(ev => {
    const date = new Date(ev.eventDate + 'T' + (ev.startTime ?? '00:00'));
    const end = ev.endTime
      ? new Date(ev.eventDate + 'T' + ev.endTime)
      : new Date(date.getTime() + 60 * 60 * 1000);
    const emoji = CATEGORY_EMOJI[ev.category] ?? '📅';
    const categoryLabel = CATEGORY_LABELS[ev.category] ?? ev.category;
    const label = ev.title ? `${categoryLabel} — ${ev.title}` : categoryLabel;
    return {
      id: `event-${ev.eventId}`,
      title: `${emoji} ${label}`,
      start: date,
      end,
      type: 'club_event' as const,
      clubEvent: ev,
    };
  });

  const events: CalendarEvent[] = [...matchEvents, ...birthdayEvents, ...clubEventCalEvents];

  const onSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.type === 'match' && event.resource) {
      setSelected(event.resource);
      setTeamSides([]);
      setMyAvailability(undefined);
      setPollTeamId(null);
    } else if (event.type === 'club_event' && event.clubEvent) {
      setSelectedClubEvent(event.clubEvent);
    }
  }, []);

  // Fetch team sheet + poll when a match is selected
  useEffect(() => {
    if (!selected?.matchId) return;
    setDetailLoading(true);

    const fetchDetails = async () => {
      const matchId = selected.matchId!;

      // Team sheet
      const sides = await matchApi.getTeamSheet(matchId).catch(() => [] as MatchSide[]);
      setTeamSides(sides);

      // Polls — try both teams, find the one with my entry
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
      setMyAvailability(found); // null = poll exists but no entry; undefined = no open poll
      setPollTeamId(foundTeamId);
    };

    fetchDetails()
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [selected, me]);

  const onNavigate = useCallback((d: Date) => setDate(d), []);
  const onView = useCallback((v: View) => setView(v), []);

  const downloadIcs = () => {
    const escIcs = (s: string) =>
      s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmtDt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const fmtDate = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

    const stamp = fmtDt(new Date());
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Cricket Legend//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Cricket Legend',
    ];

    matches.forEach(m => {
      const start = toDate(m);
      const end = toEndDate(m);
      const desc = [
        m.tournamentName ? `${m.tournamentName}${m.matchStage ? ' — ' + (STAGE_LABELS[m.matchStage] ?? m.matchStage) : ''}` : '',
        m.umpire ? `Umpire: ${m.umpire}` : '',
      ].filter(Boolean).join('\\n');
      lines.push(
        'BEGIN:VEVENT',
        `UID:match-${m.matchId}@cricketlegend`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${fmtDt(start)}`,
        `DTEND:${fmtDt(end)}`,
        `SUMMARY:${escIcs(`🏏 ${m.homeTeamName ?? '—'} vs ${m.oppositionTeamName ?? '—'}`)}`,
        ...(m.fieldName ? [`LOCATION:${escIcs([m.fieldName, m.fieldAddress].filter(Boolean).join(', '))}`] : []),
        ...(desc ? [`DESCRIPTION:${desc}`] : []),
        'END:VEVENT',
      );
    });

    clubEvents.forEach(ev => {
      const start = new Date(ev.eventDate + 'T' + (ev.startTime ?? '00:00'));
      const end = ev.endTime
        ? new Date(ev.eventDate + 'T' + ev.endTime)
        : new Date(start.getTime() + 60 * 60 * 1000);
      const categoryLabel = CATEGORY_LABELS[ev.category] ?? ev.category;
      const summary = ev.title ? `${categoryLabel} — ${ev.title}` : categoryLabel;
      const desc = [ev.notes, ev.meetingUrl ? `Meeting: ${ev.meetingUrl}` : ''].filter(Boolean).join('\\n');
      lines.push(
        'BEGIN:VEVENT',
        `UID:event-${ev.eventId}@cricketlegend`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${fmtDt(start)}`,
        `DTEND:${fmtDt(end)}`,
        `SUMMARY:${escIcs(summary)}`,
        ...(ev.locationName ? [`LOCATION:${escIcs(ev.locationName)}`] : []),
        ...(desc ? [`DESCRIPTION:${escIcs(desc)}`] : []),
        'END:VEVENT',
      );
    });

    clubPlayers.forEach(p => {
      const dob = new Date(p.dateOfBirth!);
      const start = new Date(thisYear, dob.getMonth(), dob.getDate());
      const end = new Date(thisYear, dob.getMonth(), dob.getDate() + 1);
      lines.push(
        'BEGIN:VEVENT',
        `UID:birthday-${p.playerId}@cricketlegend`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${fmtDate(start)}`,
        `DTEND;VALUE=DATE:${fmtDate(end)}`,
        'RRULE:FREQ=YEARLY',
        `SUMMARY:${escIcs(`🎂 ${p.name} ${p.surname}`)}`,
        'END:VEVENT',
      );
    });

    lines.push('END:VCALENDAR');

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cricket-legend.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const bg = event.type === 'birthday' ? '#7b1fa2'
      : event.type === 'club_event' ? '#2e7d32'
      : '#1a5276';
    return {
      style: {
        backgroundColor: bg,
        borderRadius: 4,
        color: '#fff',
        border: 'none',
        fontSize: 12,
        padding: '2px 6px',
        cursor: event.type === 'birthday' ? 'default' : 'pointer',
      },
    };
  };

  // Derive selection status from team sheets
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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CalendarMonth color="primary" />
        <Typography variant="h5">My Schedule</Typography>
        <Chip label={`${matches.length} match${matches.length !== 1 ? 'es' : ''}`} size="small" variant="outlined" sx={{ ml: 1 }} />
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileDownload />}
          onClick={downloadIcs}
          sx={{ ml: 'auto' }}
        >
          Export to Calendar
        </Button>
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

              {/* Availability & Selection */}
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
                  Team Sheet
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Club event detail dialog */}
      <Dialog open={!!selectedClubEvent} onClose={() => setSelectedClubEvent(null)} maxWidth="sm" fullWidth>
        {selectedClubEvent && (
          <>
            <DialogTitle sx={{ bgcolor: 'success.main', color: 'common.white', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={CATEGORY_LABELS[selectedClubEvent.category] ?? selectedClubEvent.category}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'common.white', fontWeight: 'bold' }}
                />
                {selectedClubEvent.title && (
                  <Typography variant="h6">{selectedClubEvent.title}</Typography>
                )}
              </Box>
              {selectedClubEvent.teamName && (
                <Typography variant="caption" sx={{ opacity: 0.85 }}>{selectedClubEvent.teamName}</Typography>
              )}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonth fontSize="small" color="action" />
                  <Typography variant="body2">
                    <strong>Date:</strong> {selectedClubEvent.eventDate}
                    {selectedClubEvent.startTime && ` at ${selectedClubEvent.startTime}`}
                    {selectedClubEvent.endTime && ` – ${selectedClubEvent.endTime}`}
                  </Typography>
                </Box>
                {selectedClubEvent.locationName && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Location:</strong>{' '}
                      {selectedClubEvent.googleMapsUrl ? (
                        <Typography component="a" href={selectedClubEvent.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                          variant="body2" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                          {selectedClubEvent.locationName}
                        </Typography>
                      ) : selectedClubEvent.locationName}
                    </Typography>
                  </Box>
                )}
                {selectedClubEvent.meetingUrl && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEvents fontSize="small" color="action" />
                    <Typography variant="body2">
                      <Typography component="a" href={selectedClubEvent.meetingUrl} target="_blank" rel="noopener noreferrer"
                        variant="body2" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                        Join Meeting
                      </Typography>
                    </Typography>
                  </Box>
                )}
                {selectedClubEvent.notes && (
                  <>
                    <Divider />
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{selectedClubEvent.notes}</Typography>
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedClubEvent(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

