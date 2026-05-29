import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, TextField, MenuItem, Chip, TablePagination, Button,
  Tooltip, IconButton, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Autocomplete,
} from '@mui/material';
import { FilterList, AccountBalanceWallet, Add } from '@mui/icons-material';
import { financialAdminApi } from '../../api/financialAdminApi';
import { useFinancialAdmin } from '../../hooks/useFinancialAdmin';
import { PlayerDTO, PagedAllocationResponse, WalletAllocationDTO } from '../../types';

const CATEGORY_LABELS: Record<string, string> = {
  ANNUAL_SUBSCRIPTION: 'Annual Subscription',
  MATCH_FEE: 'Match Fee',
  TOURNAMENT_FEE: 'Tournament Fee',
  OTHER: 'Other',
};

export const FinanceAllocation: React.FC = () => {
  const { clubId, loaded } = useFinancialAdmin();
  const [tab, setTab] = useState(0);
  const [players, setPlayers] = useState<PlayerDTO[]>([]);
  const [walletBalances, setWalletBalances] = useState<Record<number, number>>({});
  const [allocationTotals, setAllocationTotals] = useState<Record<number, number>>({});

  // Allocation history filters
  const [historyResponse, setHistoryResponse] = useState<PagedAllocationResponse | null>(null);
  const [filterPlayer, setFilterPlayer] = useState<PlayerDTO | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [histPage, setHistPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Allocate form
  const [allocPlayer, setAllocPlayer] = useState<PlayerDTO | null>(null);
  const [allocType, setAllocType] = useState<'annual' | 'other'>('annual');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocDesc, setAllocDesc] = useState('');
  const [allocYear, setAllocYear] = useState<number | ''>(new Date().getFullYear());
  const [allocResult, setAllocResult] = useState<{ success?: string; error?: string } | null>(null);
  const [allocating, setAllocating] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const loadWallets = () => {
    if (!clubId) return;
    financialAdminApi.getMyWalletBalances().then(setWalletBalances);
    financialAdminApi.getMyClubAllocationTotals(clubId).then(setAllocationTotals);
  };

  const loadHistory = () => {
    if (!clubId) return;
    financialAdminApi.getMyAllocations({
      playerId: filterPlayer?.playerId,
      category: filterCategory || undefined,
      year: filterYear || undefined,
      month: filterMonth || undefined,
      page: histPage,
      size: 25,
    }).then(setHistoryResponse);
  };

  useEffect(() => {
    if (!loaded || !clubId) return;
    financialAdminApi.getMyPlayers().then(setPlayers);
    loadWallets();
  }, [loaded, clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadHistory(); }, [clubId, filterPlayer, filterCategory, filterYear, filterMonth, histPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAllocate = async () => {
    if (!allocPlayer || !allocAmount) return;
    setAllocating(true);
    setAllocResult(null);
    try {
      let result: any;
      if (allocType === 'annual') {
        result = await financialAdminApi.allocateAnnualSubscription(
          allocPlayer.playerId!, +allocAmount, allocYear || undefined
        );
      } else {
        result = await financialAdminApi.allocateOther(
          allocPlayer.playerId!, +allocAmount, allocDesc
        );
      }
      const skipped = result?.skipped ?? [];
      if (skipped.length > 0) {
        setAllocResult({ error: `Allocation skipped: ${skipped[0].reason} (balance: R${skipped[0].walletBalance?.toFixed(2)})` });
      } else {
        setAllocResult({ success: 'Allocation successful.' });
        setAllocPlayer(null);
        setAllocAmount('');
        setAllocDesc('');
        loadWallets();
        loadHistory();
      }
    } catch {
      setAllocResult({ error: 'Allocation failed. Please try again.' });
    } finally {
      setAllocating(false);
    }
  };

  if (!loaded) return null;
  if (!clubId) return (
    <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
      No club assignment found for your account.
    </Typography>
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Fund Allocation</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Wallet Overview" />
        <Tab label="Allocate" />
        <Tab label="History" />
      </Tabs>

      {/* Wallet Overview */}
      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell align="right">Wallet Balance</TableCell>
                <TableCell align="right">Total Allocated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map(p => {
                const balance = walletBalances[p.playerId!] ?? 0;
                const allocated = allocationTotals[p.playerId!] ?? 0;
                return (
                  <TableRow key={p.playerId}>
                    <TableCell>{p.surname}, {p.name}</TableCell>
                    <TableCell align="right">
                      <Chip
                        icon={<AccountBalanceWallet sx={{ fontSize: 14 }} />}
                        label={`R ${balance.toFixed(2)}`}
                        size="small"
                        color={balance > 0 ? 'success' : balance < 0 ? 'error' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">R {allocated.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
              {players.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No players found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Allocate */}
      {tab === 1 && (
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Allocate Funds</Typography>

          {allocResult?.success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAllocResult(null)}>{allocResult.success}</Alert>
          )}
          {allocResult?.error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAllocResult(null)}>{allocResult.error}</Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              options={players}
              getOptionLabel={p => `${p.surname}, ${p.name}`}
              value={allocPlayer}
              onChange={(_, v) => setAllocPlayer(v)}
              renderInput={params => <TextField {...params} label="Player" size="small" />}
            />

            {allocPlayer && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<AccountBalanceWallet sx={{ fontSize: 14 }} />}
                  label={`Wallet: R ${(walletBalances[allocPlayer.playerId!] ?? 0).toFixed(2)}`}
                  size="small"
                  color={(walletBalances[allocPlayer.playerId!] ?? 0) > 0 ? 'success' : 'error'}
                  variant="outlined"
                />
                <Chip
                  label={`Allocated: R ${(allocationTotals[allocPlayer.playerId!] ?? 0).toFixed(2)}`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            )}

            <TextField select label="Type" size="small" value={allocType}
              onChange={e => setAllocType(e.target.value as 'annual' | 'other')}>
              <MenuItem value="annual">Annual Subscription</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>

            {allocType === 'annual' && (
              <TextField select label="Subscription Year" size="small" value={allocYear}
                onChange={e => setAllocYear(+e.target.value)}>
                {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </TextField>
            )}

            {allocType === 'other' && (
              <TextField label="Description" size="small" value={allocDesc}
                onChange={e => setAllocDesc(e.target.value)} required />
            )}

            <TextField label="Amount (R)" size="small" type="number" value={allocAmount}
              onChange={e => setAllocAmount(e.target.value)}
              inputProps={{ min: 0, step: '0.01' }} />

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAllocate}
              disabled={allocating || !allocPlayer || !allocAmount || (allocType === 'other' && !allocDesc)}
            >
              {allocating ? 'Allocating…' : 'Allocate'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* History */}
      {tab === 2 && (
        <>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: filtersOpen ? 2 : 0 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mr: 'auto' }}>Filters</Typography>
              <Tooltip title={filtersOpen ? 'Collapse' : 'Expand'}>
                <IconButton size="small" onClick={() => setFiltersOpen(o => !o)}><FilterList fontSize="small" /></IconButton>
              </Tooltip>
            </Box>
            {filtersOpen && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Autocomplete
                  options={players}
                  getOptionLabel={p => `${p.surname}, ${p.name}`}
                  value={filterPlayer}
                  onChange={(_, v) => { setFilterPlayer(v); setHistPage(0); }}
                  renderInput={params => <TextField {...params} label="Player" size="small" sx={{ width: 220 }} />}
                  sx={{ width: 220 }}
                />
                <TextField select size="small" label="Category" value={filterCategory}
                  onChange={e => { setFilterCategory(e.target.value); setHistPage(0); }} sx={{ width: 200 }}>
                  <MenuItem value="">All</MenuItem>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Year" value={filterYear}
                  onChange={e => { setFilterYear(e.target.value === '' ? '' : +e.target.value); setHistPage(0); }} sx={{ width: 120 }}>
                  <MenuItem value="">All</MenuItem>
                  {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Month" value={filterMonth}
                  onChange={e => { setFilterMonth(e.target.value === '' ? '' : +e.target.value); setHistPage(0); }}
                  sx={{ width: 140 }} disabled={!filterYear}>
                  <MenuItem value="">All</MenuItem>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                    <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
                  ))}
                </TextField>
                <Button size="small" onClick={() => { setFilterPlayer(null); setFilterCategory(''); setFilterYear(''); setFilterMonth(''); setHistPage(0); }}>
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
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(historyResponse?.content ?? []).map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{a.allocationDate}</TableCell>
                    <TableCell>{a.playerName}</TableCell>
                    <TableCell>
                      <Chip label={CATEGORY_LABELS[a.category] ?? a.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{a.description ?? a.matchLabel ?? a.tournamentName ?? (a.subscriptionYear ? `${a.subscriptionYear}` : '')}</TableCell>
                    <TableCell align="right">R {a.amount?.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {(historyResponse?.content ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No allocations found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={historyResponse?.totalElements ?? 0}
              page={histPage}
              onPageChange={(_, p) => setHistPage(p)}
              rowsPerPage={25}
              rowsPerPageOptions={[25]}
            />
          </TableContainer>
        </>
      )}
    </Box>
  );
};
