import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, TextField, MenuItem, Chip, TablePagination, Button,
  Tooltip, IconButton, Tabs, Tab, Alert, Autocomplete, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar,
  FormGroup, FormControlLabel, Checkbox,
} from '@mui/material';
import {
  FilterList, AccountBalanceWallet, Add, Search,
  Subscriptions, SportsScore, EmojiEvents, History,
} from '@mui/icons-material';
import { financialAdminApi } from '../../api/financialAdminApi';
import { matchApi } from '../../api/matchApi';
import { tournamentApi } from '../../api/tournamentApi';
import { useFinancialAdmin } from '../../hooks/useFinancialAdmin';
import {
  Player, PagedAllocationResponse,
  Match, MatchSide, MatchFeePlayerDataDTO, Tournament, TournamentFeePlayerDataDTO,
} from '../../types';

const CATEGORY_LABELS: Record<string, string> = {
  ANNUAL_SUBSCRIPTION: 'Annual Subscription',
  MATCH_FEE: 'Match Fee',
  TOURNAMENT_FEE: 'Tournament Fee',
  OTHER: 'Other',
};

const fmt = (v: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);

// ── Wallet Overview tab ───────────────────────────────────────────────────────

interface WalletOverviewProps {
  players: Player[];
  walletBalances: Record<number, number>;
  allocationTotals: Record<number, number>;
}

const WalletOverviewTab: React.FC<WalletOverviewProps> = ({ players, walletBalances, allocationTotals }) => (
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
);

// ── Allocate (annual/other) tab ───────────────────────────────────────────────

interface AllocateTabProps {
  players: Player[];
  walletBalances: Record<number, number>;
  allocationTotals: Record<number, number>;
  onAllocated: () => void;
}

