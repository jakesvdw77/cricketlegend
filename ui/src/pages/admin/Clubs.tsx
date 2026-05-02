import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Avatar, CircularProgress, Snackbar, TableSortLabel,
  TablePagination, Popover, FormGroup, FormControlLabel, Checkbox, Tooltip, useMediaQuery, useTheme, Link,
} from '@mui/material';
import { Add, ArrowBack, Edit, Delete, OpenInNew, CloudUpload, ViewColumn, HighlightOff, FilterList } from '@mui/icons-material';
import { clubApi } from '../../api/clubApi';
import { paymentApi } from '../../api/paymentApi';
import { Club } from '../../types';
import { DetailSection, DetailGrid, DetailField } from '../../components/admin/DetailView';

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
  const [deleteTarget, setDeleteTarget] = useState<Club | null>(null);
  const [nameError, setNameError] = useState('');
  const [viewing, setViewing] = useState(false);
  const [viewItem, setViewItem] = useState<Club | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const load = () => clubApi.findAll().then(setRows);
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(empty); setNameError(''); setOpen(true); };
  const openEdit = (c: Club) => { setEditing(c); setNameError(''); setOpen(true); };

  const isDuplicateName = (name: string) => {
    const lower = name.trim().toLowerCase();
    return rows.some(r => r.name.toLowerCase() === lower && r.clubId !== editing.clubId);
  };

  const save = async () => {
    if (isDuplicateName(editing.name)) {
      setNameError('A club with this name already exists.');
      return;
    }
    try {
      if (editing.clubId) { await clubApi.update(editing.clubId, editing); }
      else { await clubApi.create(editing); }
      setOpen(false);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.response?.data?.message ?? 'Could not save club.';
      setNameError(msg);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.clubId) return;
    try {
      await clubApi.delete(deleteTarget.clubId);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not delete club.');
    } finally {
      setDeleteTarget(null);
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

  const col = (key: ColKey) => isMobile ? key === 'name' : visibleCols.has(key);

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

  if (open) {
    return (
      <>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Button startIcon={<ArrowBack />} onClick={() => setOpen(false)}>Back</Button>
            <Typography variant="h6" sx={{ flex: 1 }}>{editing.clubId ? 'Edit' : 'New'} Club</Typography>
            <Button variant="contained" onClick={save} disabled={!editing.name}>Save</Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
            <input type="file" ref={logoInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleLogoUpload} />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar src={editing.logoUrl ?? ''} sx={{ width: 64, height: 64, flexShrink: 0, cursor: editing.logoUrl ? 'pointer' : 'default' }}
                onClick={() => editing.logoUrl && setViewLogoUrl(editing.logoUrl)}>
                {editing.name.charAt(0)}
              </Avatar>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button variant="outlined" size="small"
                  startIcon={uploading ? <CircularProgress size={14} /> : <CloudUpload />}
                  onClick={() => logoInputRef.current?.click()} disabled={uploading}>
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
            <TextField label="Club Name" value={editing.name} required error={!!nameError} helperText={nameError}
              onChange={e => { set({ name: e.target.value }); setNameError(''); }} />
            <TextField label="Google Maps URL" value={editing.googleMapsUrl ?? ''} placeholder="https://maps.google.com/..."
              onChange={e => set({ googleMapsUrl: e.target.value })} />
            <TextField label="Website URL" value={editing.websiteUrl ?? ''} placeholder="https://..."
              onChange={e => set({ websiteUrl: e.target.value })} />
            <TextField label="Contact Person" value={editing.contactPerson ?? ''}
              onChange={e => set({ contactPerson: e.target.value })} />
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField label="Email" type="email" value={editing.email ?? ''} fullWidth
                onChange={e => set({ email: e.target.value })} />
              <TextField label="Contact Number" value={editing.contactNumber ?? ''} fullWidth
                onChange={e => set({ contactNumber: e.target.value })} />
            </Box>
          </Box>
        </Box>
        <Dialog open={!!viewLogoUrl} onClose={() => setViewLogoUrl(null)} maxWidth="sm">
          <DialogContent sx={{ p: 0, lineHeight: 0 }}>
            <img src={viewLogoUrl ?? ''} alt="Club logo" style={{ display: 'block', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
          </DialogContent>
          <DialogActions><Button onClick={() => setViewLogoUrl(null)}>Close</Button></DialogActions>
        </Dialog>
      </>
    );
  }

  if (viewing && viewItem) {
    return (
      <Box sx={{ maxWidth: 800 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => setViewing(false)}>Back</Button>
          <Typography variant="h6" sx={{ flex: 1 }}>Club</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Header card */}
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={viewItem.logoUrl ?? ''} sx={{ width: 64, height: 64, flexShrink: 0 }}>
              {viewItem.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h5">{viewItem.name}</Typography>
            </Box>
          </Paper>

          {/* Contact section */}
          <DetailSection title="Contact">
            <DetailGrid>
              <DetailField label="Contact Person" value={viewItem.contactPerson} />
              <DetailField label="Email" value={viewItem.email} />
              <DetailField label="Contact Number" value={viewItem.contactNumber} />
            </DetailGrid>
          </DetailSection>

          {/* Links section */}
          {(viewItem.websiteUrl || viewItem.googleMapsUrl) && (
            <DetailSection title="Links">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {viewItem.websiteUrl && (
                  <Link href={viewItem.websiteUrl} target="_blank" rel="noopener" underline="hover">
                    {viewItem.websiteUrl}
                  </Link>
                )}
                {viewItem.googleMapsUrl && (
                  <Link href={viewItem.googleMapsUrl} target="_blank" rel="noopener" underline="hover">
                    View on Maps
                  </Link>
                )}
              </Box>
            </DetailSection>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Clubs</Typography>
        {!isMobile && (
          <Tooltip title="Toggle columns">
            <IconButton onClick={e => setColAnchor(e.currentTarget)}><ViewColumn /></IconButton>
          </Tooltip>
        )}
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Club
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: filtersOpen ? 2 : 0 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mr: 'auto' }}>Filters</Typography>
          <Tooltip title={filtersOpen ? 'Collapse' : 'Expand'}>
            <IconButton size="small" onClick={() => setFiltersOpen(o => !o)}>
              <FilterList fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {filtersOpen && (
          <TextField
            size="small"
            fullWidth
            placeholder="Search name, contact, email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        )}
      </Paper>

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
                {col('name')          && <TableCell><Link component="button" underline="hover" onClick={() => { setViewItem(r); setViewing(true); }} sx={{ textAlign: 'left' }}>{r.name}</Link></TableCell>}
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
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </TableContainer>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError('')} message={error} />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Club</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

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
