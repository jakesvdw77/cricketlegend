import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Chip, Tooltip, TablePagination,
  Divider, FormControlLabel, Switch, Checkbox, useMediaQuery, useTheme,
  Popover, FormGroup,
} from '@mui/material';
import { Add, ArrowBack, Edit, Delete, OpenInNew, VideoCall, FilterList, ViewColumn } from '@mui/icons-material';
import { eventApi } from '../../api/eventApi';
import { clubApi } from '../../api/clubApi';
import { teamApi } from '../../api/teamApi';
import { ClubEvent, Club, Team, EventCategory, RecurrenceType } from '../../types';

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

export const Events: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | ''>('');
  const [teamFilter, setTeamFilter] = useState<number | ''>('');
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

  useEffect(() => {
    clubApi.findAll().then(setClubs);
    teamApi.findAll().then(setTeams);
  }, []);

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
    setEditing(emptyEvent(selectedClubId as number || 0));
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

  // Auto-fill location from club when club is selected
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

  const clubTeams = selectedClubId ? teams.filter(t => t.associatedClubId === selectedClubId) : [];
  const filtered = events
    .filter(e => !categoryFilter || e.category === categoryFilter)
    .filter(e => !teamFilter || e.teamId === teamFilter);
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
          <TextField select label="Club" value={editing.clubId || ''} required
            onChange={e => handleClubChange(+e.target.value)}>
            {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select label="Team (leave blank for all club members)" value={editing.teamId ?? ''}
            onChange={e => set({ teamId: e.target.value ? +e.target.value : undefined })}>
            <MenuItem value="">— All club members —</MenuItem>
            {filteredTeams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
          </TextField>
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
        <Typography variant="h5" sx={{ mr: 'auto' }}>Events</Typography>
        {!isMobile && (
          <Tooltip title="Toggle columns">
            <IconButton onClick={e => setColAnchor(e.currentTarget)}><ViewColumn /></IconButton>
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
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField select size="small" label="Club" value={selectedClubId}
              onChange={e => { setSelectedClubId(e.target.value === '' ? '' : +e.target.value); setCategoryFilter(''); setTeamFilter(''); setPage(0); }}
              sx={{ width: { xs: '100%', sm: 220 } }}>
              <MenuItem value="">— Select a club —</MenuItem>
              {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Team" value={teamFilter}
              onChange={e => { setTeamFilter(e.target.value === '' ? '' : +e.target.value); setPage(0); }}
              sx={{ width: { xs: '100%', sm: 200 } }} disabled={!selectedClubId}>
              <MenuItem value="">— All teams —</MenuItem>
              {clubTeams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
            </TextField>
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
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    {!selectedClubId
                      ? 'Select a club to view events.'
                      : (categoryFilter || teamFilter)
                        ? 'No events match the selected filters.'
                        : 'No events found for this club.'}
                  </Typography>
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
              <Checkbox
                checked={deleteNotify}
                onChange={e => setDeleteNotify(e.target.checked)}
                color="warning"
              />
            }
            label="Send cancellation notification to members"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteTarget(null); setDeleteNotify(false); }}>Cancel</Button>
          {deleteTarget?.seriesId && (
            <Button color="warning" onClick={() => deleteSeries(deleteTarget.seriesId!)}>
              Delete Series
            </Button>
          )}
          <Button variant="contained" color="error" onClick={confirmDelete}>Delete This</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
