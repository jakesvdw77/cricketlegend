import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar, Box, Button, Chip, CircularProgress, Container, Divider, Tab, Tabs, Typography,
} from '@mui/material';
import {
  ArrowBack, CalendarMonth, FiberManualRecord, GridView, TableRows,
} from '@mui/icons-material';
import { tournamentApi } from '../../api/tournamentApi';
import { matchApi } from '../../api/matchApi';
import { Match, MatchResultSummary, Tournament } from '../../types';
import keycloak from '../../keycloak';
import { TournamentScheduleTab } from '../../components/admin/TournamentScheduleTab';
import { MatchScheduleVisual } from '../../components/admin/MatchScheduleVisual';

export const TournamentSchedule: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const id = Number(tournamentId);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<MatchResultSummary[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [viewTab, setViewTab] = useState(0);

  useEffect(() => {
    tournamentApi.findById(id)
      .then(setTournament)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setMatchesLoading(true);
    Promise.all([
      matchApi.findByTournament(id),
      matchApi.findResultsByTournament(id),
    ])
      .then(([ms, rs]) => {
        setMatches(
          [...ms].sort((a, b) => {
            const dc = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
            return dc !== 0 ? dc : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
          }),
        );
        setResults(rs);
      })
      .finally(() => setMatchesLoading(false));
  }, [id]);

  const resultMap = useMemo(() => new Map(results.map(r => [r.matchId, r])), [results]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }
  if (!tournament) {
    return <Typography textAlign="center" mt={6} color="text.secondary">Tournament not found.</Typography>;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const isLive = !!tournament.startDate && tournament.startDate <= todayStr
    && (!tournament.endDate || tournament.endDate >= todayStr);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} variant="outlined" size="small">
            Back
          </Button>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Avatar src={tournament.logoUrl} variant="rounded" sx={{ width: 52, height: 52 }}>
                {tournament.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{tournament.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                  {tournament.cricketFormat && <Chip label={tournament.cricketFormat} size="small" />}
                  {isLive && (
                    <Chip
                      icon={<FiberManualRecord sx={{ fontSize: '10px !important' }} />}
                      label="LIVE"
                      size="small"
                      sx={{ bgcolor: '#e53935', color: 'white', '& .MuiChip-icon': { color: 'white' } }}
                    />
                  )}
                  {tournament.startDate && (
                    <Chip
                      icon={<CalendarMonth sx={{ fontSize: '14px !important' }} />}
                      label={tournament.endDate ? `${tournament.startDate} – ${tournament.endDate}` : tournament.startDate}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </Box>
            {tournament.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{tournament.description}</Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 0 }} />

        {/* View tabs */}
        <Tabs
          value={viewTab}
          onChange={(_, v) => setViewTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab
            icon={<TableRows sx={{ fontSize: 17 }} />}
            iconPosition="start"
            label="Table View"
            sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            icon={<GridView sx={{ fontSize: 17 }} />}
            iconPosition="start"
            label="Visual Schedule"
            sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>

        {viewTab === 0 && (
          <TournamentScheduleTab tournament={tournament} />
        )}

        {viewTab === 1 && (
          matchesLoading
            ? <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
            : <MatchScheduleVisual matches={matches} resultMap={resultMap} tournament={tournament} showExport={!!keycloak.authenticated} />
        )}

      </Container>
    </Box>
  );
};
