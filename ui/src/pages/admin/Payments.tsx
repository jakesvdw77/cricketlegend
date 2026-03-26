import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Chip, Divider,
  Autocomplete, Select, FormControl, InputLabel, Snackbar,
  Card, CardContent, ToggleButton, ToggleButtonGroup, Tooltip,
} from '@mui/material';
import {
  Add, Edit, Delete, Print, FilterAlt, AttachFile,
  Person, Business, EmojiEvents,
} from '@mui/icons-material';
import { paymentApi } from '../../api/paymentApi';
import { playerApi } from '../../api/playerApi';
import { sponsorApi } from '../../api/sponsorApi';
import { tournamentApi } from '../../api/tournamentApi';
import { clubApi } from '../../api/clubApi';
import { Payment, PaymentType, PaymentCategory, Player, Sponsor, Tournament, Club } from '../../types';

// ── helpers ────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];

const TYPE_LABELS: Record<PaymentType, string> = {
  PLAYER: 'Player', SPONSOR: 'Sponsor', AD_HOC: 'Ad Hoc',
};

const CATEGORY_LABELS: Record<PaymentCategory, string> = {
  TOURNAMENT_FEE: 'Tournament Fee',
  ANNUAL_SUBSCRIPTION: 'Annual Subscription',
  SPONSORSHIP: 'Sponsorship',
  AD_HOC: 'Ad Hoc',
};

const TYPE_COLORS: Record<PaymentType, 'primary' | 'secondary' | 'warning'> = {
  PLAYER: 'primary', SPONSOR: 'secondary', AD_HOC: 'warning',
};

