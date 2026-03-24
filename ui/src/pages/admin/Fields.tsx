import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Link, TableSortLabel,
} from '@mui/material';
import { Add, Edit, Delete, OpenInNew } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { fieldApi } from '../../api/fieldApi';
import { clubApi } from '../../api/clubApi';
import { Field, Club } from '../../types';

const empty: Field = { name: '' };

export const Fields: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Field[]>([]);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Field>(empty);

  const load = () => fieldApi.findAll().then(setRows);
  useEffect(() => {
    load();
    clubApi.findAll().then(setClubs);
  }, []);

  const openCreate = () => { setEditing(empty); setOpen(true); };
  const openEdit = (f: Field) => { setEditing(f); setOpen(true); };

  const save = async () => {
    if (editing.fieldId) { await fieldApi.update(editing.fieldId, editing); }
    else { await fieldApi.create(editing); }
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (confirm('Delete field?')) { await fieldApi.delete(id); load(); }
  };

  const set = (patch: Partial<Field>) => setEditing(e => ({ ...e, ...patch }));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Fields / Grounds</Typography>
        <TextField
          size="small"
          placeholder="Search name, club…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 260 }}
        />
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Field
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' }, '& .MuiTableHead-root .MuiTableSortLabel-root': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root:hover': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root.Mui-active': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-icon': { color: 'inherit !important' } }}>
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sortDir}>
                <TableSortLabel active direction={sortDir} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>Name</TableSortLabel>
              </TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Home Club</TableCell>
              <TableCell>Map</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {[...rows].filter(r => {
              const q = search.toLowerCase();
              return !q
                || r.name.toLowerCase().includes(q)
                || r.homeClubName?.toLowerCase().includes(q);
            }).sort((a, b) => {
              const cmp = a.name.localeCompare(b.name);
              return sortDir === 'asc' ? cmp : -cmp;
            }).map(r => (
              <TableRow key={r.fieldId}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.address}</TableCell>
                <TableCell>
                  {r.homeClubId ? (
                    <Link
                      component="button"
                      underline="hover"
                      onClick={() => navigate('/admin/clubs', { state: { highlightId: r.homeClubId } })}
                    >
                      {r.homeClubName}
                    </Link>
                  ) : null}
                </TableCell>
                <TableCell>
                  {r.googleMapsUrl && (
                    <IconButton size="small" component="a" href={r.googleMapsUrl} target="_blank" rel="noopener" title="Open in Maps">
                      <OpenInNew fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(r)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.fieldId!)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.fieldId ? 'Edit' : 'New'} Field</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Name"
            value={editing.name}
            onChange={e => set({ name: e.target.value })}
            required
          />
          <TextField
            label="Address"
            value={editing.address ?? ''}
            onChange={e => set({ address: e.target.value })}
            multiline
            rows={2}
          />
          <TextField
            label="Google Maps URL"
            value={editing.googleMapsUrl ?? ''}
            onChange={e => set({ googleMapsUrl: e.target.value })}
            placeholder="https://maps.google.com/..."
          />
          <TextField
            select
            label="Home Club"
            value={editing.homeClubId ?? ''}
            onChange={e => set({ homeClubId: +e.target.value })}
          >
            <MenuItem value="">— None —</MenuItem>
            {clubs.map(c => (
              <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!editing.name}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
