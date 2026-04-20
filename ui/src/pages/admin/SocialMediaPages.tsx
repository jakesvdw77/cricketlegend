import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Switch, Tooltip, Chip,
} from '@mui/material';
import { Add, Edit, Delete, OpenInNew } from '@mui/icons-material';
import { socialMediaPageApi } from '../../api/socialMediaPageApi';
import { SocialMediaPage } from '../../types';

const empty: SocialMediaPage = { url: '', label: '', enabled: true };

export const SocialMediaPages: React.FC = () => {
  const [rows, setRows] = useState<SocialMediaPage[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SocialMediaPage>(empty);

  const load = () => socialMediaPageApi.findAll().then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing.id) { await socialMediaPageApi.update(editing.id, editing); }
    else { await socialMediaPageApi.create(editing); }
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (confirm('Delete this social media page?')) { await socialMediaPageApi.delete(id); load(); }
  };

  const toggleEnabled = async (page: SocialMediaPage) => {
    await socialMediaPageApi.update(page.id!, { ...page, enabled: !page.enabled });
    load();
  };

  const set = (patch: Partial<SocialMediaPage>) => setEditing(e => ({ ...e, ...patch }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Social Media Pages</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(empty); setOpen(true); }}>
          Add Page
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{
          '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
          '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
          '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
        }}>
          <TableHead>
            <TableRow>
              <TableCell>Label</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.label || <em style={{ color: '#999' }}>—</em>}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.url}
                    </Typography>
                    <Tooltip title="Open">
                      <IconButton size="small" component="a" href={r.url} target="_blank" rel="noopener">
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch checked={r.enabled} size="small" onChange={() => toggleEnabled(r)} />
                    <Chip label={r.enabled ? 'Enabled' : 'Disabled'} color={r.enabled ? 'success' : 'default'} size="small" />
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => { setEditing(r); setOpen(true); }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => remove(r.id!)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No social media pages configured
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.id ? 'Edit Social Media Page' : 'Add Social Media Page'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Page URL"
            value={editing.url}
            onChange={e => set({ url: e.target.value })}
            fullWidth
            required
            placeholder="https://www.facebook.com/YourPage"
          />
          <TextField
            label="Label (optional)"
            value={editing.label ?? ''}
            onChange={e => set({ label: e.target.value })}
            fullWidth
            placeholder="e.g. Cricket Legend on Facebook"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch checked={editing.enabled} onChange={e => set({ enabled: e.target.checked })} />
            <Typography variant="body2">{editing.enabled ? 'Enabled — visible on landing page' : 'Disabled — hidden from landing page'}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!editing.url.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
