import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Avatar, CircularProgress, Snackbar, TableSortLabel,
  TablePagination, Popover, FormGroup, FormControlLabel, Checkbox, Tooltip, useMediaQuery, useTheme,
} from '@mui/material';
import { Add, Edit, Delete, OpenInNew, CloudUpload, ViewColumn, HighlightOff } from '@mui/icons-material';
import { clubApi } from '../../api/clubApi';
import { paymentApi } from '../../api/paymentApi';
import { Club } from '../../types';

const empty: Club = { name: '' };

type ColKey = 'name' | 'contactPerson' | 'email' | 'contactNumber' | 'links';
const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'name',          label: 'Name' },
  { key: 'contactPerson', label: 'Contact Person' },
  { key: 'email',         label: 'Email' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'links',         label: 'Links' },
];
const DEFAULT_VISIBLE = new Set<ColKey>(['name', 'contactPerson', 'email', 'contactNumber', 'links']);
const MOBILE_VISIBLE = new Set<ColKey>(['name', 'contactPerson', 'links']);

export const Clubs: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = useState<Club[]>([]);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Club>(empty);
  const [uploading, setUploading] = useState(false);
  const [viewLogoUrl, setViewLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(isMobile ? MOBILE_VISIBLE : DEFAULT_VISIBLE));
  const [colAnchor, setColAnchor] = useState<HTMLButtonElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const load = () => clubApi.findAll().then(setRows);
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(empty); setOpen(true); };
  const openEdit = (c: Club) => { setEditing(c); setOpen(true); };

  const save = async () => {
    if (editing.clubId) { await clubApi.update(editing.clubId, editing); }
    else { await clubApi.create(editing); }
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (confirm('Delete club?')) {
      try {
        await clubApi.delete(id);
        load();
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? 'Could not delete club.');
      }
    }
  };

  const set = (patch: Partial<Club>) => setEditing(e => ({ ...e, ...patch }));

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const col = (key: ColKey) => visibleCols.has(key);

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

  const filtered = [...rows].filter(r => {
    const q = search.toLowerCase();
    return !q
      || r.name.toLowerCase().includes(q)
      || r.contactPerson?.toLowerCase().includes(q)
      || r.email?.toLowerCase().includes(q);
  }).sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Clubs</Typography>
        <TextField
          size="small"
          placeholder="Search name, contact, email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 280 } }}
        />
        <Tooltip title="Toggle columns">
          <IconButton onClick={e => setColAnchor(e.currentTarget)}><ViewColumn /></IconButton>
        </Tooltip>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Club
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
                control={<Checkbox size="small" checked={visibleCols.has(c.key)} onChange={() => toggleCol(c.key)} />}
              />
            ))}
          </FormGroup>
        </Box>
      </Popover>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' }, '& .MuiTableHead-root .MuiTableSortLabel-root': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root:hover': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root.Mui-active': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-icon': { color: 'inherit !important' } }}>
          <TableHead>
            <TableRow>
              <TableCell width={48} />
              {col('name') && (
                <TableCell sortDirection={sortDir}>
                  <TableSortLabel active direction={sortDir} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>Name</TableSortLabel>
                </TableCell>
              )}
              {col('contactPerson') && <TableCell>Contact Person</TableCell>}
              {col('email')         && <TableCell>Email</TableCell>}
              {col('contactNumber') && <TableCell>Contact Number</TableCell>}
              {col('links')         && <TableCell>Links</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(r => (
              <TableRow key={r.clubId}>
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
                    {r.name.charAt(0)}
                  </Avatar>
                </TableCell>
                {col('name')          && <TableCell>{r.name}</TableCell>}
                {col('contactPerson') && <TableCell>{r.contactPerson}</TableCell>}
                {col('email')         && <TableCell>{r.email}</TableCell>}
                {col('contactNumber') && <TableCell>{r.contactNumber}</TableCell>}
                {col('links') && (
                  <TableCell>
                    {r.websiteUrl && (
                      <IconButton size="small" component="a" href={r.websiteUrl} target="_blank" rel="noopener" title="Website">
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    )}
                    {r.googleMapsUrl && (
                      <IconButton size="small" component="a" href={r.googleMapsUrl} target="_blank" rel="noopener" title="Map">
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(r)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.clubId!)}><Delete /></IconButton>
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

      {/* Add / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.clubId ? 'Edit' : 'New'} Club</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>


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
                {editing.name.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploading ? <CircularProgress size={14} /> : <CloudUpload />}
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Upload Logo'}
                  </Button>
                  {editing.logoUrl && (
                    <Tooltip title="Remove logo">
                      <IconButton size="small" color="error" onClick={() => set({ logoUrl: undefined })}>
                        <HighlightOff fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          <TextField
              label="Club Name"
              value={editing.name}
              onChange={e => set({ name: e.target.value })}
              required
          />

          <TextField
            label="Google Maps URL"
            value={editing.googleMapsUrl ?? ''}
            onChange={e => set({ googleMapsUrl: e.target.value })}
            placeholder="https://maps.google.com/..."
          />
          <TextField
            label="Website URL"
            value={editing.websiteUrl ?? ''}
            onChange={e => set({ websiteUrl: e.target.value })}
            placeholder="https://..."
          />
          <TextField
            label="Contact Person"
            value={editing.contactPerson ?? ''}
            onChange={e => set({ contactPerson: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              label="Email"
              type="email"
              value={editing.email ?? ''}
              onChange={e => set({ email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Contact Number"
              value={editing.contactNumber ?? ''}
              onChange={e => set({ contactNumber: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!editing.name}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError('')} message={error} />

      {/* Logo viewer */}
      <Dialog open={!!viewLogoUrl} onClose={() => setViewLogoUrl(null)} maxWidth="sm">
        <DialogContent sx={{ p: 0, lineHeight: 0 }}>
          <img
            src={viewLogoUrl ?? ''}
            alt="Club logo"
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