const AllocateTab: React.FC<AllocateTabProps> = ({ players, walletBalances, allocationTotals, onAllocated }) => {
  const [allocPlayer, setAllocPlayer] = useState<Player | null>(null);
  const [allocType, setAllocType] = useState<'annual' | 'other'>('annual');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocDesc, setAllocDesc] = useState('');
  const [allocYear, setAllocYear] = useState<number | ''>(new Date().getFullYear());
  const [allocResult, setAllocResult] = useState<{ success?: string; error?: string } | null>(null);
  const [allocating, setAllocating] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

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
        onAllocated();
      }
    } catch {
      setAllocResult({ error: 'Allocation failed. Please try again.' });
    } finally {
      setAllocating(false);
    }
  };

  return (
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
      const data = await financialAdminApi.getMyMatchFeePlayerData(selectedMatch.matchId, selectedSideIds);
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
      const res = await financialAdminApi.allocateMatchFee(
        player.playerId, amount, selectedMatch.matchId!,
        selectedTournament?.matchFee ?? undefined,
        `Match fee - ${matchLabel}`,
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

  // Amount dialog derived values
  const matchFee = selectedTournament?.matchFee ?? 0;
  const alreadyAllocated = Number(amountDialog?.player.matchFeeAllocated ?? 0);
  const remainingFee = Math.max(0, matchFee - alreadyAllocated);
  const walletBalance = Number(amountDialog?.player.walletBalance ?? 0);
  const maxAllowable = Math.min(walletBalance, remainingFee || Infinity);
  const enteredAmount = parseFloat(amountInput);
  const exceedsWallet = !!amountInput && enteredAmount > walletBalance;
  const exceedsFee = !!amountInput && matchFee > 0 && enteredAmount > remainingFee;
  const hasAmountError = !!amountInput && (enteredAmount <= 0 || exceedsWallet || exceedsFee);

  return (
    <Box>
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
                <Table size="small">
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
            error={hasAmountError}
            helperText={
              exceedsFee ? `Amount exceeds remaining match fee (${fmt(remainingFee)})`
                : exceedsWallet ? 'Amount exceeds available wallet balance'
                : undefined
            }
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
            disabled={!amountInput || enteredAmount <= 0 || hasAmountError || remainingFee === 0}
          >
            Allocate
          </Button>
        </DialogActions>
      </Dialog>
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
  const [snack, setSnack] = useState('');
  const [showUnallocatedOnly, setShowUnallocatedOnly] = useState(false);
  const [searchText, setSearchText] = useState('');

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
  };

  const handleLoadPlayers = async () => {
    if (!selectedTournament?.tournamentId) return;
    setLoadingPlayers(true);
    try {
      const data = await financialAdminApi.getMyTournamentFeePlayerData(selectedTournament.tournamentId);
      setPlayers(data);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const totalFee = (selectedTournament?.entryFee ?? 0) + (selectedTournament?.registrationFee ?? 0);

  const handleAllocate = (player: TournamentFeePlayerDataDTO) => {
    const remaining = Math.max(0, totalFee - Number(player.tournamentFeeAllocated));
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
      const res = await financialAdminApi.allocateTournamentFee(
        player.playerId, amount, selectedTournament.tournamentId!,
        totalFee > 0 ? totalFee : undefined,
        `Tournament registration fee - ${selectedTournament.name}`,
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

  const displayedPlayers = useMemo(() => {
    let result = players;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(p => p.playerName.toLowerCase().includes(q));
    }
    if (showUnallocatedOnly) {
      result = result.filter(p => Number(p.tournamentFeeAllocated) < totalFee);
    }
    return result;
  }, [players, searchText, showUnallocatedOnly, totalFee]);

  const unallocatedCount = useMemo(
    () => players.filter(p => Number(p.tournamentFeeAllocated) < totalFee).length,
    [players, totalFee]
  );

  // Amount dialog derived values
  const dialogTotalFee = totalFee;
  const alreadyAllocated = Number(amountDialog?.player.tournamentFeeAllocated ?? 0);
  const remainingFee = Math.max(0, dialogTotalFee - alreadyAllocated);
  const walletBalance = Number(amountDialog?.player.walletBalance ?? 0);
  const enteredAmount = parseFloat(amountInput);
  const exceedsWallet = !!amountInput && enteredAmount > walletBalance;
  const exceedsFee = !!amountInput && dialogTotalFee > 0 && enteredAmount > remainingFee;
  const hasAmountError = !!amountInput && (enteredAmount <= 0 || exceedsWallet);
  const fullyAllocated = dialogTotalFee > 0 && remainingFee === 0;

  return (
    <Box>
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

      {selectedTournament && totalFee > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Tournament fees for <strong>{selectedTournament.name}</strong>:{' '}
          {(selectedTournament.entryFee ?? 0) > 0 && (selectedTournament.registrationFee ?? 0) > 0 ? (
            <>entry <strong>{fmt(selectedTournament.entryFee!)}</strong> + registration <strong>{fmt(selectedTournament.registrationFee!)}</strong> = <strong>{fmt(totalFee)}</strong> per player</>
          ) : (
            <strong>{fmt(totalFee)}</strong>
          )}
        </Alert>
      )}

      {!selectedTournament && (
        <Alert severity="info">Select a tournament to load player data for fee allocation.</Alert>
      )}

      {players.length > 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip label={`Players: ${players.length}`} variant="outlined" />
            {unallocatedCount > 0 && (
              <Chip label={`Unallocated: ${unallocatedCount}`} color="warning" variant="outlined" />
            )}
            <TextField
              label="Search player"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
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

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
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
                {displayedPlayers.map(player => (
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
        </>
      )}

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} />

      <Dialog open={!!amountDialog} onClose={() => setAmountDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Allocate Tournament Fee — {amountDialog?.player.playerName}</DialogTitle>
        <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Wallet balance: <strong>{fmt(walletBalance)}</strong>
            </Typography>
            {dialogTotalFee > 0 && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Tournament fee: <strong>{fmt(dialogTotalFee)}</strong>
                </Typography>
                {alreadyAllocated > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Already allocated: <strong style={{ color: '#1565c0' }}>{fmt(alreadyAllocated)}</strong>
                  </Typography>
                )}
                <Typography variant="body2" color={fullyAllocated ? 'success.main' : 'text.secondary'}>
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
            inputProps={{ min: 0.01, step: 0.01 }}
            onChange={e => setAmountInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirmAllocate(); }}
            error={hasAmountError}
            helperText={exceedsWallet ? 'Amount exceeds available wallet balance' : undefined}
          />
          {exceedsFee && !exceedsWallet && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Amount exceeds the remaining tournament fee ({fmt(remainingFee)}). You can still proceed.
            </Alert>
          )}
          {fullyAllocated && (
            <Alert severity="success" sx={{ py: 0.5 }}>Tournament fee fully allocated for this player.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAmountDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmAllocate}
            disabled={!amountInput || enteredAmount <= 0 || hasAmountError}
          >
            Allocate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── History tab ───────────────────────────────────────────────────────────────

interface HistoryTabProps {
  clubId: number;
  players: Player[];
}

const HistoryTab: React.FC<HistoryTabProps> = ({ clubId, players }) => {
  const [historyResponse, setHistoryResponse] = useState<PagedAllocationResponse | null>(null);
  const [filterPlayer, setFilterPlayer] = useState<Player | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [histPage, setHistPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const loadHistory = () => {
    financialAdminApi.getMyAllocations({
      playerId: filterPlayer?.playerId,
      category: filterCategory || undefined,
      year: filterYear || undefined,
      month: filterMonth || undefined,
      page: histPage,
      size: 25,
    }).then(setHistoryResponse);
  };

  useEffect(() => { loadHistory(); }, [clubId, filterPlayer, filterCategory, filterYear, filterMonth, histPage]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
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
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const FinanceAllocation: React.FC = () => {
  const { clubId, loaded } = useFinancialAdmin();
  const [tab, setTab] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [walletBalances, setWalletBalances] = useState<Record<number, number>>({});
  const [allocationTotals, setAllocationTotals] = useState<Record<number, number>>({});

  const loadWallets = () => {
    if (!clubId) return;
    financialAdminApi.getMyWalletBalances().then(setWalletBalances);
    financialAdminApi.getMyClubAllocationTotals(clubId).then(setAllocationTotals);
  };

  useEffect(() => {
    if (!loaded || !clubId) return;
    financialAdminApi.getMyPlayers().then(setPlayers);
    loadWallets();
  }, [loaded, clubId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <Tab icon={<AccountBalanceWallet />} iconPosition="start" label="Wallet Overview" />
        <Tab icon={<Subscriptions />} iconPosition="start" label="Annual / Other" />
        <Tab icon={<SportsScore />} iconPosition="start" label="Match Fees" />
        <Tab icon={<EmojiEvents />} iconPosition="start" label="Tournament Fees" />
        <Tab icon={<History />} iconPosition="start" label="History" />
      </Tabs>

      {tab === 0 && (
        <WalletOverviewTab players={players} walletBalances={walletBalances} allocationTotals={allocationTotals} />
      )}
      {tab === 1 && (
        <AllocateTab
          players={players}
          walletBalances={walletBalances}
          allocationTotals={allocationTotals}
          onAllocated={loadWallets}
        />
      )}
      {tab === 2 && <MatchFeesTab />}
      {tab === 3 && <TournamentFeesTab />}
      {tab === 4 && <HistoryTab clubId={clubId} players={players} />}
    </Box>
  );
};
