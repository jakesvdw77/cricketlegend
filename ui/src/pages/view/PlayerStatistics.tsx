import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Autocomplete, TextField, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Paper, Chip,
  Grid, Card, CardContent, Link,
} from '@mui/material';
import { playerApi } from '../../api/playerApi';
import { Player, PlayerResult } from '../../types';
import { formatEnum } from '../../utils/formatEnum';

export const PlayerStatistics: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerResult[]>([]);

  useEffect(() => { playerApi.findAll().then(setPlayers); }, []);

  useEffect(() => {
    if (!selected?.playerId) return;
    playerApi.getStatistics(selected.playerId).then(setStats);
  }, [selected]);

  const totalRuns = stats.reduce((s, r) => s + (r.score ?? 0), 0);
  const totalWickets = stats.reduce((s, r) => s + (r.wickets ?? 0), 0);
  const totalFours = stats.reduce((s, r) => s + (r.foursHit ?? 0), 0);
  const totalSixes = stats.reduce((s, r) => s + (r.sixesHit ?? 0), 0);
  const highScore = stats.length ? Math.max(...stats.map(r => r.score ?? 0)) : 0;
  const matches = stats.length;
  const motm = stats.filter(r => r.manOfMatch).length;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Player Statistics</Typography>
      <Autocomplete
        options={players}
        getOptionLabel={p => `${p.name} ${p.surname} (#${p.shirtNumber ?? '?'})`}
        onChange={(_, p) => { setSelected(p); setStats([]); }}
        renderInput={params => <TextField {...params} label="Select Player" />}
        sx={{ maxWidth: 400, mb: 3 }}
      />

      {selected && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">{selected.name} {selected.surname}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', my: 1 }}>
            {selected.battingStance && <Chip size="small" label={formatEnum(selected.battingStance)} />}
            {selected.bowlingType && <Chip size="small" label={formatEnum(selected.bowlingType)} />}
            {selected.wicketKeeper && <Chip size="small" label="WK" color="info" />}
          </Box>
          {selected.careerUrl && (
            <Link href={selected.careerUrl} target="_blank" rel="noopener noreferrer" variant="body2">
              View Career Profile
            </Link>
          )}
        </Box>
      )}

      {stats.length > 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Matches', value: matches },
              { label: 'Total Runs', value: totalRuns },
              { label: 'High Score', value: highScore },
              { label: 'Total Wickets', value: totalWickets },
              { label: 'Fours', value: totalFours },
              { label: 'Sixes', value: totalSixes },
              { label: 'Man of Match', value: motm },
            ].map(s => (
              <Grid item xs={6} sm={3} key={s.label}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="h4" color="primary">{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Team</TableCell>
                  <TableCell align="right">Pos</TableCell>
                  <TableCell align="right">Runs</TableCell>
                  <TableCell align="right">Balls</TableCell>
                  <TableCell align="right">4s</TableCell>
                  <TableCell align="right">6s</TableCell>
                  <TableCell>Dismissal</TableCell>
                  <TableCell>Overs</TableCell>
                  <TableCell align="right">Wkts</TableCell>
                  <TableCell align="right">Dots</TableCell>
                  <TableCell>MoM</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.map(r => (
                  <TableRow key={r.playerResultId}>
                    <TableCell>{r.teamName}</TableCell>
                    <TableCell align="right">{r.battingPosition}</TableCell>
                    <TableCell align="right"><strong>{r.score ?? 0}</strong></TableCell>
                    <TableCell align="right">{r.ballsFaced ?? 0}</TableCell>
                    <TableCell align="right">{r.foursHit ?? 0}</TableCell>
                    <TableCell align="right">{r.sixesHit ?? 0}</TableCell>
                    <TableCell>
                      {r.dismissed ? <Chip size="small" label={r.dismissalType} /> : <Chip size="small" label="not out" color="success" />}
                    </TableCell>
                    <TableCell>{r.oversBowled ?? '-'}</TableCell>
                    <TableCell align="right">{r.wickets ?? 0}</TableCell>
                    <TableCell align="right">{r.dots ?? 0}</TableCell>
                    <TableCell>{r.manOfMatch ? '⭐' : ''}</TableCell>
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
