import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Avatar, CircularProgress,
  Autocomplete, TableSortLabel, TablePagination, Popover, FormGroup,
  Checkbox, FormControlLabel, Tooltip, useMediaQuery, useTheme, Tabs, Tab, Chip, InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, CloudUpload, Groups, Print, SportsCricket, ViewColumn, ContentCopy, Language, Facebook, Instagram, YouTube, HighlightOff } from '@mui/icons-material';
import { printSquad } from '../../utils/printSquad';
import { teamApi } from '../../api/teamApi';
import { clubApi } from '../../api/clubApi';
import { playerApi } from '../../api/playerApi';
import { fieldApi } from '../../api/fieldApi';
import { paymentApi } from '../../api/paymentApi';
import { sponsorApi } from '../../api/sponsorApi';
import { Team, Club, Player, Field, Sponsor } from '../../types';
import { ManagerDTO } from '../../api/managerApi';
import { useAuth } from '../../hooks/useAuth';
import { useManagerTeams } from '../../hooks/useManagerTeams';

const empty: Team = { teamName: '' };

type ColKey = 'teamName' | 'club' | 'captain' | 'homeGround' | 'selector' | 'coach' | 'manager' | 'sponsors' | 'links';
const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'teamName',   label: 'Team Name' },
  { key: 'club',       label: 'Club' },
  { key: 'homeGround', label: 'Home Ground' },
  { key: 'captain',    label: 'Captain' },
  { key: 'selector',   label: 'Selector' },
  { key: 'coach',      label: 'Coach' },
  { key: 'manager',    label: 'Manager' },
  { key: 'sponsors',   label: 'Sponsors' },
  { key: 'links',      label: 'Links' },
];
const DEFAULT_VISIBLE = new Set<ColKey>(['teamName', 'club', 'homeGround', 'captain', 'selector', 'coach', 'manager', 'sponsors', 'links']);
const MOBILE_VISIBLE = new Set<ColKey>(['teamName', 'club', 'captain']);

