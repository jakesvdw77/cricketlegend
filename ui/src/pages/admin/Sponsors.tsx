import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Avatar, Link, CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, OpenInNew, CloudUpload } from '@mui/icons-material';
import { sponsorApi } from '../../api/sponsorApi';
import { paymentApi } from '../../api/paymentApi';
import { Sponsor } from '../../types';

const empty: Sponsor = { name: '' };

export const Sponsors: React.FC = () => {
  const [rows, setRows] = useState<Sponsor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor>(empty);
  const [uploading, setUploading] = useState(false);
  const [viewLogoUrl, setViewLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Sponsors</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(empty); setOpen(true); }}>
          Add Sponsor
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Name</TableCell>
              <TableCell>Website</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Contact Email</TableCell>
              <TableCell>Contact Number</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
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
          <TextField label="Sponsor Name" value={editing.name} required
            onChange={e => set({ name: e.target.value })} />

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
                src={editing.brandLogoUrl ?? ''}
                variant="rounded"
                sx={{ width: 64, height: 64, flexShrink: 0, cursor: editing.brandLogoUrl ? 'pointer' : 'default' }}
                onClick={() => editing.brandLogoUrl && setViewLogoUrl(editing.brandLogoUrl)}
              >
                {editing.name.charAt(0)}
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
                  label="Brand Logo URL"
                  value={editing.brandLogoUrl ?? ''}
                  onChange={e => set({ brandLogoUrl: e.target.value })}
                  size="small"
                  helperText="Upload a logo above or paste a URL"
                />
              </Box>
            </Box>
          </Box>

          <TextField label="Brand Website" value={editing.brandWebsite ?? ''}
            onChange={e => set({ brandWebsite: e.target.value })} />
          <TextField label="Contact Person" value={editing.contactPerson ?? ''}
            onChange={e => set({ contactPerson: e.target.value })} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Contact Email" type="email" value={editing.contactEmail ?? ''} fullWidth
              onChange={e => set({ contactEmail: e.target.value })} />
            <TextField label="Contact Number" value={editing.contactNumber ?? ''} fullWidth
              onChange={e => set({ contactNumber: e.target.value })} />
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
