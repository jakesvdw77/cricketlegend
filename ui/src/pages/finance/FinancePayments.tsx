import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, TextField, MenuItem, Chip, TablePagination, Button,
  Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { FilterList, OpenInNew, CheckCircle, Cancel, Undo } from '@mui/icons-material';
import { financialAdminApi } from '../../api/financialAdminApi';
import { useFinancialAdmin } from '../../hooks/useFinancialAdmin';
import { Payment, PagedPaymentResponse, PaymentStatus, Player } from '../../types';

const STATUS_COLORS: Record<PaymentStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error',
};

export const FinancePayments: React.FC = () => {
  const { clubId, loaded } = useFinancialAdmin();
  const [response, setResponse] = useState<PagedPaymentResponse | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | ''>('');
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [page, setPage] = useState(0);
  const [size] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Proof dialog
  const [proof, setProof] = useState<string | null>(null);

  // Approve dialog
  const [approveTarget, setApproveTarget] = useState<Payment | null>(null);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const load = () => {
    if (!clubId) return;
    financialAdminApi.getMyPayments({
      status: filterStatus || undefined,
      year: filterYear || undefined,
      month: filterMonth || undefined,
      page,
      size,
    }).then(setResponse);
  };

  useEffect(() => { if (loaded && clubId) financialAdminApi.getMyPlayers().then(setPlayers); }, [loaded, clubId]);
  useEffect(() => { load(); }, [clubId, filterStatus, filterYear, filterMonth, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async () => {
    if (!approveTarget) return;
    await financialAdminApi.approvePayment(approveTarget.paymentId!, approveTarget);
    setApproveTarget(null);
    load();
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    await financialAdminApi.rejectPayment(rejectTarget.paymentId!, rejectTarget, rejectReason.trim());
    setRejectTarget(null);
    setRejectReason('');
    load();
  };

  const handleReverseRejection = async (p: Payment) => {
    await financialAdminApi.approvePayment(p.paymentId!, { ...p, rejectionReason: undefined });
    load();
  };

  if (!loaded) return null;
  if (!clubId) return (
    <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
      No club assignment found for your account.
    </Typography>
  );

  const payments = response?.content ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Payments</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: filtersOpen ? 2 : 0 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mr: 'auto' }}>Filters</Typography>
          <Tooltip title={filtersOpen ? 'Collapse' : 'Expand'}>
            <IconButton size="small" onClick={() => setFiltersOpen(o => !o)}><FilterList fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
        {filtersOpen && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField select size="small" label="Status" value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value as PaymentStatus | ''); setPage(0); }}
              sx={{ width: 160 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </TextField>
            <TextField select size="small" label="Year" value={filterYear}
              onChange={e => { setFilterYear(e.target.value === '' ? '' : +e.target.value); setPage(0); }}
              sx={{ width: 120 }}>
              <MenuItem value="">All</MenuItem>
              {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Month" value={filterMonth}
              onChange={e => { setFilterMonth(e.target.value === '' ? '' : +e.target.value); setPage(0); }}
              sx={{ width: 140 }} disabled={!filterYear}>
              <MenuItem value="">All</MenuItem>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
              ))}
            </TextField>
            <Button size="small" onClick={() => { setFilterStatus(''); setFilterYear(''); setFilterMonth(''); setPage(0); }}>
              Clear
            </Button>
          </Box>
        )}
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Player</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Proof</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map(p => (
              <TableRow key={p.paymentId}>
                <TableCell>{p.paymentDate}</TableCell>
                <TableCell>{p.playerName ?? players.find(pl => pl.playerId === p.playerId)?.name ?? '—'}</TableCell>
                <TableCell align="right">R {p.amount?.toFixed(2)}</TableCell>
                <TableCell>
                  {p.status && (
                    <Tooltip title={p.rejectionReason ? `Reason: ${p.rejectionReason}` : ''} disableHoverListener={!p.rejectionReason}>
                      <Chip label={p.status} color={STATUS_COLORS[p.status]} size="small" />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>{p.description}</TableCell>
                <TableCell>
                  {p.proofOfPaymentUrl && (
                    <Tooltip title="View proof">
                      <IconButton size="small" onClick={() => setProof(p.proofOfPaymentUrl!)}>
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {(p.status === 'PENDING' || p.status == null) && (
                    <>
                      <Tooltip title="Approve">
                        <IconButton size="small" color="success" onClick={() => setApproveTarget(p)}>
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton size="small" color="error" onClick={() => { setRejectTarget(p); setRejectReason(''); }}>
                          <Cancel fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {p.status === 'REJECTED' && (
                    <Tooltip title="Reverse rejection">
                      <IconButton size="small" color="warning" onClick={() => handleReverseRejection(p)}>
                        <Undo fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No payments found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={response?.totalElements ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={size}
          rowsPerPageOptions={[size]}
        />
      </TableContainer>

      {/* Proof dialog */}
      <Dialog open={!!proof} onClose={() => setProof(null)} maxWidth="md" fullWidth>
        <DialogTitle>Proof of Payment</DialogTitle>
        <DialogContent>
          {proof && <Box component="img" src={proof} alt="Proof" sx={{ width: '100%', borderRadius: 1 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProof(null)}>Close</Button>
          {proof && (
            <Button component="a" href={proof} target="_blank" rel="noopener" startIcon={<OpenInNew />}>Open</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Approve confirmation dialog */}
      <Dialog open={!!approveTarget} onClose={() => setApproveTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Approve Payment</DialogTitle>
        <DialogContent>
          <Typography>
            Approve payment of <strong>R {approveTarget?.amount?.toFixed(2)}</strong> from{' '}
            <strong>{approveTarget?.playerName}</strong> on {approveTarget?.paymentDate}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveTarget(null)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApprove}>Approve</Button>
        </DialogActions>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Payment</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Reject payment of <strong>R {rejectTarget?.amount?.toFixed(2)}</strong> from{' '}
            <strong>{rejectTarget?.playerName}</strong>?
          </Typography>
          <TextField
            label="Rejection reason"
            fullWidth
            multiline
            rows={2}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={!rejectReason.trim()}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
