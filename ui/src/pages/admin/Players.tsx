import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Checkbox, FormControlLabel, Avatar,
  CircularProgress, Tooltip, TableSortLabel, TablePagination,
  Popover, FormGroup,
} from '@mui/material';
import { Add, Edit, Delete, CloudUpload, OpenInNew, ViewColumn } from '@mui/icons-material';
import { playerApi } from '../../api/playerApi';
import { clubApi } from '../../api/clubApi';
import { paymentApi } from '../../api/paymentApi';
import { Player, Club, BattingPosition, BattingStance, BowlingArm, BowlingType, ClothingSize } from '../../types';
import { formatEnum } from '../../utils/formatEnum';

const empty: Player = { name: '', surname: '' };

const VALID_BOWLING_TYPES: BowlingType[] = [
  'VERY_FAST', 'FAST', 'FAST_MEDIUM', 'MEDIUM_FAST', 'MEDIUM', 'MEDIUM_SLOW',
  'OFF_SPIN', 'LEG_SPIN', 'SLOW_LEFT_ARM_ORTHODOX', 'CHINAMAN', 'NONE',
];
const validBowlingType = (v?: string): BowlingType | '' =>
  VALID_BOWLING_TYPES.includes(v as BowlingType) ? (v as BowlingType) : '';

type ColKey = 'name' | 'surname' | 'shirtNumber' | 'club' | 'battingStance' | 'battingPosition' | 'bowlingArm' | 'bowlingType' | 'wicketKeeper' | 'shirtSize' | 'pantSize';

const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'name',           label: 'Name' },
  { key: 'surname',        label: 'Surname' },
  { key: 'shirtNumber',    label: '#' },
  { key: 'club',           label: 'Club' },
  { key: 'battingStance',  label: 'Batting' },
  { key: 'battingPosition',label: 'Position' },
  { key: 'bowlingArm',     label: 'Bowling Arm' },
  { key: 'bowlingType',    label: 'Bowling' },
  { key: 'wicketKeeper',   label: 'WK' },
  { key: 'shirtSize',      label: 'Shirt Size' },
  { key: 'pantSize',       label: 'Pant Size' },
];

const DEFAULT_VISIBLE = new Set<ColKey>(['name', 'surname', 'shirtNumber', 'club', 'battingStance', 'battingPosition', 'bowlingArm', 'bowlingType', 'wicketKeeper']);