const fmt = (v: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const empty: Payment = {
  paymentType: 'PLAYER',
  paymentDate: new Date().toISOString().split('T')[0],
  amount: 0,
};

// ── component ─────────────────────────────────────────────────────────────

export const Payments: React.FC = () => {
  const [rows, setRows] = useState<Payment[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [dialogClub, setDialogClub] = useState<Club | null>(null);

  // filters
  const [filterType, setFilterType] = useState<PaymentType | ''>('');
  const [filterPlayer, setFilterPlayer] = useState<Player | null>(null);
  const [filterSponsor, setFilterSponsor] = useState<Sponsor | null>(null);
  const [filterTournament, setFilterTournament] = useState<Tournament | null>(null);
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');

  // dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payment>(empty);
  const [uploading, setUploading] = useState(false);
  const [snack, setSnack] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () =>
    paymentApi.findAll({
      playerId: filterPlayer?.playerId,
      sponsorId: filterSponsor?.sponsorId,
      tournamentId: filterTournament?.tournamentId,
      paymentType: filterType || undefined,
      year: filterYear || undefined,
      month: filterMonth || undefined,
    }).then(setRows);

  useEffect(() => {
    playerApi.findAll().then(setPlayers);
    clubApi.findAll().then(setClubs);
    sponsorApi.findAll().then(setSponsors);
    tournamentApi.findAll().then(setTournaments);
  }, []);

  useEffect(() => { load(); }, [filterType, filterPlayer, filterSponsor, filterTournament, filterYear, filterMonth]);

  const set = (patch: Partial<Payment>) => setEditing(e => ({ ...e, ...patch }));

  const save = async () => {
    if (editing.paymentId) { await paymentApi.update(editing.paymentId, editing); }
    else { await paymentApi.create(editing); }
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (confirm('Delete this payment record?')) { await paymentApi.delete(id); load(); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      set({ proofOfPaymentUrl: url });
      setSnack('Proof of payment uploaded.');
    } catch {
      setSnack('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openCreate = () => { setEditing(empty); setDialogClub(null); setOpen(true); };
  const openEdit = (p: Payment) => {
    // Pre-select the club when editing so the player list is already filtered
    const club = clubs.find(c => c.clubId === players.find(pl => pl.playerId === p.playerId)?.homeClubId) ?? null;
    setDialogClub(club);
    setEditing(p);
    setOpen(true);
  };

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  // ── filter helpers
  const selectedPlayerObj = players.find(p => p.playerId === editing.playerId) ?? null;
  const selectedSponsorObj = sponsors.find(s => s.sponsorId === editing.sponsorId) ?? null;
  const selectedTournamentObj = tournaments.find(t => t.tournamentId === editing.tournamentId) ?? null;

  const showPlayerField = editing.paymentType === 'PLAYER';
  const showSponsorField = editing.paymentType === 'SPONSOR';
  const showTournamentField =
    (editing.paymentType === 'PLAYER' && editing.paymentCategory === 'TOURNAMENT_FEE') ||
    (editing.paymentType === 'SPONSOR');
  const showAdHocDescription = editing.paymentType === 'AD_HOC';

  const playerCategories: PaymentCategory[] = ['TOURNAMENT_FEE', 'ANNUAL_SUBSCRIPTION'];

  return (
    <Box>
      {/* ── header ──────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5">Payments</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Print />}
            onClick={() => window.print()}
            sx={{ '@media print': { display: 'none' } }}>
            Print
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Add Payment
          </Button>
        </Box>
      </Box>

      {/* ── filters ─────────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, '@media print': { display: 'none' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
          <FilterAlt fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary">Filters</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filterType}
            onChange={(_, v) => { setFilterType(v ?? ''); setFilterPlayer(null); setFilterSponsor(null); }}
          >
            <ToggleButton value="">All</ToggleButton>
            <ToggleButton value="PLAYER"><Person sx={{ mr: 0.5, fontSize: 16 }} />Player</ToggleButton>
            <ToggleButton value="SPONSOR"><Business sx={{ mr: 0.5, fontSize: 16 }} />Sponsor</ToggleButton>
            <ToggleButton value="AD_HOC"><EmojiEvents sx={{ mr: 0.5, fontSize: 16 }} />Ad Hoc</ToggleButton>
          </ToggleButtonGroup>

          {(filterType === '' || filterType === 'PLAYER') && (
            <Autocomplete
              options={players}
              getOptionLabel={p => `${p.name} ${p.surname}`}
              value={filterPlayer}
              onChange={(_, v) => setFilterPlayer(v)}
              renderInput={params => <TextField {...params} label="Search Player" size="small" />}
              sx={{ minWidth: 220 }}
              clearOnEscape
            />
          )}

          {(filterType === '' || filterType === 'SPONSOR') && (
            <Autocomplete
              options={sponsors}
              getOptionLabel={s => s.name}
              value={filterSponsor}
              onChange={(_, v) => setFilterSponsor(v)}
              renderInput={params => <TextField {...params} label="Search Sponsor" size="small" />}
              sx={{ minWidth: 200 }}
              clearOnEscape
            />
          )}

          <Autocomplete
            options={tournaments}
            getOptionLabel={t => t.name}
            value={filterTournament}
            onChange={(_, v) => setFilterTournament(v)}
            renderInput={params => <TextField {...params} label="Tournament" size="small" />}
            sx={{ minWidth: 220 }}
            clearOnEscape
          />

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select label="Year" value={filterYear}
              onChange={e => setFilterYear(e.target.value as number | '')}>
              <MenuItem value="">All</MenuItem>
              {YEARS.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Month</InputLabel>
            <Select label="Month" value={filterMonth}
              onChange={e => setFilterMonth(e.target.value as number | '')}>
              <MenuItem value="">All</MenuItem>
              {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>

          <Button size="small" onClick={() => {
            setFilterType(''); setFilterPlayer(null); setFilterSponsor(null);
            setFilterTournament(null); setFilterYear(''); setFilterMonth('');
          }}>Clear</Button>
        </Box>
      </Paper>

      {/* ── summary ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Card variant="outlined" sx={{ flex: 1, minWidth: 200 }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" color="text.secondary">Total Amount</Typography>
            <Typography variant="h5" color="primary" fontWeight="bold">{fmt(total)}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, minWidth: 160 }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" color="text.secondary">Payments</Typography>
            <Typography variant="h5" color="text.primary" fontWeight="bold">{rows.length}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* ── table ───────────────────────────────────────────────────────── */}
      <TableContainer component={Paper} id="print-area" sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' } }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Player / Sponsor</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Tournament</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell sx={{ '@media print': { display: 'none' } }}>Proof</TableCell>
              <TableCell sx={{ '@media print': { display: 'none' } }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.paymentId}>
                <TableCell>{r.paymentDate}</TableCell>
                <TableCell>
                  <Chip label={TYPE_LABELS[r.paymentType]} size="small" color={TYPE_COLORS[r.paymentType]} />
                </TableCell>
                <TableCell>
                  {r.playerName || r.sponsorName || '—'}
                </TableCell>
                <TableCell>
                  {r.paymentCategory ? CATEGORY_LABELS[r.paymentCategory] : '—'}
                </TableCell>
                <TableCell>{r.tournamentName ?? '—'}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Tooltip title={r.description ?? ''} placement="top">
                    <span>{r.description ?? '—'}</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right"><strong>{fmt(Number(r.amount))}</strong></TableCell>
                <TableCell sx={{ '@media print': { display: 'none' } }}>
                  {r.proofOfPaymentUrl ? (
                    <Button size="small" variant="text" startIcon={<AttachFile />}
                      onClick={() => paymentApi.openProof(r.proofOfPaymentUrl!).catch(() => setSnack('Could not load proof of payment.'))}>
                      View
                    </Button>
                  ) : '—'}
                </TableCell>
                <TableCell sx={{ '@media print': { display: 'none' } }}>
                  <IconButton size="small" onClick={() => openEdit(r)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.paymentId!)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                  No payments found.
                </TableCell>
              </TableRow>
            )}
            {/* total row */}
            {rows.length > 0 && (
              <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: '2px solid' } }}>
                <TableCell colSpan={6} align="right">Total</TableCell>
                <TableCell align="right">{fmt(total)}</TableCell>
                <TableCell colSpan={2} sx={{ '@media print': { display: 'none' } }} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── add/edit dialog ─────────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.paymentId ? 'Edit' : 'New'} Payment</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>

          {/* Payment type */}
          <TextField select label="Payment Type" value={editing.paymentType}
            onChange={e => {
              if (e.target.value !== 'PLAYER') setDialogClub(null);
              set({ paymentType: e.target.value as PaymentType, paymentCategory: undefined, playerId: undefined, sponsorId: undefined, tournamentId: undefined });
            }}>
            <MenuItem value="PLAYER">Player</MenuItem>
            <MenuItem value="SPONSOR">Sponsor</MenuItem>
            <MenuItem value="AD_HOC">Ad Hoc</MenuItem>
          </TextField>

          {/* Club filter → then Player */}
          {showPlayerField && (
            <>
              <Autocomplete
                options={clubs}
                getOptionLabel={c => c.name}
                value={dialogClub}
                onChange={(_, c) => { setDialogClub(c); set({ playerId: undefined }); }}
                renderInput={params => <TextField {...params} label="Filter by Club" helperText="Select a club to narrow down the player list" />}
                isOptionEqualToValue={(o, v) => o.clubId === v.clubId}
                clearOnEscape
              />
              <Autocomplete
                options={dialogClub
                  ? players.filter(p => p.homeClubId === dialogClub.clubId)
                  : players}
                getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
                value={selectedPlayerObj}
                onChange={(_, v) => set({ playerId: v?.playerId })}
                renderInput={params => (
                  <TextField {...params} label="Player" required
                    helperText={dialogClub
                      ? `${players.filter(p => p.homeClubId === dialogClub.clubId).length} player(s) in ${dialogClub.name}`
                      : `${players.length} players — filter by club above`}
                  />
                )}
                isOptionEqualToValue={(o, v) => o.playerId === v.playerId}
                noOptionsText={dialogClub ? `No players registered under ${dialogClub.name}` : 'No players found'}
              />
            </>
          )}

          {/* Sponsor */}
          {showSponsorField && (
            <Autocomplete
              options={sponsors}
              getOptionLabel={s => s.name}
              value={selectedSponsorObj}
              onChange={(_, v) => set({ sponsorId: v?.sponsorId })}
              renderInput={params => <TextField {...params} label="Sponsor" required />}
              isOptionEqualToValue={(o, v) => o.sponsorId === v.sponsorId}
            />
          )}

          {/* Category */}
          {showPlayerField && (
            <TextField select label="Category" value={editing.paymentCategory ?? ''}
              onChange={e => set({ paymentCategory: e.target.value as PaymentCategory, tournamentId: undefined })}>
              {playerCategories.map(c => (
                <MenuItem key={c} value={c}>{CATEGORY_LABELS[c]}</MenuItem>
              ))}
            </TextField>
          )}
          {showSponsorField && (
            <TextField select label="Category" value={editing.paymentCategory ?? ''}
              onChange={e => set({ paymentCategory: e.target.value as PaymentCategory })}>
              <MenuItem value="SPONSORSHIP">Sponsorship</MenuItem>
            </TextField>
          )}

          {/* Tournament (optional for sponsors, required for tournament fee) */}
          {showTournamentField && (
            <Autocomplete
              options={tournaments}
              getOptionLabel={t => t.name}
              value={selectedTournamentObj}
              onChange={(_, v) => set({ tournamentId: v?.tournamentId })}
              renderInput={params => (
                <TextField {...params} label="Tournament"
                  helperText={editing.paymentType === 'SPONSOR' ? 'Leave blank for once-off sponsorship' : undefined}
                  required={editing.paymentCategory === 'TOURNAMENT_FEE'}
                />
              )}
              isOptionEqualToValue={(o, v) => o.tournamentId === v.tournamentId}
            />
          )}

          <Divider />

          {/* Date + Amount */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Payment Date" type="date" value={editing.paymentDate}
              InputLabelProps={{ shrink: true }}
              onChange={e => set({ paymentDate: e.target.value })}
              fullWidth required />
            <TextField label="Amount (R)" type="number" value={editing.amount}
              inputProps={{ min: 0, step: 0.01 }}
              onChange={e => set({ amount: parseFloat(e.target.value) || 0 })}
              fullWidth required />
          </Box>

          {/* Description */}
          <TextField
            label={showAdHocDescription ? 'Description (required)' : 'Notes / Description'}
            value={editing.description ?? ''}
            multiline rows={showAdHocDescription ? 3 : 2}
            onChange={e => set({ description: e.target.value })}
            required={showAdHocDescription}
          />

          {/* Proof of payment */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Proof of Payment
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<AttachFile />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : 'Upload File'}
              </Button>
              {editing.proofOfPaymentUrl && (
                <Button size="small" variant="text" startIcon={<AttachFile />}
                  onClick={() => paymentApi.openProof(editing.proofOfPaymentUrl!).catch(() => setSnack('Could not load proof of payment.'))}>
                  View current proof
                </Button>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Accepted: images (JPG, PNG) or PDF. Max 10 MB.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')} message={snack} />

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </Box>
  );
};
