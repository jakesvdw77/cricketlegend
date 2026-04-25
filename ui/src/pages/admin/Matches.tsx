import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, ListSubheader,
  TableSortLabel, TablePagination,
  Popover, FormGroup, Checkbox, FormControlLabel, Tooltip, useMediaQuery, useTheme, InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, Assignment, Groups, ViewColumn, Print, HowToVote, YouTube } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { fieldApi } from '../../api/fieldApi';
import { tournamentApi } from '../../api/tournamentApi';
import { Match, Team, Field, Tournament, MatchStage } from '../../types';

const empty: Match = {};

type ColKey = 'date' | 'startTime' | 'tournament' | 'homeTeam' | 'opposition' | 'ground' | 'umpire' | 'stage';
const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'date',        label: 'Match Day' },
  { key: 'startTime',   label: 'Start Time' },
  { key: 'tournament',  label: 'Tournament' },
  { key: 'stage',       label: 'Stage' },
  { key: 'homeTeam',    label: 'Home Team' },
  { key: 'opposition',  label: 'Opposition' },
  { key: 'ground',      label: 'Ground' },
  { key: 'umpire',      label: 'Umpire' },
];
const DEFAULT_VISIBLE = new Set<ColKey>(['date', 'startTime', 'tournament', 'homeTeam', 'opposition', 'ground', 'umpire', 'stage']);
const MOBILE_VISIBLE = new Set<ColKey>(['date', 'startTime', 'tournament', 'homeTeam', 'opposition', 'ground']);

