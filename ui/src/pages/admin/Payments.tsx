import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Chip, Divider,
  Autocomplete, Select, FormControl, InputLabel, Snackbar,
  Card, CardContent, ToggleButton, ToggleButtonGroup, Tooltip,
  FormControlLabel, Checkbox, TablePagination, Radio, RadioGroup,
} from '@mui/material';
import {
  Add, Edit, Delete, PictureAsPdf, FilterAlt, AttachFile,
  Person, Business, EmojiEvents, CheckCircle, Cancel, Undo,
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { paymentApi } from '../../api/paymentApi';
import { playerApi } from '../../api/playerApi';
import { sponsorApi } from '../../api/sponsorApi';
import { tournamentApi } from '../../api/tournamentApi';
import { clubApi } from '../../api/clubApi';
import { Payment, PaymentType, PaymentCategory, PaymentStatus, Player, Sponsor, Tournament, Club } from '../../types';
import { useAuth } from '../../hooks/useAuth';

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
  TOURNAMENT_REGISTRATION: 'Tournament Registration',
  ANNUAL_SUBSCRIPTION: 'Annual Subscription',
  SPONSORSHIP: 'Sponsorship',
  AD_HOC: 'Ad Hoc',
  OTHER: 'Other',
};

const TYPE_COLORS: Record<PaymentType, 'primary' | 'secondary' | 'warning'> = {
  PLAYER: 'primary', SPONSOR: 'secondary', AD_HOC: 'warning',
};

const fmt = (v: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected',
};
const STATUS_COLORS: Record<PaymentStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error',
};

const empty: Payment = {
  paymentType: 'PLAYER',
  paymentDate: new Date().toISOString().split('T')[0],
  amount: 0,
  status: 'PENDING',
};

// ── component ─────────────────────────────────────────────────────────────

