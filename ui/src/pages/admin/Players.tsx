import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Checkbox, FormControlLabel, Avatar,
  CircularProgress, Tooltip,
} from '@mui/material';
import { Add, Edit, Delete, CloudUpload, OpenInNew } from '@mui/icons-material';
import { playerApi } from '../../api/playerApi';
import { clubApi } from '../../api/clubApi';
import { paymentApi } from '../../api/paymentApi';
import { Player, Club, BattingStance, BowlingArm, BowlingType } from '../../types';
import { formatEnum } from '../../utils/formatEnum';

const empty: Player = { name: '', surname: '' };

export const Players: React.FC = () => {
  const [rows, setRows] = useState<Player[]>([]);
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
    if (editing.playerId) { await playerApi.update(editing.playerId, editing); }
    else { await playerApi.create(editing); }
    setOpen(false); load();
  };

  const remove = async (id: number) => {
    if (confirm('Delete player?')) { await playerApi.delete(id); load(); }
  };

  const set = (patch: Partial<Player>) => setEditing(e => ({ ...e, ...patch }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Players</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(empty); setOpen(true); }}>
          Add Player
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Name</TableCell>
              <TableCell>Surname</TableCell>
              <TableCell>#</TableCell>
              <TableCell>Club</TableCell>
              <TableCell>Batting</TableCell>
              <TableCell>Bowling</TableCell>
              <TableCell>WK</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
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
          <TextField select label="Bowling Type" value={editing.bowlingType ?? ''}
            onChange={e => set({ bowlingType: e.target.value as BowlingType })}>
            <MenuItem value="FAST_PACE">Fast Pace</MenuItem>
            <MenuItem value="MEDIUM_FAST_PACE">Medium Fast Pace</MenuItem>
            <MenuItem value="MEDIUM_PACE">Medium Pace</MenuItem>
            <MenuItem value="OFF_SPIN">Off Spin</MenuItem>
            <MenuItem value="LEG_SPIN">Leg Spin</MenuItem>
            <MenuItem value="SLOW_BOWLER">Slow Bowler</MenuItem>
            <MenuItem value="NONE">Don't Bowl</MenuItem>
          </TextField>
          <FormControlLabel control={<Checkbox checked={editing.wicketKeeper ?? false}
            onChange={e => set({ wicketKeeper: e.target.checked })} />} label="Wicket Keeper" />
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