export const Players: React.FC = () => {
  const [rows, setRows] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Player>(empty);
  const [uploading, setUploading] = useState(false);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [clubFilter, setClubFilter] = useState<number | ''>('');
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(DEFAULT_VISIBLE);
  const [colAnchor, setColAnchor] = useState<HTMLButtonElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      set({ profilePictureUrl: url });
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const load = () => playerApi.findAll().then(setRows);
  useEffect(() => {
    load();
    clubApi.findAll().then(setClubs);
  }, []);

  const save = async () => {
    const payload: Player = {
      ...editing,
      bowlingType: editing.bowlingType || undefined,
      bowlingArm: editing.bowlingArm || undefined,
      battingStance: editing.battingStance || undefined,
      battingPosition: editing.battingPosition || undefined,
    };
    if (payload.playerId) { await playerApi.update(payload.playerId, payload); }
    else { await playerApi.create(payload); }
    setOpen(false); load();
  };

  const remove = async (id: number) => {
    if (confirm('Delete player?')) { await playerApi.delete(id); load(); }
  };

  const set = (patch: Partial<Player>) => setEditing(e => ({ ...e, ...patch }));

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filtered = [...rows].filter(r => {
    const q = search.toLowerCase();
    const matchesSearch = !q
      || r.name.toLowerCase().includes(q)
      || r.surname.toLowerCase().includes(q)
      || r.homeClubName?.toLowerCase().includes(q)
      || r.shirtNumber?.toString().includes(q);
    const matchesClub = !clubFilter || r.homeClubId === clubFilter;
    return matchesSearch && matchesClub;
  }).sort((a, b) => {
    const cmp = a.surname.localeCompare(b.surname) || a.name.localeCompare(b.name);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const col = (key: ColKey) => visibleCols.has(key);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Players</Typography>
        <TextField
          size="small"
          placeholder="Search name, surname, club, #…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 280 } }}
        />
        <TextField
          select
          size="small"
          label="Club"
          value={clubFilter}
          onChange={e => { setClubFilter(e.target.value === '' ? '' : +e.target.value); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 200 } }}
        >
          <MenuItem value="">All Clubs</MenuItem>
          {clubs.map(c => (
            <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>
          ))}
        </TextField>
        <Tooltip title="Toggle columns">
          <IconButton onClick={e => setColAnchor(e.currentTarget)}><ViewColumn /></IconButton>
        </Tooltip>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(empty); setOpen(true); }}>
          Add Player
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
              <TableCell />
              {col('name')            && <TableCell>Name</TableCell>}
              {col('surname')         && <TableCell sortDirection={sortDir}><TableSortLabel active direction={sortDir} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>Surname</TableSortLabel></TableCell>}
              {col('shirtNumber')     && <TableCell>#</TableCell>}
              {col('club')            && <TableCell>Club</TableCell>}
              {col('battingStance')   && <TableCell>Batting</TableCell>}
              {col('battingPosition') && <TableCell>Position</TableCell>}
              {col('bowlingArm')      && <TableCell>Bowling Arm</TableCell>}
              {col('bowlingType')     && <TableCell>Bowling</TableCell>}
              {col('wicketKeeper')    && <TableCell>WK</TableCell>}
              {col('shirtSize')       && <TableCell>Shirt Size</TableCell>}
              {col('pantSize')        && <TableCell>Pant Size</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(r => (
              <TableRow key={r.playerId}>
                <TableCell>
                  <Avatar
                    src={r.profilePictureUrl}
                    sx={{
                      width: 32, height: 32,
                      cursor: r.profilePictureUrl ? 'pointer' : 'default',
                      '&:hover': r.profilePictureUrl ? { opacity: 0.8 } : {},
                    }}
                    onClick={() => r.profilePictureUrl && setViewPhotoUrl(r.profilePictureUrl)}
                  >
                    {r.name.charAt(0)}
                  </Avatar>
                </TableCell>
                {col('name')            && <TableCell>{r.name}</TableCell>}
                {col('surname')         && <TableCell>{r.surname}</TableCell>}
                {col('shirtNumber')     && <TableCell>{r.shirtNumber}</TableCell>}
                {col('club')            && <TableCell>{r.homeClubName}</TableCell>}
                {col('battingStance')   && <TableCell>{formatEnum(r.battingStance)}</TableCell>}
                {col('battingPosition') && <TableCell>{formatEnum(r.battingPosition)}</TableCell>}
                {col('bowlingArm')      && <TableCell>{r.bowlingArm && r.bowlingType !== 'NONE' ? `${formatEnum(r.bowlingArm)} Arm` : ''}</TableCell>}
                {col('bowlingType')     && <TableCell>{formatEnum(r.bowlingType)}</TableCell>}
                {col('wicketKeeper')    && <TableCell>{r.wicketKeeper ? '✓' : ''}</TableCell>}
                {col('shirtSize')       && <TableCell>{r.shirtSize ?? ''}</TableCell>}
                {col('pantSize')        && <TableCell>{r.pantSize ?? ''}</TableCell>}
                <TableCell>
                  <IconButton size="small" onClick={() => { setEditing(r); setOpen(true); }}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.playerId!)}><Delete /></IconButton>
                  {r.careerUrl && (
                    <Tooltip title="Career profile">
                      <IconButton size="small" component="a" href={r.careerUrl} target="_blank" rel="noopener noreferrer">
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
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

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.playerId ? 'Edit' : 'New'} Player</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>

          <Box>
            <input
                type="file"
                ref={photoInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handlePhotoUpload}
            />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar
                  src={editing.profilePictureUrl ?? ''}
                  sx={{ width: 64, height: 64, flexShrink: 0 }}
              >
                {editing.name?.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploading ? <CircularProgress size={14} /> : <CloudUpload />}
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploading}
                    sx={{ alignSelf: 'flex-start' }}
                >
                  {uploading ? 'Uploading…' : 'Upload Photo'}
                </Button>

              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Name" value={editing.name} fullWidth required
              onChange={e => set({ name: e.target.value })} />
            <TextField label="Surname" value={editing.surname} fullWidth required
              onChange={e => set({ surname: e.target.value })} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Date of Birth" type="date" value={editing.dateOfBirth ?? ''} fullWidth
              InputLabelProps={{ shrink: true }} onChange={e => set({ dateOfBirth: e.target.value })} />
            <TextField
                select
                label="Home Club"
                value={editing.homeClubId ?? ''} fullWidth
                onChange={e => set({ homeClubId: e.target.value ? +e.target.value : undefined })}
            >
              <MenuItem value="">— None —</MenuItem>
              {clubs.map(c => (
                  <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>
              ))}
            </TextField>
          </Box>



          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Shirt #" type="number" value={editing.shirtNumber ?? ''} fullWidth
                       onChange={e => set({ shirtNumber: +e.target.value })} />

            <TextField select label="Shirt Size" value={editing.shirtSize ?? ''} fullWidth
              onChange={e => set({ shirtSize: e.target.value as ClothingSize || undefined })}>
              <MenuItem value="">— None —</MenuItem>
              {(['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as ClothingSize[]).map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Pant Size" value={editing.pantSize ?? ''} fullWidth
              onChange={e => set({ pantSize: e.target.value as ClothingSize || undefined })}>
              <MenuItem value="">— None —</MenuItem>
              {(['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as ClothingSize[]).map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Contact" value={editing.contactNumber ?? ''} fullWidth
              onChange={e => set({ contactNumber: e.target.value })} />
            <TextField label="Alt Contact" value={editing.alternativeContactNumber ?? ''} fullWidth
              onChange={e => set({ alternativeContactNumber: e.target.value })} />
          </Box>
          <TextField label="Email" type="email" value={editing.email ?? ''}
            onChange={e => set({ email: e.target.value })} />
          <TextField
              label="Career URL"
              type="url"
              value={editing.careerUrl ?? ''}
              onChange={e => set({ careerUrl: e.target.value })}
              helperText="Link to player's career profile (e.g. CricHeroes)"
          />

          <TextField select label="Batting Position" value={editing.battingPosition ?? ''}
            onChange={e => set({ battingPosition: e.target.value as BattingPosition })}>
            <MenuItem value="">— None —</MenuItem>
            <MenuItem value="OPENER">Opener</MenuItem>
            <MenuItem value="TOP_ORDER">Top Order</MenuItem>
            <MenuItem value="MIDDLE_ORDER">Middle Order</MenuItem>
            <MenuItem value="LOWER_MIDDLE_ORDER">Lower Middle Order</MenuItem>
            <MenuItem value="LOWER_ORDER">Lower Order</MenuItem>
          </TextField>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField select label="Batting Stance" value={editing.battingStance ?? ''} fullWidth
              onChange={e => set({ battingStance: e.target.value as BattingStance })}>
              <MenuItem value="RIGHT_HANDED">Right Handed</MenuItem>
              <MenuItem value="LEFT_HANDED">Left Handed</MenuItem>
            </TextField>
            <TextField select label="Bowling Arm" value={editing.bowlingArm ?? ''} fullWidth
              onChange={e => set({ bowlingArm: e.target.value as BowlingArm })}>
              <MenuItem value="RIGHT">Right</MenuItem>
              <MenuItem value="LEFT">Left</MenuItem>
            </TextField>
          </Box>
          <TextField select label="Bowling Type" value={validBowlingType(editing.bowlingType)}
            onChange={e => set({ bowlingType: e.target.value as BowlingType })}>
            <MenuItem value="VERY_FAST"><Tooltip title="150+ km/h" placement="right"><span style={{ width: '100%' }}>Very Fast</span></Tooltip></MenuItem>
            <MenuItem value="FAST"><Tooltip title="140–150 km/h" placement="right"><span style={{ width: '100%' }}>Fast</span></Tooltip></MenuItem>
            <MenuItem value="FAST_MEDIUM"><Tooltip title="130–140 km/h" placement="right"><span style={{ width: '100%' }}>Fast Medium</span></Tooltip></MenuItem>
            <MenuItem value="MEDIUM_FAST"><Tooltip title="120–130 km/h" placement="right"><span style={{ width: '100%' }}>Medium Fast</span></Tooltip></MenuItem>
            <MenuItem value="MEDIUM"><Tooltip title="100–120 km/h" placement="right"><span style={{ width: '100%' }}>Medium</span></Tooltip></MenuItem>
            <MenuItem value="MEDIUM_SLOW"><Tooltip title="85–100 km/h" placement="right"><span style={{ width: '100%' }}>Medium Slow</span></Tooltip></MenuItem>
            <MenuItem value="OFF_SPIN"><Tooltip title="Finger Spin · 70–90 km/h" placement="right"><span style={{ width: '100%' }}>Off Spin</span></Tooltip></MenuItem>
            <MenuItem value="LEG_SPIN"><Tooltip title="Wrist Spin · 70–90 km/h" placement="right"><span style={{ width: '100%' }}>Leg Spin</span></Tooltip></MenuItem>
            <MenuItem value="SLOW_LEFT_ARM_ORTHODOX"><Tooltip title="Left-arm Finger Spin · 70–90 km/h" placement="right"><span style={{ width: '100%' }}>Slow Left-Arm Orthodox</span></Tooltip></MenuItem>
            <MenuItem value="CHINAMAN"><Tooltip title="Left-arm Wrist Spin · 65–85 km/h" placement="right"><span style={{ width: '100%' }}>Chinaman</span></Tooltip></MenuItem>
            <MenuItem value="NONE">Don't Bowl</MenuItem>
          </TextField>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <FormControlLabel control={<Checkbox checked={editing.wicketKeeper ?? false}
              onChange={e => set({ wicketKeeper: e.target.checked })} />} label="Wicket Keeper" />
            <FormControlLabel control={<Checkbox checked={editing.partTimeBowler ?? false}
              onChange={e => set({ partTimeBowler: e.target.checked })} />} label="Part Time Bowler" />
          </Box>


        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Photo viewer */}
      <Dialog open={!!viewPhotoUrl} onClose={() => setViewPhotoUrl(null)} maxWidth="sm">
        <DialogContent sx={{ p: 0, lineHeight: 0 }}>
          <img
            src={viewPhotoUrl ?? ''}
            alt="Player photo"
            style={{ display: 'block', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewPhotoUrl(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
