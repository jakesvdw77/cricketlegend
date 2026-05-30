import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Chip, Tooltip, TablePagination,
  Divider, FormControlLabel, Switch, Checkbox, useMediaQuery, useTheme,
  Popover, FormGroup, Grid, Card, CardContent, CardActions,
  ToggleButton, ToggleButtonGroup, Select,
} from '@mui/material';
import {
  Add, ArrowBack, Edit, Delete, OpenInNew, VideoCall, FilterList, ViewColumn,
  Shield, TableRows, GridView, CalendarMonth, AccessTime, Place, Notes,
  ChevronLeft, ChevronRight, CalendarViewMonth,
} from '@mui/icons-material';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { eventApi } from '../../api/eventApi';
import { clubApi } from '../../api/clubApi';
import { teamApi } from '../../api/teamApi';
import { useAuth } from '../../hooks/useAuth';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { ClubEvent, Club, Team, EventCategory, RecurrenceType } from '../../types';

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { 'en-US': enUS } });

const CATEGORY_LABELS: Record<EventCategory, string> = {
  TEAM_PRACTISE: 'Team Practice',
  AWARD_CEREMONY: 'Award Ceremony',
  CAPPING_CEREMONY: 'Capping Ceremony',
  TEAM_MEETING: 'Team Meeting',
};

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  NONE: 'No repeat',
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
};

const CATEGORY_COLORS: Record<EventCategory, 'primary' | 'secondary' | 'success' | 'warning'> = {
  TEAM_PRACTISE: 'primary',
  AWARD_CEREMONY: 'success',
  CAPPING_CEREMONY: 'secondary',
  TEAM_MEETING: 'warning',
};

const CATEGORY_EMOJI: Record<EventCategory, string> = {
  TEAM_PRACTISE: '🏏',
  AWARD_CEREMONY: '🏆',
  CAPPING_CEREMONY: '🎓',
  TEAM_MEETING: '📋',
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const CAL_VIEWS: View[] = ['month', 'week', 'day'];

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ClubEvent;
}

interface CalToolbarProps {
  date: Date;
  view: View;
  onDateChange: (d: Date) => void;
  onViewChange: (v: View) => void;
}

