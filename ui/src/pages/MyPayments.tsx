import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, TablePagination, Chip, Divider, Autocomplete, TextField,
  CircularProgress, Alert, Snackbar, Tooltip,
} from '@mui/material';
import { Upload, AttachFile, Add } from '@mui/icons-material';
import { MenuItem } from '@mui/material';
import { paymentApi } from '../api/paymentApi';
import { tournamentApi } from '../api/tournamentApi';
import { Payment, PaymentCategory, PaymentStatus, Tournament } from '../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected',
};
const STATUS_COLORS: Record<PaymentStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error',
};

export const MyPayments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [snack, setSnack] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Form state
  const [category, setCategory] = useState<PaymentCategory | ''>('');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () =>
    paymentApi.findMine()
      .then(setPayments)
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
      setSnack('Payment submitted successfully. It is now pending admin approval.');
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
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>My Payments</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setShowForm(v => !v)}>
          Submit Payment
        </Button>
      </Box>

      {/* ── Submission form ───────────────────────────────────────────────── */}
      {showForm && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Submit Proof of Payment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select the tournament you are paying for, enter the amount, upload your proof of payment,
            and submit. Your payment will be marked as <strong>Pending</strong> until an admin reviews it.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Payment Category"
              value={category}
              onChange={e => { setCategory(e.target.value as PaymentCategory); setTournament(null); }}
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
                onChange={(_, v) => setTournament(v)}
                renderInput={params => <TextField {...params} label="Tournament" required />}
                isOptionEqualToValue={(o, v) => o.tournamentId === v.tournamentId}
              />
            )}

            <TextField
              label="Amount (R)"
              type="number"
              value={amount}
              inputProps={{ min: 0, step: 0.01 }}
              onChange={e => setAmount(parseFloat(e.target.value) || '')}
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

      {/* ── Payment history ───────────────────────────────────────────────── */}
      {payments.length === 0 ? (
        <Alert severity="info">
          You have no payment submissions yet. Use the <strong>Submit Payment</strong> button to upload proof of payment for a tournament.
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
              {payments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(p => (
                <TableRow key={p.paymentId}>
                  <TableCell>{p.paymentDate}</TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[p.status ?? 'PENDING']}
                      size="small"
                      color={STATUS_COLORS[p.status ?? 'PENDING']}
                    />
                  </TableCell>
                  <TableCell>{p.paymentCategory ? p.paymentCategory.replace('_', ' ') : '—'}</TableCell>
                  <TableCell>{p.tournamentName ?? '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={p.description ?? ''}>
                      <span>{p.description ?? '—'}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right"><strong>{fmt(Number(p.amount))}</strong></TableCell>
                  <TableCell>
                    {p.proofOfPaymentUrl ? (
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<AttachFile />}
                        onClick={() => paymentApi.openProof(p.proofOfPaymentUrl!).catch(() => setSnack('Could not load proof.'))}
                      >
                        View
                      </Button>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={payments.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[20, 30, 50]}
          />
        </TableContainer>
      )}

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
};
