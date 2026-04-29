import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, TablePagination, Chip, CircularProgress, Alert,
  Tooltip, Button, Divider, Autocomplete, TextField, Snackbar, MenuItem,
} from '@mui/material';
import { AccountBalanceWallet, AttachFile, Upload, Add } from '@mui/icons-material';
import { paymentApi } from '../api/paymentApi';
import { tournamentApi } from '../api/tournamentApi';
import { Payment, PaymentCategory, PaymentStatus, Tournament, WalletAllocationDTO } from '../types';

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
const STATUS_COLORS: Record<PaymentStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error',
};

export const MyWallet: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [allocations, setAllocations] = useState<WalletAllocationDTO[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () =>
    Promise.all([paymentApi.getWallet(), paymentApi.findMine()])
      .then(([w, mine]) => {
        setBalance(Number(w.balance));
        setAllocations(w.allocations ?? []);
        setTransactions(mine.slice().sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)));
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    tournamentApi.findAll().then(setTournaments);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
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
      load();
    } catch {
      setSnack('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!category && !!amount && Number(amount) > 0 && !!proofUrl &&
    (category !== 'TOURNAMENT_FEE' && category !== 'TOURNAMENT_REGISTRATION' || !!tournament);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>

      {/* ── Balance card + Topup button ──────────────────────────────────── */}
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
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowForm(v => !v)}
          sx={{
            bgcolor: 'rgba(0,0,0,0.35)',
            color: 'inherit',
            border: '1px solid rgba(255,255,255,0.5)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
            whiteSpace: 'nowrap',
          }}
        >
          Topup
        </Button>
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
      <Typography variant="h6" sx={{ mb: 1 }}>Transaction History</Typography>

      {transactions.length === 0 ? (
        <Alert severity="info">
          No payment submissions yet. Use <strong>Topup My Wallet</strong> to upload proof of payment.
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
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Tournament</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Proof</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(t => (
                  <TableRow key={t.paymentId}>
                    <TableCell>{t.paymentDate}</TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[t.status ?? 'PENDING']}
                        size="small"
                        color={STATUS_COLORS[t.status ?? 'PENDING']}
                      />
                    </TableCell>
                    <TableCell>
                      {CATEGORY_LABELS[t.paymentCategory ?? ''] ?? t.paymentCategory ?? '—'}
                    </TableCell>
                    <TableCell>{t.tournamentName ?? '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={t.description ?? ''}>
                        <span>{t.description ?? '—'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <strong style={{ color: t.status === 'APPROVED' ? 'green' : undefined }}>
                        {fmt(Number(t.amount))}
                      </strong>
                    </TableCell>
                    <TableCell>
                      {t.proofOfPaymentUrl ? (
                        <Chip
                          icon={<AttachFile />}
                          label="View"
                          size="small"
                          variant="outlined"
                          clickable
                          onClick={() => paymentApi.openProof(t.proofOfPaymentUrl!)}
                        />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={transactions.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[20, 30, 50]}
          />
        </TableContainer>
      )}
      </>}

      {/* ── Allocated funds ──────────────────────────────────────────────── */}
      {allocations.length > 0 && !showForm && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Allocated Funds</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={{
              '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'error.main', color: 'common.white', fontWeight: 'bold' },
              '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
              '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
            }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount Deducted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allocations
                  .slice()
                  .sort((a, b) => String(b.allocationDate).localeCompare(String(a.allocationDate)))
                  .map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{String(a.allocationDate)}</TableCell>
                      <TableCell>{ALLOCATION_CATEGORY_LABELS[a.category] ?? a.category}</TableCell>
                      <TableCell>{a.description ?? '—'}</TableCell>
                      <TableCell align="right">
                        <strong style={{ color: '#d32f2f' }}>− {fmt(Number(a.amount))}</strong>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
};