const CalToolbar: React.FC<CalToolbarProps> = ({ date, view, onDateChange, onViewChange }) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const shift = (dir: -1 | 1) => {
    const next = new Date(date);
    if (view === 'month') next.setMonth(next.getMonth() + dir);
    else if (view === 'week') next.setDate(next.getDate() + dir * 7);
    else next.setDate(next.getDate() + dir);
    onDateChange(next);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
      <IconButton size="small" onClick={() => shift(-1)} sx={{ color: '#e4f4df' }}>
        <ChevronLeft />
      </IconButton>
      <Button size="small" onClick={() => onDateChange(new Date())}
        sx={{ color: '#e4f4df', borderColor: 'rgba(100,180,90,0.35)', border: '1px solid', minWidth: 0, px: 1, py: 0.25, fontSize: 12 }}>
        Today
      </Button>
      <IconButton size="small" onClick={() => shift(1)} sx={{ color: '#e4f4df' }}>
        <ChevronRight />
      </IconButton>

      <Select
        value={month}
        onChange={e => { const next = new Date(date); next.setMonth(e.target.value as number); onDateChange(next); }}
        size="small"
        variant="outlined"
        sx={{ color: '#e4f4df', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100,180,90,0.35)' }, '.MuiSvgIcon-root': { color: '#e4f4df' }, minWidth: 130 }}
      >
        {MONTHS.map((m, i) => <MenuItem key={i} value={i}>{m}</MenuItem>)}
      </Select>

      <Select
        value={year}
        onChange={e => { const next = new Date(date); next.setFullYear(e.target.value as number); onDateChange(next); }}
        size="small"
        variant="outlined"
        sx={{ color: '#e4f4df', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100,180,90,0.35)' }, '.MuiSvgIcon-root': { color: '#e4f4df' }, minWidth: 90 }}
      >
        {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
      </Select>

      <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
        {CAL_VIEWS.map(v => (
          <Button key={v} size="small"
            variant={v === view ? 'contained' : 'outlined'}
            onClick={() => onViewChange(v)}
            sx={v === view
              ? { bgcolor: '#28b463', color: '#0e1f0e', fontWeight: 'bold', minWidth: 60 }
              : { color: '#e4f4df', borderColor: 'rgba(100,180,90,0.35)', minWidth: 60 }}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

const emptyEvent = (clubId: number): ClubEvent => ({
  clubId,
  category: 'TEAM_PRACTISE',
  eventDate: new Date().toISOString().slice(0, 10),
  recurrence: 'NONE',
});

type ColKey = 'date' | 'category' | 'titleTeam' | 'time' | 'location' | 'repeat' | 'links';
const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'date',      label: 'Date' },
  { key: 'category',  label: 'Category' },
  { key: 'titleTeam', label: 'Title / Team' },
  { key: 'time',      label: 'Time' },
  { key: 'location',  label: 'Location' },
  { key: 'repeat',    label: 'Repeat' },
  { key: 'links',     label: 'Links' },
];
const DEFAULT_VISIBLE = new Set<ColKey>(['date', 'category', 'titleTeam', 'time', 'location', 'repeat', 'links']);
const MOBILE_VISIBLE = new Set<ColKey>(['date', 'time', 'category']);

type ViewMode = 'card' | 'list' | 'calendar';

export const Events: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as any;
  const returnTo: string | undefined = locationState?.returnTo;
  const preselectedTeamId: number | undefined = locationState?.filterTeamId;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isManager } = useAuth();
  const { restrictByTeam, homeClubId, teamIds } = useManagerTeams();

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | ''>('');
  const [teamFilter, setTeamFilter] = useState<number | ''>(preselectedTeamId ?? '');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClubEvent | null>(null);
  const [deleteNotify, setDeleteNotify] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);
  const [useClubLocation, setUseClubLocation] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(isMobile ? MOBILE_VISIBLE : DEFAULT_VISIBLE));
  const [colAnchor, setColAnchor] = useState<HTMLButtonElement | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [calView, setCalView] = useState<View>('month');
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => {
    clubApi.findAll().then(setClubs);
    teamApi.findAll().then(all => {
      setTeams(all);
      if (preselectedTeamId) {
        const team = all.find(t => t.teamId === preselectedTeamId);
        if (team?.associatedClubId) setSelectedClubId(team.associatedClubId);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isManager && homeClubId && !preselectedTeamId) {
      setSelectedClubId(homeClubId);
    }
  }, [isManager, homeClubId, preselectedTeamId]);

  useEffect(() => {
    if (selectedClubId) {
      eventApi.getByClub(selectedClubId as number).then(setEvents);
    } else {
      setEvents([]);
    }
  }, [selectedClubId]);

  const load = () => {
    if (selectedClubId) eventApi.getByClub(selectedClubId as number).then(setEvents);
  };

  const openCreate = () => {
    const base = emptyEvent(selectedClubId as number || 0);
    if (preselectedTeamId) base.teamId = preselectedTeamId;
    setEditing(base);
    setUseClubLocation(false);
    setOpen(true);
  };

  const openEdit = (e: ClubEvent) => {
    setEditing({ ...e });
    const club = clubs.find(c => c.clubId === e.clubId);
    setUseClubLocation(!!(club && e.locationName === club.name && e.googleMapsUrl === club.googleMapsUrl));
    setOpen(true);
  };

  const set = (patch: Partial<ClubEvent>) => setEditing(prev => prev ? { ...prev, ...patch } : prev);

  const handleClubChange = (clubId: number) => {
    const club = clubs.find(c => c.clubId === clubId);
    set({
      clubId,
      locationName: club?.name,
      googleMapsUrl: club?.googleMapsUrl ?? editing?.googleMapsUrl,
    });
  };

  const save = async () => {
    if (!editing) return;
    if (editing.eventId) {
      await eventApi.update(editing.eventId, editing);
    } else {
      await eventApi.create(editing);
    }
    setOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.eventId) return;
    await eventApi.delete(deleteTarget.eventId, deleteNotify);
    setDeleteTarget(null);
    setDeleteNotify(false);
    load();
  };

  const deleteSeries = async (seriesId: number) => {
    await eventApi.deleteSeries(seriesId, deleteNotify);
    setDeleteTarget(null);
    setDeleteNotify(false);
    load();
  };

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const col = (key: ColKey) => isMobile ? MOBILE_VISIBLE.has(key) : visibleCols.has(key);

  const filteredTeams = editing?.clubId
    ? teams.filter(t => t.associatedClubId === editing.clubId)
    : teams;

  const clubTeams = selectedClubId
    ? teams.filter(t => t.associatedClubId === selectedClubId && (!restrictByTeam || teamIds.has(t.teamId!)))
    : [];

  const filtered = events
    .filter(e => !categoryFilter || e.category === categoryFilter)
    .filter(e => !teamFilter || e.teamId === teamFilter);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const calEvents: CalEvent[] = filtered.map(ev => {
    const start = new Date(ev.eventDate + 'T' + (ev.startTime ?? '00:00'));
    const end = ev.endTime
      ? new Date(ev.eventDate + 'T' + ev.endTime)
      : new Date(start.getTime() + 60 * 60 * 1000);
    const label = ev.title ? `${CATEGORY_LABELS[ev.category]} — ${ev.title}` : CATEGORY_LABELS[ev.category];
    return {
      id: `event-${ev.eventId}`,
      title: `${CATEGORY_EMOJI[ev.category]} ${label}`,
      start,
      end,
      resource: ev,
    };
  });

  const calEventStyle = (ev: CalEvent) => {
    const colorMap: Record<EventCategory, string> = {
      TEAM_PRACTISE: '#1565c0',
      AWARD_CEREMONY: '#2e7d32',
      CAPPING_CEREMONY: '#6a1b9a',
      TEAM_MEETING: '#e65100',
    };
    return {
      style: {
        backgroundColor: colorMap[ev.resource.category] ?? '#1565c0',
        borderRadius: 4,
        color: '#fff',
        border: 'none',
        fontSize: 12,
        padding: '2px 6px',
        cursor: 'pointer',
      },
    };
  };

  const emptyMessage = !selectedClubId
    ? 'Select a club to view events.'
    : (categoryFilter || teamFilter)
      ? 'No events match the selected filters.'
      : 'No events found for this club.';

  if (open && editing) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => setOpen(false)}>Back</Button>
          <Typography variant="h6" sx={{ flex: 1 }}>{editing.eventId ? 'Edit Event' : 'New Event'}</Typography>
          <Button variant="contained" onClick={save}
            disabled={!editing.clubId || !editing.category || !editing.eventDate}>Save</Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 700 }}>
          {!preselectedTeamId && (
            <TextField select label="Club" value={editing.clubId || ''} required
              onChange={e => handleClubChange(+e.target.value)}>
              {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
            </TextField>
          )}
          {!preselectedTeamId && (
            <TextField select label="Team (leave blank for all club members)" value={editing.teamId ?? ''}
              onChange={e => set({ teamId: e.target.value ? +e.target.value : undefined })}>
              <MenuItem value="">— All club members —</MenuItem>
              {filteredTeams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
            </TextField>
          )}
          <TextField select label="Category" value={editing.category} required
            onChange={e => set({ category: e.target.value as EventCategory })}>
            {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map(k => (
              <MenuItem key={k} value={k}>{CATEGORY_LABELS[k]}</MenuItem>
            ))}
          </TextField>
          <TextField label="Title (optional)" value={editing.title ?? ''}
            onChange={e => set({ title: e.target.value })} helperText="Leave blank to use category name" />
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Date" type="date" value={editing.eventDate} required fullWidth
              InputLabelProps={{ shrink: true }} onChange={e => set({ eventDate: e.target.value })} />
            <TextField label="Start Time" type="time" value={editing.startTime ?? ''} fullWidth
              InputLabelProps={{ shrink: true }} onChange={e => set({ startTime: e.target.value || undefined })} />
            <TextField label="End Time" type="time" value={editing.endTime ?? ''} fullWidth
              InputLabelProps={{ shrink: true }} onChange={e => set({ endTime: e.target.value || undefined })} />
          </Box>
          <Divider><Typography variant="caption">Location</Typography></Divider>
          <FormControlLabel control={
            <Switch checked={useClubLocation} onChange={e => {
              const checked = e.target.checked;
              setUseClubLocation(checked);
              if (checked) {
                const club = clubs.find(c => c.clubId === editing.clubId);
                set({ locationName: club?.name ?? '', googleMapsUrl: club?.googleMapsUrl ?? '' });
              }
            }} />} label="Use club as location" />
          <TextField label="Location Name" value={editing.locationName ?? ''}
            onChange={e => set({ locationName: e.target.value })} disabled={useClubLocation}
            InputProps={{ readOnly: useClubLocation }} />
          <TextField label="Google Maps URL" value={editing.googleMapsUrl ?? ''}
            onChange={e => set({ googleMapsUrl: e.target.value })} placeholder="https://maps.google.com/..."
            disabled={useClubLocation} InputProps={{ readOnly: useClubLocation }} />
          <TextField label="Meeting URL (e.g. Google Meet)" value={editing.meetingUrl ?? ''}
            onChange={e => set({ meetingUrl: e.target.value })} placeholder="https://meet.google.com/..." />
          <Divider><Typography variant="caption">Recurrence</Typography></Divider>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField select label="Repeat" value={editing.recurrence ?? 'NONE'} fullWidth
              onChange={e => set({ recurrence: e.target.value as RecurrenceType })}>
              {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map(k => (
                <MenuItem key={k} value={k}>{RECURRENCE_LABELS[k]}</MenuItem>
              ))}
            </TextField>
            {editing.recurrence && editing.recurrence !== 'NONE' && (
              <TextField label="Repeat Until" type="date" value={editing.recurrenceEndDate ?? ''} fullWidth
                InputLabelProps={{ shrink: true }}
                onChange={e => set({ recurrenceEndDate: e.target.value || undefined })} />
            )}
          </Box>
          <Divider><Typography variant="caption">Notes</Typography></Divider>
          <TextField label="Notes" value={editing.notes ?? ''} multiline rows={3}
            onChange={e => set({ notes: e.target.value })} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {returnTo && (
          <Button startIcon={<ArrowBack />} onClick={() => navigate(returnTo)} sx={{ mr: 1 }}>
            Back
          </Button>
        )}
        <Typography variant="h5" sx={{ mr: 'auto' }}>Events</Typography>

        <ToggleButtonGroup value={viewMode} exclusive size="small" onChange={(_, v) => v && setViewMode(v)}>
          <ToggleButton value="card"><Tooltip title="Card view"><GridView fontSize="small" /></Tooltip></ToggleButton>
          <ToggleButton value="list"><Tooltip title="List view"><TableRows fontSize="small" /></Tooltip></ToggleButton>
          <ToggleButton value="calendar"><Tooltip title="Calendar view"><CalendarViewMonth fontSize="small" /></Tooltip></ToggleButton>
        </ToggleButtonGroup>

        {!isMobile && viewMode === 'list' && (
          <Tooltip title="Toggle columns">
            <IconButton size="small" onClick={e => setColAnchor(e.currentTarget)}><ViewColumn /></IconButton>
          </Tooltip>
        )}
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Event
        </Button>
      </Box>

      <Popover
        open={!!colAnchor}
        anchorEl={colAnchor}
        onClose={() => setColAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Visible Columns</Typography>
          <FormGroup>
            {ALL_COLUMNS.map(c => (
              <FormControlLabel
                key={c.key}
                label={c.label}
                control={<Checkbox size="small" checked={visibleCols.has(c.key)} onChange={() => toggleCol(c.key)} />}
              />
            ))}
          </FormGroup>
        </Box>
      </Popover>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: filtersOpen ? 2 : 0 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mr: 'auto' }}>Filters</Typography>
          <Tooltip title={filtersOpen ? 'Collapse' : 'Expand'}>
            <IconButton size="small" onClick={() => setFiltersOpen(o => !o)}>
              <FilterList fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {filtersOpen && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {!preselectedTeamId && !isManager && (
              <TextField select size="small" label="Club" value={selectedClubId}
                onChange={e => { setSelectedClubId(e.target.value === '' ? '' : +e.target.value); setCategoryFilter(''); setTeamFilter(''); setPage(0); }}
                sx={{ width: { xs: '100%', sm: 220 } }}>
                <MenuItem value="">— Select a club —</MenuItem>
                {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
              </TextField>
            )}
            {!preselectedTeamId && isManager && clubs.find(c => c.clubId === homeClubId) && (
              <Chip label={clubs.find(c => c.clubId === homeClubId)!.name} size="small" variant="outlined" icon={<Shield />} />
            )}
            {!preselectedTeamId && (
              <TextField select size="small" label="Team" value={teamFilter}
                onChange={e => { setTeamFilter(e.target.value === '' ? '' : +e.target.value); setPage(0); }}
                sx={{ width: { xs: '100%', sm: 200 } }} disabled={!selectedClubId}>
                <MenuItem value="">— All teams —</MenuItem>
                {clubTeams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
              </TextField>
            )}
            <TextField select size="small" label="Category" value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value as EventCategory | ''); setPage(0); }}
              sx={{ width: { xs: '100%', sm: 200 } }}>
              <MenuItem value="">— All categories —</MenuItem>
              {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map(k => (
                <MenuItem key={k} value={k}>{CATEGORY_LABELS[k]}</MenuItem>
              ))}
            </TextField>
          </Box>
        )}
      </Paper>

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <Box sx={{
          bgcolor: '#0e1f0e',
          borderRadius: 2,
          p: 2,
          color: '#e4f4df',
          '& .rbc-toolbar': { display: 'none' },
          '& .rbc-month-view, & .rbc-time-view, & .rbc-agenda-view': { borderColor: 'rgba(100,180,90,0.2)', borderRadius: 1 },
          '& .rbc-header': { fontWeight: 'bold', fontSize: 13, color: '#e4f4df', borderColor: 'rgba(100,180,90,0.2)', bgcolor: '#1e3a1e' },
          '& .rbc-month-row': { borderColor: 'rgba(100,180,90,0.15)' },
          '& .rbc-day-bg': { borderColor: 'rgba(100,180,90,0.15)' },
          '& .rbc-off-range-bg': { bgcolor: '#0a160a' },
          '& .rbc-today': { bgcolor: 'rgba(40,180,99,0.12)' },
          '& .rbc-date-cell': { color: '#e4f4df' },
          '& .rbc-date-cell.rbc-off-range': { color: 'rgba(228,244,223,0.35)' },
          '& .rbc-label': { color: '#e4f4df' },
          '& .rbc-time-content': { borderColor: 'rgba(100,180,90,0.2)' },
          '& .rbc-timeslot-group': { borderColor: 'rgba(100,180,90,0.15)' },
          '& .rbc-time-slot': { color: 'rgba(228,244,223,0.6)' },
          '& .rbc-current-time-indicator': { bgcolor: '#28b463' },
          '& .rbc-agenda-table': { color: '#e4f4df' },
          '& .rbc-agenda-date-cell, & .rbc-agenda-time-cell': { color: '#e4f4df', borderColor: 'rgba(100,180,90,0.2)' },
        }}>
          <CalToolbar date={calDate} view={calView} onDateChange={setCalDate} onViewChange={setCalView} />
          {filtered.length === 0 ? (
            <Typography variant="body2" color="#e4f4df" sx={{ textAlign: 'center', py: 6, opacity: 0.6 }}>
              {emptyMessage}
            </Typography>
          ) : (
            <Calendar
              localizer={localizer}
              events={calEvents}
              startAccessor="start"
              endAccessor="end"
              view={calView}
              date={calDate}
              onNavigate={setCalDate}
              onView={setCalView}
              onSelectEvent={(ev: CalEvent) => openEdit(ev.resource)}
              eventPropGetter={calEventStyle}
              tooltipAccessor={(ev: CalEvent) => ev.title}
              views={['month', 'week', 'day']}
              toolbar={false}
              style={{ height: 600 }}
              popup
            />
          )}
        </Box>
      )}

      {/* Card view */}
      {viewMode === 'card' && (
        <>
          {filtered.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              {emptyMessage}
            </Typography>
          ) : (
            <>
              <Grid container spacing={2}>
                {paginated.map(ev => (
                  <Grid item xs={12} sm={6} md={4} key={ev.eventId}>
                    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flex: 1, pb: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                          <Chip label={CATEGORY_LABELS[ev.category]} color={CATEGORY_COLORS[ev.category]} size="small" sx={{ flexShrink: 0 }} />
                          {ev.recurrence && ev.recurrence !== 'NONE' && (
                            <Chip label={RECURRENCE_LABELS[ev.recurrence]} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
                          )}
                        </Box>

                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 0.5 }}>
                          {ev.title || CATEGORY_LABELS[ev.category]}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          {ev.teamName ?? 'All club members'}
                        </Typography>

                        <Divider sx={{ mb: 1.5 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarMonth sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                            <Typography variant="body2">{ev.eventDate}</Typography>
                            {ev.recurrenceEndDate && (
                              <Typography variant="caption" color="text.secondary">→ {ev.recurrenceEndDate}</Typography>
                            )}
                          </Box>
                          {ev.startTime && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTime sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                              <Typography variant="body2">{ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</Typography>
                            </Box>
                          )}
                          {ev.locationName && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Place sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                              <Typography variant="body2" noWrap sx={{ flex: 1 }}>{ev.locationName}</Typography>
                              {ev.googleMapsUrl && (
                                <Tooltip title="Open in Maps">
                                  <IconButton size="small" component="a" href={ev.googleMapsUrl} target="_blank" rel="noopener" sx={{ p: 0.25 }}>
                                    <OpenInNew sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          )}
                          {ev.meetingUrl && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <VideoCall sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                              <Typography variant="body2" component="a" href={ev.meetingUrl} target="_blank" rel="noopener"
                                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                Meeting link
                              </Typography>
                            </Box>
                          )}
                          {ev.notes && (
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <Notes sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0, mt: 0.2 }} />
                              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                                {ev.notes}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'flex-end', pt: 0.5 }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(ev)}><Edit fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(ev)}><Delete fontSize="small" /></IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </>
          )}
        </>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' } }}>
            <TableHead>
              <TableRow>
                {col('date')      && <TableCell>Date</TableCell>}
                {col('category')  && <TableCell>Category</TableCell>}
                {col('titleTeam') && <TableCell>Title / Team</TableCell>}
                {col('time')      && <TableCell>Time</TableCell>}
                {col('location')  && <TableCell>Location</TableCell>}
                {col('repeat')    && <TableCell>Repeat</TableCell>}
                {col('links')     && <TableCell>Links</TableCell>}
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map(ev => (
                <TableRow key={ev.eventId}>
                  {col('date') && <TableCell>{ev.eventDate}</TableCell>}
                  {col('category') && (
                    <TableCell>
                      <Chip label={CATEGORY_LABELS[ev.category]} color={CATEGORY_COLORS[ev.category]} size="small" />
                    </TableCell>
                  )}
                  {col('titleTeam') && (
                    <TableCell>
                      <Typography variant="body2">{ev.title || CATEGORY_LABELS[ev.category]}</Typography>
                      {ev.teamName
                        ? <Typography variant="caption" color="text.secondary">{ev.teamName}</Typography>
                        : <Typography variant="caption" color="text.secondary">All club members</Typography>}
                    </TableCell>
                  )}
                  {col('time') && (
                    <TableCell>
                      {ev.startTime && `${ev.startTime}${ev.endTime ? ` – ${ev.endTime}` : ''}`}
                    </TableCell>
                  )}
                  {col('location') && <TableCell>{ev.locationName}</TableCell>}
                  {col('repeat') && (
                    <TableCell>
                      {ev.recurrence && ev.recurrence !== 'NONE' && (
                        <Chip label={RECURRENCE_LABELS[ev.recurrence]} size="small" variant="outlined" />
                      )}
                    </TableCell>
                  )}
                  {col('links') && (
                    <TableCell>
                      <Box sx={{ display: 'flex' }}>
                        {ev.googleMapsUrl && (
                          <Tooltip title="Google Maps">
                            <IconButton size="small" component="a" href={ev.googleMapsUrl} target="_blank" rel="noopener">
                              <OpenInNew fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {ev.meetingUrl && (
                          <Tooltip title="Meeting Link">
                            <IconButton size="small" component="a" href={ev.meetingUrl} target="_blank" rel="noopener">
                              <VideoCall fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  )}
                  <TableCell>
                    <IconButton size="small" onClick={() => openEdit(ev)}><Edit /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(ev)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={ALL_COLUMNS.filter(c => col(c.key)).length + 1} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{emptyMessage}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </TableContainer>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteNotify(false); }} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Event</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.title || (deleteTarget ? CATEGORY_LABELS[deleteTarget.category] : '')}</strong> on {deleteTarget?.eventDate}?
          </Typography>
          {deleteTarget?.seriesId && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This event is part of a recurring series.
            </Typography>
          )}
          <FormControlLabel
            sx={{ mt: 2, display: 'flex' }}
            control={
              <Checkbox checked={deleteNotify} onChange={e => setDeleteNotify(e.target.checked)} color="warning" />
            }
            label="Send cancellation notification to members"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteTarget(null); setDeleteNotify(false); }}>Cancel</Button>
          {deleteTarget?.seriesId && (
            <Button color="warning" onClick={() => deleteSeries(deleteTarget.seriesId!)}>Delete Series</Button>
          )}
          <Button variant="contained" color="error" onClick={confirmDelete}>Delete This</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
