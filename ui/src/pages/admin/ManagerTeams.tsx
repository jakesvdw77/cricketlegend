import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Button, TextField,
  MenuItem, Alert, Chip, Tooltip,
} from '@mui/material';
import { Delete, PersonAdd } from '@mui/icons-material';
import { managerApi, ManagerTeamAssignment, ManagerDTO } from '../../api/managerApi';
import { teamApi } from '../../api/teamApi';
import { Team } from '../../types';

export const ManagerTeams: React.FC = () => {
  const [assignments, setAssignments] = useState<ManagerTeamAssignment[]>([]);
  const [managers, setManagers] = useState<ManagerDTO[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [managerId, setManagerId] = useState<number | ''>('');
  const [teamId, setTeamId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const load = () => managerApi.getAllAssignments().then(setAssignments).catch(() => {});

  useEffect(() => {
    load();
    managerApi.findAllManagers().then(setManagers);
    teamApi.findAll().then(setTeams);
  }, []);

  const handleAssign = async () => {
    if (!managerId || !teamId) return;
    setError(null);
    try {
      await managerApi.assign(managerId as number, teamId as number);
      setManagerId('');
      setTeamId('');
      load();
    } catch {
      setError('Failed to assign. This combination may already exist.');
    }
  };

  const handleUnassign = async (id: number) => {
    try {
      await managerApi.unassign(id);
      load();
    } catch {
      setError('Failed to remove assignment.');
    }
  };

  // Group by manager for display
  const grouped = assignments.reduce<Record<string, ManagerTeamAssignment[]>>((acc, a) => {
    const key = `${a.managerId}`;
    (acc[key] ??= []).push(a);
    return acc;
  }, {});

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Manager Teams</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Assign Manager to Team</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField
            select
            label="Manager"
            size="small"
            value={managerId}
            onChange={e => setManagerId(Number(e.target.value))}
            sx={{ minWidth: 240 }}
          >
            {managers.map(m => (
              <MenuItem key={m.managerId} value={m.managerId}>{m.displayName} — {m.email}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Team"
            size="small"
            value={teamId}
            onChange={e => setTeamId(Number(e.target.value))}
            sx={{ minWidth: 200 }}
          >
            {teams.map(t => (
              <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={handleAssign}
            disabled={!managerId || !teamId}
          >
            Assign
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>

      {Object.keys(grouped).length === 0 ? (
        <Alert severity="info">No manager-team assignments yet.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small" sx={{
            '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
            '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
            '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
          }}>
            <TableHead>
              <TableRow>
                <TableCell>Manager</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Teams</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.values(grouped).map(entries => {
                const first = entries[0];
                return (
                  <TableRow key={first.managerId}>
                    <TableCell>{first.managerDisplayName}</TableCell>
                    <TableCell>{first.managerEmail}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {entries.map(e => (
                          <Chip
                            key={e.id}
                            label={e.teamName}
                            size="small"
                            onDelete={() => handleUnassign(e.id)}
                            deleteIcon={<Tooltip title="Remove"><Delete fontSize="small" /></Tooltip>}
                          />
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};
