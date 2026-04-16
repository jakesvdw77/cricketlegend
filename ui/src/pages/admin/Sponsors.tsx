import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Avatar, Link, CircularProgress, TableSortLabel, Tooltip,
} from '@mui/material';
import { Add, Edit, Delete, OpenInNew, CloudUpload, HighlightOff } from '@mui/icons-material';
import { sponsorApi } from '../../api/sponsorApi';
import { paymentApi } from '../../api/paymentApi';
import { Sponsor } from '../../types';

const empty: Sponsor = { name: '' };

export const Sponsors: React.FC = () => {
  const [rows, setRows] = useState<Sponsor[]>([]);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor>(empty);
  const [uploading, setUploading] = useState(false);
  const [uploadingPrint, setUploadingPrint] = useState(false);
  const [viewLogoUrl, setViewLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const printLogoInputRef = useRef<HTMLInputElement>(null);

  const load = () => sponsorApi.findAll().then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing.sponsorId) { await sponsorApi.update(editing.sponsorId, editing); }
    else { await sponsorApi.create(editing); }
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (confirm('Delete sponsor?')) { await sponsorApi.delete(id); load(); }
  };

  const set = (patch: Partial<Sponsor>) => setEditing(e => ({ ...e, ...patch }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      set({ brandLogoUrl: url });
    } finally {
      setUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handlePrintLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPrint(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      set({ printLogoUrl: url });
    } finally {
      setUploadingPrint(false);
      if (printLogoInputRef.current) printLogoInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Sponsors</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(empty); setOpen(true); }}>
          Add Sponsor
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' }, '& .MuiTableHead-root .MuiTableSortLabel-root': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root:hover': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root.Mui-active': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-icon': { color: 'inherit !important' } }}>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell sortDirection={sortDir}>
                <TableSortLabel active direction={sortDir} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>Name</TableSortLabel>
              </TableCell>
              <TableCell>Website</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Contact Email</TableCell>
              <TableCell>Contact Number</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {[...rows].sort((a, b) => {
              const cmp = a.name.localeCompare(b.name);
              return sortDir === 'asc' ? cmp : -cmp;
            }).map(r => (
              <TableRow key={r.sponsorId}>
                <TableCell>
                  <Avatar
                    src={r.brandLogoUrl}
                    variant="rounded"
                    sx={{
                      width: 32, height: 32,
                      cursor: r.brandLogoUrl ? 'pointer' : 'default',
                      '&:hover': r.brandLogoUrl ? { opacity: 0.8 } : {},
                    }}
                    onClick={() => r.brandLogoUrl && setViewLogoUrl(r.brandLogoUrl)}
                  >
                    {r.name.charAt(0)}
                  </Avatar>
                </TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>
                  {r.brandWebsite && (
                    <Link href={r.brandWebsite} target="_blank" rel="noopener" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {r.brandWebsite} <OpenInNew sx={{ fontSize: 14 }} />
                    </Link>
                  )}
                </TableCell>
                <TableCell>{r.contactPerson}</TableCell>
                <TableCell>{r.contactEmail}</TableCell>
                <TableCell>{r.contactNumber}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => { setEditing(r); setOpen(true); }}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.sponsorId!)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.sponsorId ? 'Edit' : 'New'} Sponsor</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>

          {/* Brand logo upload + preview */}
          <Box>
            <input type="file" ref={logoInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleLogoUpload} />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar
                src={editing.brandLogoUrl ?? ''}
                variant="rounded"
                sx={{ width: 64, height: 64, flexShrink: 0, cursor: editing.brandLogoUrl ? 'pointer' : 'default' }}
                onClick={() => editing.brandLogoUrl && setViewLogoUrl(editing.brandLogoUrl)}
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
                  {editing.brandLogoUrl && (
                    <Tooltip title="Remove logo">
                      <IconButton size="small" color="error" onClick={() => set({ brandLogoUrl: undefined })}>
                        <HighlightOff fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Print logo upload + preview */}
          <Box>
            <input type="file" ref={printLogoInputRef} style={{ display: 'none' }} accept="image/*" onChange={handlePrintLogoUpload} />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar
                src={editing.printLogoUrl ?? ''}
                variant="rounded"
                sx={{ width: 64, height: 64, flexShrink: 0, cursor: editing.printLogoUrl ? 'pointer' : 'default' }}
                onClick={() => editing.printLogoUrl && setViewLogoUrl(editing.printLogoUrl)}
              >
                {editing.name.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploadingPrint ? <CircularProgress size={14} /> : <CloudUpload />}
                    onClick={() => printLogoInputRef.current?.click()}
                    disabled={uploadingPrint}
                  >
                    {uploadingPrint ? 'Uploading…' : 'Upload Print Logo'}
                  </Button>
                  {editing.printLogoUrl && (
                    <Tooltip title="Remove print logo">
                      <IconButton size="small" color="error" onClick={() => set({ printLogoUrl: undefined })}>
                        <HighlightOff fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          <TextField label="Sponsor Name" value={editing.name} required
            onChange={e => set({ name: e.target.value })} />



          <TextField label="Brand Website" value={editing.brandWebsite ?? ''}
            onChange={e => set({ brandWebsite: e.target.value })} />
          <TextField label="Contact Person" value={editing.contactPerson ?? ''}
            onChange={e => set({ contactPerson: e.target.value })} />
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Contact Email" type="email" value={editing.contactEmail ?? ''} fullWidth
              onChange={e => set({ contactEmail: e.target.value })} />
            <TextField label="Contact Number" value={editing.contactNumber ?? ''} fullWidth
              onChange={e => set({ contactNumber: e.target.value })} />
          </Box>
          <TextField label="Address" value={editing.address ?? ''}
            onChange={e => set({ address: e.target.value })} multiline rows={2} />
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="VAT Number" value={editing.vatNumber ?? ''} fullWidth
              onChange={e => set({ vatNumber: e.target.value })} />
            <TextField label="Registration Number" value={editing.registrationNumber ?? ''} fullWidth
              onChange={e => set({ registrationNumber: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Logo viewer */}
      <Dialog open={!!viewLogoUrl} onClose={() => setViewLogoUrl(null)} maxWidth="sm">
        <DialogContent sx={{ p: 0, lineHeight: 0 }}>
          <img
            src={viewLogoUrl ?? ''}
            alt="Brand logo"
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
