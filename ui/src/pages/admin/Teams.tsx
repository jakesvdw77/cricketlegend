import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Avatar, CircularProgress,
  List, ListItem, ListItemAvatar, ListItemText, Autocomplete,
} from '@mui/material';
import { Add, Edit, Delete, CloudUpload, Groups, PersonRemove, Print } from '@mui/icons-material';
import { printSquad } from '../../utils/printSquad';
import { playerDescription } from '../../utils/playerDescription';
import { teamApi } from '../../api/teamApi';
import { clubApi } from '../../api/clubApi';
import { playerApi } from '../../api/playerApi';
import { fieldApi } from '../../api/fieldApi';
import { paymentApi } from '../../api/paymentApi';
import { Team, Club, Player, Field } from '../../types';

const empty: Team = { teamName: '' };

export const Teams: React.FC = () => {
  const [rows, setRows] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team>(empty);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [viewLogoUrl, setViewLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Squad management
  const [squadTeam, setSquadTeam] = useState<Team | null>(null);
  const [squad, setSquad] = useState<Player[]>([]);

  const load = () => teamApi.findAll().then(setRows);
  useEffect(() => {
    load();
    clubApi.findAll().then(setClubs);
    playerApi.findAll().then(setPlayers);
    fieldApi.findAll().then(setFields);
  }, []);

  const save = async () => {
    if (editing.teamId) { await teamApi.update(editing.teamId, editing); }
    else { await teamApi.create(editing); }
    setOpen(false); load();
  };

  const remove = async (id: number) => {
    if (confirm('Delete team?')) { await teamApi.delete(id); load(); }
  };

  const set = (patch: Partial<Team>) => setEditing(e => ({ ...e, ...patch }));

  const openSquad = async (team: Team) => {
    setSquadTeam(team);
    const s = await teamApi.getSquad(team.teamId!);
    setSquad(s);
  };

  const addToSquad = async (player: Player) => {
    await teamApi.addToSquad(squadTeam!.teamId!, player.playerId!);
    setSquad(s => [...s, player]);
  };

  const removeFromSquad = async (playerId: number) => {
    await teamApi.removeFromSquad(squadTeam!.teamId!, playerId);
    setSquad(s => s.filter(p => p.playerId !== playerId));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      set({ logoUrl: url });
    } finally {
      setUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      set({ teamPhotoUrl: url });
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Teams</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(empty); setOpen(true); }}>
          Add Team
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={48} />
              <TableCell>Team Name</TableCell>
              <TableCell>Club</TableCell>
              <TableCell>Captain</TableCell>
              <TableCell>Home Ground</TableCell>
              <TableCell>Coach</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.teamId}>
                <TableCell>
                  <Avatar
                    src={r.logoUrl}
                    sx={{
                      width: 32, height: 32,
                      cursor: r.logoUrl ? 'pointer' : 'default',
                      '&:hover': r.logoUrl ? { opacity: 0.8 } : {},
                    }}
                    onClick={() => r.logoUrl && setViewLogoUrl(r.logoUrl)}
                  >
                    {r.teamName.charAt(0)}
                  </Avatar>
                </TableCell>
                <TableCell>{r.teamName}</TableCell>
                <TableCell>{r.associatedClubName}</TableCell>
                <TableCell>{r.captainName}</TableCell>
                <TableCell>{r.homeFieldName}</TableCell>
                <TableCell>{r.coach}</TableCell>
                <TableCell>
                  <IconButton size="small" title="Manage Squad" onClick={() => openSquad(r)}><Groups /></IconButton>
                  <IconButton size="small" onClick={() => { setEditing(r); setOpen(true); }}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.teamId!)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.teamId ? 'Edit' : 'New'} Team</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Team Name" value={editing.teamName} required fullWidth
              onChange={e => set({ teamName: e.target.value })} />
            <TextField label="Abbreviation" value={editing.abbreviation ?? ''} sx={{ width: 140 }}
              inputProps={{ maxLength: 10 }} helperText="Max 10 characters"
              onChange={e => set({ abbreviation: e.target.value })} />
          </Box>
          <TextField select label="Associated Club" value={editing.associatedClubId ?? ''}
            onChange={e => set({ associatedClubId: +e.target.value })}>
            {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select label="Captain" value={editing.captainId ?? ''}
            onChange={e => set({ captainId: +e.target.value })}>
            {players.map(p => <MenuItem key={p.playerId} value={p.playerId}>{p.name} {p.surname}</MenuItem>)}
          </TextField>
          <TextField select label="Home Ground" value={editing.homeFieldId ?? ''}
            onChange={e => set({ homeFieldId: +e.target.value })}>
            {fields.map(f => <MenuItem key={f.fieldId} value={f.fieldId}>{f.name}</MenuItem>)}
          </TextField>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Coach" value={editing.coach ?? ''} fullWidth
              onChange={e => set({ coach: e.target.value })} />
            <TextField label="Manager" value={editing.manager ?? ''} fullWidth
              onChange={e => set({ manager: e.target.value })} />
          </Box>
          <TextField label="Email" value={editing.email ?? ''}
            onChange={e => set({ email: e.target.value })} />
          <TextField label="Contact Number" value={editing.contactNumber ?? ''}
            onChange={e => set({ contactNumber: e.target.value })} />

          {/* Logo upload + preview */}
          <Box>
            <input
              type="file"
              ref={logoInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleLogoUpload}
            />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar
                src={editing.logoUrl ?? ''}
                sx={{
                  width: 64, height: 64, flexShrink: 0,
                  cursor: editing.logoUrl ? 'pointer' : 'default',
                }}
                onClick={() => editing.logoUrl && setViewLogoUrl(editing.logoUrl)}
              >
                {editing.teamName.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={uploading ? <CircularProgress size={14} /> : <CloudUpload />}
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploading}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {uploading ? 'Uploading…' : 'Upload Logo'}
                </Button>
                <TextField
                  label="Logo URL"
                  value={editing.logoUrl ?? ''}
                  onChange={e => set({ logoUrl: e.target.value })}
                  size="small"
                  helperText="Upload a logo above or paste a URL"
                />
              </Box>
            </Box>
          </Box>

          {/* Team photo upload + preview */}
          <Box>
            <input
              type="file"
              ref={photoInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              {editing.teamPhotoUrl && (
                <Box
                  component="img"
                  src={editing.teamPhotoUrl}
                  alt="Team photo"
                  sx={{
                    width: 96, height: 64, objectFit: 'cover', borderRadius: 1,
                    flexShrink: 0, cursor: 'pointer',
                  }}
                  onClick={() => setViewLogoUrl(editing.teamPhotoUrl!)}
                />
              )}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={uploadingPhoto ? <CircularProgress size={14} /> : <CloudUpload />}
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {uploadingPhoto ? 'Uploading…' : 'Upload Team Photo'}
                </Button>
                <TextField
                  label="Team Photo URL"
                  value={editing.teamPhotoUrl ?? ''}
                  onChange={e => set({ teamPhotoUrl: e.target.value })}
                  size="small"
                  helperText="Upload a photo above or paste a URL"
                />
              </Box>
            </Box>
          </Box>

          <TextField label="Website URL" value={editing.websiteUrl ?? ''}
            onChange={e => set({ websiteUrl: e.target.value })} />
          <TextField label="Facebook URL" value={editing.facebookUrl ?? ''}
            onChange={e => set({ facebookUrl: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Squad management dialog */}
      <Dialog open={!!squadTeam} onClose={() => setSquadTeam(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Squad — {squadTeam?.teamName}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Autocomplete
            options={players.filter(p => !squad.some(s => s.playerId === p.playerId))}
            getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
            onChange={(_, p) => { if (p) addToSquad(p); }}
            renderInput={params => <TextField {...params} label="Add player to squad" size="small" />}
            sx={{ mb: 2 }}
            blurOnSelect
            clearOnBlur
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {squad.length} player{squad.length !== 1 ? 's' : ''} in squad
            </Typography>
          </Box>
          <List dense disablePadding>
            {squad.map(p => (
              <ListItem
                key={p.playerId}
                disablePadding
                secondaryAction={
                  <IconButton size="small" onClick={() => removeFromSquad(p.playerId!)} title="Remove from squad">
                    <PersonRemove fontSize="small" />
                  </IconButton>
                }
                sx={{ py: 0.5 }}
              >
                <ListItemAvatar sx={{ minWidth: 36 }}>
                  <Avatar src={p.profilePictureUrl} sx={{ width: 28, height: 28, fontSize: 12 }}>
                    {p.name.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
                  secondary={playerDescription(p)}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<Print />} onClick={() => printSquad(squadTeam!, squad)}>
            Print / Export PDF
          </Button>
          <Button onClick={() => setSquadTeam(null)}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Logo viewer */}
      <Dialog open={!!viewLogoUrl} onClose={() => setViewLogoUrl(null)} maxWidth="sm">
        <DialogContent sx={{ p: 0, lineHeight: 0 }}>
          <img
            src={viewLogoUrl ?? ''}
            alt="Team logo"
            style={{ display: 'block', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewLogoUrl(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
