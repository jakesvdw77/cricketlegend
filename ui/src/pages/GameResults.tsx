import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Chip, Avatar, Divider, Stack,
  Card, CardContent, useTheme, useMediaQuery,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, AccessTime, LocationOn, SportsCricket,
  SportsScore,
} from '@mui/icons-material';
import { matchApi } from '../api/matchApi';
import { Match } from '../types';

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final', PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16',
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtTime = (t?: string) => (t ? t.substring(0, 5) : null);

const sortKey = (m: Match) =>
  `${m.matchDate ?? '0000-01-01'}T${m.scheduledStartTime ?? '00:00:00'}`;

const isFinal = (m: Match) =>
  !!(m.matchCompleted || m.forfeited || m.noResult || m.matchDrawn);

const fmtScore = (runs?: number, wickets?: number, overs?: string) => {
  if (runs == null) return null;
  const w = wickets != null && wickets < 10 ? `/${wickets}` : '';
  const o = overs ? ` (${overs})` : '';
  return `${runs}${w}${o}`;
};

const homeBattedFirst = (m: Match): boolean =>
  (m.tossWonBy === 'HOME' && m.tossDecision === 'BAT') ||
  (m.tossWonBy === 'OPPOSITION' && m.tossDecision === 'BOWL');

interface TournamentGroup {
  tournamentId: number | null;
  tournamentName: string;
  matches: Match[];
  latestDate: string;
}

const groupByTournament = (matches: Match[]): TournamentGroup[] => {
  const map = new Map<string, TournamentGroup>();

  for (const m of matches) {
    const key = m.tournamentId != null ? String(m.tournamentId) : '__none__';
    if (!map.has(key)) {
      map.set(key, {
        tournamentId: m.tournamentId ?? null,
        tournamentName: m.tournamentName ?? 'Friendlies / No Tournament',
        matches: [],
        latestDate: sortKey(m),
      });
    }
    const g = map.get(key)!;
    g.matches.push(m);
    if (sortKey(m) > g.latestDate) g.latestDate = sortKey(m);
  }

  for (const g of map.values()) {
    g.matches.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  }

  return [...map.values()].sort((a, b) => b.latestDate.localeCompare(a.latestDate));
};

const ResultChip: React.FC<{ match: Match }> = ({ match: m }) => {
  if (m.forfeited)  return <Chip label="Forfeited" size="small" color="warning" />;
  if (m.noResult)   return <Chip label="No Result" size="small" variant="outlined" />;
  if (m.matchDrawn) return <Chip label="Draw" size="small" color="info" />;
  return null;
};

const ScoreLine: React.FC<{ match: Match }> = ({ match: m }) => {
  const hasToss = m.tossWonBy && m.tossDecision;
  const hbf = hasToss ? homeBattedFirst(m) : true;

  const homeRuns    = hbf ? m.scoreBattingFirst    : m.scoreBattingSecond;
  const homeWkts    = hbf ? m.wicketsLostBattingFirst : m.wicketsLostBattingSecond;
  const homeOvers   = hbf ? m.oversBattingFirst    : m.oversBattingSecond;
  const awayRuns    = hbf ? m.scoreBattingSecond   : m.scoreBattingFirst;
  const awayWkts    = hbf ? m.wicketsLostBattingSecond : m.wicketsLostBattingFirst;
  const awayOvers   = hbf ? m.oversBattingSecond   : m.oversBattingFirst;

  const homeScore = fmtScore(homeRuns, homeWkts, homeOvers);
  const awayScore = fmtScore(awayRuns, awayWkts, awayOvers);

  if (!homeScore && !awayScore) return null;

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
      <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 80, color: 'text.primary' }}>
        {m.homeTeamAbbreviation ?? m.homeTeamName ?? '—'}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 90 }}>
        {homeScore ?? '—'}
      </Typography>
      <Typography variant="caption" color="text.disabled">vs</Typography>
      <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 80, color: 'text.primary' }}>
        {m.oppositionTeamAbbreviation ?? m.oppositionTeamName ?? '—'}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {awayScore ?? '—'}
      </Typography>
    </Stack>
  );
};

const ResultRow: React.FC<{ match: Match }> = ({ match: m }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  return (
    <Card
      variant="outlined"
      onClick={() => m.matchId && navigate(`/matches/scorecards?matchId=${m.matchId}`)}
      sx={{ mb: 1.5, cursor: m.matchId ? 'pointer' : 'default', '&:hover': m.matchId ? { borderColor: 'primary.main' } : {} }}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>

        {/* Header row: teams + result chip */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar src={m.homeTeamLogoUrl} sx={{ width: 26, height: 26, fontSize: 12 }}>
              {m.homeTeamName?.charAt(0)}
            </Avatar>
            <Typography variant="body2" fontWeight="bold">
              {m.homeTeamAbbreviation ?? m.homeTeamName ?? '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">vs</Typography>
            <Avatar src={m.oppositionTeamLogoUrl} sx={{ width: 26, height: 26, fontSize: 12 }}>
              {m.oppositionTeamName?.charAt(0)}
            </Avatar>
            <Typography variant="body2" fontWeight="bold">
              {m.oppositionTeamAbbreviation ?? m.oppositionTeamName ?? '—'}
            </Typography>
          </Stack>
          <ResultChip match={m} />
        </Stack>

        {/* Scores */}
        <ScoreLine match={m} />

        {/* Outcome description */}
        {m.matchOutcomeDescription && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {m.matchOutcomeDescription}
          </Typography>
        )}

        {/* Meta row */}
        <Stack
          direction={isMobile ? 'column' : 'row'}
          spacing={1}
          alignItems={{ sm: 'center' }}
          sx={{ mt: 1, flexWrap: 'wrap' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarMonth sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="caption">{fmtDate(m.matchDate)}</Typography>
          </Box>
          {fmtTime(m.scheduledStartTime) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTime sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption">{fmtTime(m.scheduledStartTime)}</Typography>
            </Box>
          )}
          {m.fieldName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {m.fieldIconUrl
                ? <Avatar src={m.fieldIconUrl} variant="rounded" sx={{ width: 13, height: 13 }} />
                : <LocationOn sx={{ fontSize: 13, color: 'text.secondary' }} />}
              <Typography variant="caption" noWrap sx={{ maxWidth: 180 }}>{m.fieldName}</Typography>
            </Box>
          )}
          {m.matchStage && (
            <Chip label={STAGE_LABELS[m.matchStage] ?? m.matchStage} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
          )}
        </Stack>

      </CardContent>
    </Card>
  );
};

export const GameResults: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    matchApi.getMySchedule()
      .then(all => setMatches(all.filter(isFinal)))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (matches.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 8 }}>
        <SportsCricket sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography color="text.secondary">No match results found yet.</Typography>
      </Box>
    );
  }

  const groups = groupByTournament(matches);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <SportsScore color="primary" />
        <Typography variant="h5">Game Results</Typography>
        <Chip label={`${matches.length} match${matches.length !== 1 ? 'es' : ''}`} size="small" variant="outlined" sx={{ ml: 1 }} />
      </Box>

      {groups.map((group, i) => (
        <Box key={group.tournamentId ?? '__none__'} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <EmojiEvents color="action" fontSize="small" />
            <Typography variant="subtitle1" fontWeight="bold">{group.tournamentName}</Typography>
            <Chip label={group.matches.length} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
          </Stack>

          {group.matches.map(m => (
            <ResultRow key={m.matchId} match={m} />
          ))}

          {i < groups.length - 1 && <Divider sx={{ mt: 2 }} />}
        </Box>
      ))}
    </Box>
  );
};
