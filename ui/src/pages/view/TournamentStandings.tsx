import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Avatar, Chip, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
} from '@mui/material';
import { ArrowBack, EmojiEvents, SportsCricket, Refresh } from '@mui/icons-material';
import { tournamentApi } from '../../api/tournamentApi';
import { Tournament, PoolStandings, PoolStandingEntry } from '../../types';

export const TournamentStandings: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { key } = useLocation();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<PoolStandings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    if (!tournamentId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      tournamentApi.findById(+tournamentId),
      tournamentApi.getStandings(+tournamentId),
    ])
      .then(([t, s]) => { setTournament(t); setStandings(s); })
      .catch(() => setError('Failed to load standings.'))
      .finally(() => setLoading(false));
  };

  // Re-fetch every time this page is navigated to (key changes on each navigation)
  useEffect(fetchData, [tournamentId, key]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} size="small">Back</Button>
        <Button startIcon={loading ? <CircularProgress size={14} /> : <Refresh />} onClick={fetchData} size="small" disabled={loading}>
          Refresh
        </Button>
        {tournament?.logoUrl && (
          <Avatar src={tournament.logoUrl} variant="rounded" sx={{ width: 40, height: 40 }} />
        )}
        <Box>
          <Typography variant="h5" sx={{ lineHeight: 1.2 }}>{tournament?.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            {tournament?.cricketFormat && (
              <Chip icon={<SportsCricket sx={{ fontSize: '14px !important' }} />} label={tournament.cricketFormat} size="small" color="primary" variant="outlined" />
            )}
            {tournament?.startDate && (
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                {tournament.startDate}{tournament.endDate ? ` — ${tournament.endDate}` : ''}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {standings.length === 0 && (
        <Typography color="text.secondary">No standings available yet.</Typography>
      )}

      {standings.map(pool => (
        <Box key={pool.poolId} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <EmojiEvents color="primary" fontSize="small" />
            <Typography variant="h6">{pool.poolName}</Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap' } }}>
                  <TableCell width={32}>#</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell align="center" title="Games Played">P</TableCell>
                  <TableCell align="center" title="Won">W</TableCell>
                  <TableCell align="center" title="Lost">L</TableCell>
                  <TableCell align="center" title="No Result">NR</TableCell>
                  <TableCell align="center" title="Drawn">D</TableCell>
                  <TableCell align="center" title="Bonus Points">BP</TableCell>
                  <TableCell align="center" title="Total Points">Pts</TableCell>
                  <TableCell align="right" title="Net Run Rate">NRR</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pool.entries.map((entry, idx) => (
                  <StandingRow key={entry.teamId} entry={entry} position={idx + 1} />
                ))}
                {pool.entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <Typography variant="body2" color="text.secondary" align="center">No teams in this pool.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
            <Legend label="P" desc="Played" />
            <Legend label="W" desc="Won" />
            <Legend label="L" desc="Lost" />
            <Legend label="NR" desc="No Result" />
            <Legend label="D" desc="Drawn" />
            <Legend label="BP" desc="Bonus Points" />
            <Legend label="Pts" desc="Total Points" />
            <Legend label="NRR" desc="Net Run Rate" />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const StandingRow: React.FC<{ entry: PoolStandingEntry; position: number }> = ({ entry, position }) => {
  const nrrFormatted = entry.netRunRate >= 0
    ? `+${entry.netRunRate.toFixed(3)}`
    : entry.netRunRate.toFixed(3);

  return (
    <TableRow sx={{ '&:last-child td': { border: 0 }, ...(position <= 2 ? { bgcolor: 'action.hover' } : {}) }}>
      <TableCell>
        <Typography variant="body2" color="text.secondary">{position}</Typography>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={entry.logoUrl} variant="rounded" sx={{ width: 28, height: 28, fontSize: 12 }}>
            {entry.teamName.charAt(0)}
          </Avatar>
          <Typography variant="body2" fontWeight={position === 1 ? 700 : 400}>
            {entry.teamName}
          </Typography>
        </Box>
      </TableCell>
      <TableCell align="center"><Typography variant="body2">{entry.gamesPlayed}</Typography></TableCell>
      <TableCell align="center"><Typography variant="body2" color="success.main" fontWeight={600}>{entry.won}</Typography></TableCell>
      <TableCell align="center"><Typography variant="body2" color="error.main">{entry.lost}</Typography></TableCell>
      <TableCell align="center"><Typography variant="body2" color="text.secondary">{entry.noResults}</Typography></TableCell>
      <TableCell align="center"><Typography variant="body2" color="text.secondary">{entry.draws}</Typography></TableCell>
      <TableCell align="center"><Typography variant="body2">{entry.bonusPoints}</Typography></TableCell>
      <TableCell align="center">
        <Typography variant="body2" fontWeight={700}>{entry.points}</Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" color={entry.netRunRate >= 0 ? 'success.main' : 'error.main'} fontWeight={500}>
          {nrrFormatted}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

const Legend: React.FC<{ label: string; desc: string }> = ({ label, desc }) => (
  <Typography variant="caption" color="text.secondary">
    <b>{label}</b> = {desc}
  </Typography>
);
