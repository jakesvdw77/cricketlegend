import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Button, TextField, MenuItem, Alert, Chip, IconButton, Tooltip,
} from '@mui/material';
import { Delete, PersonAdd } from '@mui/icons-material';
import { financialAdminApi, ClubFinancialAdminDTO } from '../../api/financialAdminApi';
import { managerApi, ManagerDTO } from '../../api/managerApi';
import { clubApi } from '../../api/clubApi';
import { Club } from '../../types';

export const FinancialAdmins: React.FC = () => {
  const [assignments, setAssignments] = useState<ClubFinancialAdminDTO[]>([]);
  const [managers, setManagers] = useState<ManagerDTO[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [managerId, setManagerId] = useState<number | ''>('');
  const [clubId, setClubId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const load = () => financialAdminApi.getAllAssignments().then(setAssignments).catch(() => {});

  useEffect(() => {
    load();
    managerApi.findAllManagers().then(setManagers);
    clubApi.findAll().then(setClubs);
  }, []);

  const handleAssign = async () => {
    if (!managerId || !clubId) return;
    setError(null);
    try {
      await financialAdminApi.assign(managerId as number, clubId as number);
      setManagerId('');
      setClubId('');
      load();
    } catch {
      setError('Failed to assign. This combination may already exist.');
    }
  };

  const handleUnassign = async (id: number) => {
    try {
      await financialAdminApi.unassign(id);
      load();
    } catch {
      setError('Failed to remove assignment.');
    }
  };

  const grouped = assignments.reduce<Record<string, ClubFinancialAdminDTO[]>>((acc, a) => {
    (acc[`${a.managerId}`] ??= []).push(a);
    return acc;
  }, {});

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Financial Admins</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Assign Financial Admin to Club</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField select label="Manager" size="small" value={managerId}
            onChange={e => setManagerId(Number(e.target.value))} sx={{ minWidth: 240 }}>
            {managers.map(m => (
              <MenuItem key={m.managerId} value={m.managerId}>{m.displayName} — {m.email}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Club" size="small" value={clubId}
            onChange={e => setClubId(Number(e.target.value))} sx={{ minWidth: 220 }}>
            {clubs.map(c => (
              <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" startIcon={<PersonAdd />} onClick={handleAssign}
            disabled={!managerId || !clubId}>
            Assign
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Financial Admin</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Club</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.values(grouped).map(group => (
              group.map((a, i) => (
                <TableRow key={a.id}>
                  {i === 0 && (
                    <TableCell rowSpan={group.length} sx={{ fontWeight: 'bold' }}>
                      {a.managerDisplayName}
                    </TableCell>
                  )}
                  {i === 0 && (
                    <TableCell rowSpan={group.length} sx={{ color: 'text.secondary' }}>
                      {a.managerEmail}
                    </TableCell>
                  )}
                  <TableCell>
                    <Chip label={a.clubName} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove assignment">
                      <IconButton size="small" color="error" onClick={() => handleUnassign(a.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ))}
            {assignments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No financial admins assigned yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
