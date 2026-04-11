import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, IconButton, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Chip, Autocomplete,
} from '@mui/material';
import { Add, Edit, Delete, Link as LinkIcon } from '@mui/icons-material';
import { managerApi, ManagerDTO } from '../../api/managerApi';
import { playerApi } from '../../api/playerApi';
import { Player } from '../../types';

const empty: Omit<ManagerDTO, 'managerId' | 'displayName' | 'playerDisplayName'> = {
  email: '',
  name: '',
  surname: '',
  phone: '',
  playerId: undefined,
};

export const Managers: React.FC = () => {
  const [managers, setManagers] = useState<ManagerDTO[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<typeof empty & { managerId?: number }>(empty);
  const [linkedPlayer, setLinkedPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => managerApi.findAllManagers().then(setManagers).catch(() => {});

  useEffect(() => {
    load();
    playerApi.findAll().then(setPlayers);
  }, []);

  const openCreate = () => {
    setEditing(empty);
    setLinkedPlayer(null);
    setError(null);
    setOpen(true);
  };

  const openEdit = (m: ManagerDTO) => {
    setEditing({
      managerId: m.managerId,
      email: m.email,
      name: m.name ?? '',
      surname: m.surname ?? '',
      phone: m.phone ?? '',
      playerId: m.playerId,
    });
    setLinkedPlayer(m.playerId ? players.find(p => p.playerId === m.playerId) ?? null : null);
    setError(null);
    setOpen(true);
  };

  const handlePlayerLink = (player: Player | null) => {
    setLinkedPlayer(player);
    if (player) {
      setEditing(e => ({
        ...e,
        playerId: player.playerId,
        name: player.name,
        surname: player.surname,
        email: player.email ?? e.email,
        phone: player.contactNumber ?? e.phone,
      }));
    } else {
      setEditing(e => ({ ...e, playerId: undefined }));
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!editing.email.trim()) { setError('Email is required.'); return; }
    if (!editing.playerId && (!editing.name?.trim() || !editing.surname?.trim())) {
      setError('Name and surname are required for standalone managers.');
      return;
    }
    try {
      const payload = {
        email: editing.email,
        name: editing.name,
        surname: editing.surname,
        phone: editing.phone,
        playerId: editing.playerId,
      };
      if (editing.managerId) {
        await managerApi.updateManager(editing.managerId, payload);
      } else {
        await managerApi.createManager(payload);
      }
      setOpen(false);
      load();
    } catch {
      setError('Failed to save manager. The email may already be in use.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete manager? This will also remove all their team assignments.')) return;
    try {
      await managerApi.deleteManager(id);
      load();
    } catch {
      setError('Failed to delete manager.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Managers</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add Manager</Button>
      </Box>

      {error && !open && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small" sx={{
          '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
          '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
          '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
        }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Linked Player</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {managers.map(m => (
              <TableRow key={m.managerId}>
                <TableCell>{m.displayName}</TableCell>
                <TableCell>{m.email}</TableCell>
                <TableCell>{m.phone ?? '—'}</TableCell>
                <TableCell>
                  {m.playerId ? (
                    <Chip icon={<LinkIcon />} label={m.playerDisplayName} size="small" color="primary" variant="outlined" />
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(m)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(m.managerId)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {managers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No managers yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing.managerId ? 'Edit' : 'New'} Manager</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Autocomplete
            options={players}
            value={linkedPlayer}
            getOptionLabel={p => `${p.name} ${p.surname}${p.email ? ` (${p.email})` : ''}`}
            onChange={(_, p) => handlePlayerLink(p)}
            renderInput={params => (
              <TextField {...params} label="Link to Player (optional)" size="small"
                helperText="Select a player to auto-fill their details" />
            )}
            clearOnBlur={false}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Name" size="small" fullWidth required
              value={editing.name ?? ''}
              onChange={e => setEditing(v => ({ ...v, name: e.target.value }))}
              disabled={!!linkedPlayer}
            />
            <TextField
              label="Surname" size="small" fullWidth required
              value={editing.surname ?? ''}
              onChange={e => setEditing(v => ({ ...v, surname: e.target.value }))}
              disabled={!!linkedPlayer}
            />
          </Box>

          <TextField
            label="Keycloak Email" size="small" required
            value={editing.email}
            onChange={e => setEditing(v => ({ ...v, email: e.target.value }))}
            helperText="Must match the user's login email in Keycloak"
          />

          <TextField
            label="Phone" size="small"
            value={editing.phone ?? ''}
            onChange={e => setEditing(v => ({ ...v, phone: e.target.value }))}
            disabled={!!linkedPlayer}
            helperText={linkedPlayer ? "Sourced from linked player's contact number" : undefined}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
