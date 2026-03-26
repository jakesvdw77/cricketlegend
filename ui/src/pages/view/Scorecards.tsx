import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Paper, Chip, Divider, Alert, Select, MenuItem, FormControl, InputLabel, Button,
} from '@mui/material';
import { ScoreboardOutlined } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { Match, MatchResult, TeamScorecard } from '../../types';

const InningsTable: React.FC<{ title: string; innings: TeamScorecard }> = ({ title, innings }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="h6">{title} — {innings.score}/{innings.wickets} ({innings.overs} overs)</Typography>
    <Typography variant="subtitle2" sx={{ mt: 1 }}>Batting</Typography>
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 1, overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell><TableCell>Batsman</TableCell><TableCell>Dismissal</TableCell>
            <TableCell align="right">R</TableCell><TableCell align="right">4s</TableCell>
            <TableCell align="right">6s</TableCell><TableCell align="right">Dots</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(innings.batting ?? []).map((b, i) => (
            <TableRow key={i}>
              <TableCell>{b.battingPosition}</TableCell>
              <TableCell>{b.playerName}</TableCell>
              <TableCell>
                {b.dismissed ? <Typography variant="caption">{b.dismissalType} — {b.dismissedDescription}</Typography>
                  : <Chip label="not out" size="small" color="success" />}
              </TableCell>
              <TableCell align="right"><strong>{b.score ?? 0}</strong></TableCell>
              <TableCell align="right">{b.fours ?? 0}</TableCell>
              <TableCell align="right">{b.sixes ?? 0}</TableCell>
              <TableCell align="right">{b.dots ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <Typography variant="subtitle2">Bowling</Typography>
    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Bowler</TableCell><TableCell align="right">O</TableCell>
            <TableCell align="right">R</TableCell><TableCell align="right">W</TableCell>
            <TableCell align="right">Dots</TableCell><TableCell align="right">Wd</TableCell>
            <TableCell align="right">NB</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(innings.bowling ?? []).map((b, i) => (
            <TableRow key={i}>
              <TableCell>{b.playerName}</TableCell>
              <TableCell align="right">{b.overs}</TableCell>
              <TableCell align="right">{b.runs ?? 0}</TableCell>
              <TableCell align="right"><strong>{b.wickets ?? 0}</strong></TableCell>
              <TableCell align="right">{b.dots ?? 0}</TableCell>
              <TableCell align="right">{b.wides ?? 0}</TableCell>
              <TableCell align="right">{b.noBalls ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

export const Scorecards: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    matchApi.findPrevious().then(setMatches);
    const q = searchParams.get('matchId');
    if (q) setSelectedId(+q);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setError('');
    matchApi.getResult(+selectedId)
      .then(setResult)
      .catch(() => { setError('No result recorded for this match yet.'); setResult(null); });
  }, [selectedId]);

  const selectedMatch = matches.find(m => m.matchId === selectedId);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Scorecards</Typography>
      <FormControl sx={{ minWidth: 300, mb: 3 }}>
        <InputLabel>Select Match</InputLabel>
        <Select value={selectedId} label="Select Match" onChange={e => setSelectedId(e.target.value as number)}>
          {matches.map(m => (
            <MenuItem key={m.matchId} value={m.matchId}>
              {m.matchDate} — {m.homeTeamName} vs {m.oppositionTeamName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && <Alert severity="info">{error}</Alert>}

      {result && selectedMatch && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="h6">
              {selectedMatch.homeTeamName} vs {selectedMatch.oppositionTeamName}
            </Typography>
            {selectedMatch.scoringUrl && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ScoreboardOutlined />}
                href={selectedMatch.scoringUrl}
                target="_blank"
                rel="noopener noreferrer"
                component="a"
              >
                Live Scoring
              </Button>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {selectedMatch.matchDate} | {selectedMatch.fieldName}
          </Typography>
          {result.matchCompleted && (
            <Box sx={{ my: 2 }}>
              <Chip label={result.matchDrawn ? 'Draw' : `Winner: ${result.winningTeamName}`} color={result.matchDrawn ? 'default' : 'success'} />
              {result.manOfTheMatchName && <Chip label={`MoM: ${result.manOfTheMatchName}`} sx={{ ml: 1 }} color="secondary" />}
              {result.wonWithBonusPoint && <Chip label="Bonus Point" sx={{ ml: 1 }} color="warning" />}
              {result.decidedOnDLS && <Chip label="DLS" sx={{ ml: 1 }} />}
              {result.matchOutcomeDescription && (
                <Typography variant="body2" sx={{ mt: 1 }}>{result.matchOutcomeDescription}</Typography>
              )}
            </Box>
          )}
          <Divider sx={{ my: 2 }} />
          {result.scoreCard?.teamA && (
            <InningsTable title={`1st Innings — ${result.sideBattingFirstName}`} innings={result.scoreCard.teamA} />
          )}
          {result.scoreCard?.teamB && (
            <InningsTable title="2nd Innings" innings={result.scoreCard.teamB} />
          )}
        </Box>
      )}
    </Box>
  );
};
