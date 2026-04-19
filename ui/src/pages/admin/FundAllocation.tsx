import React, { useEffect, useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Box, Typography, Tabs, Tab, Paper, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  CircularProgress, Alert, Chip, Button, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider, Snackbar,
  ToggleButton, ToggleButtonGroup, Autocomplete, FormControlLabel, Checkbox, FormGroup,
  InputAdornment, Pagination,
} from '@mui/material';
import {
  Subscriptions, SportsScore, Category, CheckCircle, Warning,
  AccountBalanceWallet, ReceiptLong, Search, EmojiEvents, PictureAsPdf,
} from '@mui/icons-material';
import { clubApi } from '../../api/clubApi';
import { playerApi } from '../../api/playerApi';
import { paymentApi } from '../../api/paymentApi';
import { matchApi } from '../../api/matchApi';
import { tournamentApi } from '../../api/tournamentApi';
import {
  Club, Player, Payment, PaymentStatus, AllocationResultDTO,
  Match, MatchSide, MatchFeePlayerDataDTO, Tournament, TournamentFeePlayerDataDTO,
  WalletAllocationDTO,
} from '../../types';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected',
};
const STATUS_COLORS: Record<PaymentStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error',
};

// ── Tab panel ─────────────────────────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index}>
    {value === index && children}
  </Box>
);

// ── Annual Subscription tab ───────────────────────────────────────────────────

