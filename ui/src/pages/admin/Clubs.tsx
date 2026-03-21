import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Avatar, CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, OpenInNew, CloudUpload } from '@mui/icons-material';
import { clubApi } from '../../api/clubApi';
import { paymentApi } from '../../api/paymentApi';
import { Club } from '../../types';

const empty: Club = { name: '' };

export const Clubs: React.FC = () => {
  const [rows, setRows] = useState<Club[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Club>(empty);
  const [uploading, setUploading] = useState(false);
  const [viewLogoUrl, setViewLogoUrl] = useState<string | null>(null);
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
    if (confirm('Delete club?')) { await clubApi.delete(id); load(); }
  };

  const set = (patch: Partial<Club>) => setEditing(e => ({ ...e, ...patch }));

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Clubs</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Club
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={48} />
              <TableCell>Name</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Contact Number</TableCell>
              <TableCell>Links</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
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
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.contactPerson}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.contactNumber}</TableCell>
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
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(r)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.clubId!)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.clubId ? 'Edit' : 'New'} Club</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Club Name"
            value={editing.name}
            onChange={e => set({ name: e.target.value })}
            required
          />

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
                  label="Club Image URL"
                  value={editing.logoUrl ?? ''}
                  onChange={e => set({ logoUrl: e.target.value })}
                  size="small"
                  helperText="Upload a logo above or paste a URL"
                />
              </Box>
            </Box>
          </Box>

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
          <Box sx={{ display: 'flex', gap: 2 }}>
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
