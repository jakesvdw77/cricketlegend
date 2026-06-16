import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, TablePagination, Chip, CircularProgress, Alert,
  Tooltip, Button, Divider, Autocomplete, TextField, Snackbar, MenuItem,
  IconButton, Popover, FormGroup, Checkbox, FormControlLabel, useMediaQuery, useTheme,
  Collapse,
} from '@mui/material';
import { AccountBalanceWallet, AttachFile, Upload, Add, ViewColumn, FilterList, ArrowBack, ExpandMore, ExpandLess } from '@mui/icons-material';
import { DetailSection, DetailGrid, DetailField } from '../components/admin/DetailView';
import { paymentApi } from '../api/paymentApi';
import { tournamentApi } from '../api/tournamentApi';
import { Payment, PaymentCategory, PaymentStatus, Tournament, WalletAllocationDTO, PagedPaymentResponse, PagedAllocationResponse } from '../types';
import { ProofViewerDialog } from '../components/ProofViewerDialog';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);

const CATEGORY_LABELS: Record<string, string> = {
  TOURNAMENT_FEE: 'Tournament Fee',
  TOURNAMENT_REGISTRATION: 'Tournament Registration',
  ANNUAL_SUBSCRIPTION: 'Annual Subscription',
  OTHER: 'Other',
  AD_HOC: 'Ad Hoc',
  SPONSORSHIP: 'Sponsorship',
};

const ALLOCATION_CATEGORY_LABELS: Record<string, string> = {
  ANNUAL_SUBSCRIPTION: 'Annual Subscription',
  MATCH_FEE: 'Match Fee',
  TOURNAMENT_FEE: 'Tournament Fee',
  TOURNAMENT_REGISTRATION: 'Tournament Registration',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected',
};

type TxColKey = 'date' | 'status' | 'category' | 'tournament' | 'description' | 'amount' | 'proof';
const TX_COLUMNS: { key: TxColKey; label: string }[] = [
  { key: 'date',        label: 'Date' },
  { key: 'status',      label: 'Status' },
  { key: 'category',    label: 'Category' },
  { key: 'tournament',  label: 'Tournament' },
  { key: 'description', label: 'Description' },
  { key: 'amount',      label: 'Amount' },
  { key: 'proof',       label: 'Proof' },
];
const TX_DEFAULT_VISIBLE  = new Set<TxColKey>(['date', 'status', 'category', 'tournament', 'description', 'amount', 'proof']);
const TX_MOBILE_VISIBLE   = new Set<TxColKey>(['date', 'category', 'amount', 'status']);

type AllocColKey = 'date' | 'category' | 'description' | 'amount';
const ALLOC_COLUMNS: { key: AllocColKey; label: string }[] = [
  { key: 'date',        label: 'Date' },
  { key: 'category',    label: 'Category' },
  { key: 'description', label: 'Description' },
  { key: 'amount',      label: 'Amount Deducted' },
];
const ALLOC_DEFAULT_VISIBLE = new Set<AllocColKey>(['date', 'category', 'description', 'amount']);
const ALLOC_MOBILE_VISIBLE  = new Set<AllocColKey>(['date', 'category', 'amount']);
const STATUS_COLORS: Record<PaymentStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error',
};