export const Payments: React.FC = () => {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Payment[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [dialogClub, setDialogClub] = useState<Club | null>(null);

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalElements, setTotalElements] = useState(0);

  // server-computed totals (across all filtered records, not just current page)
  const [subtotal, setSubtotal] = useState(0);
  const [vatTotal, setVatTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  // filters
  const [filterType, setFilterType] = useState<PaymentType | ''>('');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | ''>('');
  const [filterPlayer, setFilterPlayer] = useState<Player | null>(null);
  const [filterSponsor, setFilterSponsor] = useState<Sponsor | null>(null);
  const [filterTournament, setFilterTournament] = useState<Tournament | null>(null);
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');

  // dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payment>(empty);
  const [amountStr, setAmountStr] = useState<string>('0');
  const [uploading, setUploading] = useState(false);
  const [snack, setSnack] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFilters = {
    playerId: filterPlayer?.playerId,
    sponsorId: filterSponsor?.sponsorId,
    tournamentId: filterTournament?.tournamentId,
    paymentType: filterType || undefined,
    status: filterStatus || undefined,
    year: filterYear || undefined,
    month: filterMonth || undefined,
  };

  const load = () =>
    paymentApi.findAll({ ...currentFilters, page, size: rowsPerPage }).then(res => {
      setRows(res.content);
      setTotalElements(res.totalElements);
      setSubtotal(Number(res.subtotal));
      setVatTotal(Number(res.vatTotal));
      setGrandTotal(Number(res.grandTotal));
    });

  useEffect(() => {
    playerApi.findAll().then(setPlayers);
    clubApi.findAll().then(setClubs);
    sponsorApi.findAll().then(setSponsors);
    tournamentApi.findAll().then(setTournaments);
  }, []);

  useEffect(() => { load(); }, [page, rowsPerPage, filterType, filterStatus, filterPlayer, filterSponsor, filterTournament, filterYear, filterMonth]);



  // Approval confirmation dialog
  const [approveTarget, setApproveTarget] = useState<Payment | null>(null);

  const confirmApprove = async () => {
    if (!approveTarget) return;
    const updated = { ...approveTarget, status: 'APPROVED' as PaymentStatus };
    await paymentApi.update(approveTarget.paymentId!, updated);
    setRows(prev => prev.map(r => r.paymentId === approveTarget.paymentId ? updated : r));
    setApproveTarget(null);
    setSnack('Payment approved.');
  };

  // Rejection dialog
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const openReject = (r: Payment) => { setRejectTarget(r); setRejectReason(''); };
  const confirmReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    const updated = { ...rejectTarget, status: 'REJECTED' as PaymentStatus, rejectionReason: rejectReason.trim() };
    await paymentApi.update(rejectTarget.paymentId!, updated);
    setRows(prev => prev.map(r => r.paymentId === rejectTarget.paymentId ? updated : r));
    setRejectTarget(null);
    setSnack('Payment rejected.');
  };

  // Reversal dialog
  const [reversalTarget, setReversalTarget] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  const openReversal = (r: Payment) => { setReversalTarget(r); setReversalReason(''); };
  const confirmReversal = async () => {
    if (!reversalTarget || !reversalReason.trim()) return;
    const updated = { ...reversalTarget, status: 'PENDING' as PaymentStatus, rejectionReason: undefined, description: reversalReason.trim() + (reversalTarget.description ? `\n\n[Previous note] ${reversalTarget.description}` : '') };
    await paymentApi.update(reversalTarget.paymentId!, updated);
    setRows(prev => prev.map(r => r.paymentId === reversalTarget.paymentId ? updated : r));
    setReversalTarget(null);
    setSnack('Payment reversed to pending.');
  };

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

  const openCreate = () => { setEditing(empty); setAmountStr('0'); setDialogClub(null); setOpen(true); };
  const openEdit = (p: Payment) => {
    // Pre-select the club when editing so the player list is already filtered
    const club = clubs.find(c => c.clubId === players.find(pl => pl.playerId === p.playerId)?.homeClubId) ?? null;
    setDialogClub(club);
    setEditing(p);
    setAmountStr(String(p.amount ?? 0));
    setOpen(true);
  };

  const VAT_RATE = 0.15;

  // ── filter helpers
  const selectedPlayerObj = players.find(p => p.playerId === editing.playerId) ?? null;
  const selectedSponsorObj = sponsors.find(s => s.sponsorId === editing.sponsorId) ?? null;
  const selectedTournamentObj = tournaments.find(t => t.tournamentId === editing.tournamentId) ?? null;

  const showPlayerField = editing.paymentType === 'PLAYER';
  const showSponsorField = editing.paymentType === 'SPONSOR';
  const showTournamentField =
    (editing.paymentType === 'PLAYER' && (editing.paymentCategory === 'TOURNAMENT_FEE' || editing.paymentCategory === 'TOURNAMENT_REGISTRATION')) ||
    (editing.paymentType === 'SPONSOR');
  const showAdHocDescription = editing.paymentType === 'AD_HOC';

  const playerCategories: PaymentCategory[] = ['TOURNAMENT_FEE', 'TOURNAMENT_REGISTRATION', 'ANNUAL_SUBSCRIPTION', 'OTHER'];

  const generatePdf = async () => {
    // Fetch all filtered records (not just current page) for the PDF
    const allData = await paymentApi.findAll({ ...currentFilters, page: 0, size: 100000 });
    const allRows = allData.content;
    const pdfSubtotal = Number(allData.subtotal);
    const pdfVatTotal = Number(allData.vatTotal);
    const pdfGrandTotal = Number(allData.grandTotal);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleString('en-ZA');

    // ── Header ──────────────────────────────────────────────────────────────
    doc.setFillColor(26, 82, 118);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Cricket Legend', 14, 10);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Payments Report', 14, 17);
    doc.setFontSize(9);
    doc.text(`Generated: ${now}`, pageW - 14, 17, { align: 'right' });

    // ── Summary boxes ────────────────────────────────────────────────────────
    doc.setTextColor(0, 0, 0);
    const summaryY = 28;
    const boxW = 60;
    const gap = 8;
    const boxes = [
      { label: 'Subtotal', value: fmt(pdfSubtotal) },
      { label: 'VAT (15%)', value: fmt(pdfVatTotal) },
      { label: 'Grand Total (incl. VAT)', value: fmt(pdfGrandTotal) },
      { label: 'Number of Payments', value: String(allData.totalElements) },
    ];
    boxes.forEach((b, i) => {
      const x = 14 + i * (boxW + gap);
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 248, 250);
      doc.roundedRect(x, summaryY, boxW, 18, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(b.label, x + 4, summaryY + 6);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(i === 2 ? 40 : 30, i === 2 ? 130 : 30, i === 2 ? 99 : 30);
      doc.text(b.value, x + 4, summaryY + 14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
    });

    // ── Table ────────────────────────────────────────────────────────────────
    const tableRows = allRows.map(r => [
      r.paymentDate,
      TYPE_LABELS[r.paymentType],
      r.playerName ?? r.sponsorName ?? '—',
      r.paymentCategory ? CATEGORY_LABELS[r.paymentCategory] : '—',
      r.tournamentName ?? '—',
      r.description ?? '—',
      fmt(r.vatInclusive ? Number(r.amount) / 1.15 : Number(r.amount)),
      r.taxable ? fmt(r.vatInclusive ? Number(r.amount) - Number(r.amount) / 1.15 : Number(r.amount) * VAT_RATE) : '—',
      r.vatInclusive ? fmt(Number(r.amount)) : fmt(Number(r.amount) + (r.taxable ? Number(r.amount) * VAT_RATE : 0)),
    ]);

    autoTable(doc, {
      startY: summaryY + 24,
      head: [['Date', 'Type', 'Player / Sponsor', 'Category', 'Tournament', 'Description', 'Amount', 'VAT (15%)', 'Total']],
      body: tableRows,
      foot: [[
        '', '', '', '', '', 'Subtotal', fmt(pdfSubtotal), '', '',
      ], [
        '', '', '', '', '', 'VAT (15%)', '', fmt(pdfVatTotal), '',
      ], [
        '', '', '', '', '', 'Grand Total', '', '', fmt(pdfGrandTotal),
      ]],
      headStyles: { fillColor: [26, 82, 118], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      footStyles: { fillColor: [240, 244, 248], textColor: [50, 50, 50], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right', fontStyle: 'bold' },
      },
      styles: { overflow: 'linebreak', cellPadding: 2 },
      didDrawPage: (_data) => {
        const pg = doc.getCurrentPageInfo().pageNumber;
        const total = (doc.internal as any).pages?.length - 1 || pg;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${pg} of ${total}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
        doc.text('Cricket Legend — Confidential', 14, doc.internal.pageSize.getHeight() - 6);
      },
    });

    doc.save(`payments-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <Box>
      {/* ── header ──────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5">Payments</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={generatePdf}>
            Download PDF
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
            onChange={(_, v) => { setFilterType(v ?? ''); setFilterPlayer(null); setFilterSponsor(null); setPage(0); }}
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
              onChange={(_, v) => { setFilterPlayer(v); setPage(0); }}
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
              onChange={(_, v) => { setFilterSponsor(v); setPage(0); }}
              renderInput={params => <TextField {...params} label="Search Sponsor" size="small" />}
              sx={{ minWidth: 200 }}
              clearOnEscape
            />
          )}

          <Autocomplete
            options={tournaments}
            getOptionLabel={t => t.name}
            value={filterTournament}
            onChange={(_, v) => { setFilterTournament(v); setPage(0); }}
            renderInput={params => <TextField {...params} label="Tournament" size="small" />}
            sx={{ minWidth: 220 }}
            clearOnEscape
          />

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select label="Year" value={filterYear}
              onChange={e => { setFilterYear(e.target.value as number | ''); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {YEARS.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Month</InputLabel>
            <Select label="Month" value={filterMonth}
              onChange={e => { setFilterMonth(e.target.value as number | ''); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value as PaymentStatus | ''); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </Select>
          </FormControl>

          <Button size="small" onClick={() => {
            setFilterType(''); setFilterStatus(''); setFilterPlayer(null); setFilterSponsor(null);
            setFilterTournament(null); setFilterYear(''); setFilterMonth(''); setPage(0);
          }}>Clear</Button>
        </Box>
      </Paper>

      {/* ── summary ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Card variant="outlined" sx={{ flex: 1, minWidth: 160 }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" color="text.secondary">Subtotal</Typography>
            <Typography variant="h5" color="primary" fontWeight="bold">{fmt(subtotal)}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, minWidth: 160 }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" color="text.secondary">VAT (15%)</Typography>
            <Typography variant="h5" color="text.primary" fontWeight="bold">{fmt(vatTotal)}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, minWidth: 160 }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" color="text.secondary">Grand Total (incl. VAT)</Typography>
            <Typography variant="h5" color="secondary" fontWeight="bold">{fmt(grandTotal)}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, minWidth: 120 }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" color="text.secondary">Payments</Typography>
            <Typography variant="h5" color="text.primary" fontWeight="bold">{totalElements}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* ── table ───────────────────────────────────────────────────────── */}
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' } }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Player / Sponsor</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Tournament</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">VAT (15%)</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Proof</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.paymentId}>
                <TableCell>{r.paymentDate}</TableCell>
                <TableCell>
                  <Chip label={STATUS_LABELS[r.status ?? 'PENDING']} size="small" color={STATUS_COLORS[r.status ?? 'PENDING']} />
                </TableCell>
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
                  {r.rejectionReason && (
                    <Tooltip title={`Rejection reason: ${r.rejectionReason}`} placement="top">
                      <Chip label="Reason" size="small" color="error" variant="outlined" sx={{ ml: 0.5, fontSize: 10, height: 18 }} />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell align="right"><strong>{fmt(r.vatInclusive ? Number(r.amount) / 1.15 : Number(r.amount))}</strong></TableCell>
                <TableCell align="right">{r.taxable ? fmt(r.vatInclusive ? Number(r.amount) - Number(r.amount) / 1.15 : Number(r.amount) * VAT_RATE) : '—'}</TableCell>
                <TableCell align="right"><strong>{r.vatInclusive ? fmt(Number(r.amount)) : fmt(Number(r.amount) + (r.taxable ? Number(r.amount) * VAT_RATE : 0))}</strong></TableCell>
                <TableCell>
                  {r.proofOfPaymentUrl ? (
                    <Button size="small" variant="text" startIcon={<AttachFile />}
                      onClick={() => paymentApi.openProof(r.proofOfPaymentUrl!).catch(() => setSnack('Could not load proof of payment.'))}>
                      View
                    </Button>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  {isAdmin && (r.status === 'PENDING' || r.status == null) && (
                    <>
                      <Tooltip title="Approve">
                        <IconButton size="small" color="success" onClick={() => setApproveTarget(r)}><CheckCircle /></IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton size="small" color="error" onClick={() => openReject(r)}><Cancel /></IconButton>
                      </Tooltip>
                    </>
                  )}
                  {isAdmin && r.status === 'REJECTED' && (
                    <Tooltip title="Reverse rejection">
                      <IconButton size="small" color="warning" onClick={() => openReversal(r)}><Undo /></IconButton>
                    </Tooltip>
                  )}
                  <IconButton size="small" onClick={() => openEdit(r)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.paymentId!)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ py: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                  No payments found.
                </TableCell>
              </TableRow>
            )}
            {/* totals rows */}
            {rows.length > 0 && (
              <>
                <TableRow sx={{ '& td': { borderTop: '2px solid' } }}>
                  <TableCell colSpan={7} align="right">Subtotal</TableCell>
                  <TableCell align="right"><strong>{fmt(subtotal)}</strong></TableCell>
                  <TableCell /><TableCell /><TableCell colSpan={2} />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={7} align="right">VAT (15%)</TableCell>
                  <TableCell />
                  <TableCell align="right"><strong>{fmt(vatTotal)}</strong></TableCell>
                  <TableCell /><TableCell colSpan={2} />
                </TableRow>
                <TableRow sx={{ '& td': { fontWeight: 'bold', bgcolor: 'action.hover' } }}>
                  <TableCell colSpan={7} align="right">Grand Total (incl. VAT)</TableCell>
                  <TableCell /><TableCell />
                  <TableCell align="right">{fmt(grandTotal)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalElements}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
      />

      {/* ── add/edit dialog ─────────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing.paymentId ? 'Edit' : 'New'} Payment</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '20px !important' }}>

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
              onChange={e => { set({ paymentCategory: e.target.value as PaymentCategory, tournamentId: undefined, amount: 0, vatInclusive: false }); setAmountStr('0'); }}>
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
              onChange={(_, v) => {
                const patch: Partial<Payment> = { tournamentId: v?.tournamentId };
                if (v) {
                  const fee = editing.paymentCategory === 'TOURNAMENT_REGISTRATION' ? v.registrationFee
                            : editing.paymentCategory === 'TOURNAMENT_FEE' ? v.matchFee
                            : undefined;
                  if (fee != null) { patch.amount = Number(fee); setAmountStr(String(fee)); }
                }
                set(patch);
              }}
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
            <TextField label="Amount (R)" type="number" value={amountStr}
              inputProps={{ min: 0, step: 0.01 }}
              onChange={e => {
                setAmountStr(e.target.value);
                set({ amount: parseFloat(e.target.value) || 0 });
              }}
              fullWidth required />
          </Box>

          {/* VAT */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!editing.taxable}
                  onChange={e => {
                    const checked = e.target.checked;
                    set({ taxable: checked, vatInclusive: checked ? editing.vatInclusive : false });
                  }}
                />
              }
              label="Subject to VAT (15%)"
            />
            {editing.taxable && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, pl: 1 }}>
                <FormControl>
                  <RadioGroup
                    row
                    value={editing.vatInclusive ? 'inclusive' : 'exclusive'}
                    onChange={e => set({ vatInclusive: e.target.value === 'inclusive' })}
                  >
                    <FormControlLabel value="exclusive" control={<Radio size="small" />} label="VAT Exclusive (VAT added on top)" />
                    <FormControlLabel value="inclusive" control={<Radio size="small" />} label="VAT Inclusive (VAT already in amount)" />
                  </RadioGroup>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {editing.vatInclusive
                    ? <>Net: {fmt(editing.amount / 1.15)} &nbsp;|&nbsp; VAT: {fmt(editing.amount - editing.amount / 1.15)} &nbsp;|&nbsp; Total paid: {fmt(editing.amount)}</>
                    : <>VAT: {fmt(editing.amount * VAT_RATE)} &nbsp;|&nbsp; Total incl. VAT: {fmt(editing.amount * (1 + VAT_RATE))}</>
                  }
                </Typography>
              </Box>
            )}
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

      {/* Approval confirmation dialog */}
      <Dialog open={!!approveTarget} onClose={() => setApproveTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Approve Payment</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Please confirm you want to approve the following payment:
          </Typography>
          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Player / Sponsor</Typography>
              <Typography variant="body2" fontWeight="bold">{approveTarget?.playerName ?? approveTarget?.sponsorName ?? '—'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Tournament</Typography>
              <Typography variant="body2">{approveTarget?.tournamentName ?? '—'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Date</Typography>
              <Typography variant="body2">{approveTarget?.paymentDate}</Typography>
            </Box>
            <TextField
              label="Description"
              value={approveTarget?.description ?? ''}
              onChange={e => setApproveTarget(t => t ? { ...t, description: e.target.value } : t)}
              multiline
              rows={2}
              fullWidth
              size="small"
            />
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Amount</Typography>
              <Typography variant="body1" fontWeight="bold" color="success.main">
                {fmt(approveTarget?.vatInclusive ? Number(approveTarget.amount) / 1.15 : Number(approveTarget?.amount ?? 0))}
              </Typography>
            </Box>
            {approveTarget?.taxable && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">{approveTarget.vatInclusive ? 'VAT (15%)' : 'VAT (15%)'}</Typography>
                <Typography variant="body1" fontWeight="bold" color="success.main">{fmt(approveTarget.vatInclusive ? Number(approveTarget.amount) - Number(approveTarget.amount) / 1.15 : Number(approveTarget.amount) * VAT_RATE)}</Typography>
              </Box>
            )}
            {approveTarget?.taxable && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Total</Typography>
                <Typography variant="body1" fontWeight="bold" color="success.main">
                  {fmt(approveTarget.vatInclusive ? Number(approveTarget.amount) : Number(approveTarget.amount) * (1 + VAT_RATE))}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveTarget(null)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={confirmApprove}>
            Confirm Approval
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection dialog */}
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Payment</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a reason for rejecting this payment. The reason will be stored with the record.
          </Typography>
          <TextField
            label="Rejection Reason"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            required
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!rejectReason.trim()} onClick={confirmReject}>
            Reject Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reversal dialog */}
      <Dialog open={!!reversalTarget} onClose={() => setReversalTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reverse Rejection</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a reason for reversing this rejection. The payment will be set back to <strong>Pending</strong>.
          </Typography>
          <TextField
            label="Reason"
            value={reversalReason}
            onChange={e => setReversalReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            required
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReversalTarget(null)}>Cancel</Button>
          <Button variant="contained" color="warning" disabled={!reversalReason.trim()} onClick={confirmReversal}>
            Reverse to Pending
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')} message={snack} />

    </Box>
  );
};
