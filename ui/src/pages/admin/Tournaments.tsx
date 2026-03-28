import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Chip, Autocomplete,
  Avatar, CircularProgress, Divider, InputAdornment, TableSortLabel,
  TablePagination, Popover, FormGroup, Checkbox, FormControlLabel,
  Tabs, Tab,
} from '@mui/material';
import { Add, Edit, Delete, CloudUpload, PictureAsPdf, Language, Facebook, AppRegistration, EmojiEvents, ViewColumn } from '@mui/icons-material';
import { tournamentApi } from '../../api/tournamentApi';
import { sponsorApi } from '../../api/sponsorApi';
import { teamApi } from '../../api/teamApi';
import { paymentApi } from '../../api/paymentApi';
import { Tournament, CricketFormat, Sponsor, Team, TournamentPool } from '../../types';

const FORMATS: CricketFormat[] = ['T20', 'T30', 'T45', 'T50'];

const empty: Tournament = { name: '', pointsForWin: 2, pointsForDraw: 1, pointsForNoResult: 1, pointsForBonus: 1, sponsors: [] };

interface LocalPoolTeam { teamId: number; teamName: string; tournamentTeamId?: number }
interface LocalPool { poolId?: number; poolName: string; teams: LocalPoolTeam[] }

type ColKey = 'name' | 'format' | 'startDate' | 'endDate' | 'pools' | 'winner' | 'sponsors' | 'links';
const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'name',      label: 'Name' },
  { key: 'format',    label: 'Format' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate',   label: 'End Date' },
  { key: 'pools',     label: 'Pools' },
  { key: 'winner',    label: 'Winner' },
  { key: 'sponsors',  label: 'Sponsors' },
  { key: 'links',     label: 'Links' },
];
const DEFAULT_VISIBLE = new Set<ColKey>(['name', 'format', 'startDate', 'endDate', 'pools', 'winner', 'sponsors', 'links']);