export const Matches: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = useState<Match[]>([]);
  const [sortField, setSortField] = useState<'matchDate' | 'tournamentName' | 'homeTeamName'>('matchDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };
  const [filterTournament, setFilterTournament] = useState<number | ''>('');
  const [filterStage, setFilterStage] = useState<MatchStage | ''>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Match>(empty);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(isMobile ? MOBILE_VISIBLE : DEFAULT_VISIBLE));
  const [colAnchor, setColAnchor] = useState<HTMLButtonElement | null>(null);
  const [errors, setErrors] = useState<{ matchDate?: string; homeTeam?: string; oppTeam?: string; startTime?: string }>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = () => matchApi.findAll().then(setRows);
  useEffect(() => {
    load();
    teamApi.findAll().then(setTeams);
    fieldApi.findAll().then(setFields);
    tournamentApi.findAll().then(setTournaments);
  }, []);

  const openCreate = () => {
    setEditing(empty);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (match: Match) => {
    setEditing(match);
    setErrors({});
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    load();
  };

  const saveMatchDetails = async () => {
    const newErrors: typeof errors = {};
    if (!editing.matchDate) newErrors.matchDate = 'Match date is required';
    if (!editing.homeTeamId) newErrors.homeTeam = 'Home team is required';
    if (!editing.oppositionTeamId) newErrors.oppTeam = 'Opposition team is required';
    else if (editing.homeTeamId && editing.homeTeamId === editing.oppositionTeamId)
      newErrors.oppTeam = 'Opposition team must be different from home team';
    if (!editing.scheduledStartTime) newErrors.startTime = 'Start time is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    if (editing.matchId) {
      await matchApi.update(editing.matchId, editing);
    } else {
      await matchApi.create(editing);
    }
    handleClose();
  };

  const remove = async () => {
    if (deleteId == null) return;
    await matchApi.delete(deleteId);
    setDeleteId(null);
    load();
  };

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filtered = [...rows].filter(r => {
    const matchesTournament = !filterTournament || r.tournamentId === filterTournament;
    const matchesStage = !filterStage || r.matchStage === filterStage;
    return matchesTournament && matchesStage;
  }).sort((a, b) => {
    const val = (r: typeof a) =>
      sortField === 'matchDate' ? (r.matchDate ?? '') :
      sortField === 'tournamentName' ? (r.tournamentName ?? '') :
      (r.homeTeamName ?? '');
    const cmp = val(a).localeCompare(val(b));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const col = (key: ColKey) => visibleCols.has(key);

  const selectedTournament = tournaments.find(t => t.tournamentId === editing.tournamentId);
  const tournamentPools = selectedTournament?.pools ?? [];
  const usePoolGroups = tournamentPools.length > 1;

  const renderTeamItems = (excludeId?: number) => {
    if (!editing.tournamentId || tournamentPools.length === 0) {
      return teams
        .filter(t => t.teamId !== excludeId)
        .map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>);
    }
    if (usePoolGroups) {
      return tournamentPools.flatMap(pool => [
        <ListSubheader key={`h-${pool.poolId}`}>{pool.poolName}</ListSubheader>,
        ...(pool.teams ?? [])
          .filter(t => t.teamId !== excludeId)
          .map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>),
      ]);
    }
    return (tournamentPools[0].teams ?? [])
      .filter(t => t.teamId !== excludeId)
      .map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Matches</Typography>
        <TextField
          select
          size="small"
          label="Tournament"
          value={filterTournament}
          onChange={e => { setFilterTournament(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 220 } }}
        >
          <MenuItem value="">All tournaments</MenuItem>
          {tournaments.map(t => <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Stage"
          value={filterStage}
          onChange={e => { setFilterStage(e.target.value as MatchStage | ''); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 140 } }}
        >
          <MenuItem value="">All stages</MenuItem>
          <MenuItem value="FRIENDLY">Friendly</MenuItem>
          <MenuItem value="POOL">Pool</MenuItem>
          <MenuItem value="QUARTER_FINAL">Quarter-Final</MenuItem>
          <MenuItem value="SEMI_FINAL">Semi-Final</MenuItem>
          <MenuItem value="FINAL">Final</MenuItem>
        </TextField>
        <Tooltip title="Toggle columns">
          <IconButton onClick={e => setColAnchor(e.currentTarget)}><ViewColumn /></IconButton>
        </Tooltip>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Match
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
                control={
                  <Checkbox
                    size="small"
                    checked={visibleCols.has(c.key)}
                    onChange={() => toggleCol(c.key)}
                  />
                }
              />
            ))}
          </FormGroup>
        </Box>
      </Popover>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' }, '& .MuiTableHead-root .MuiTableSortLabel-root': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root:hover': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root.Mui-active': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-icon': { color: 'inherit !important' } }}>
          <TableHead>
            <TableRow>
              {col('date') && (
                <TableCell sortDirection={sortField === 'matchDate' ? sortDir : false}>
                  <TableSortLabel active={sortField === 'matchDate'} direction={sortDir} onClick={() => handleSort('matchDate')}>Match Day</TableSortLabel>
                </TableCell>
              )}
              {col('startTime')  && <TableCell>Start Time</TableCell>}
              {col('tournament') && (
                <TableCell sortDirection={sortField === 'tournamentName' ? sortDir : false}>
                  <TableSortLabel active={sortField === 'tournamentName'} direction={sortDir} onClick={() => handleSort('tournamentName')}>Tournament</TableSortLabel>
                </TableCell>
              )}
              {col('stage')      && <TableCell>Stage</TableCell>}
              {col('homeTeam') && (
                <TableCell sortDirection={sortField === 'homeTeamName' ? sortDir : false}>
                  <TableSortLabel active={sortField === 'homeTeamName'} direction={sortDir} onClick={() => handleSort('homeTeamName')}>Home Team</TableSortLabel>
                </TableCell>
              )}
              {col('opposition') && <TableCell>Opposition</TableCell>}
              {col('ground')     && <TableCell>Ground</TableCell>}
              {col('umpire')     && <TableCell>Umpire</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(r => (
              <TableRow key={r.matchId}>
                {col('date')       && <TableCell>{r.matchDate}</TableCell>}
                {col('startTime')  && <TableCell>{r.scheduledStartTime ? r.scheduledStartTime.slice(0, 5) : ''}</TableCell>}
                {col('tournament') && <TableCell>{r.tournamentName}</TableCell>}
                {col('stage')      && <TableCell>{r.matchStage ? { FRIENDLY: 'Friendly', POOL: 'Pool', QUARTER_FINAL: 'Quarter-Final', SEMI_FINAL: 'Semi-Final', FINAL: 'Final' }[r.matchStage] : ''}</TableCell>}
                {col('homeTeam')   && <TableCell>{r.homeTeamName}</TableCell>}
                {col('opposition') && <TableCell>{r.oppositionTeamName}</TableCell>}
                {col('ground')     && <TableCell>{r.fieldName}</TableCell>}
                {col('umpire')     && <TableCell>{r.umpire}</TableCell>}
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(r)}><Edit /></IconButton>
                  </Tooltip>
                  <Tooltip title="Team Sheet">
                    <IconButton size="small" onClick={() => navigate(`/admin/matches/${r.matchId}/teamsheet`)}>
                      <Groups />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Availability Poll">
                    <IconButton size="small" onClick={() => navigate(`/admin/matches/${r.matchId}/availability`)}>
                      <HowToVote />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Capture Result">
                    <IconButton size="small" onClick={() => navigate(`/admin/matches/${r.matchId}/result`)}>
                      <Assignment />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Print Team Sheet">
                    <IconButton size="small" onClick={() => navigate(`/matches/${r.matchId}/teamsheet`)}>
                      <Print />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => setDeleteId(r.matchId!)}><Delete /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </TableContainer>

      <Dialog open={open} onClose={(_, reason) => { if (reason !== 'backdropClick') handleClose(); }} maxWidth="md" fullWidth>
        <DialogTitle>{editing.matchId ? 'Edit' : 'New'} Match</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '20px !important', minHeight: 480, overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField label="Match Date" type="date" value={editing.matchDate ?? ''} fullWidth required
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.matchDate} helperText={errors.matchDate}
                  onChange={e => setEditing({ ...editing, matchDate: e.target.value })} />
                <TextField label="Arrival Time" type="time" value={editing.arrivalTime ?? ''} fullWidth
                  InputLabelProps={{ shrink: true }} onChange={e => setEditing({ ...editing, arrivalTime: e.target.value })} />
                <TextField label="Toss Time" type="time" value={editing.tossTime ?? ''} fullWidth
                  InputLabelProps={{ shrink: true }} onChange={e => setEditing({ ...editing, tossTime: e.target.value })} />
                <TextField label="Start Time" type="time" value={editing.scheduledStartTime ?? ''} fullWidth required
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.startTime} helperText={errors.startTime}
                  onChange={e => {
                    const startTime = e.target.value;
                    const patch: Partial<Match> = { scheduledStartTime: startTime };
                    if (startTime) {
                      const [h, m] = startTime.split(':').map(Number);
                      const minsFromMidnight = h * 60 + m;
                      const offset = (mins: number) => {
                        const t = ((minsFromMidnight - mins) % 1440 + 1440) % 1440;
                        return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
                      };
                      if (!editing.arrivalTime) patch.arrivalTime = offset(45);
                      if (!editing.tossTime) patch.tossTime = offset(15);
                    }
                    setEditing({ ...editing, ...patch });
                  }} />
              </Box>
              <TextField select label="Tournament" value={editing.tournamentId ?? ''}
                onChange={e => {
                  const tId = +e.target.value;
                  const newT = tournaments.find(t => t.tournamentId === tId);
                  const validIds = new Set((newT?.pools ?? []).flatMap(p => (p.teams ?? []).map(t => t.teamId)));
                  setEditing(prev => ({
                    ...prev,
                    tournamentId: tId,
                    homeTeamId: prev.homeTeamId && validIds.has(prev.homeTeamId) ? prev.homeTeamId : undefined,
                    oppositionTeamId: prev.oppositionTeamId && validIds.has(prev.oppositionTeamId) ? prev.oppositionTeamId : undefined,
                  }));
                }}>
                {tournaments.map(t => <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>)}
              </TextField>
              <TextField select label="Stage" value={editing.matchStage ?? ''}
                onChange={e => setEditing({ ...editing, matchStage: e.target.value as MatchStage })}>
                <MenuItem value="FRIENDLY">Friendly</MenuItem>
                <MenuItem value="POOL">Pool</MenuItem>
                <MenuItem value="QUARTER_FINAL">Quarter-Final</MenuItem>
                <MenuItem value="SEMI_FINAL">Semi-Final</MenuItem>
                <MenuItem value="FINAL">Final</MenuItem>
              </TextField>
              <TextField select label="Home Team" value={editing.homeTeamId ?? ''} required
                error={!!errors.homeTeam} helperText={errors.homeTeam}
                onChange={e => setEditing({ ...editing, homeTeamId: +e.target.value })}>
                {renderTeamItems(editing.oppositionTeamId)}
              </TextField>
              <TextField select label="Opposition Team" value={editing.oppositionTeamId ?? ''} required
                error={!!errors.oppTeam} helperText={errors.oppTeam}
                onChange={e => setEditing({ ...editing, oppositionTeamId: +e.target.value })}>
                {renderTeamItems(editing.homeTeamId)}
              </TextField>
              <TextField select label="Ground" value={editing.fieldId ?? ''}
                onChange={e => setEditing({ ...editing, fieldId: +e.target.value })}>
                {fields.map(f => <MenuItem key={f.fieldId} value={f.fieldId}>{f.name}</MenuItem>)}
              </TextField>
              <TextField label="Umpire" value={editing.umpire ?? ''}
                onChange={e => setEditing({ ...editing, umpire: e.target.value })} />
              <TextField label="Live Scoring URL" value={editing.scoringUrl ?? ''}
                onChange={e => setEditing({ ...editing, scoringUrl: e.target.value })} />
              <TextField label="YouTube Stream URL" value={editing.youtubeUrl ?? ''}
                onChange={e => setEditing({ ...editing, youtubeUrl: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><YouTube sx={{ color: '#FF0000', fontSize: 20 }} /></InputAdornment> }} />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={saveMatchDetails}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteId != null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Match</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this match? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={remove}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