export const Teams: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAdmin } = useAuth();
  const { teamIds: managerTeamIds, restrictByTeam } = useManagerTeams();

  const canManage = (teamId: number) => !restrictByTeam || managerTeamIds.has(teamId);
  const [rows, setRows] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [filterClubId, setFilterClubId] = useState<number | ''>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team>(empty);
  const [teamNameError, setTeamNameError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [viewLogoUrl, setViewLogoUrl] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(isMobile ? MOBILE_VISIBLE : DEFAULT_VISIBLE));
  const [colAnchor, setColAnchor] = useState<HTMLButtonElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [teamManagers, setTeamManagers] = useState<ManagerDTO[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [dialogTab, setDialogTab] = useState(0);
  const [sponsorPopoverAnchor, setSponsorPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverSponsors, setPopoverSponsors] = useState<Sponsor[]>([]);


  const load = () => teamApi.findAll().then(setRows);
  useEffect(() => {
    load();
    clubApi.findAll().then(setClubs);
    playerApi.findAll().then(setPlayers);
    fieldApi.findAll().then(setFields);
    sponsorApi.findAll().then(setSponsors);
  }, []);

  const openCreate = () => {
    setEditing(empty);
    setTeamManagers([]);
    setTeamNameError('');
    setDialogTab(0);
    setOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditing(team);
    setTeamNameError('');
    setDialogTab(0);
    if (team.teamId) {
      teamApi.getManagers(team.teamId).then(setTeamManagers).catch(() => setTeamManagers([]));
    }
    setOpen(true);
  };

  const save = async () => {
    const name = editing.teamName?.trim() ?? '';
    if (!name) { setTeamNameError('Team name is required'); return; }
    const duplicate = rows.find(r =>
      r.teamName.toLowerCase() === name.toLowerCase() && r.teamId !== editing.teamId
    );
    if (duplicate) { setTeamNameError('A team with this name already exists'); return; }
    setTeamNameError('');
    if (editing.teamId) { await teamApi.update(editing.teamId, editing); }
    else { await teamApi.create(editing); }
    setOpen(false); load();
  };

  const remove = async () => {
    if (deleteId == null) return;
    await teamApi.delete(deleteId);
    setDeleteId(null);
    load();
  };

  const duplicate = (t: Team) => {
    const { teamId, captainName, associatedClubName, homeFieldName, ...rest } = t;
    setEditing({ ...rest, teamName: `${t.teamName} (Copy)` });
    setOpen(true);
  };

  const set = (patch: Partial<Team>) => setEditing(e => ({ ...e, ...patch }));


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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      set({ teamPhotoUrl: url });
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filtered = [...rows].filter(r => {
    const q = search.toLowerCase();
    const matchesSearch = !q || r.teamName.toLowerCase().includes(q) || r.associatedClubName?.toLowerCase().includes(q);
    const matchesClub = !filterClubId || (filterClubId === -1 ? !r.associatedClubId : r.associatedClubId === filterClubId);
    return matchesSearch && matchesClub;
  }).sort((a, b) => {
    const cmp = a.teamName.localeCompare(b.teamName);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const col = (key: ColKey) => visibleCols.has(key);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Teams</Typography>
        <TextField
          select
          size="small"
          label="Club"
          value={filterClubId}
          onChange={e => { setFilterClubId(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 200 } }}
        >
          <MenuItem value="">All clubs</MenuItem>
          <MenuItem value={-1}>No club</MenuItem>
          {clubs.map(c => (
            <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          placeholder="Search name, club…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 260 } }}
        />
        <Tooltip title="Toggle columns">
          <IconButton onClick={e => setColAnchor(e.currentTarget)}><ViewColumn /></IconButton>
        </Tooltip>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Add Team
          </Button>
        )}
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
                control={
                  <Checkbox
                    size="small"
                    checked={visibleCols.has(c.key)}
                    onChange={() => toggleCol(c.key)}
                  />
                }
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
              {col('teamName')   && (
                <TableCell sortDirection={sortDir}>
                  <TableSortLabel active direction={sortDir} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>Team Name</TableSortLabel>
                </TableCell>
              )}
              {col('club')       && <TableCell>Club</TableCell>}
              {col('captain')    && <TableCell>Captain</TableCell>}
              {col('homeGround') && <TableCell>Home Ground</TableCell>}
              {col('selector')   && <TableCell>Selector</TableCell>}
              {col('coach')      && <TableCell>Coach</TableCell>}
              {col('manager')    && <TableCell>Manager</TableCell>}
              {col('sponsors')   && <TableCell>Sponsors</TableCell>}
              {col('links')      && <TableCell>Links</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(r => (
              <TableRow key={r.teamId}>
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
                    {r.teamName.charAt(0)}
                  </Avatar>
                </TableCell>
                {col('teamName')   && <TableCell>{r.teamName}</TableCell>}
                {col('club')       && <TableCell>{r.associatedClubName}</TableCell>}
                {col('captain')    && <TableCell>{r.captainName}</TableCell>}
                {col('homeGround') && <TableCell>{r.homeFieldName}</TableCell>}
                {col('selector')   && <TableCell>{r.selector}</TableCell>}
                {col('coach')      && <TableCell>{r.coach}</TableCell>}
                {col('manager')    && <TableCell>{r.manager}</TableCell>}
                {col('sponsors')   && (
                  <TableCell>
                    <Chip
                      label={r.sponsors?.length ?? 0}
                      size="small"
                      clickable={!!r.sponsors?.length}
                      onClick={r.sponsors?.length ? (e) => {
                        setPopoverSponsors(r.sponsors!);
                        setSponsorPopoverAnchor(e.currentTarget);
                      } : undefined}
                      title={r.sponsors?.length ? 'View sponsors' : 'No sponsors'}
                    />
                  </TableCell>
                )}
                {col('links') && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {r.websiteUrl && (
                        <IconButton size="small" component="a" href={r.websiteUrl} target="_blank" rel="noopener noreferrer" title="Website">
                          <Language fontSize="small" />
                        </IconButton>
                      )}
                      {r.facebookUrl && (
                        <IconButton size="small" component="a" href={r.facebookUrl} target="_blank" rel="noopener noreferrer" title="Facebook" sx={{ color: '#1877F2' }}>
                          <Facebook fontSize="small" />
                        </IconButton>
                      )}
                      {r.instagramUrl && (
                        <IconButton size="small" component="a" href={r.instagramUrl} target="_blank" rel="noopener noreferrer" title="Instagram" sx={{ color: '#E1306C' }}>
                          <Instagram fontSize="small" />
                        </IconButton>
                      )}
                      {r.youtubeUrl && (
                        <IconButton size="small" component="a" href={r.youtubeUrl} target="_blank" rel="noopener noreferrer" title="YouTube" sx={{ color: '#FF0000' }}>
                          <YouTube fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                )}
                <TableCell sx={{ whiteSpace: { xs: 'normal', md: 'nowrap' } }}>
                  {canManage(r.teamId!) && (
                    <IconButton size="small" onClick={() => openEdit(r)} title="Edit"><Edit /></IconButton>
                  )}
                  {canManage(r.teamId!) && (
                    <IconButton size="small" title="Manage Squad" onClick={() => navigate(`/admin/teams/${r.teamId}/squad`)}><Groups /></IconButton>
                  )}
                  <IconButton size="small" title="Print Squad" onClick={async () => {
                    const squad = await teamApi.getSquad(r.teamId!);
                    printSquad(r, [...squad].sort((a, b) => a.name.localeCompare(b.name)));
                  }}><Print fontSize="small" /></IconButton>
                  {isAdmin && (
                    <IconButton size="small" title="Duplicate" onClick={() => duplicate(r)}><ContentCopy fontSize="small" /></IconButton>
                  )}
                  {isAdmin && (
                    <IconButton size="small" color="error" onClick={() => setDeleteId(r.teamId!)}><Delete /></IconButton>
                  )}
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
      <Dialog open={open} onClose={(_, reason) => { if (reason !== 'backdropClick') setOpen(false); }} maxWidth="md" fullWidth>
        <DialogTitle>{editing.teamId ? 'Edit' : 'New'} Team</DialogTitle>
        <Tabs value={dialogTab} onChange={(_, v) => setDialogTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Details" />
          <Tab label="Sponsors" />
        </Tabs>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid' }}>

          {/* Tab 0: Details */}
          <Box sx={{ gridArea: '1/1', display: 'flex', flexDirection: 'column', gap: 2, visibility: dialogTab === 0 ? 'visible' : 'hidden' }}>

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
                {editing.teamName.charAt(0)}
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

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Team Name" value={editing.teamName} required fullWidth
                       error={!!teamNameError} helperText={teamNameError}
                       onChange={e => { set({ teamName: e.target.value }); setTeamNameError(''); }} />
            <TextField label="Abbreviation" value={editing.abbreviation ?? ''} sx={{ width: 140 }}
                       inputProps={{ maxLength: 10 }}
                       onChange={e => set({ abbreviation: e.target.value })} />
          </Box>

          <TextField select label="Associated Club" value={editing.associatedClubId ?? ''}
                     onChange={e => set({ associatedClubId: +e.target.value })}>
            {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
          </TextField>

          <TextField select label="Home Ground" value={editing.homeFieldId ?? ''}
                     onChange={e => set({ homeFieldId: +e.target.value })}>
            {fields.map(f => <MenuItem key={f.fieldId} value={f.fieldId}>{f.name}</MenuItem>)}
          </TextField>

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField select label="Coach" value={editing.coach ?? ''} fullWidth
                       onChange={e => set({ coach: e.target.value })}
                       helperText={!editing.teamId ? 'Save team first to load managers' : undefined}>
              <MenuItem value="">— None —</MenuItem>
              {teamManagers.map(m => (
                <MenuItem key={m.managerId} value={m.displayName}>{m.displayName}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Manager" value={editing.manager ?? ''} fullWidth
                       onChange={e => set({ manager: e.target.value })}>
              <MenuItem value="">— None —</MenuItem>
              {teamManagers.map(m => (
                <MenuItem key={m.managerId} value={m.displayName}>{m.displayName}</MenuItem>
              ))}
            </TextField>
          </Box>

          <TextField select label="Selector" value={editing.selector ?? ''}
                     onChange={e => set({ selector: e.target.value })}>
            <MenuItem value="">— None —</MenuItem>
            {teamManagers.map(m => (
              <MenuItem key={m.managerId} value={m.displayName}>{m.displayName}</MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField label="Email" value={editing.email ?? ''} fullWidth
            onChange={e => set({ email: e.target.value })} />
          <TextField label="Contact Number" value={editing.contactNumber ?? ''} fullWidth
            onChange={e => set({ contactNumber: e.target.value })} />
          </Box>

          <TextField label="Website URL" value={editing.websiteUrl ?? ''}
                     onChange={e => set({ websiteUrl: e.target.value })} />
          <TextField label="Facebook URL" value={editing.facebookUrl ?? ''}
                     onChange={e => set({ facebookUrl: e.target.value })}
                     InputProps={{ startAdornment: <InputAdornment position="start"><Facebook sx={{ color: '#1877F2', fontSize: 20 }} /></InputAdornment> }} />
          <TextField label="Instagram URL" value={editing.instagramUrl ?? ''}
                     onChange={e => set({ instagramUrl: e.target.value })}
                     InputProps={{ startAdornment: <InputAdornment position="start"><Instagram sx={{ color: '#E1306C', fontSize: 20 }} /></InputAdornment> }} />
          <TextField label="YouTube URL" value={editing.youtubeUrl ?? ''}
                     onChange={e => set({ youtubeUrl: e.target.value })}
                     InputProps={{ startAdornment: <InputAdornment position="start"><YouTube sx={{ color: '#FF0000', fontSize: 20 }} /></InputAdornment> }} />

          {/* Team photo upload + preview */}
          <Box>
            <input
              type="file"
              ref={photoInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              {editing.teamPhotoUrl && (
                <Box
                  component="img"
                  src={editing.teamPhotoUrl}
                  alt="Team photo"
                  sx={{
                    width: 96, height: 64, objectFit: 'cover', borderRadius: 1,
                    flexShrink: 0, cursor: 'pointer',
                  }}
                  onClick={() => setViewLogoUrl(editing.teamPhotoUrl!)}
                />
              )}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>

                <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploadingPhoto ? <CircularProgress size={14} /> : <CloudUpload />}
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    sx={{ alignSelf: 'flex-start' }}
                >
                  {uploadingPhoto ? 'Uploading…' : 'Upload Team Photo'}
                </Button>
                <TextField
                    label="Team Photo URL"
                    value={editing.teamPhotoUrl ?? ''}
                    onChange={e => set({ teamPhotoUrl: e.target.value })}
                    size="small"
                    helperText="Upload a photo above or paste a URL"
                />
              </Box>
            </Box>
          </Box>

          </Box>

          {/* Tab 1: Sponsors */}
          <Box sx={{ gridArea: '1/1', display: 'flex', flexDirection: 'column', gap: 2, visibility: dialogTab === 1 ? 'visible' : 'hidden' }}>
            <Autocomplete
              multiple
              options={sponsors}
              getOptionLabel={s => s.name}
              value={editing.sponsors ?? []}
              onChange={(_, value) => set({ sponsors: value })}
              isOptionEqualToValue={(o, v) => o.sponsorId === v.sponsorId}
              renderTags={(value, getTagProps) =>
                value.map((s, idx) => (
                  <Chip label={s.name} size="small" {...getTagProps({ index: idx })} key={s.sponsorId} />
                ))
              }
              renderInput={params => <TextField {...params} label="Sponsors" placeholder="Add sponsor…" />}
            />
          </Box>

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>


      {/* Sponsor detail popover */}
      <Popover
        open={!!sponsorPopoverAnchor}
        anchorEl={sponsorPopoverAnchor}
        onClose={() => setSponsorPopoverAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, maxWidth: 320 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Sponsors</Typography>
          {popoverSponsors.map((s, i) => (
            <Box key={s.sponsorId ?? i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: i < popoverSponsors.length - 1 ? 2 : 0 }}>
              <Avatar src={s.brandLogoUrl} sx={{ width: 40, height: 40, flexShrink: 0 }}>
                {s.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight="bold">{s.name}</Typography>
                {s.brandWebsite && (
                  <Typography variant="caption" component="a" href={s.brandWebsite} target="_blank" rel="noreferrer" sx={{ display: 'block', color: 'primary.main' }}>
                    {s.brandWebsite}
                  </Typography>
                )}
                {s.contactPerson && (
                  <Typography variant="caption" sx={{ display: 'block' }}>{s.contactPerson}</Typography>
                )}
                {s.contactEmail && (
                  <Typography variant="caption" sx={{ display: 'block' }}>{s.contactEmail}</Typography>
                )}
                {s.contactNumber && (
                  <Typography variant="caption" sx={{ display: 'block' }}>{s.contactNumber}</Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Popover>

      {/* Delete confirmation */}
      <Dialog open={deleteId != null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Team</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this team? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={remove}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Logo viewer */}
      <Dialog open={!!viewLogoUrl} onClose={() => setViewLogoUrl(null)} maxWidth="sm">
        <DialogContent sx={{ p: 0, lineHeight: 0 }}>
          <img
            src={viewLogoUrl ?? ''}
            alt="Team logo"
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