export const Tournaments: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Tournament[]>([]);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterFormat, setFilterFormat] = useState<CricketFormat | ''>('');
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tournament>(empty);
  const [uploading, setUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [viewLogoUrl, setViewLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Pool management state
  const [localPools, setLocalPools] = useState<LocalPool[]>([]);
  const [originalPools, setOriginalPools] = useState<LocalPool[]>([]);
  const [newPoolName, setNewPoolName] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Column visibility state
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));
  const [colAnchor, setColAnchor] = useState<HTMLButtonElement | null>(null);

  const col = (key: ColKey) => visibleCols.has(key);

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const load = () => tournamentApi.findAll().then(setRows);
  useEffect(() => {
    load();
    sponsorApi.findAll().then(setSponsors);
    teamApi.findAll().then(setAllTeams);
  }, []);

  const openDialog = (tournament: Tournament) => {
    setEditing(tournament);
    const pools: LocalPool[] = (tournament.pools ?? []).map(p => ({
      poolId: p.poolId,
      poolName: p.poolName,
      teams: (p.teams ?? []).map(t => ({
        teamId: t.teamId!,
        teamName: t.teamName!,
        tournamentTeamId: t.tournamentTeamId,
      })),
    }));
    setLocalPools(pools);
    setOriginalPools(JSON.parse(JSON.stringify(pools)));
    setNewPoolName('');
    setActiveTab(0);
    setOpen(true);
  };

  const save = async () => {
    let saved: Tournament;
    if (editing.tournamentId) {
      saved = await tournamentApi.update(editing.tournamentId, editing);
    } else {
      saved = await tournamentApi.create(editing);
    }
    const tournamentId = saved.tournamentId!;

    // Delete removed pools
    for (const orig of originalPools) {
      if (orig.poolId && !localPools.find(p => p.poolId === orig.poolId)) {
        await tournamentApi.deletePool(orig.poolId);
      }
    }

    // Sync each pool
    for (const pool of localPools) {
      let poolId = pool.poolId;

      if (!poolId) {
        const created = await tournamentApi.addPool(tournamentId, { poolName: pool.poolName } as TournamentPool);
        poolId = created.poolId!;
      }

      const origPool = originalPools.find(p => p.poolId === poolId);
      const origTeamIds = new Set(origPool?.teams.map(t => t.teamId) ?? []);
      const currTeamIds = new Set(pool.teams.map(t => t.teamId));

      for (const orig of origPool?.teams ?? []) {
        if (!currTeamIds.has(orig.teamId)) {
          await tournamentApi.removeTeamFromPool(poolId, orig.teamId);
        }
      }
      for (const team of pool.teams) {
        if (!origTeamIds.has(team.teamId)) {
          await tournamentApi.addTeamToPool(poolId, team.teamId);
        }
      }
    }

    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (confirm('Delete this tournament?')) { await tournamentApi.delete(id); load(); }
  };

  const set = (patch: Partial<Tournament>) => setEditing(e => ({ ...e, ...patch }));

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

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      set({ playingConditionsUrl: url });
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  // Pool helpers
  const addPool = () => {
    const name = newPoolName.trim() || `Pool ${String.fromCharCode(65 + localPools.length)}`;
    setLocalPools(p => [...p, { poolName: name, teams: [] }]);
    setNewPoolName('');
  };

  const removePool = (idx: number) => {
    setLocalPools(p => p.filter((_, i) => i !== idx));
  };

  const addTeamToLocalPool = (poolIdx: number, team: Team) => {
    setLocalPools(pools => pools.map((p, i) => {
      if (i !== poolIdx) return p;
      if (p.teams.find(t => t.teamId === team.teamId)) return p;
      return { ...p, teams: [...p.teams, { teamId: team.teamId!, teamName: team.teamName }] };
    }));
  };

  const removeTeamFromLocalPool = (poolIdx: number, teamId: number) => {
    setLocalPools(pools => pools.map((p, i) =>
      i !== poolIdx ? p : { ...p, teams: p.teams.filter(t => t.teamId !== teamId) }
    ));
  };

  // Filtered + sorted rows
  const filtered = [...rows].filter(r => {
    const q = search.toLowerCase();
    const matchesName = !q || r.name.toLowerCase().includes(q);
    const matchesFormat = !filterFormat || r.cricketFormat === filterFormat;
    const matchesYear = !filterYear || r.startDate?.startsWith(String(filterYear));
    return matchesName && matchesFormat && matchesYear;
  }).sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Tournaments</Typography>
        <TextField
          select
          size="small"
          label="Format"
          value={filterFormat}
          onChange={e => { setFilterFormat(e.target.value as CricketFormat | ''); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 110 } }}
        >
          <MenuItem value="">All</MenuItem>
          {FORMATS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Year"
          value={filterYear}
          onChange={e => { setFilterYear(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 100 } }}
        >
          <MenuItem value="">All</MenuItem>
          {Array.from(new Set(rows.map(r => r.startDate?.slice(0, 4)).filter(Boolean)))
            .sort((a, b) => Number(b) - Number(a))
            .map(y => <MenuItem key={y} value={Number(y)}>{y}</MenuItem>)}
        </TextField>
        <TextField
          size="small"
          placeholder="Search name…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 220 } }}
        />
        <IconButton
          size="small"
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
          <Box sx={{ p: 2, minWidth: 160 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Columns</Typography>
            <FormGroup>
              {ALL_COLUMNS.map(c => (
                <FormControlLabel
                  key={c.key}
                  control={
                    <Checkbox
                      size="small"
                      checked={visibleCols.has(c.key)}
                      onChange={() => toggleCol(c.key)}
                    />
                  }
                  label={c.label}
                />
              ))}
            </FormGroup>
          </Box>
        </Popover>
        <Button variant="contained" startIcon={<Add />} onClick={() => openDialog(empty)}>
          Add Tournament
        </Button>
      </Box>

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
              {col('format') && <TableCell>Format</TableCell>}
              {col('startDate') && <TableCell>Start Date</TableCell>}
              {col('endDate') && <TableCell>End Date</TableCell>}
              {col('pools') && <TableCell>Pools</TableCell>}
              {col('winner') && <TableCell>Winner</TableCell>}
              {col('sponsors') && <TableCell>Sponsors</TableCell>}
              {col('links') && <TableCell>Links</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(r => (
              <TableRow key={r.tournamentId}>
                <TableCell>
                  <Avatar
                    src={r.logoUrl}
                    variant="rounded"
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
                {col('name') && <TableCell>{r.name}</TableCell>}
                {col('format') && <TableCell><Chip label={r.cricketFormat} size="small" /></TableCell>}
                {col('startDate') && <TableCell>{r.startDate}</TableCell>}
                {col('endDate') && <TableCell>{r.endDate}</TableCell>}
                {col('pools') && (
                  <TableCell>
                    <Chip
                      label={r.pools?.length ?? 0}
                      size="small"
                      clickable
                      onClick={() => navigate(`/admin/tournaments/${r.tournamentId}/pools`)}
                      title="View pools"
                    />
                  </TableCell>
                )}
                {col('winner') && (
                  <TableCell>
                    {r.winningTeamName && (
                      <Chip icon={<EmojiEvents />} label={r.winningTeamName} size="small" color="warning" variant="outlined" />
                    )}
                  </TableCell>
                )}
                {col('sponsors') && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {r.sponsors?.map(s => (
                        <Chip key={s.sponsorId} label={s.name} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                )}
                {col('links') && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {r.websiteLink && (
                        <IconButton size="small" component="a" href={r.websiteLink} target="_blank" rel="noopener noreferrer" title="Website">
                          <Language fontSize="small" />
                        </IconButton>
                      )}
                      {r.facebookLink && (
                        <IconButton size="small" component="a" href={r.facebookLink} target="_blank" rel="noopener noreferrer" title="Facebook" sx={{ color: '#1877F2' }}>
                          <Facebook fontSize="small" />
                        </IconButton>
                      )}
                      {r.playingConditionsUrl && (
                        <IconButton size="small" component="a" href={r.playingConditionsUrl} target="_blank" rel="noopener noreferrer" title="Playing Conditions" color="error">
                          <PictureAsPdf fontSize="small" />
                        </IconButton>
                      )}
                      {r.registrationPageUrl && (
                        <IconButton size="small" component="a" href={r.registrationPageUrl} target="_blank" rel="noopener noreferrer" title="Registration">
                          <AppRegistration fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                )}
                <TableCell>
                  <IconButton size="small" onClick={() => openDialog(r)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.tournamentId!)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </TableContainer>

      {/* Add / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing.tournamentId ? 'Edit' : 'New'} Tournament</DialogTitle>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="General Info" />
          <Tab label="Pools" />
          <Tab label="Media & Links" />
          <Tab label="Sponsors" />
        </Tabs>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>

          {/* Tab 0: General Info */}
          {activeTab === 0 && (
            <>
              {/* Logo upload + preview */}
              <Box>
                <input type="file" ref={logoInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleLogoUpload} />
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Avatar
                    src={editing.logoUrl ?? ''}
                    variant="rounded"
                    sx={{ width: 64, height: 64, flexShrink: 0, cursor: editing.logoUrl ? 'pointer' : 'default' }}
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
                  </Box>
                </Box>
              </Box>

              <TextField label="Name" value={editing.name} onChange={e => set({ name: e.target.value })} required />
              <TextField label="Description" value={editing.description ?? ''} multiline rows={2}
                onChange={e => set({ description: e.target.value })} />
              <TextField select label="Format" value={editing.cricketFormat ?? ''} onChange={e => set({ cricketFormat: e.target.value as CricketFormat })}>
                {FORMATS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </TextField>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField label="Start Date" type="date" value={editing.startDate ?? ''} InputLabelProps={{ shrink: true }}
                  onChange={e => set({ startDate: e.target.value })} fullWidth />
                <TextField label="End Date" type="date" value={editing.endDate ?? ''} InputLabelProps={{ shrink: true }}
                  onChange={e => set({ endDate: e.target.value })} fullWidth />
              </Box>

              <Divider />
              <Typography variant="subtitle2" color="text.secondary">Scoring</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField label="Win Pts" type="number" value={editing.pointsForWin ?? 2}
                  onChange={e => set({ pointsForWin: +e.target.value })} />
                <TextField label="Draw Pts" type="number" value={editing.pointsForDraw ?? 1}
                  onChange={e => set({ pointsForDraw: +e.target.value })} />
                <TextField label="No Result Pts" type="number" value={editing.pointsForNoResult ?? 1}
                  onChange={e => set({ pointsForNoResult: +e.target.value })} />
                <TextField label="Bonus Pts" type="number" value={editing.pointsForBonus ?? 1}
                  onChange={e => set({ pointsForBonus: +e.target.value })} />
              </Box>

              <Divider />
              <Typography variant="subtitle2" color="text.secondary">Fees</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  label="Entry Fee"
                  type="number"
                  value={editing.entryFee ?? ''}
                  onChange={e => set({ entryFee: e.target.value ? +e.target.value : undefined })}
                  InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }}
                  fullWidth
                />
                <TextField
                  label="Registration Fee"
                  type="number"
                  value={editing.registrationFee ?? ''}
                  onChange={e => set({ registrationFee: e.target.value ? +e.target.value : undefined })}
                  InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }}
                  fullWidth
                />
                <TextField
                  label="Match Fee"
                  type="number"
                  value={editing.matchFee ?? ''}
                  onChange={e => set({ matchFee: e.target.value ? +e.target.value : undefined })}
                  InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }}
                  fullWidth
                />
              </Box>

              <Divider />
              <Typography variant="subtitle2" color="text.secondary">Winner</Typography>
              <Autocomplete
                options={allTeams}
                getOptionLabel={t => t.teamName}
                value={allTeams.find(t => t.teamId === editing.winningTeamId) ?? null}
                onChange={(_, team) => set({ winningTeamId: team?.teamId ?? undefined, winningTeamName: team?.teamName ?? undefined })}
                isOptionEqualToValue={(o, v) => o.teamId === v.teamId}
                renderInput={params => (
                  <TextField {...params} label="Winning Team" InputProps={{ ...params.InputProps, startAdornment: <><EmojiEvents sx={{ color: 'warning.main', mr: 0.5, fontSize: 20 }} />{params.InputProps.startAdornment}</> }} />
                )}
              />
            </>
          )}

          {/* Tab 1: Pools */}
          {activeTab === 1 && (
            <>
              {localPools.map((pool, poolIdx) => (
                <Paper key={poolIdx} variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      label="Pool Name"
                      value={pool.poolName}
                      size="small"
                      sx={{ flex: 1 }}
                      onChange={e => setLocalPools(pools => pools.map((p, i) =>
                        i === poolIdx ? { ...p, poolName: e.target.value } : p
                      ))}
                    />
                    <IconButton size="small" color="error" onClick={() => removePool(poolIdx)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', minHeight: 28 }}>
                    {pool.teams.map(t => (
                      <Chip
                        key={t.teamId}
                        label={t.teamName}
                        size="small"
                        onDelete={() => removeTeamFromLocalPool(poolIdx, t.teamId)}
                      />
                    ))}
                  </Box>
                  <Autocomplete
                    options={allTeams.filter(t => !pool.teams.find(pt => pt.teamId === t.teamId))}
                    getOptionLabel={t => t.teamName}
                    onChange={(_, team) => { if (team) addTeamToLocalPool(poolIdx, team); }}
                    value={null}
                    blurOnSelect
                    renderInput={params => <TextField {...params} label="Add team to pool" size="small" />}
                  />
                </Paper>
              ))}

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="New Pool Name"
                  value={newPoolName}
                  size="small"
                  sx={{ flex: 1 }}
                  onChange={e => setNewPoolName(e.target.value)}
                  placeholder={`Pool ${String.fromCharCode(65 + localPools.length)}`}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPool(); } }}
                />
                <Button variant="outlined" size="small" startIcon={<Add />} onClick={addPool}>
                  Add Pool
                </Button>
              </Box>
            </>
          )}

          {/* Tab 2: Media & Links */}
          {activeTab === 2 && (
            <>
              <input type="file" ref={pdfInputRef} style={{ display: 'none' }} accept="application/pdf" onChange={handlePdfUpload} />
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ width: 64, height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editing.playingConditionsUrl ? (
                    <IconButton
                      component="a"
                      href={editing.playingConditionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="error"
                      size="large"
                    >
                      <PictureAsPdf sx={{ fontSize: 40 }} />
                    </IconButton>
                  ) : (
                    <PictureAsPdf sx={{ fontSize: 40, color: 'text.disabled' }} />
                  )}
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploadingPdf ? <CircularProgress size={14} /> : <CloudUpload />}
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={uploadingPdf}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {uploadingPdf ? 'Uploading…' : 'Upload Playing Conditions'}
                  </Button>
                </Box>
              </Box>

              <TextField label="Website" value={editing.websiteLink ?? ''} onChange={e => set({ websiteLink: e.target.value })} />
              <TextField label="Facebook" value={editing.facebookLink ?? ''} onChange={e => set({ facebookLink: e.target.value })} />
              <TextField
                label="Registration Page URL"
                value={editing.registrationPageUrl ?? ''}
                onChange={e => set({ registrationPageUrl: e.target.value })}
              />
            </>
          )}

          {/* Tab 3: Sponsors */}
          {activeTab === 3 && (
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
              renderInput={params => <TextField {...params} label="Sponsors" />}
            />
          )}

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
            alt="Tournament logo"
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