export const MyWallet: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const [balance, setBalance] = useState<number>(0);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  // Transaction table state
  const [txData, setTxData]         = useState<PagedPaymentResponse | null>(null);
  const [txLoading, setTxLoading]   = useState(true);
  const [txPage, setTxPage]         = useState(0);
  const [txPageSize, setTxPageSize] = useState(20);
  const [txSectionOpen, setTxSectionOpen]     = useState(true);
  const [allocSectionOpen, setAllocSectionOpen] = useState(false);
  const [txFiltersOpen, setTxFiltersOpen] = useState(!isMobile);
  const [txYear, setTxYear]         = useState<number | ''>('');
  const [txMonth, setTxMonth]       = useState<number | ''>('');
  const [txStatus, setTxStatus]     = useState<string>('');
  const [txCategory, setTxCategory] = useState<string>('');

  // Allocation table state
  const [allocData, setAllocData]         = useState<PagedAllocationResponse | null>(null);
  const [allocLoading, setAllocLoading]   = useState(true);
  const [allocPage, setAllocPage]         = useState(0);
  const [allocPageSize, setAllocPageSize] = useState(20);
  const [allocFiltersOpen, setAllocFiltersOpen] = useState(!isMobile);
  const [allocYear, setAllocYear]         = useState<number | ''>('');
  const [allocMonth, setAllocMonth]       = useState<number | ''>('');
  const [allocCategory, setAllocCategory] = useState<string>('');

  // Top-up form state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<PaymentCategory | ''>('');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [snack, setSnack] = useState('');
  const [proofViewUrl, setProofViewUrl] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [viewItem, setViewItem] = useState<Payment | null>(null);

  const [txVisibleCols, setTxVisibleCols]       = useState<Set<TxColKey>>(new Set(isMobile ? TX_MOBILE_VISIBLE   : TX_DEFAULT_VISIBLE));
  const [txColAnchor, setTxColAnchor]           = useState<HTMLButtonElement | null>(null);
  const [allocVisibleCols, setAllocVisibleCols] = useState<Set<AllocColKey>>(new Set(isMobile ? ALLOC_MOBILE_VISIBLE : ALLOC_DEFAULT_VISIBLE));
  const [allocColAnchor, setAllocColAnchor]     = useState<HTMLButtonElement | null>(null);

  const toggleTxCol = (key: TxColKey) => setTxVisibleCols(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleAllocCol = (key: AllocColKey) => setAllocVisibleCols(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const txCol    = (key: TxColKey)    => isMobile ? TX_MOBILE_VISIBLE.has(key)    : txVisibleCols.has(key);
  const allocCol = (key: AllocColKey) => isMobile ? ALLOC_MOBILE_VISIBLE.has(key) : allocVisibleCols.has(key);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBalance = () =>
    paymentApi.getWallet()
      .then(w => setBalance(Number(w.balance)))
      .finally(() => setLoading(false));

  type TxOvr = { page?: number; size?: number; year?: number | ''; month?: number | ''; status?: string; category?: string };
  const loadTx = (ovr: TxOvr = {}) => {
    const year     = 'year'     in ovr ? ovr.year     : txYear;
    const month    = 'month'    in ovr ? ovr.month    : txMonth;
    const status   = 'status'   in ovr ? ovr.status   : txStatus;
    const category = 'category' in ovr ? ovr.category : txCategory;
    const page     = ovr.page  ?? txPage;
    const size     = ovr.size  ?? txPageSize;
    setTxLoading(true);
    paymentApi.findMinePaged({
      status:          (status   as string) || undefined,
      paymentCategory: (category as string) || undefined,
      year:            (year     as number) || undefined,
      month:           (month    as number) || undefined,
      page, size,
    }).then(setTxData).finally(() => setTxLoading(false));
  };

  type AllocOvr = { page?: number; size?: number; year?: number | ''; month?: number | ''; category?: string };
  const loadAlloc = (ovr: AllocOvr = {}) => {
    const year     = 'year'     in ovr ? ovr.year     : allocYear;
    const month    = 'month'    in ovr ? ovr.month    : allocMonth;
    const category = 'category' in ovr ? ovr.category : allocCategory;
    const page     = ovr.page  ?? allocPage;
    const size     = ovr.size  ?? allocPageSize;
    setAllocLoading(true);
    paymentApi.findMyAllocations({
      category: (category as string) || undefined,
      year:     (year     as number) || undefined,
      month:    (month    as number) || undefined,
      page, size,
    }).then(setAllocData).finally(() => setAllocLoading(false));
  };

  useEffect(() => {
    loadBalance();
    loadTx({ page: 0, size: txPageSize });
    loadAlloc({ page: 0, size: allocPageSize });
    tournamentApi.findAll().then(setTournaments);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadProofFile(formData);
      setProofUrl(url);
      setSnack('Proof of payment uploaded.');
    } catch {
      setSnack('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!category || !amount || !proofUrl) return;
    setSubmitting(true);
    try {
      await paymentApi.submitProof({
        tournamentId: tournament?.tournamentId,
        paymentCategory: category,
        amount: Number(amount),
        description: description || undefined,
        proofOfPaymentUrl: proofUrl,
      });
      setSnack('Payment submitted. It is pending admin approval.');
      setShowForm(false);
      setCategory('');
      setTournament(null);
      setAmount('');
      setDescription('');
      setProofUrl('');
      loadBalance();
      loadTx({ page: 0 });
    } catch {
      setSnack('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!category && !!amount && Number(amount) > 0 && !!proofUrl &&
    (category !== 'TOURNAMENT_FEE' && category !== 'TOURNAMENT_REGISTRATION' || !!tournament);

  if (viewing && viewItem) {
    return (
      <Box sx={{ maxWidth: 600 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => setViewing(false)} />
          <Typography variant="h6" sx={{ flex: 1 }}>Payment Detail</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight="bold" sx={{ color: viewItem.status === 'APPROVED' ? 'success.main' : 'text.primary' }}>
                {fmt(Number(viewItem.amount))}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {CATEGORY_LABELS[viewItem.paymentCategory ?? ''] ?? viewItem.paymentCategory ?? '—'}
              </Typography>
            </Box>
            <Chip
              label={STATUS_LABELS[viewItem.status ?? 'PENDING']}
              color={STATUS_COLORS[viewItem.status ?? 'PENDING']}
            />
          </Paper>

          <DetailSection title="Payment Details">
            <DetailGrid>
              <DetailField label="Date" value={viewItem.paymentDate} />
              <DetailField label="Category" value={CATEGORY_LABELS[viewItem.paymentCategory ?? ''] ?? viewItem.paymentCategory} />
              <DetailField label="Tournament" value={viewItem.tournamentName} />
              <DetailField label="Description" value={viewItem.description} />
            </DetailGrid>
          </DetailSection>

          {viewItem.rejectionReason && (
            <DetailSection title="Rejection">
              <DetailField label="Reason" value={viewItem.rejectionReason} />
            </DetailSection>
          )}

          {viewItem.proofOfPaymentUrl && (
            <DetailSection title="Proof of Payment">
              <Button
                variant="outlined"
                size="small"
                startIcon={<AttachFile />}
                onClick={() => setProofViewUrl(viewItem.proofOfPaymentUrl!)}
              >
                View Proof
              </Button>
            </DetailSection>
          )}
        </Box>
        <ProofViewerDialog open={!!proofViewUrl} proofUrl={proofViewUrl} onClose={() => setProofViewUrl(null)} />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>My Wallet</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setShowForm(v => !v)}>
          Topup
        </Button>
      </Box>

      {/* ── Balance card ─────────────────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          p: 3, mb: 4, display: 'flex', alignItems: 'center', gap: 3,
          background: theme => `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          color: 'primary.contrastText',
          borderRadius: 2,
        }}
      >
        <AccountBalanceWallet sx={{ fontSize: 56, opacity: 0.85 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>
            My Wallet Balance
          </Typography>
          <Typography variant="h3" fontWeight="bold">
            {fmt(balance)}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Total of all approved payment contributions minus allocations
          </Typography>
        </Box>
      </Paper>

      {/* ── Top-up form ──────────────────────────────────────────────────── */}
      {showForm && (
        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Submit Proof of Payment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a category, enter the amount, upload your proof of payment and submit.
            Your payment will be marked as <strong>Pending</strong> until an admin reviews it.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Payment Category"
              value={category}
              onChange={e => { setCategory(e.target.value as PaymentCategory); setTournament(null); setAmount(''); }}
              required
            >
              <MenuItem value="TOURNAMENT_FEE">Tournament Fee</MenuItem>
              <MenuItem value="TOURNAMENT_REGISTRATION">Tournament Registration</MenuItem>
              <MenuItem value="ANNUAL_SUBSCRIPTION">Annual Subscription</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </TextField>

            {(category === 'TOURNAMENT_FEE' || category === 'TOURNAMENT_REGISTRATION') && (
              <Autocomplete
                options={tournaments}
                getOptionLabel={t => t.name}
                value={tournament}
                onChange={(_, v) => {
                    setTournament(v);
                    if (v) {
                      const fee = category === 'TOURNAMENT_REGISTRATION' ? v.registrationFee : v.matchFee;
                      if (fee != null) setAmount(String(fee));
                    }
                  }}
                renderInput={params => <TextField {...params} label="Tournament" required />}
                isOptionEqualToValue={(o, v) => o.tournamentId === v.tournamentId}
              />
            )}

            <TextField
              label="Amount (R)"
              type="number"
              value={amount}
              inputProps={{ min: 0, step: 0.01 }}
              onChange={e => setAmount(e.target.value)}
              required
            />

            <TextField
              label="Description / Reference (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              multiline
              rows={2}
            />

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Proof of Payment <span style={{ color: 'red' }}>*</span>
              </Typography>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,application/pdf"
                onChange={handleUpload}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={uploading ? <CircularProgress size={14} /> : <Upload />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : 'Upload File'}
                </Button>
                {proofUrl && (
                  <Chip
                    icon={<AttachFile />}
                    label="Proof uploaded"
                    color="success"
                    size="small"
                    onDelete={() => setProofUrl('')}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Accepted: images (JPG, PNG) or PDF. Max 10 MB.
              </Typography>
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {submitting ? 'Submitting…' : 'Submit Payment'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* ── Transaction history ──────────────────────────────────────────── */}
      {!showForm && <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ mr: 'auto', cursor: 'pointer' }} onClick={() => setTxSectionOpen(o => !o)}>
          Transaction History
        </Typography>
        <Tooltip title={txFiltersOpen ? 'Collapse filters' : 'Expand filters'}>
          <IconButton onClick={() => setTxFiltersOpen(o => !o)}><FilterList /></IconButton>
        </Tooltip>
        <Tooltip title="Toggle columns">
          <IconButton onClick={e => setTxColAnchor(e.currentTarget)}><ViewColumn /></IconButton>
        </Tooltip>
        <Tooltip title={txSectionOpen ? 'Collapse' : 'Expand'}>
          <IconButton onClick={() => setTxSectionOpen(o => !o)}>
            {txSectionOpen ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Tooltip>
      </Box>
      <Collapse in={txSectionOpen}>

      {txFiltersOpen && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField select size="small" label="Year" value={txYear} sx={{ minWidth: 100 }}
              onChange={e => { const v = e.target.value === '' ? '' : Number(e.target.value); setTxYear(v); setTxPage(0); loadTx({ year: v, page: 0 }); }}>
              <MenuItem value="">All</MenuItem>
              {YEARS.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Month" value={txMonth} sx={{ minWidth: 130 }}
              onChange={e => { const v = e.target.value === '' ? '' : Number(e.target.value); setTxMonth(v); setTxPage(0); loadTx({ month: v, page: 0 }); }}>
              <MenuItem value="">All</MenuItem>
              {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Status" value={txStatus} sx={{ minWidth: 130 }}
              onChange={e => { setTxStatus(e.target.value); setTxPage(0); loadTx({ status: e.target.value, page: 0 }); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </TextField>
            <TextField select size="small" label="Category" value={txCategory} sx={{ minWidth: 180 }}
              onChange={e => { setTxCategory(e.target.value); setTxPage(0); loadTx({ category: e.target.value, page: 0 }); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="TOURNAMENT_FEE">Tournament Fee</MenuItem>
              <MenuItem value="TOURNAMENT_REGISTRATION">Tournament Registration</MenuItem>
              <MenuItem value="ANNUAL_SUBSCRIPTION">Annual Subscription</MenuItem>
              <MenuItem value="AD_HOC">Ad Hoc</MenuItem>
              <MenuItem value="SPONSORSHIP">Sponsorship</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </TextField>
          </Box>
        </Paper>
      )}

      <Popover
        open={!!txColAnchor}
        anchorEl={txColAnchor}
        onClose={() => setTxColAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Visible Columns</Typography>
          <FormGroup>
            {TX_COLUMNS.map(c => (
              <FormControlLabel
                key={c.key}
                label={c.label}
                control={<Checkbox size="small" checked={txVisibleCols.has(c.key)} onChange={() => toggleTxCol(c.key)} />}
              />
            ))}
          </FormGroup>
        </Box>
      </Popover>

      {txLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : !txData || txData.totalElements === 0 ? (
        <Alert severity="info">
          No payment submissions yet. Use <strong>Topup</strong> to upload proof of payment.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" sx={{
            '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
            '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
            '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
          }}>
            <TableHead>
              <TableRow>
                {txCol('date')        && <TableCell>Date</TableCell>}
                {txCol('status')      && <TableCell>Status</TableCell>}
                {txCol('category')    && <TableCell>Category</TableCell>}
                {txCol('tournament')  && <TableCell>Tournament</TableCell>}
                {txCol('description') && <TableCell>Description</TableCell>}
                {txCol('amount')      && <TableCell align="right">Amount</TableCell>}
                {txCol('proof')       && <TableCell>Proof</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {(txData.content as Payment[]).map(t => (
                <TableRow key={t.paymentId}>
                  {txCol('date')        && <TableCell>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => { setViewItem(t); setViewing(true); }}
                    >
                      {t.paymentDate}
                    </Typography>
                  </TableCell>}
                  {txCol('status')      && <TableCell>
                    <Chip label={STATUS_LABELS[t.status ?? 'PENDING']} size="small" color={STATUS_COLORS[t.status ?? 'PENDING']} />
                  </TableCell>}
                  {txCol('category')    && <TableCell>{CATEGORY_LABELS[t.paymentCategory ?? ''] ?? t.paymentCategory ?? '—'}</TableCell>}
                  {txCol('tournament')  && <TableCell>{t.tournamentName ?? '—'}</TableCell>}
                  {txCol('description') && <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={t.description ?? ''}><span>{t.description ?? '—'}</span></Tooltip>
                  </TableCell>}
                  {txCol('amount')      && <TableCell align="right">
                    <strong style={{ color: t.status === 'APPROVED' ? 'green' : undefined }}>{fmt(Number(t.amount))}</strong>
                  </TableCell>}
                  {txCol('proof')       && <TableCell>
                    {t.proofOfPaymentUrl ? (
                      <Chip icon={<AttachFile />} label="View" size="small" variant="outlined" clickable onClick={() => setProofViewUrl(t.proofOfPaymentUrl!)} />
                    ) : '—'}
                  </TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={txData.totalElements}
            page={txPage}
            onPageChange={(_, newPage) => { setTxPage(newPage); loadTx({ page: newPage }); }}
            rowsPerPage={txPageSize}
            onRowsPerPageChange={e => { const s = parseInt(e.target.value, 10); setTxPageSize(s); setTxPage(0); loadTx({ page: 0, size: s }); }}
            rowsPerPageOptions={[20, 30, 50]}
          />
        </TableContainer>
      )}
      </Collapse>
      </>}

      {/* ── Allocated funds ──────────────────────────────────────────────── */}
      {!showForm && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 4, mb: 1 }}>
            <Typography variant="h6" sx={{ mr: 'auto', cursor: 'pointer' }} onClick={() => setAllocSectionOpen(o => !o)}>
              Allocated Funds
            </Typography>
            <Tooltip title={allocFiltersOpen ? 'Collapse filters' : 'Expand filters'}>
              <IconButton onClick={() => setAllocFiltersOpen(o => !o)}><FilterList /></IconButton>
            </Tooltip>
            <Tooltip title="Toggle columns">
              <IconButton onClick={e => setAllocColAnchor(e.currentTarget)}><ViewColumn /></IconButton>
            </Tooltip>
            <Tooltip title={allocSectionOpen ? 'Collapse' : 'Expand'}>
              <IconButton onClick={() => setAllocSectionOpen(o => !o)}>
                {allocSectionOpen ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Tooltip>
          </Box>
          <Collapse in={allocSectionOpen}>

          {allocFiltersOpen && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField select size="small" label="Year" value={allocYear} sx={{ minWidth: 100 }}
                  onChange={e => { const v = e.target.value === '' ? '' : Number(e.target.value); setAllocYear(v); setAllocPage(0); loadAlloc({ year: v, page: 0 }); }}>
                  <MenuItem value="">All</MenuItem>
                  {YEARS.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Month" value={allocMonth} sx={{ minWidth: 130 }}
                  onChange={e => { const v = e.target.value === '' ? '' : Number(e.target.value); setAllocMonth(v); setAllocPage(0); loadAlloc({ month: v, page: 0 }); }}>
                  <MenuItem value="">All</MenuItem>
                  {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Category" value={allocCategory} sx={{ minWidth: 200 }}
                  onChange={e => { setAllocCategory(e.target.value); setAllocPage(0); loadAlloc({ category: e.target.value, page: 0 }); }}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="ANNUAL_SUBSCRIPTION">Annual Subscription</MenuItem>
                  <MenuItem value="MATCH_FEE">Match Fee</MenuItem>
                  <MenuItem value="TOURNAMENT_FEE">Tournament Fee</MenuItem>
                  <MenuItem value="TOURNAMENT_REGISTRATION">Tournament Registration</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </TextField>
              </Box>
            </Paper>
          )}

          <Popover
            open={!!allocColAnchor}
            anchorEl={allocColAnchor}
            onClose={() => setAllocColAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Visible Columns</Typography>
              <FormGroup>
                {ALLOC_COLUMNS.map(c => (
                  <FormControlLabel
                    key={c.key}
                    label={c.label}
                    control={<Checkbox size="small" checked={allocVisibleCols.has(c.key)} onChange={() => toggleAllocCol(c.key)} />}
                  />
                ))}
              </FormGroup>
            </Box>
          </Popover>

          {allocLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : !allocData || allocData.totalElements === 0 ? (
            <Alert severity="info">No allocations found.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" sx={{
                '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'error.main', color: 'common.white', fontWeight: 'bold' },
                '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
                '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
              }}>
                <TableHead>
                  <TableRow>
                    {allocCol('date')        && <TableCell>Date</TableCell>}
                    {allocCol('category')    && <TableCell>Category</TableCell>}
                    {allocCol('description') && <TableCell>Description</TableCell>}
                    {allocCol('amount')      && <TableCell align="right">Amount Deducted</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(allocData.content as WalletAllocationDTO[]).map(a => (
                    <TableRow key={a.id}>
                      {allocCol('date')        && <TableCell>{String(a.allocationDate)}</TableCell>}
                      {allocCol('category')    && <TableCell>{ALLOCATION_CATEGORY_LABELS[a.category] ?? a.category}</TableCell>}
                      {allocCol('description') && <TableCell>{a.description ?? '—'}</TableCell>}
                      {allocCol('amount')      && <TableCell align="right">
                        <strong style={{ color: '#d32f2f' }}>− {fmt(Number(a.amount))}</strong>
                      </TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={allocData.totalElements}
                page={allocPage}
                onPageChange={(_, newPage) => { setAllocPage(newPage); loadAlloc({ page: newPage }); }}
                rowsPerPage={allocPageSize}
                onRowsPerPageChange={e => { const s = parseInt(e.target.value, 10); setAllocPageSize(s); setAllocPage(0); loadAlloc({ page: 0, size: s }); }}
                rowsPerPageOptions={[20, 30, 50]}
              />
            </TableContainer>
          )}
          </Collapse>
        </>
      )}

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} />
      <ProofViewerDialog open={!!proofViewUrl} proofUrl={proofViewUrl} onClose={() => setProofViewUrl(null)} />
    </Box>
  );
};
