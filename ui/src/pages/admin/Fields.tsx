import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Link, TableSortLabel,
  TablePagination, Popover, FormGroup, Checkbox, FormControlLabel,
  Avatar, CircularProgress, Tooltip,
} from '@mui/material';
import { Add, Edit, Delete, OpenInNew, ViewColumn, CloudUpload, HighlightOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { fieldApi } from '../../api/fieldApi';
import { clubApi } from '../../api/clubApi';
import { paymentApi } from '../../api/paymentApi';
import { Field, Club } from '../../types';

const empty: Field = { name: '' };

type ColKey = 'icon' | 'name' | 'address' | 'homeClub' | 'map';
const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'icon',     label: 'Icon' },
  { key: 'name',     label: 'Name' },
  { key: 'address',  label: 'Address' },
  { key: 'homeClub', label: 'Home Club' },
  { key: 'map',      label: 'Map' },
];
const DEFAULT_VISIBLE = new Set<ColKey>(['icon', 'name', 'address', 'homeClub', 'map']);

export const Fields: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Field[]>([]);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Field>(empty);
  const [uploading, setUploading] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));
  const [colAnchor, setColAnchor] = useState<HTMLButtonElement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Field | null>(null);
  const [nameError, setNameError] = useState('');

  const load = () => fieldApi.findAll().then(setRows);
  useEffect(() => {
    load();
    clubApi.findAll().then(setClubs);
  }, []);

  const openCreate = () => { setEditing(empty); setNameError(''); setOpen(true); };
  const openEdit = (f: Field) => { setEditing(f); setNameError(''); setOpen(true); };

  const isDuplicateName = (name: string) =>
    rows.some(r => r.name.toLowerCase() === name.trim().toLowerCase() && r.fieldId !== editing.fieldId);

  const save = async () => {
    if (isDuplicateName(editing.name)) {
      setNameError('A field with this name already exists.');
      return;
    }
    try {
      if (editing.fieldId) { await fieldApi.update(editing.fieldId, editing); }
      else { await fieldApi.create(editing); }
      setOpen(false);
      load();
    } catch (e: any) {
      setNameError(e?.response?.data?.detail ?? e?.response?.data?.message ?? 'Could not save field.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.fieldId) return;
    try {
      await fieldApi.delete(deleteTarget.fieldId);
      load();
    } finally {
      setDeleteTarget(null);
    }
  };

  const set = (patch: Partial<Field>) => setEditing(e => ({ ...e, ...patch }));

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      set({ iconUrl: url });
    } finally {
      setUploading(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const col = (key: ColKey) => visibleCols.has(key);

  const filtered = [...rows].filter(r => {
    const q = search.toLowerCase();
    return !q
      || r.name.toLowerCase().includes(q)
      || r.homeClubName?.toLowerCase().includes(q);
  }).sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Fields / Grounds</Typography>
        <TextField
          size="small"
          placeholder="Search name, club…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 260 } }}
        />
        <IconButton
          title="Toggle columns"
          onClick={e => setColAnchor(e.currentTarget)}
        >
          <ViewColumn />
        </IconButton>
        <Popover
          open={Boolean(colAnchor)}
          anchorEl={colAnchor}
          onClose={() => setColAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <FormGroup sx={{ px: 2, py: 1 }}>
            {ALL_COLUMNS.map(c => (
              <FormControlLabel
                key={c.key}
                control={
                  <Checkbox
                    checked={visibleCols.has(c.key)}
                    onChange={() => toggleCol(c.key)}
                    size="small"
                  />
                }
                label={c.label}
              />
            ))}
          </FormGroup>
        </Popover>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Field
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' }, '& .MuiTableHead-root .MuiTableSortLabel-root': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root:hover': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root.Mui-active': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-icon': { color: 'inherit !important' } }}>
          <TableHead>
            <TableRow>
              {col('icon') && <TableCell>Icon</TableCell>}
              {col('name') && (
                <TableCell sortDirection={sortDir}>
                  <TableSortLabel active direction={sortDir} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>Name</TableSortLabel>
                </TableCell>
              )}
              {col('address') && <TableCell>Address</TableCell>}
              {col('homeClub') && <TableCell>Home Club</TableCell>}
              {col('map') && <TableCell>Map</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(r => (
              <TableRow key={r.fieldId}>
                {col('icon') && (
                  <TableCell>
                    <Avatar src={r.iconUrl ?? ''} variant="rounded" sx={{ width: 36, height: 36, fontSize: 13 }}>
                      {!r.iconUrl && r.name.substring(0, 2).toUpperCase()}
                    </Avatar>
                  </TableCell>
                )}
                {col('name') && <TableCell>{r.name}</TableCell>}
                {col('address') && <TableCell>{r.address}</TableCell>}
                {col('homeClub') && (
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
                )}
                {col('map') && (
                  <TableCell>
                    {r.googleMapsUrl && (
                      <IconButton size="small" component="a" href={r.googleMapsUrl} target="_blank" rel="noopener" title="Open in Maps">
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(r)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(r)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </TableContainer>

      <Dialog open={open} onClose={(_, reason) => { if (reason !== 'backdropClick') setOpen(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.fieldId ? 'Edit' : 'New'} Field</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {/* Icon upload */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={editing.iconUrl ?? ''} variant="rounded" sx={{ width: 64, height: 64, flexShrink: 0 }}>
              {!editing.iconUrl && editing.name.substring(0, 2).toUpperCase()}
            </Avatar>
            <input ref={iconInputRef} type="file" accept="image/*" hidden onChange={handleIconUpload} />
            <Button
              variant="outlined"
              size="small"
              startIcon={uploading ? <CircularProgress size={14} /> : <CloudUpload />}
              onClick={() => iconInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload Icon'}
            </Button>
            {editing.iconUrl && (
              <Tooltip title="Remove icon">
                <IconButton size="small" color="error" onClick={() => set({ iconUrl: undefined })}>
                  <HighlightOff fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <TextField
            label="Name"
            value={editing.name}
            onChange={e => { set({ name: e.target.value }); setNameError(''); }}
            required
            error={!!nameError}
            helperText={nameError}
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

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!editing.name}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Field</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
