import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Checkbox, FormControlLabel, Avatar,
  CircularProgress, Tooltip, TableSortLabel,
} from '@mui/material';
import { Add, Edit, Delete, CloudUpload, OpenInNew } from '@mui/icons-material';
import { playerApi } from '../../api/playerApi';
import { clubApi } from '../../api/clubApi';
import { paymentApi } from '../../api/paymentApi';
import { Player, Club, BattingPosition, BattingStance, BowlingArm, BowlingType } from '../../types';
import { formatEnum } from '../../utils/formatEnum';

const empty: Player = { name: '', surname: '' };

const VALID_BOWLING_TYPES: BowlingType[] = [
  'VERY_FAST', 'FAST', 'FAST_MEDIUM', 'MEDIUM_FAST', 'MEDIUM', 'MEDIUM_SLOW',
  'OFF_SPIN', 'LEG_SPIN', 'SLOW_LEFT_ARM_ORTHODOX', 'CHINAMAN', 'NONE',
];
const validBowlingType = (v?: string): BowlingType | '' =>
  VALID_BOWLING_TYPES.includes(v as BowlingType) ? (v as BowlingType) : '';

export const Players: React.FC = () => {
  const [rows, setRows] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Player>(empty);
  const [uploading, setUploading] = useState(false);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Players</Typography>
        <TextField
          size="small"
          placeholder="Search name, surname, club, #…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 280 }}
        />
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(empty); setOpen(true); }}>
          Add Player
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' }, '& .MuiTableHead-root .MuiTableSortLabel-root': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root:hover': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root.Mui-active': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-icon': { color: 'inherit !important' } }}>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Name</TableCell>
              <TableCell sortDirection={sortDir}>
                <TableSortLabel active direction={sortDir} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>Surname</TableSortLabel>
              </TableCell>
              <TableCell>#</TableCell>
              <TableCell>Club</TableCell>
              <TableCell>Batting</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Bowling Arm</TableCell>
              <TableCell>Bowling</TableCell>
              <TableCell>WK</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {[...rows].filter(r => {
              const q = search.toLowerCase();
              return !q
                || r.name.toLowerCase().includes(q)
                || r.surname.toLowerCase().includes(q)
                || r.homeClubName?.toLowerCase().includes(q)
                || r.shirtNumber?.toString().includes(q);
            }).sort((a, b) => {
              const cmp = a.surname.localeCompare(b.surname) || a.name.localeCompare(b.name);
              return sortDir === 'asc' ? cmp : -cmp;
            }).map(r => (
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
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.surname}</TableCell>
                <TableCell>{r.shirtNumber}</TableCell>
                <TableCell>{r.homeClubName}</TableCell>
                <TableCell>{formatEnum(r.battingStance)}</TableCell>
                <TableCell>{formatEnum(r.battingPosition)}</TableCell>
                <TableCell>{r.bowlingArm && r.bowlingType !== 'NONE' ? `${formatEnum(r.bowlingArm)} Arm` : ''}</TableCell>
                <TableCell>{formatEnum(r.bowlingType)}</TableCell>
                <TableCell>{r.wicketKeeper ? '✓' : ''}</TableCell>
                <TableCell>
                  {r.careerUrl && (
                    <Tooltip title="Career profile">
                      <IconButton size="small" component="a" href={r.careerUrl} target="_blank" rel="noopener noreferrer">
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <IconButton size="small" onClick={() => { setEditing(r); setOpen(true); }}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.playerId!)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.playerId ? 'Edit' : 'New'} Player</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Name" value={editing.name} fullWidth required
              onChange={e => set({ name: e.target.value })} />
            <TextField label="Surname" value={editing.surname} fullWidth required
              onChange={e => set({ surname: e.target.value })} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Date of Birth" type="date" value={editing.dateOfBirth ?? ''} fullWidth
              InputLabelProps={{ shrink: true }} onChange={e => set({ dateOfBirth: e.target.value })} />
            <TextField label="Shirt #" type="number" value={editing.shirtNumber ?? ''} fullWidth
              onChange={e => set({ shirtNumber: +e.target.value })} />
          </Box>
          <TextField
            select
            label="Home Club"
            value={editing.homeClubId ?? ''}
            onChange={e => set({ homeClubId: e.target.value ? +e.target.value : undefined })}
          >
            <MenuItem value="">— None —</MenuItem>
            {clubs.map(c => (
              <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Contact" value={editing.contactNumber ?? ''} fullWidth
              onChange={e => set({ contactNumber: e.target.value })} />
            <TextField label="Alt Contact" value={editing.alternativeContactNumber ?? ''} fullWidth
              onChange={e => set({ alternativeContactNumber: e.target.value })} />
          </Box>
          <TextField label="Email" type="email" value={editing.email ?? ''}
            onChange={e => set({ email: e.target.value })} />
          <TextField select label="Batting Position" value={editing.battingPosition ?? ''}
            onChange={e => set({ battingPosition: e.target.value as BattingPosition })}>
            <MenuItem value="">— None —</MenuItem>
            <MenuItem value="OPENER">Opener</MenuItem>
            <MenuItem value="TOP_ORDER">Top Order</MenuItem>
            <MenuItem value="MIDDLE_ORDER">Middle Order</MenuItem>
            <MenuItem value="LOWER_MIDDLE_ORDER">Lower Middle Order</MenuItem>
            <MenuItem value="LOWER_ORDER">Lower Order</MenuItem>
          </TextField>
          <Box sx={{ display: 'flex', gap: 2 }}>
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
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel control={<Checkbox checked={editing.wicketKeeper ?? false}
              onChange={e => set({ wicketKeeper: e.target.checked })} />} label="Wicket Keeper" />
            <FormControlLabel control={<Checkbox checked={editing.partTimeBowler ?? false}
              onChange={e => set({ partTimeBowler: e.target.checked })} />} label="Part Time Bowler" />
          </Box>
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
                <TextField
                  label="Profile Picture URL"
                  value={editing.profilePictureUrl ?? ''}
                  onChange={e => set({ profilePictureUrl: e.target.value })}
                  size="small"
                  helperText="Upload a photo above or paste a URL"
                />
              </Box>
            </Box>
          </Box>
          <TextField
            label="Career URL"
            type="url"
            value={editing.careerUrl ?? ''}
            onChange={e => set({ careerUrl: e.target.value })}
            helperText="Link to player's career profile (e.g. CricHeroes)"
          />
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