const AnnualSubscriptionTab: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [walletBalances, setWalletBalances] = useState<Record<number, number>>({});
  const [allocationTotals, setAllocationTotals] = useState<Record<number, number>>({});
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [allocatingPlayerId, setAllocatingPlayerId] = useState<number | null>(null);
  const [amountDialog, setAmountDialog] = useState<{ playerId: number; playerName: string; walletBalance: number } | null>(null);
  const [amountInput, setAmountInput] = useState<string>('');
  const [yearInput, setYearInput] = useState<number>(new Date().getFullYear());
  const [result, setResult] = useState<AllocationResultDTO | null>(null);
  const [snack, setSnack] = useState('');
  const [paymentsDialog, setPaymentsDialog] = useState<{ playerId: number; playerName: string; walletBalance: number; payments: Payment[] } | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Filters
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [searchText, setSearchText] = useState('');
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const load = (clubId?: string) => {
    const cid = clubId ?? selectedClubId;
    setLoading(true);
    const baseRequests: Promise<any>[] = [
      clubApi.findAll(),
      playerApi.findAll(),
      paymentApi.findAll({ paymentType: 'PLAYER', size: 100000 }),
    ];
    const walletRequest = cid
      ? paymentApi.getClubWalletBalances(parseInt(cid, 10))
      : Promise.resolve({});
    const allocRequest = cid
      ? paymentApi.getClubAllocationTotals(parseInt(cid, 10))
      : Promise.resolve({});

    Promise.all([...baseRequests, walletRequest, allocRequest]).then(([c, p, pmts, balances, allocs]) => {
      setClubs(c.slice().sort((a: Club, b: Club) => a.name.localeCompare(b.name)));
      setPlayers(p);
      setPayments(pmts.content.filter((pm: Payment) => pm.paymentCategory === 'ANNUAL_SUBSCRIPTION'));
      setWalletBalances(balances);
      setAllocationTotals(allocs);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filteredPlayers = useMemo(() => {
    if (!selectedClubId) return [];
    let result = players
      .filter(p => String(p.homeClubId) === selectedClubId)
      .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(p => `${p.name} ${p.surname}`.toLowerCase().includes(q));
    }

    if (paidFilter !== 'all') {
      result = result.filter(p => {
        const pmts = payments.filter(pm => pm.playerId === p.playerId && pm.status === 'APPROVED');
        const yearFiltered = filterYear
          ? pmts.filter(pm => new Date(pm.paymentDate).getFullYear() === filterYear)
          : pmts;
        const hasPaid = yearFiltered.length > 0;
        return paidFilter === 'paid' ? hasPaid : !hasPaid;
      });
    }

    return result;
  }, [players, selectedClubId, searchText, paidFilter, payments, filterYear]);

  const paymentByPlayer = useMemo(() => {
    const map = new Map<number, Payment[]>();
    payments.forEach(p => {
      if (!p.playerId) return;
      if (!map.has(p.playerId)) map.set(p.playerId, []);
      map.get(p.playerId)!.push(p);
    });
    return map;
  }, [payments]);

  const filteredPaymentByPlayer = useMemo(() => {
    if (!filterYear) return paymentByPlayer;
    const map = new Map<number, Payment[]>();
    paymentByPlayer.forEach((pmts, pid) => {
      const yearPmts = pmts.filter(pm => new Date(pm.paymentDate).getFullYear() === filterYear);
      if (yearPmts.length > 0) map.set(pid, yearPmts);
    });
    return map;
  }, [paymentByPlayer, filterYear]);

  const totals = useMemo(() => {
    const totalAllocated = filteredPlayers.reduce((sum, pl) => {
      return sum + Number(allocationTotals[pl.playerId!] ?? 0);
    }, 0);
    return { totalAllocated };
  }, [filteredPlayers, allocationTotals]);

  const handleAllocatePlayer = (playerId: number, playerName: string) => {
    const balance = Number(walletBalances[playerId] ?? 0);
    setAmountInput('');
    setYearInput(new Date().getFullYear());
    setAmountDialog({ playerId, playerName, walletBalance: balance });
  };

  const handleConfirmAllocate = async () => {
    if (!amountDialog) return;
    const amount = parseFloat(amountInput);
    if (!amount || amount <= 0) return;
    setAmountDialog(null);
    setAllocatingPlayerId(amountDialog.playerId);
    try {
      const res = await paymentApi.allocatePlayerAnnualSubscription(amountDialog.playerId, amount, yearInput);
      if (res.allocated.length > 0) {
        setSnack(`Allocated ${fmt(Number(res.allocated[0].amount))} for ${amountDialog.playerName}.`);
        load(selectedClubId);
      } else if (res.skipped.length > 0) {
        setSnack(`Skipped: ${res.skipped[0].reason}.`);
      }
    } finally {
      setAllocatingPlayerId(null);
    }
  };

  const handleViewPayments = async (playerId: number, playerName: string, walletBalance: number) => {
    setPaymentsLoading(true);
    try {
      const res = await paymentApi.findAll({ playerId, size: 100000 });
      const sorted = res.content.slice().sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
      setPaymentsDialog({ playerId, playerName, walletBalance, payments: sorted });
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleSelectPayment = (payment: Payment) => {
    if (!paymentsDialog) return;
    setAmountInput(String(payment.amount));
    setYearInput(new Date().getFullYear());
    setAmountDialog({ playerId: paymentsDialog.playerId, playerName: paymentsDialog.playerName, walletBalance: paymentsDialog.walletBalance });
    setPaymentsDialog(null);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      {/* Club filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField
          select
          label="Filter by Club"
          value={selectedClubId}
          onChange={e => {
            const val = e.target.value;
            setSelectedClubId(val);
            if (val) {
              const cid = parseInt(val, 10);
              Promise.all([
                paymentApi.getClubWalletBalances(cid),
                paymentApi.getClubAllocationTotals(cid),
              ]).then(([balances, allocs]) => {
                setWalletBalances(balances);
                setAllocationTotals(allocs);
              });
            } else {
              setWalletBalances({});
              setAllocationTotals({});
            }
          }}
          sx={{ minWidth: 220 }}
          size="small"
        >
          <MenuItem value="">— Select a club —</MenuItem>
          {clubs.map(c => (
            <MenuItem key={c.clubId} value={String(c.clubId)}>{c.name}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Filter by Year"
          value={filterYear}
          onChange={e => setFilterYear(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ minWidth: 130 }}
          size="small"
        >
          <MenuItem value="">All years</MenuItem>
          {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>

        <TextField
          label="Search player"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          }}
        />

        <ToggleButtonGroup
          exclusive
          size="small"
          value={paidFilter}
          onChange={(_, v) => { if (v !== null) setPaidFilter(v); }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="paid">Paid</ToggleButton>
          <ToggleButton value="unpaid">Not Paid</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {!selectedClubId ? (
        <Alert severity="info">Select a club to view its players and annual subscription status.</Alert>
      ) : filteredPlayers.length === 0 ? (
        <Alert severity="warning">No players match the current filters.</Alert>
      ) : (
        <>
          {/* Summary chips */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={`Players: ${filteredPlayers.length}`} variant="outlined" />
            <Chip label={`Total Allocated: ${fmt(totals.totalAllocated)}`} color="primary" />
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={{
              '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
              '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
              '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
            }}>
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell align="center">Payments{filterYear ? ` (${filterYear})` : ''}</TableCell>
                  <TableCell align="center">Latest Status</TableCell>
                  <TableCell align="right">Wallet Balance</TableCell>
                  <TableCell align="right">Total Allocated</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPlayers.map(player => {
                  const pmts = filteredPaymentByPlayer.get(player.playerId!) ?? [];
                  const latest = pmts.slice().sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0];

                  return (
                    <TableRow key={player.playerId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {player.name} {player.surname}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {pmts.length > 0 ? pmts.length : <Chip label="None" size="small" variant="outlined" />}
                      </TableCell>
                      <TableCell align="center">
                        {latest ? (
                          <Chip
                            label={STATUS_LABELS[latest.status ?? 'PENDING']}
                            size="small"
                            color={STATUS_COLORS[latest.status ?? 'PENDING']}
                          />
                        ) : (
                          <Chip label="No payment" size="small" color="default" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {(() => {
                          const bal = Number(walletBalances[player.playerId!] ?? 0);
                          return (
                            <strong style={{ color: bal > 0 ? 'green' : bal < 0 ? '#d32f2f' : undefined }}>
                              {fmt(bal)}
                            </strong>
                          );
                        })()}
                      </TableCell>
                      <TableCell align="right">
                        {(() => {
                          const allocated = Number(allocationTotals[player.playerId!] ?? 0);
                          return allocated > 0
                            ? <strong style={{ color: '#1565c0' }}>{fmt(allocated)}</strong>
                            : <Typography variant="body2" color="text.secondary">—</Typography>;
                        })()}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View payments">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleViewPayments(player.playerId!, `${player.name} ${player.surname}`, Number(walletBalances[player.playerId!] ?? 0))}
                              disabled={paymentsLoading}
                            >
                              <ReceiptLong fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {Number(walletBalances[player.playerId!] ?? 0) > 0 && (
                          <Tooltip title="Allocate funds for this player">
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                disabled={allocatingPlayerId === player.playerId}
                                onClick={() => handleAllocatePlayer(player.playerId!, `${player.name} ${player.surname}`)}
                              >
                                {allocatingPlayerId === player.playerId
                                  ? <CircularProgress size={16} />
                                  : <AccountBalanceWallet fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} />

      {/* ── Player payments dialog ───────────────────────────────────────── */}
      <Dialog open={!!paymentsDialog} onClose={() => setPaymentsDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>Payments — {paymentsDialog?.playerName}</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {paymentsDialog && paymentsDialog.payments.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="info">No payments found for this player.</Alert>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' } }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Use</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentsDialog?.payments.map(p => (
                    <TableRow key={p.paymentId} sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}>
                      <TableCell>{p.paymentDate}</TableCell>
                      <TableCell>{p.paymentCategory?.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{p.description ?? '—'}</TableCell>
                      <TableCell align="right"><strong>{fmt(Number(p.amount))}</strong></TableCell>
                      <TableCell align="center">
                        <Chip
                          label={STATUS_LABELS[p.status ?? 'PENDING']}
                          size="small"
                          color={STATUS_COLORS[p.status ?? 'PENDING']}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button size="small" variant="outlined" onClick={() => handleSelectPayment(p)}>
                          Use
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setPaymentsDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Amount dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!amountDialog} onClose={() => setAmountDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Allocate Funds — {amountDialog?.playerName}</DialogTitle>
        <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Available wallet balance: <strong>{fmt(amountDialog?.walletBalance ?? 0)}</strong>
          </Typography>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Subscription Year
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={yearInput}
              onChange={(_, v) => { if (v !== null) setYearInput(v); }}
            >
              <ToggleButton value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</ToggleButton>
              <ToggleButton value={new Date().getFullYear()}>{new Date().getFullYear()}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <TextField
            label="Amount to Allocate (R)"
            type="number"
            fullWidth
            autoFocus
            value={amountInput}
            inputProps={{ min: 0.01, max: amountDialog?.walletBalance, step: 0.01 }}
            onChange={e => setAmountInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirmAllocate(); }}
            error={!!amountInput && (parseFloat(amountInput) <= 0 || parseFloat(amountInput) > (amountDialog?.walletBalance ?? 0))}
            helperText={
              !!amountInput && parseFloat(amountInput) > (amountDialog?.walletBalance ?? 0)
                ? 'Amount exceeds available wallet balance'
                : undefined
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAmountDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmAllocate}
            disabled={!amountInput || parseFloat(amountInput) <= 0 || parseFloat(amountInput) > (amountDialog?.walletBalance ?? 0)}
          >
            Allocate
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Result dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!result} onClose={() => setResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Allocation Complete</DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          {result && (
            <Box>
              {result.allocated.length > 0 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircle color="success" fontSize="small" />
                    <Typography fontWeight="bold" color="success.main">
                      Successfully Allocated ({result.allocated.length})
                    </Typography>
                  </Box>
                  <List dense disablePadding sx={{ mb: 2 }}>
                    {result.allocated.map(a => (
                      <ListItem key={a.playerId} disablePadding sx={{ py: 0.25 }}>
                        <ListItemText
                          primary={a.playerName}
                          secondary={fmt(Number(a.amount))}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ color: 'success.main', fontWeight: 'bold' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
              {result.skipped.length > 0 && (
                <>
                  {result.allocated.length > 0 && <Divider sx={{ mb: 2 }} />}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Warning color="warning" fontSize="small" />
                    <Typography fontWeight="bold" color="warning.main">
                      Skipped ({result.skipped.length})
                    </Typography>
                  </Box>
                  <List dense disablePadding>
                    {result.skipped.map(s => (
                      <ListItem key={s.playerId} disablePadding sx={{ py: 0.25 }}>
                        <ListItemText
                          primary={s.playerName}
                          secondary={
                            s.reason === 'Insufficient wallet funds'
                              ? `${s.reason} — Balance: ${fmt(Number(s.walletBalance))}, Required: ${fmt(Number(s.required))}`
                              : s.reason
                          }
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
              {result.allocated.length === 0 && result.skipped.length === 0 && (
                <Alert severity="info">No players with pending subscription allocations were found.</Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setResult(null)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── Match Fees tab ────────────────────────────────────────────────────────────

const MatchFeesTab: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [sides, setSides] = useState<MatchSide[]>([]);
  const [selectedSideIds, setSelectedSideIds] = useState<number[]>([]);
  const [players, setPlayers] = useState<MatchFeePlayerDataDTO[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingSides, setLoadingSides] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [allocatingPlayerId, setAllocatingPlayerId] = useState<number | null>(null);
  const [amountDialog, setAmountDialog] = useState<{ player: MatchFeePlayerDataDTO } | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [paymentsDialog, setPaymentsDialog] = useState<{ player: MatchFeePlayerDataDTO; payments: Payment[] } | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [snack, setSnack] = useState('');
  const [showUnallocatedOnly, setShowUnallocatedOnly] = useState(false);

  useEffect(() => {
    matchApi.findAll()
      .then(all => setMatches(all.slice().sort((a, b) =>
        (b.matchDate ?? '').localeCompare(a.matchDate ?? ''))))
      .finally(() => setLoadingMatches(false));
  }, []);

  const handleMatchSelect = async (match: Match | null) => {
    setSelectedMatch(match);
    setSelectedTournament(null);
    setSides([]);
    setSelectedSideIds([]);
    setPlayers([]);
    if (!match?.matchId) return;
    setLoadingSides(true);
    try {
      const [s, tournament] = await Promise.all([
        matchApi.getTeamSheet(match.matchId),
        match.tournamentId ? tournamentApi.findById(match.tournamentId) : Promise.resolve(null),
      ]);
      setSides(s);
      setSelectedSideIds(s.map(side => side.matchSideId!).filter(Boolean) as number[]);
      setSelectedTournament(tournament);
    } finally {
      setLoadingSides(false);
    }
  };

  const toggleSide = (id: number) =>
    setSelectedSideIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handleLoadPlayers = async () => {
    if (!selectedMatch?.matchId || selectedSideIds.length === 0) return;
    setLoadingPlayers(true);
    try {
      const data = await paymentApi.getMatchFeePlayerData(selectedMatch.matchId, selectedSideIds);
      setPlayers(data);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleAllocate = (player: MatchFeePlayerDataDTO) => {
    const matchFee = selectedTournament?.matchFee ?? 0;
    const remaining = Math.max(0, matchFee - Number(player.matchFeeAllocated));
    setAmountInput(remaining > 0 ? String(remaining) : '');
    setAmountDialog({ player });
  };

  const handleConfirmAllocate = async () => {
    if (!amountDialog || !selectedMatch?.matchId) return;
    const amount = parseFloat(amountInput);
    if (!amount || amount <= 0) return;
    const { player } = amountDialog;
    setAmountDialog(null);
    setAllocatingPlayerId(player.playerId);
    const matchLabel = `${selectedMatch.homeTeamName} vs ${selectedMatch.oppositionTeamName} (${selectedMatch.matchDate})`;
    try {
      const res = await paymentApi.allocatePlayerMatchFee(
        player.playerId, amount, selectedMatch.matchId!, `Match fee - ${matchLabel}`,
        selectedTournament?.matchFee ?? undefined
      );
      if (res.allocated.length > 0) {
        setSnack(`Allocated ${fmt(amount)} for ${player.playerName}.`);
        handleLoadPlayers();
      } else if (res.skipped.length > 0) {
        setSnack(`Skipped: ${res.skipped[0].reason}.`);
      }
    } finally {
      setAllocatingPlayerId(null);
    }
  };

  const handleViewPayments = async (player: MatchFeePlayerDataDTO) => {
    setPaymentsLoading(true);
    try {
      const res = await paymentApi.findAll({ playerId: player.playerId, size: 100000 });
      setPaymentsDialog({ player, payments: res.content.slice().sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)) });
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleSelectPayment = (_payment: Payment) => {
    if (!paymentsDialog) return;
    const matchFee = selectedTournament?.matchFee ?? 0;
    const alreadyAllocated = Number(paymentsDialog.player.matchFeeAllocated ?? 0);
    const remaining = Math.max(0, matchFee - alreadyAllocated);
    setAmountInput(remaining > 0 ? String(remaining) : '');
    setAmountDialog({ player: paymentsDialog.player });
    setPaymentsDialog(null);
  };

  const groupedPlayers = useMemo(() => {
    const matchFee = selectedTournament?.matchFee ?? 0;
    const map = new Map<string, MatchFeePlayerDataDTO[]>();
    players
      .filter(p => !showUnallocatedOnly || Number(p.matchFeeAllocated) < matchFee)
      .forEach(p => {
        if (!map.has(p.teamName)) map.set(p.teamName, []);
        map.get(p.teamName)!.push(p);
      });
    return map;
  }, [players, showUnallocatedOnly, selectedTournament]);

  const unallocatedCount = useMemo(() => {
    const matchFee = selectedTournament?.matchFee ?? 0;
    return players.filter(p => Number(p.matchFeeAllocated) < matchFee).length;
  }, [players, selectedTournament]);

  return (
    <Box>
      {/* Match selector */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Autocomplete
          options={matches}
          loading={loadingMatches}
          getOptionLabel={m => `${m.homeTeamName} vs ${m.oppositionTeamName}${m.matchDate ? ` — ${m.matchDate}` : ''}${m.tournamentName ? ` (${m.tournamentName})` : ''}`}
          value={selectedMatch}
          onChange={(_, v) => handleMatchSelect(v)}
          isOptionEqualToValue={(a, b) => a.matchId === b.matchId}
          renderInput={params => <TextField {...params} label="Select Match" size="small" />}
          sx={{ minWidth: 380 }}
        />

        {sides.length > 0 && (
          <FormGroup row sx={{ gap: 1 }}>
            {sides.map(side => (
              <FormControlLabel
                key={side.matchSideId}
                control={
                  <Checkbox
                    size="small"
                    checked={selectedSideIds.includes(side.matchSideId!)}
                    onChange={() => toggleSide(side.matchSideId!)}
                  />
                }
                label={side.teamName ?? `Side ${side.matchSideId}`}
              />
            ))}
          </FormGroup>
        )}

        {sides.length > 0 && (
          <Button
            variant="contained"
            size="small"
            startIcon={loadingPlayers ? <CircularProgress size={14} color="inherit" /> : <Search />}
            onClick={handleLoadPlayers}
            disabled={loadingPlayers || selectedSideIds.length === 0}
          >
            Load Players
          </Button>
        )}

        {loadingSides && <CircularProgress size={20} />}
      </Box>

      {!selectedMatch && (
        <Alert severity="info">Select a match to load the match day squad for fee allocation.</Alert>
      )}

      {selectedMatch && sides.length === 0 && !loadingSides && (
        <Alert severity="warning">No team sheets found for this match. Record the playing XI first.</Alert>
      )}

      {/* Players table */}
      {players.length > 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip label={`Players: ${players.length}`} variant="outlined" />
            {unallocatedCount > 0 && (
              <Chip label={`Unallocated: ${unallocatedCount}`} color="warning" variant="outlined" />
            )}
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={showUnallocatedOnly}
                  onChange={e => setShowUnallocatedOnly(e.target.checked)}
                />
              }
              label={<Typography variant="body2">Show unallocated only</Typography>}
            />
          </Box>

          {Array.from(groupedPlayers.entries()).map(([teamName, teamPlayers]) => (
            <Box key={teamName} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'primary.main' }}>
                {teamName}
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" sx={{
                  '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
                  '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
                  '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Player</TableCell>
                      <TableCell align="right">Wallet Balance</TableCell>
                      <TableCell align="right">Tournament Payments</TableCell>
                      <TableCell align="right">Allocated (this match)</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teamPlayers.map(player => (
                      <TableRow key={player.playerId}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">{player.playerName}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <strong style={{ color: player.walletBalance > 0 ? 'green' : player.walletBalance < 0 ? '#d32f2f' : undefined }}>
                            {fmt(Number(player.walletBalance))}
                          </strong>
                        </TableCell>
                        <TableCell align="right">
                          {player.tournamentPaymentCount > 0 ? (
                            <Box>
                              <strong style={{ color: 'green' }}>{fmt(Number(player.tournamentPaymentTotal))}</strong>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {player.tournamentPaymentCount} payment{player.tournamentPaymentCount !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {Number(player.matchFeeAllocated) > 0
                            ? <strong style={{ color: '#1565c0' }}>{fmt(Number(player.matchFeeAllocated))}</strong>
                            : <Typography variant="body2" color="text.secondary">—</Typography>}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View payments">
                            <span>
                              <IconButton size="small" onClick={() => handleViewPayments(player)} disabled={paymentsLoading}>
                                <ReceiptLong fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {Number(player.walletBalance) > 0 && (
                            <Tooltip title="Allocate match fee">
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  disabled={allocatingPlayerId === player.playerId}
                                  onClick={() => handleAllocate(player)}
                                >
                                  {allocatingPlayerId === player.playerId
                                    ? <CircularProgress size={16} />
                                    : <AccountBalanceWallet fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </>
      )}

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} />

      {/* Player payments dialog */}
      <Dialog open={!!paymentsDialog} onClose={() => setPaymentsDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>Payments — {paymentsDialog?.player.playerName}</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {paymentsDialog?.payments.length === 0 ? (
            <Box sx={{ p: 3 }}><Alert severity="info">No payments found.</Alert></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' } }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Tournament</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Use</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentsDialog?.payments.map(p => (
                    <TableRow key={p.paymentId} sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}>
                      <TableCell>{p.paymentDate}</TableCell>
                      <TableCell>{p.paymentCategory?.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{p.tournamentName ?? '—'}</TableCell>
                      <TableCell>{p.description ?? '—'}</TableCell>
                      <TableCell align="right"><strong>{fmt(Number(p.amount))}</strong></TableCell>
                      <TableCell align="center">
                        <Chip label={STATUS_LABELS[p.status ?? 'PENDING']} size="small" color={STATUS_COLORS[p.status ?? 'PENDING']} />
                      </TableCell>
                      <TableCell align="center">
                        <Button size="small" variant="outlined" onClick={() => handleSelectPayment(p)}>Use</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setPaymentsDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Amount dialog */}
      {(() => {
        const matchFee = selectedTournament?.matchFee ?? 0;
        const alreadyAllocated = Number(amountDialog?.player.matchFeeAllocated ?? 0);
        const remainingFee = Math.max(0, matchFee - alreadyAllocated);
        const walletBalance = Number(amountDialog?.player.walletBalance ?? 0);
        const maxAllowable = Math.min(walletBalance, remainingFee);
        const enteredAmount = parseFloat(amountInput);
        const exceedsWallet = !!amountInput && enteredAmount > walletBalance;
        const exceedsFee = !!amountInput && enteredAmount > remainingFee;
        const hasError = !!amountInput && (enteredAmount <= 0 || exceedsWallet || exceedsFee);
        const errorText = exceedsFee
          ? `Amount exceeds remaining match fee (${fmt(remainingFee)})`
          : exceedsWallet
            ? 'Amount exceeds available wallet balance'
            : undefined;

        return (
          <Dialog open={!!amountDialog} onClose={() => setAmountDialog(null)} maxWidth="xs" fullWidth>
            <DialogTitle>Allocate Match Fee — {amountDialog?.player.playerName}</DialogTitle>
            <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Wallet balance: <strong>{fmt(walletBalance)}</strong>
                </Typography>
                {matchFee > 0 && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Match fee: <strong>{fmt(matchFee)}</strong>
                    </Typography>
                    {alreadyAllocated > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Already allocated: <strong style={{ color: '#1565c0' }}>{fmt(alreadyAllocated)}</strong>
                      </Typography>
                    )}
                    <Typography variant="body2" color={remainingFee === 0 ? 'error' : 'text.secondary'}>
                      Remaining to allocate: <strong>{fmt(remainingFee)}</strong>
                    </Typography>
                  </>
                )}
              </Box>
              <TextField
                label="Amount to Allocate (R)"
                type="number"
                fullWidth
                autoFocus
                value={amountInput}
                inputProps={{ min: 0.01, max: maxAllowable, step: 0.01 }}
                onChange={e => setAmountInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirmAllocate(); }}
                error={hasError}
                helperText={errorText}
                disabled={remainingFee === 0}
              />
              {remainingFee === 0 && (
                <Alert severity="success" sx={{ py: 0.5 }}>Match fee fully allocated for this player.</Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAmountDialog(null)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleConfirmAllocate}
                disabled={!amountInput || enteredAmount <= 0 || hasError || remainingFee === 0}
              >
                Allocate
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}
    </Box>
  );
};

// ── Tournament Fees tab ───────────────────────────────────────────────────────

const TournamentFeesTab: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<TournamentFeePlayerDataDTO[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [allocatingPlayerId, setAllocatingPlayerId] = useState<number | null>(null);
  const [amountDialog, setAmountDialog] = useState<{ player: TournamentFeePlayerDataDTO } | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [paymentsDialog, setPaymentsDialog] = useState<{ player: TournamentFeePlayerDataDTO; payments: Payment[] } | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [snack, setSnack] = useState('');
  const [showUnallocatedOnly, setShowUnallocatedOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');

  useEffect(() => {
    tournamentApi.findAll()
      .then(all => setTournaments(all.slice().sort((a: Tournament, b: Tournament) =>
        (b.startDate ?? '').localeCompare(a.startDate ?? ''))))
      .finally(() => setLoadingTournaments(false));
  }, []);

  const handleTournamentSelect = (t: Tournament | null) => {
    setSelectedTournament(t);
    setPlayers([]);
    setSearchText('');
    setSelectedTeamId('');
  };

  const handleLoadPlayers = async () => {
    if (!selectedTournament?.tournamentId) return;
    setLoadingPlayers(true);
    try {
      const data = await paymentApi.getTournamentFeePlayerData(selectedTournament.tournamentId);
      setPlayers(data);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleAllocate = (player: TournamentFeePlayerDataDTO) => {
    const regFee = selectedTournament?.registrationFee ?? 0;
    const remaining = Math.max(0, regFee - Number(player.tournamentFeeAllocated));
    setAmountInput(remaining > 0 ? String(remaining) : '');
    setAmountDialog({ player });
  };

  const handleConfirmAllocate = async () => {
    if (!amountDialog || !selectedTournament?.tournamentId) return;
    const amount = parseFloat(amountInput);
    if (!amount || amount <= 0) return;
    const { player } = amountDialog;
    setAmountDialog(null);
    setAllocatingPlayerId(player.playerId);
    try {
      const res = await paymentApi.allocatePlayerTournamentFee(
        player.playerId, amount, selectedTournament.tournamentId!,
        `Tournament registration fee - ${selectedTournament.name}`,
        selectedTournament.registrationFee ?? undefined
      );
      if (res.allocated.length > 0) {
        setSnack(`Allocated ${fmt(amount)} for ${player.playerName}.`);
        handleLoadPlayers();
      } else if (res.skipped.length > 0) {
        setSnack(`Skipped: ${res.skipped[0].reason}.`);
      }
    } finally {
      setAllocatingPlayerId(null);
    }
  };

  const handleViewPayments = async (player: TournamentFeePlayerDataDTO) => {
    setPaymentsLoading(true);
    try {
      const res = await paymentApi.findAll({ playerId: player.playerId, size: 100000 });
      setPaymentsDialog({ player, payments: res.content.slice().sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)) });
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleSelectPayment = (_payment: Payment) => {
    if (!paymentsDialog) return;
    const regFee = selectedTournament?.registrationFee ?? 0;
    const alreadyAllocated = Number(paymentsDialog.player.tournamentFeeAllocated ?? 0);
    const remaining = Math.max(0, regFee - alreadyAllocated);
    setAmountInput(remaining > 0 ? String(remaining) : '');
    setAmountDialog({ player: paymentsDialog.player });
    setPaymentsDialog(null);
  };

  const registrationFee = selectedTournament?.registrationFee ?? 0;

  // Unique teams from loaded players (sorted by name, unassigned last)
  const teams = useMemo(() => {
    const map = new Map<number, string>();
    players.forEach(p => { if (p.teamId != null && p.teamName) map.set(p.teamId, p.teamName); });
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ id, name }));
  }, [players]);

  const displayedPlayers = useMemo(() => {
    let result = players;
    if (selectedTeamId !== '') {
      result = result.filter(p => p.teamId === selectedTeamId);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(p => p.playerName.toLowerCase().includes(q));
    }
    if (showUnallocatedOnly) {
      result = result.filter(p => Number(p.tournamentFeeAllocated) < registrationFee);
    }
    return result;
  }, [players, selectedTeamId, searchText, showUnallocatedOnly, registrationFee]);

  // Group displayed players by team for rendering
  const groupedPlayers = useMemo(() => {
    const map = new Map<string, TournamentFeePlayerDataDTO[]>();
    displayedPlayers.forEach(p => {
      const key = p.teamName ?? '— No team assigned —';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [displayedPlayers]);

  const unallocatedCount = useMemo(
    () => players.filter(p => Number(p.tournamentFeeAllocated) < registrationFee).length,
    [players, registrationFee]
  );

  return (
    <Box>
      {/* Tournament selector */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Autocomplete
          options={tournaments}
          loading={loadingTournaments}
          getOptionLabel={t => `${t.name}${t.startDate ? ` (${t.startDate})` : ''}`}
          value={selectedTournament}
          onChange={(_, v) => handleTournamentSelect(v)}
          isOptionEqualToValue={(a, b) => a.tournamentId === b.tournamentId}
          renderInput={params => <TextField {...params} label="Select Tournament" size="small" />}
          sx={{ minWidth: 340 }}
        />

        {selectedTournament && (
          <Button
            variant="contained"
            size="small"
            startIcon={loadingPlayers ? <CircularProgress size={14} color="inherit" /> : <Search />}
            onClick={handleLoadPlayers}
            disabled={loadingPlayers}
          >
            Load Players
          </Button>
        )}
      </Box>

      {selectedTournament && registrationFee > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Registration fee for <strong>{selectedTournament.name}</strong>: <strong>{fmt(registrationFee)}</strong> per player
        </Alert>
      )}

      {!selectedTournament && (
        <Alert severity="info">Select a tournament to load player data for fee allocation.</Alert>
      )}

      {/* Players table */}
      {players.length > 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip label={`Players: ${players.length}`} variant="outlined" />
            {unallocatedCount > 0 && (
              <Chip label={`Unallocated: ${unallocatedCount}`} color="warning" variant="outlined" />
            )}

            {teams.length > 0 && (
              <TextField
                select
                label="Filter by Team"
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value === '' ? '' : Number(e.target.value))}
                size="small"
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="">All teams</MenuItem>
                {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </TextField>
            )}

            <TextField
              label="Search player"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={showUnallocatedOnly}
                  onChange={e => setShowUnallocatedOnly(e.target.checked)}
                />
              }
              label={<Typography variant="body2">Show unallocated only</Typography>}
            />
          </Box>

          {Array.from(groupedPlayers.entries()).map(([teamName, teamPlayers]) => (
            <Box key={teamName} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'primary.main' }}>
                {teamName}
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" sx={{
                  '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
                  '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
                  '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Player</TableCell>
                      <TableCell align="right">Wallet Balance</TableCell>
                      <TableCell align="right">Tournament Payments</TableCell>
                      <TableCell align="right">Allocated (this tournament)</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teamPlayers.map(player => (
                      <TableRow key={player.playerId}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">{player.playerName}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <strong style={{ color: Number(player.walletBalance) > 0 ? 'green' : Number(player.walletBalance) < 0 ? '#d32f2f' : undefined }}>
                            {fmt(Number(player.walletBalance))}
                          </strong>
                        </TableCell>
                        <TableCell align="right">
                          {player.tournamentPaymentCount > 0 ? (
                            <Box>
                              <strong style={{ color: 'green' }}>{fmt(Number(player.tournamentPaymentTotal))}</strong>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {player.tournamentPaymentCount} payment{player.tournamentPaymentCount !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {Number(player.tournamentFeeAllocated) > 0
                            ? <strong style={{ color: '#1565c0' }}>{fmt(Number(player.tournamentFeeAllocated))}</strong>
                            : <Typography variant="body2" color="text.secondary">—</Typography>}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View payments">
                            <span>
                              <IconButton size="small" onClick={() => handleViewPayments(player)} disabled={paymentsLoading}>
                                <ReceiptLong fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {Number(player.walletBalance) > 0 && (
                            <Tooltip title="Allocate tournament fee">
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  disabled={allocatingPlayerId === player.playerId}
                                  onClick={() => handleAllocate(player)}
                                >
                                  {allocatingPlayerId === player.playerId
                                    ? <CircularProgress size={16} />
                                    : <AccountBalanceWallet fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </>
      )}

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} />

      {/* Player payments dialog */}
      <Dialog open={!!paymentsDialog} onClose={() => setPaymentsDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>Payments — {paymentsDialog?.player.playerName}</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {paymentsDialog?.payments.length === 0 ? (
            <Box sx={{ p: 3 }}><Alert severity="info">No payments found.</Alert></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' } }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Tournament</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Use</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentsDialog?.payments.map(p => (
                    <TableRow key={p.paymentId} sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}>
                      <TableCell>{p.paymentDate}</TableCell>
                      <TableCell>{p.paymentCategory?.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{p.tournamentName ?? '—'}</TableCell>
                      <TableCell>{p.description ?? '—'}</TableCell>
                      <TableCell align="right"><strong>{fmt(Number(p.amount))}</strong></TableCell>
                      <TableCell align="center">
                        <Chip label={STATUS_LABELS[p.status ?? 'PENDING']} size="small" color={STATUS_COLORS[p.status ?? 'PENDING']} />
                      </TableCell>
                      <TableCell align="center">
                        <Button size="small" variant="outlined" onClick={() => handleSelectPayment(p)}>Use</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setPaymentsDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Amount dialog */}
      {(() => {
        const regFee = selectedTournament?.registrationFee ?? 0;
        const alreadyAllocated = Number(amountDialog?.player.tournamentFeeAllocated ?? 0);
        const remainingFee = Math.max(0, regFee - alreadyAllocated);
        const walletBalance = Number(amountDialog?.player.walletBalance ?? 0);
        const maxAllowable = regFee > 0 ? Math.min(walletBalance, remainingFee) : walletBalance;
        const enteredAmount = parseFloat(amountInput);
        const exceedsWallet = !!amountInput && enteredAmount > walletBalance;
        const exceedsFee = !!amountInput && regFee > 0 && enteredAmount > remainingFee;
        const hasError = !!amountInput && (enteredAmount <= 0 || exceedsWallet || exceedsFee);
        const errorText = exceedsFee
          ? `Amount exceeds remaining registration fee (${fmt(remainingFee)})`
          : exceedsWallet
            ? 'Amount exceeds available wallet balance'
            : undefined;
        const fullyAllocated = regFee > 0 && remainingFee === 0;

        return (
          <Dialog open={!!amountDialog} onClose={() => setAmountDialog(null)} maxWidth="xs" fullWidth>
            <DialogTitle>Allocate Tournament Fee — {amountDialog?.player.playerName}</DialogTitle>
            <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Wallet balance: <strong>{fmt(walletBalance)}</strong>
                </Typography>
                {regFee > 0 && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Registration fee: <strong>{fmt(regFee)}</strong>
                    </Typography>
                    {alreadyAllocated > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Already allocated: <strong style={{ color: '#1565c0' }}>{fmt(alreadyAllocated)}</strong>
                      </Typography>
                    )}
                    <Typography variant="body2" color={fullyAllocated ? 'error' : 'text.secondary'}>
                      Remaining to allocate: <strong>{fmt(remainingFee)}</strong>
                    </Typography>
                  </>
                )}
              </Box>
              <TextField
                label="Amount to Allocate (R)"
                type="number"
                fullWidth
                autoFocus
                value={amountInput}
                inputProps={{ min: 0.01, max: maxAllowable, step: 0.01 }}
                onChange={e => setAmountInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirmAllocate(); }}
                error={hasError}
                helperText={errorText}
                disabled={fullyAllocated}
              />
              {fullyAllocated && (
                <Alert severity="success" sx={{ py: 0.5 }}>Registration fee fully allocated for this player.</Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAmountDialog(null)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleConfirmAllocate}
                disabled={!amountInput || enteredAmount <= 0 || hasError || fullyAllocated}
              >
                Allocate
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}
    </Box>
  );
};

// ── Other tab ─────────────────────────────────────────────────────────────────

const OtherTab: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    playerApi.findAll()
      .then(all => setPlayers(all.slice().sort((a: Player, b: Player) =>
        `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`))))
      .finally(() => setLoading(false));
  }, []);

  const handlePlayerSelect = async (player: Player | null) => {
    setSelectedPlayer(player);
    setWalletBalance(null);
    setAmountInput('');
    if (!player?.playerId || !player.homeClubId) return;
    setLoadingBalance(true);
    try {
      const balances = await paymentApi.getClubWalletBalances(player.homeClubId);
      setWalletBalance(Number(balances[player.playerId] ?? 0));
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedPlayer?.playerId || !description.trim() || !amountInput) return;
    const amount = parseFloat(amountInput);
    if (!amount || amount <= 0) return;
    setAllocating(true);
    try {
      const res = await paymentApi.allocatePlayerOther(selectedPlayer.playerId, amount, description.trim());
      if (res.allocated.length > 0) {
        setSnack(`Allocated ${fmt(amount)} for ${selectedPlayer.name} ${selectedPlayer.surname}.`);
        setAmountInput('');
        setDescription('');
        setSelectedPlayer(null);
        setWalletBalance(null);
      } else if (res.skipped.length > 0) {
        setSnack(`Skipped: ${res.skipped[0].reason}.`);
      }
    } finally {
      setAllocating(false);
    }
  };

  const balance = walletBalance ?? 0;
  const enteredAmount = parseFloat(amountInput);
  const exceedsWallet = !!amountInput && enteredAmount > balance;
  const hasError = !!amountInput && (enteredAmount <= 0 || exceedsWallet);
  const canAllocate = !!selectedPlayer && description.trim().length > 0 && !!amountInput && !hasError && balance > 0;

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Use this section to allocate funds from a player's wallet for any purpose not covered by the other categories. A description is required.
      </Alert>

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 500 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Autocomplete
            options={players}
            getOptionLabel={p => `${p.name} ${p.surname}`}
            value={selectedPlayer}
            onChange={(_, v) => handlePlayerSelect(v)}
            isOptionEqualToValue={(a, b) => a.playerId === b.playerId}
            renderInput={params => <TextField {...params} label="Select Player" size="small" required />}
          />

          {loadingBalance && <CircularProgress size={20} />}

          {selectedPlayer && !loadingBalance && (
            <Typography variant="body2" color="text.secondary">
              Wallet balance:{' '}
              <strong style={{ color: balance > 0 ? 'green' : balance < 0 ? '#d32f2f' : undefined }}>
                {fmt(balance)}
              </strong>
            </Typography>
          )}

          <TextField
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            size="small"
            required
            fullWidth
            placeholder="Enter a description for this allocation"
            error={!!description && description.trim().length === 0}
            helperText={!!description && description.trim().length === 0 ? 'Description is required' : undefined}
          />

          <TextField
            label="Amount to Allocate (R)"
            type="number"
            value={amountInput}
            onChange={e => setAmountInput(e.target.value)}
            size="small"
            fullWidth
            inputProps={{ min: 0.01, step: 0.01 }}
            disabled={!selectedPlayer || balance <= 0}
            error={hasError}
            helperText={
              exceedsWallet
                ? `Amount exceeds available wallet balance (${fmt(balance)})`
                : selectedPlayer && balance <= 0
                  ? 'Player has no available wallet balance'
                  : undefined
            }
            onKeyDown={e => { if (e.key === 'Enter' && canAllocate) handleAllocate(); }}
          />

          <Button
            variant="contained"
            onClick={handleAllocate}
            disabled={!canAllocate || allocating}
            startIcon={allocating ? <CircularProgress size={16} color="inherit" /> : <AccountBalanceWallet />}
          >
            Allocate
          </Button>
        </Box>
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
};

// ── Allocation list ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  ANNUAL_SUBSCRIPTION: 'Annual Subscription',
  MATCH_FEE: 'Match Fee',
  TOURNAMENT_FEE: 'Tournament Fee',
  OTHER: 'Other',
};

const CATEGORY_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning'> = {
  ANNUAL_SUBSCRIPTION: 'primary',
  MATCH_FEE: 'success',
  TOURNAMENT_FEE: 'warning',
  OTHER: 'default',
};

const CATEGORY_OPTIONS = [
  { value: 'ANNUAL_SUBSCRIPTION', label: 'Annual Subscription' },
  { value: 'MATCH_FEE', label: 'Match Fee' },
  { value: 'TOURNAMENT_FEE', label: 'Tournament Fee' },
  { value: 'OTHER', label: 'Other' },
];

const AllocationList: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [rows, setRows] = useState<WalletAllocationDTO[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);

  // Filters
  const [filterClubId, setFilterClubId] = useState<number | ''>('');
  const [filterPlayer, setFilterPlayer] = useState<Player | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const monthOptions = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  useEffect(() => {
    clubApi.findAll().then(c => setClubs(c.slice().sort((a: Club, b: Club) => a.name.localeCompare(b.name))));
    playerApi.findAll().then(p => setAllPlayers(p.slice().sort((a: Player, b: Player) =>
      `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`))));
  }, []);

  // When club changes, clear player if they don't belong to the new club
  const handleClubChange = (clubId: number | '') => {
    setFilterClubId(clubId);
    if (filterPlayer && clubId !== '' && filterPlayer.homeClubId !== clubId) {
      setFilterPlayer(null);
    }
  };

  const playerOptions = useMemo(
    () => filterClubId !== ''
      ? allPlayers.filter(p => p.homeClubId === filterClubId)
      : allPlayers,
    [allPlayers, filterClubId]
  );

  useEffect(() => {
    setPage(0);
  }, [filterClubId, filterPlayer, filterCategory, filterYear, filterMonth, refreshKey]);

  useEffect(() => {
    setLoading(true);
    paymentApi.findAllocations({
      clubId: filterClubId || undefined,
      playerId: filterPlayer?.playerId ?? undefined,
      category: filterCategory || undefined,
      year: filterYear || undefined,
      month: filterMonth || undefined,
      page,
      size: PAGE_SIZE,
    }).then(res => {
      setRows(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    }).finally(() => setLoading(false));
  }, [filterClubId, filterPlayer, filterCategory, filterYear, filterMonth, page, refreshKey]);

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => setPage(value - 1);

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      const allData = await paymentApi.findAllocations({
        clubId: filterClubId || undefined,
        playerId: filterPlayer?.playerId ?? undefined,
        category: filterCategory || undefined,
        year: filterYear || undefined,
        month: filterMonth || undefined,
        page: 0,
        size: 100000,
      });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const now = new Date().toLocaleString('en-ZA');
      const totalAmt = allData.content.reduce((s, r) => s + Number(r.amount), 0);

      // ── Header ──────────────────────────────────────────────────────────
      doc.setFillColor(26, 82, 118);
      doc.rect(0, 0, pageW, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Cricket Legend', 14, 10);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Fund Allocation Report', 14, 17);
      doc.setFontSize(9);
      doc.text(`Generated: ${now}`, pageW - 14, 17, { align: 'right' });

      // ── Summary boxes ────────────────────────────────────────────────────
      doc.setTextColor(0, 0, 0);
      const summaryY = 28;
      const boxW = 70;
      const gap = 8;
      const boxes = [
        { label: 'Total Allocated', value: fmt(totalAmt) },
        { label: 'Number of Allocations', value: String(allData.totalElements) },
        ...(filterClubId ? [{ label: 'Club', value: clubs.find(c => c.clubId === filterClubId)?.name ?? '' }] : []),
        ...(filterPlayer ? [{ label: 'Player', value: `${filterPlayer.name} ${filterPlayer.surname}` }] : []),
        ...(filterCategory ? [{ label: 'Category', value: CATEGORY_LABELS[filterCategory] ?? filterCategory }] : []),
        ...(filterYear ? [{ label: 'Period', value: filterMonth ? `${monthOptions.find(m => m.value === filterMonth)?.label} ${filterYear}` : String(filterYear) }] : []),
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
        doc.setTextColor(i === 0 ? 21 : 30, i === 0 ? 82 : 30, i === 0 ? 118 : 30);
        doc.text(b.value, x + 4, summaryY + 14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
      });

      // ── Table ────────────────────────────────────────────────────────────
      const tableRows = allData.content.map(r => [
        r.allocationDate,
        r.playerName ?? '—',
        CATEGORY_LABELS[r.category] ?? r.category,
        referenceFor(r),
        r.description ?? '—',
        fmt(Number(r.amount)),
      ]);

      autoTable(doc, {
        startY: summaryY + 24,
        head: [['Date', 'Player', 'Category', 'Reference', 'Description', 'Amount']],
        body: tableRows,
        foot: [['', '', '', '', 'Total', fmt(totalAmt)]],
        headStyles: { fillColor: [26, 82, 118], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        footStyles: { fillColor: [240, 244, 248], textColor: [50, 50, 50], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } },
        styles: { overflow: 'linebreak', cellPadding: 2 },
        didDrawPage: () => {
          const pg = doc.getCurrentPageInfo().pageNumber;
          const totalPg = (doc.internal as any).pages?.length - 1 || pg;
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Page ${pg} of ${totalPg}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
          doc.text('Cricket Legend — Confidential', 14, doc.internal.pageSize.getHeight() - 6);
        },
      });

      doc.save(`allocation-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const referenceFor = (row: WalletAllocationDTO) => {
    if (row.matchLabel) return row.matchLabel;
    if (row.tournamentName) return row.tournamentName;
    if (row.subscriptionYear) return String(row.subscriptionYear);
    return '—';
  };

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField
          select label="Club" value={filterClubId}
          onChange={e => handleClubChange(e.target.value === '' ? '' : Number(e.target.value))}
          size="small" sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All clubs</MenuItem>
          {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
        </TextField>

        <Autocomplete
          options={playerOptions}
          getOptionLabel={p => `${p.name} ${p.surname}`}
          value={filterPlayer}
          onChange={(_, v) => setFilterPlayer(v)}
          isOptionEqualToValue={(a, b) => a.playerId === b.playerId}
          renderInput={params => <TextField {...params} label="Player" size="small" />}
          sx={{ minWidth: 220 }}
          clearOnEscape
        />

        <TextField
          select label="Category" value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          size="small" sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All categories</MenuItem>
          {CATEGORY_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select label="Year" value={filterYear}
          onChange={e => setFilterYear(e.target.value === '' ? '' : Number(e.target.value))}
          size="small" sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All years</MenuItem>
          {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>

        <TextField
          select label="Month" value={filterMonth}
          onChange={e => setFilterMonth(e.target.value === '' ? '' : Number(e.target.value))}
          size="small" sx={{ minWidth: 140 }}
          disabled={!filterYear}
        >
          <MenuItem value="">All months</MenuItem>
          {monthOptions.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
        </TextField>
      </Box>

      {/* Summary + PDF button */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip label={`${totalElements} allocations`} variant="outlined" />
        <Chip label={`Total: ${fmt(total)}`} color="primary" />
        <Box sx={{ ml: 'auto' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={generatingPdf ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdf />}
            onClick={generatePdf}
            disabled={generatingPdf || totalElements === 0}
          >
            Download PDF
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{
          '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
          '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
          '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
        }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Player</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No allocations found.</Typography>
                </TableCell>
              </TableRow>
            ) : rows.map(row => (
              <TableRow key={row.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.allocationDate}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">{row.playerName ?? '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={CATEGORY_LABELS[row.category] ?? row.category}
                    size="small"
                    color={CATEGORY_COLORS[row.category] ?? 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{referenceFor(row)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{row.description ?? '—'}</Typography>
                </TableCell>
                <TableCell align="right">
                  <strong style={{ color: '#1565c0' }}>{fmt(Number(row.amount))}</strong>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={handlePageChange}
            color="primary"
            size="small"
          />
        </Box>
      )}
    </Box>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const FundAllocation: React.FC = () => {
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAllocateClose = () => {
    setAllocateOpen(false);
    setRefreshKey(k => k + 1); // Refresh the list after closing
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Fund Allocation</Typography>
        <Button
          variant="contained"
          startIcon={<AccountBalanceWallet />}
          onClick={() => setAllocateOpen(true)}
        >
          Allocate Funds
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <AllocationList refreshKey={refreshKey} />
      </Paper>

      {/* ── Allocate dialog ──────────────────────────────────────────────── */}
      <Dialog open={allocateOpen} onClose={handleAllocateClose} maxWidth="lg" fullWidth
        PaperProps={{ sx: { height: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Allocate Funds
          <Button onClick={handleAllocateClose} color="inherit" size="small">Close</Button>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2, flexShrink: 0 }}
          >
            <Tab icon={<Subscriptions />} iconPosition="start" label="Annual Subscription" />
            <Tab icon={<SportsScore />} iconPosition="start" label="Match Fees" />
            <Tab icon={<EmojiEvents />} iconPosition="start" label="Tournament Fees" />
            <Tab icon={<Category />} iconPosition="start" label="Other" />
          </Tabs>

          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <TabPanel value={tab} index={0}>
              <AnnualSubscriptionTab />
            </TabPanel>
            <TabPanel value={tab} index={1}>
              <MatchFeesTab />
            </TabPanel>
            <TabPanel value={tab} index={2}>
              <TournamentFeesTab />
            </TabPanel>
            <TabPanel value={tab} index={3}>
              <OtherTab />
            </TabPanel>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
