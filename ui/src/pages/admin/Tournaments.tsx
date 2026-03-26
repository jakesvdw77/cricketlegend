import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Chip, Autocomplete,
  Avatar, CircularProgress, Divider, InputAdornment, TableSortLabel,
} from '@mui/material';
import { Add, Edit, Delete, CloudUpload, PictureAsPdf, Language, Facebook, AppRegistration, EmojiEvents } from '@mui/icons-material';
import { tournamentApi } from '../../api/tournamentApi';
import { sponsorApi } from '../../api/sponsorApi';
import { teamApi } from '../../api/teamApi';
import { paymentApi } from '../../api/paymentApi';
import { Tournament, CricketFormat, Sponsor, Team, TournamentPool } from '../../types';

const FORMATS: CricketFormat[] = ['T20', 'T30', 'T45', 'T50'];

const empty: Tournament = { name: '', pointsForWin: 2, pointsForDraw: 1, pointsForNoResult: 1, pointsForBonus: 1, sponsors: [] };

interface LocalPoolTeam { teamId: number; teamName: string; tournamentTeamId?: number }
interface LocalPool { poolId?: number; poolName: string; teams: LocalPoolTeam[] }

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

  // Pool management state
  const [localPools, setLocalPools] = useState<LocalPool[]>([]);
  const [originalPools, setOriginalPools] = useState<LocalPool[]>([]);
  const [newPoolName, setNewPoolName] = useState('');

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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Tournaments</Typography>
        <TextField
          select
          size="small"
          label="Format"
          value={filterFormat}
          onChange={e => setFilterFormat(e.target.value as CricketFormat | '')}
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
          onChange={e => setFilterYear(e.target.value === '' ? '' : Number(e.target.value))}
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
          onChange={e => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 220 } }}
        />
        <Button variant="contained" startIcon={<Add />} onClick={() => openDialog(empty)}>
          Add Tournament
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' }, '& .MuiTableHead-root .MuiTableSortLabel-root': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root:hover': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root.Mui-active': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-icon': { color: 'inherit !important' } }}>
          <TableHead>
            <TableRow>
              <TableCell width={48} />
              <TableCell sortDirection={sortDir}>
                <TableSortLabel active direction={sortDir} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>Name</TableSortLabel>
              </TableCell>
              <TableCell>Format</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Pools</TableCell>
              <TableCell>Winner</TableCell>
              <TableCell>Sponsors</TableCell>
              <TableCell>Links</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {[...rows].filter(r => {
              const q = search.toLowerCase();
              const matchesName = !q || r.name.toLowerCase().includes(q);
              const matchesFormat = !filterFormat || r.cricketFormat === filterFormat;
              const matchesYear = !filterYear || r.startDate?.startsWith(String(filterYear));
              return matchesName && matchesFormat && matchesYear;
            }).sort((a, b) => {
              const cmp = a.name.localeCompare(b.name);
              return sortDir === 'asc' ? cmp : -cmp;
            }).map(r => (
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
                <TableCell>{r.name}</TableCell>
                <TableCell><Chip label={r.cricketFormat} size="small" /></TableCell>
                <TableCell>{r.startDate}</TableCell>
                <TableCell>{r.endDate}</TableCell>
                <TableCell>
                  <Chip
                    label={r.pools?.length ?? 0}
                    size="small"
                    clickable
                    onClick={() => navigate(`/admin/tournaments/${r.tournamentId}/pools`)}
                    title="View pools"
                  />
                </TableCell>
                <TableCell>
                  {r.winningTeamName && (
                    <Chip icon={<EmojiEvents />} label={r.winningTeamName} size="small" color="warning" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {r.sponsors?.map(s => (
                      <Chip key={s.sponsorId} label={s.name} size="small" variant="outlined" />
                    ))}
                  </Box>
                </TableCell>
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
                <TableCell>
                  <IconButton size="small" onClick={() => openDialog(r)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.tournamentId!)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing.tournamentId ? 'Edit' : 'New'} Tournament</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>

          {/* Basic Info */}
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

          {/* Scoring */}
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
          <TextField
            label="Registration Page URL"
            value={editing.registrationPageUrl ?? ''}
            onChange={e => set({ registrationPageUrl: e.target.value })}
          />

          <Divider />
          <Typography variant="subtitle2" color="text.secondary">Media &amp; Links</Typography>

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
                <TextField
                  label="Logo URL"
                  value={editing.logoUrl ?? ''}
                  onChange={e => set({ logoUrl: e.target.value })}
                  size="small"
                  helperText="Upload a logo above or paste a URL"
                />
              </Box>
            </Box>
          </Box>

          {/* Playing conditions PDF upload */}
          <Box>
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
                <TextField
                  label="Playing Conditions URL"
                  value={editing.playingConditionsUrl ?? ''}
                  onChange={e => set({ playingConditionsUrl: e.target.value })}
                  size="small"
                  helperText="Upload a PDF above or paste a URL"
                />
              </Box>
            </Box>
          </Box>

          <TextField label="Banner URL" value={editing.bannerUrl ?? ''} onChange={e => set({ bannerUrl: e.target.value })} />
          <TextField label="Website" value={editing.websiteLink ?? ''} onChange={e => set({ websiteLink: e.target.value })} />
          <TextField label="Facebook" value={editing.facebookLink ?? ''} onChange={e => set({ facebookLink: e.target.value })} />

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

          <Divider />
          <Typography variant="subtitle2" color="text.secondary">Pools</Typography>

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
