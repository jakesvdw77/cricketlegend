import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, TablePagination, Chip, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import { AccountBalanceWallet, AttachFile } from '@mui/icons-material';
import { paymentApi } from '../api/paymentApi';
import { Payment, PaymentStatus, WalletAllocationDTO } from '../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);

const CATEGORY_LABELS: Record<string, string> = {
  ANNUAL_SUBSCRIPTION: 'Annual Subscription',
  OTHER: 'Other',
  AD_HOC: 'Ad Hoc',
  SPONSORSHIP: 'Sponsorship',
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected',
};
const STATUS_COLORS: Record<PaymentStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error',
};

const ALLOCATION_CATEGORY_LABELS: Record<string, string> = {
  ANNUAL_SUBSCRIPTION: 'Annual Subscription',
  MATCH_FEE: 'Match Fee',
  OTHER: 'Other',
};

export const MyWallet: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [allocations, setAllocations] = useState<WalletAllocationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    paymentApi.getWallet()
      .then(w => {
        setBalance(Number(w.balance));
        setTransactions(w.transactions);
        setAllocations(w.allocations ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Balance card */}
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
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>
            My Wallet Balance
          </Typography>
          <Typography variant="h3" fontWeight="bold">
            {fmt(balance)}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Total of all approved payment contributions
          </Typography>
        </Box>
      </Paper>

      {/* Transaction history */}
      <Typography variant="h6" sx={{ mb: 1 }}>Transaction History</Typography>

      {transactions.length === 0 ? (
        <Alert severity="info">
          No wallet transactions yet. All approved payments will appear here once an admin has reviewed them.
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
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Proof</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions
                .slice()
                .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(t => (
                  <TableRow key={t.paymentId}>
                    <TableCell>{t.paymentDate}</TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[t.status ?? 'APPROVED']}
                        size="small"
                        color={STATUS_COLORS[t.status ?? 'APPROVED']}
                      />
                    </TableCell>
                    <TableCell>
                      {CATEGORY_LABELS[t.paymentCategory ?? ''] ?? t.paymentCategory ?? '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={t.description ?? ''}>
                        <span>{t.description ?? '—'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <strong style={{ color: 'green' }}>{fmt(Number(t.amount))}</strong>
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

      {/* ── Allocations (debits) ─────────────────────────────────────────── */}
      {allocations.length > 0 && (
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
    </Box>
  );
};
