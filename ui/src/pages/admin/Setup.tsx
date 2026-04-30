import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Switch, Tooltip, Chip,
  Card, CardContent, CardHeader, Divider, Stack,
} from '@mui/material';
import { Add, Edit, Delete, OpenInNew, CalendarMonth, Sensors, EmojiEvents, CheckCircle } from '@mui/icons-material';
import { socialMediaPageApi } from '../../api/socialMediaPageApi';
import { appSettingsApi } from '../../api/appSettingsApi';
import { SocialMediaPage, AppSettings } from '../../types';

const emptySmp: SocialMediaPage = { url: '', label: '', enabled: true };

const defaultSettings: AppSettings = {
  showUpcomingSection: true,
  showLiveMatchesSection: true,
  showLogStandingsSection: true,
  showMatchResultsSection: true,
};

export const Setup: React.FC = () => {
  // ── Social Media Pages state ──────────────────────────────────────────
  const [rows, setRows] = useState<SocialMediaPage[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SocialMediaPage>(emptySmp);

  const loadPages = () => socialMediaPageApi.findAll().then(setRows);
  useEffect(() => { loadPages(); }, []);

  const savePage = async () => {
    if (editing.id) { await socialMediaPageApi.update(editing.id, editing); }
    else { await socialMediaPageApi.create(editing); }
    setOpen(false);
    loadPages();
  };

  const removePage = async (id: number) => {
    if (confirm('Delete this social media page?')) { await socialMediaPageApi.delete(id); loadPages(); }
  };

  const togglePageEnabled = async (page: SocialMediaPage) => {
    await socialMediaPageApi.update(page.id!, { ...page, enabled: !page.enabled });
    loadPages();
  };

  const setPatch = (patch: Partial<SocialMediaPage>) => setEditing(e => ({ ...e, ...patch }));

  // ── App Settings state ────────────────────────────────────────────────
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => { appSettingsApi.get().then(setSettings).catch(() => {}); }, []);

  const toggleSetting = async (key: keyof AppSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSettingsSaving(true);
    try { await appSettingsApi.update(updated); }
    finally { setSettingsSaving(false); }
  };

  const landingSections = [
    { key: 'showUpcomingSection'      as const, label: 'Upcoming Matches & Tournaments', icon: <CalendarMonth fontSize="small" color="primary" /> },
    { key: 'showLiveMatchesSection'   as const, label: 'Live Matches',                   icon: <Sensors fontSize="small" sx={{ color: '#e53935' }} /> },
    { key: 'showLogStandingsSection'  as const, label: 'Log Standings',                  icon: <EmojiEvents fontSize="small" color="primary" /> },
    { key: 'showMatchResultsSection'  as const, label: 'Match Results',                  icon: <CheckCircle fontSize="small" color="primary" /> },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5">Page Setup</Typography>

      {/* ── Landing Page Sections ─────────────────────────────────────── */}
      <Card variant="outlined">
        <CardHeader
          title="Landing Page Sections"
          subheader="Enable or disable sections visible on the public landing page."
          titleTypographyProps={{ variant: 'h6' }}
          subheaderTypographyProps={{ variant: 'body2' }}
        />
        <Divider />
        <CardContent>
          <Stack divider={<Divider />}>
            {landingSections.map(({ key, label, icon }) => (
              <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  {icon}
                  <Typography variant="body1">{label}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Switch
                    checked={settings[key]}
                    size="small"
                    disabled={settingsSaving}
                    onChange={() => toggleSetting(key)}
                  />
                  <Chip
                    label={settings[key] ? 'Visible' : 'Hidden'}
                    color={settings[key] ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* ── Social Media Pages ────────────────────────────────────────── */}
      <Card variant="outlined">
        <CardHeader
          title="Social Media Pages"
          subheader="Manage social media page embeds shown on the landing page."
          titleTypographyProps={{ variant: 'h6' }}
          subheaderTypographyProps={{ variant: 'body2' }}
          action={
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => { setEditing(emptySmp); setOpen(true); }}
              sx={{ mt: 0.5, mr: 1 }}
            >
              Add Page
            </Button>
          }
        />
        <Divider />
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
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
                        <Switch checked={r.enabled} size="small" onChange={() => togglePageEnabled(r)} />
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
                        <IconButton size="small" color="error" onClick={() => removePage(r.id!)}>
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
        </CardContent>
      </Card>

      {/* ── Add/Edit dialog ───────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.id ? 'Edit Social Media Page' : 'Add Social Media Page'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Page URL"
            value={editing.url}
            onChange={e => setPatch({ url: e.target.value })}
            fullWidth
            required
            placeholder="https://www.facebook.com/YourPage"
          />
          <TextField
            label="Label (optional)"
            value={editing.label ?? ''}
            onChange={e => setPatch({ label: e.target.value })}
            fullWidth
            placeholder="e.g. Cricket Legend on Facebook"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch checked={editing.enabled} onChange={e => setPatch({ enabled: e.target.checked })} />
            <Typography variant="body2">
              {editing.enabled ? 'Enabled — visible on landing page' : 'Disabled — hidden from landing page'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={savePage} disabled={!editing.url.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
