import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  CircularProgress, Alert, Chip, Button, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider, Snackbar,
  ToggleButton, ToggleButtonGroup, Autocomplete, FormControlLabel, Checkbox, FormGroup,
} from '@mui/material';
import { Subscriptions, SportsScore, Category, CheckCircle, Warning, AccountBalanceWallet, ReceiptLong, Search } from '@mui/icons-material';
import { clubApi } from '../../api/clubApi';
import { playerApi } from '../../api/playerApi';
import { paymentApi } from '../../api/paymentApi';
import { matchApi } from '../../api/matchApi';
import { tournamentApi } from '../../api/tournamentApi';
import { Club, Player, Payment, PaymentStatus, AllocationResultDTO, Match, MatchSide, MatchFeePlayerDataDTO, Tournament } from '../../types';

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
    return players
      .filter(p => String(p.homeClubId) === selectedClubId)
      .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  }, [players, selectedClubId]);

  const paymentByPlayer = useMemo(() => {
    const map = new Map<number, Payment[]>();
    payments.forEach(p => {
      if (!p.playerId) return;
      if (!map.has(p.playerId)) map.set(p.playerId, []);
      map.get(p.playerId)!.push(p);
    });
    return map;
  }, [payments]);

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
      {/* Club filter + Allocate button */}
      <Box sx={{ mb: 3 }}>
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
          sx={{ minWidth: 260 }}
          size="small"
        >
          <MenuItem value="">— Select a club —</MenuItem>
          {clubs.map(c => (
            <MenuItem key={c.clubId} value={String(c.clubId)}>{c.name}</MenuItem>
          ))}
        </TextField>
      </Box>

      {!selectedClubId ? (
        <Alert severity="info">Select a club to view its players and annual subscription status.</Alert>
      ) : filteredPlayers.length === 0 ? (
        <Alert severity="warning">No players are associated with this club.</Alert>
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
                  <TableCell align="center">Payments</TableCell>
                  <TableCell align="center">Latest Status</TableCell>
                  <TableCell align="right">Wallet Balance</TableCell>
                  <TableCell align="right">Total Allocated</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPlayers.map(player => {
                  const pmts = paymentByPlayer.get(player.playerId!) ?? [];
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
    const map = new Map<string, MatchFeePlayerDataDTO[]>();
    players.forEach(p => {
      if (!map.has(p.teamName)) map.set(p.teamName, []);
      map.get(p.teamName)!.push(p);
    });
    return map;
  }, [players]);

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
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={`Players: ${players.length}`} variant="outlined" />
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

// ── Main page ─────────────────────────────────────────────────────────────────

export const FundAllocation: React.FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Fund Allocation</Typography>

      <Paper variant="outlined">
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<Subscriptions />} iconPosition="start" label="Annual Subscription" />
          <Tab icon={<SportsScore />} iconPosition="start" label="Match Fees" />
          <Tab icon={<Category />} iconPosition="start" label="Other" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tab} index={0}>
            <AnnualSubscriptionTab />
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <MatchFeesTab />
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <Typography color="text.secondary">Other allocation — coming soon.</Typography>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};
