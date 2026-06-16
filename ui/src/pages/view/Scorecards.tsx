import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Paper, Chip, Divider, Alert, Select, MenuItem, FormControl, InputLabel, Button,
  Tabs, Tab, Grid, Card, CardContent,
} from '@mui/material';
import { ScoreboardOutlined, YouTube, ArrowBack, EmojiEvents, SportsCricket, Person } from '@mui/icons-material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { Match, MatchResult, TeamScorecard } from '../../types';
import { GameAnalysisView } from '../../components/match/GameAnalysisView';
import { ElectronicScoreboard } from '../../components/match/ElectronicScoreboard';
import keycloak from '../../keycloak';

const InningsTable: React.FC<{ title: string; innings: TeamScorecard }> = ({ title, innings }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="h6">{title} — {innings.score}/{innings.wickets} ({innings.overs} overs)</Typography>
    <Typography variant="subtitle2" sx={{ mt: 1 }}>Batting</Typography>
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 1, overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell><TableCell>Batsman</TableCell><TableCell>Dismissal</TableCell>
            <TableCell align="right">R</TableCell><TableCell align="right">B</TableCell>
            <TableCell align="right">4s</TableCell><TableCell align="right">6s</TableCell>
            <TableCell align="right">SR</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(innings.batting ?? []).map((b, i) => {
            const noStats = !b.dismissed && !b.ballsFaced;
            return (
              <TableRow key={i}>
                <TableCell>{b.battingPosition}</TableCell>
                <TableCell>{b.playerName}</TableCell>
                {noStats ? (
                  <TableCell colSpan={6} sx={{ bgcolor: 'inherit' }} />
                ) : (
                  <>
                    <TableCell>
                      {b.dismissed
                        ? <Typography variant="caption">{b.dismissalType?.replace(/_/g, ' ')} — {b.dismissedDescription}</Typography>
                        : <Chip label="not out" size="small" color="success" />}
                    </TableCell>
                    <TableCell align="right"><strong>{b.score ?? 0}</strong></TableCell>
                    <TableCell align="right">{b.ballsFaced ?? 0}</TableCell>
                    <TableCell align="right">{b.fours ?? 0}</TableCell>
                    <TableCell align="right">{b.sixes ?? 0}</TableCell>
                    <TableCell align="right">
                      {b.ballsFaced ? (((b.score ?? 0) / b.ballsFaced) * 100).toFixed(1) : '—'}
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
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

const MatchOverview: React.FC<{ result: MatchResult; match: Match }> = ({ result, match }) => {
  const tossWinner = match.tossWonBy === 'HOME' ? match.homeTeamName : match.oppositionTeamName;
  const tossDecision = match.tossDecision === 'BAT' ? 'elected to bat' : match.tossDecision === 'BOWL' ? 'elected to bowl' : null;

  const secondBattingTeam =
    result.sideBattingFirstName === match.homeTeamName ? match.oppositionTeamName : match.homeTeamName;

  const topBatters = [
    ...(result.scoreCard?.teamA?.batting ?? []),
    ...(result.scoreCard?.teamB?.batting ?? []),
  ].filter(b => b.topPerformer);

  const topBowlers = [
    ...(result.scoreCard?.teamA?.bowling ?? []),
    ...(result.scoreCard?.teamB?.bowling ?? []),
  ].filter(b => b.topPerformer);

  const extras = (sc: TeamScorecard) =>
    (sc.byes ?? 0) + (sc.legByes ?? 0) + (sc.wides ?? 0) + (sc.noBalls ?? 0) + (sc.penaltyRuns ?? 0);

  return (
    <Box>
      {/* Result banner */}
      <Card variant="outlined" sx={{ mb: 2, bgcolor: result.matchDrawn ? 'action.hover' : 'success.main', color: result.matchDrawn ? 'text.primary' : 'success.contrastText' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <EmojiEvents />
            <Typography variant="h6" fontWeight={700}>
              {result.forfeited ? 'Forfeited' : result.noResult ? 'No Result' : result.matchDrawn ? 'Match Drawn' : `${result.winningTeamName} won`}
            </Typography>
            {result.decidedOnDLS && <Chip label="DLS" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)' }} />}
            {result.decidedBySuperOver && <Chip label="Super Over" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)' }} />}
            {result.wonWithBonusPoint && <Chip label="Bonus Point" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)' }} />}
          </Box>
          {result.matchOutcomeDescription && (
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>{result.matchOutcomeDescription}</Typography>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* 1st innings */}
        {result.sideBattingFirstName && (
          <Grid item xs={12} sm={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="overline" color="text.secondary">1st Innings</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {result.scoreBattingFirst}/{result.wicketsLostBattingFirst} <Typography component="span" variant="body2" color="text.secondary">({result.oversBattingFirst} ov)</Typography>
                </Typography>
                <Typography variant="body2">{result.sideBattingFirstName}</Typography>
                {result.scoreCard?.teamA && (
                  <Typography variant="caption" color="text.secondary">Extras: {extras(result.scoreCard.teamA)}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 2nd innings */}
        {secondBattingTeam && (
          <Grid item xs={12} sm={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="overline" color="text.secondary">2nd Innings</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {result.scoreBattingSecond}/{result.wicketsLostBattingSecond} <Typography component="span" variant="body2" color="text.secondary">({result.oversBattingSecond} ov)</Typography>
                </Typography>
                <Typography variant="body2">{secondBattingTeam}</Typography>
                {result.scoreCard?.teamB && (
                  <Typography variant="caption" color="text.secondary">Extras: {extras(result.scoreCard.teamB)}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Toss */}
        {tossWinner && (
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <SportsCricket fontSize="small" color="action" />
                  <Typography variant="overline" color="text.secondary">Toss</Typography>
                </Box>
                <Typography variant="body1">
                  <strong>{tossWinner}</strong>{tossDecision ? ` — ${tossDecision}` : ''}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Man of the Match */}
        {result.manOfTheMatchName && (
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Person fontSize="small" color="action" />
                  <Typography variant="overline" color="text.secondary">Man of the Match</Typography>
                </Box>
                <Typography variant="body1" fontWeight={700}>{result.manOfTheMatchName}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Top performers */}
      {(topBatters.length > 0 || topBowlers.length > 0) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Top Performers</Typography>
          <Grid container spacing={2}>
            {topBatters.length > 0 && (
              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="text.secondary">Batting</Typography>
                {topBatters.map((b, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2">{b.playerName}</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {b.score}{b.ballsFaced ? <Typography component="span" variant="caption" color="text.secondary"> ({b.ballsFaced}b)</Typography> : ''}
                      {b.fours ? <Typography component="span" variant="caption" color="text.secondary"> · {b.fours}×4</Typography> : ''}
                      {b.sixes ? <Typography component="span" variant="caption" color="text.secondary"> · {b.sixes}×6</Typography> : ''}
                    </Typography>
                  </Box>
                ))}
              </Grid>
            )}
            {topBowlers.length > 0 && (
              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="text.secondary">Bowling</Typography>
                {topBowlers.map((b, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2">{b.playerName}</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {b.wickets}/{b.runs} <Typography component="span" variant="caption" color="text.secondary">({b.overs} ov)</Typography>
                    </Typography>
                  </Box>
                ))}
              </Grid>
            )}
          </Grid>
        </>
      )}
    </Box>
  );
};

const TABS = ['Overview', 'Full Scorecard', 'Scoreboard', 'Match Report'];

export const Scorecards: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const linkedMatchId = searchParams.get('matchId');

  useEffect(() => {
    matchApi.findCompleted().then(setMatches).catch(() => {});
    if (linkedMatchId) setSelectedId(+linkedMatchId);
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
      {!linkedMatchId && <Typography variant="h5" sx={{ mb: 2 }}>Scorecards</Typography>}
      {!linkedMatchId && (
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
      )}

      {error && <Alert severity="info">{error}</Alert>}

      {result && selectedMatch && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
            {linkedMatchId && (
              <Button size="small" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>Back</Button>
            )}
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
            {selectedMatch.youtubeUrl && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<YouTube />}
                href={selectedMatch.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                component="a"
                sx={{ color: '#FF0000', borderColor: '#FF0000', '&:hover': { borderColor: '#CC0000', bgcolor: 'rgba(255,0,0,0.04)' } }}
              >
                Watch
              </Button>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {selectedMatch.matchDate} | {selectedMatch.fieldName}
          </Typography>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 1.5 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              {TABS.map((label, i) => <Tab key={i} label={label} />)}
            </Tabs>
          </Box>

          <Box sx={{ pt: 2 }}>
            {activeTab === 0 && (
              <MatchOverview result={result} match={selectedMatch} />
            )}
            {activeTab === 1 && (
              <>
                <Divider sx={{ mb: 2 }} />
                {result.scoreCard?.teamA && (
                  <InningsTable title={`1st Innings — ${result.sideBattingFirstName}`} innings={result.scoreCard.teamA} />
                )}
                {result.scoreCard?.teamB && (
                  <InningsTable title="2nd Innings" innings={result.scoreCard.teamB} />
                )}
              </>
            )}
            {activeTab === 2 && (
              <ElectronicScoreboard result={result} match={selectedMatch} />
            )}
            {activeTab === 3 && selectedMatch.homeTeamId && (
              <GameAnalysisView
                matchId={selectedId as number}
                teamId={selectedMatch.homeTeamId}
                teamName={selectedMatch.homeTeamName ?? ''}
                matchTitle={`${selectedMatch.homeTeamName} vs ${selectedMatch.oppositionTeamName}`}
                readOnly={!keycloak.authenticated}
                summaryOnly={!keycloak.authenticated}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
