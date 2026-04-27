import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Chip, Tooltip, TablePagination,
  Divider, FormControlLabel, Switch, Checkbox,
} from '@mui/material';
import { Add, Edit, Delete, DeleteSweep, OpenInNew, VideoCall } from '@mui/icons-material';
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

export const Events: React.FC = () => {
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
  const [useClubLocation, setUseClubLocation] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

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
    setEditing(emptyEvent(selectedClubId as number || clubs[0]?.clubId || 0));
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

  const filteredTeams = editing?.clubId
    ? teams.filter(t => t.associatedClubId === editing.clubId)
    : teams;

  const clubTeams = selectedClubId ? teams.filter(t => t.associatedClubId === selectedClubId) : [];
  const filtered = events
    .filter(e => !categoryFilter || e.category === categoryFilter)
    .filter(e => !teamFilter || e.teamId === teamFilter);
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Events</Typography>
        <TextField
          select
          size="small"
          label="Club"
          value={selectedClubId}
          onChange={e => { setSelectedClubId(e.target.value === '' ? '' : +e.target.value); setCategoryFilter(''); setTeamFilter(''); setPage(0); }}
          sx={{ width: 220 }}
        >
          <MenuItem value="">— Select a club —</MenuItem>
          {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Team"
          value={teamFilter}
          onChange={e => { setTeamFilter(e.target.value === '' ? '' : +e.target.value); setPage(0); }}
          sx={{ width: 200 }}
          disabled={!selectedClubId}
        >
          <MenuItem value="">— All teams —</MenuItem>
          {clubTeams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Category"
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value as EventCategory | ''); setPage(0); }}
          sx={{ width: 200 }}
        >
          <MenuItem value="">— All categories —</MenuItem>
          {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map(k => (
            <MenuItem key={k} value={k}>{CATEGORY_LABELS[k]}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} disabled={!selectedClubId}>
          Add Event
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' } }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Title / Team</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Repeat</TableCell>
              <TableCell>Links</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(ev => (
              <TableRow key={ev.eventId}>
                <TableCell>{ev.eventDate}</TableCell>
                <TableCell>
                  <Chip label={CATEGORY_LABELS[ev.category]} color={CATEGORY_COLORS[ev.category]} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{ev.title || CATEGORY_LABELS[ev.category]}</Typography>
                  {ev.teamName && <Typography variant="caption" color="text.secondary">{ev.teamName}</Typography>}
                  {!ev.teamName && <Typography variant="caption" color="text.secondary">All club members</Typography>}
                </TableCell>
                <TableCell>
                  {ev.startTime && `${ev.startTime}${ev.endTime ? ` – ${ev.endTime}` : ''}`}
                </TableCell>
                <TableCell>{ev.locationName}</TableCell>
                <TableCell>
                  {ev.recurrence && ev.recurrence !== 'NONE' && (
                    <Chip label={RECURRENCE_LABELS[ev.recurrence]} size="small" variant="outlined" />
                  )}
                </TableCell>
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
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(ev)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(ev)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
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

      {/* Add / Edit dialog */}
      {editing && (
        <Dialog open={open} onClose={(_, reason) => { if (reason !== 'backdropClick') setOpen(false); }} maxWidth="md" fullWidth>
          <DialogTitle>{editing.eventId ? 'Edit Event' : 'New Event'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '20px !important' }}>

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
              onChange={e => set({ title: e.target.value })}
              helperText="Leave blank to use category name" />

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField label="Date" type="date" value={editing.eventDate} required fullWidth
                InputLabelProps={{ shrink: true }}
                onChange={e => set({ eventDate: e.target.value })} />
              <TextField label="Start Time" type="time" value={editing.startTime ?? ''} fullWidth
                InputLabelProps={{ shrink: true }}
                onChange={e => set({ startTime: e.target.value || undefined })} />
              <TextField label="End Time" type="time" value={editing.endTime ?? ''} fullWidth
                InputLabelProps={{ shrink: true }}
                onChange={e => set({ endTime: e.target.value || undefined })} />
            </Box>

            <Divider><Typography variant="caption">Location</Typography></Divider>

            <FormControlLabel
              control={
                <Switch
                  checked={useClubLocation}
                  onChange={e => {
                    const checked = e.target.checked;
                    setUseClubLocation(checked);
                    if (checked) {
                      const club = clubs.find(c => c.clubId === editing.clubId);
                      set({ locationName: club?.name ?? '', googleMapsUrl: club?.googleMapsUrl ?? '' });
                    }
                  }}
                />
              }
              label="Use club as location"
            />

            <TextField label="Location Name" value={editing.locationName ?? ''}
              onChange={e => set({ locationName: e.target.value })}
              disabled={useClubLocation}
              InputProps={{ readOnly: useClubLocation }} />
            <TextField label="Google Maps URL" value={editing.googleMapsUrl ?? ''}
              onChange={e => set({ googleMapsUrl: e.target.value })}
              placeholder="https://maps.google.com/..."
              disabled={useClubLocation}
              InputProps={{ readOnly: useClubLocation }} />
            <TextField label="Meeting URL (e.g. Google Meet)" value={editing.meetingUrl ?? ''}
              onChange={e => set({ meetingUrl: e.target.value })}
              placeholder="https://meet.google.com/..." />

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

          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={save}
              disabled={!editing.clubId || !editing.category || !editing.eventDate}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
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
