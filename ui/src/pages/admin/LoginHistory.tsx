import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, TablePagination, TextField, InputAdornment,
  Chip,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { loginEventApi } from '../../api/loginEventApi';
import { UserLoginEvent } from '../../types';

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  admin: 'error',
  manager: 'warning',
  player: 'info',
};

export const LoginHistory: React.FC = () => {
  const [rows, setRows] = useState<UserLoginEvent[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [nameFilter, setNameFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(() => {
    loginEventApi.findAll({ name: nameFilter || undefined, page, size: rowsPerPage })
      .then(res => {
        setRows(res.content);
        setTotalElements(res.totalElements);
      })
      .catch(() => {});
  }, [nameFilter, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setNameFilter(searchInput);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>Login History</Typography>

      <Box component="form" onSubmit={handleSearch} display="flex" gap={2} mb={2}>
        <TextField
          size="small"
          placeholder="Search by name..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          }}
          sx={{ width: 280 }}
        />
      </Box>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>First Name</strong></TableCell>
                <TableCell><strong>Last Name</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Login Time</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">No login events found.</TableCell>
                </TableRow>
              ) : rows.map(row => (
                <TableRow key={row.loginEventId} hover>
                  <TableCell>{row.firstName}</TableCell>
                  <TableCell>{row.lastName}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.role}
                      size="small"
                      color={ROLE_COLORS[row.role] ?? 'default'}
                    />
                  </TableCell>
                  <TableCell>{formatTime(row.loginTime)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalElements}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Paper>
    </Box>
  );
};
