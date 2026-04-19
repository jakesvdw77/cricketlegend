import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Card, CardContent, Avatar,
  Chip, Divider, CircularProgress, Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { tournamentApi } from '../../api/tournamentApi';
import { teamApi } from '../../api/teamApi';
import { Tournament, Team } from '../../types';

export const TournamentPools: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teamsMap, setTeamsMap] = useState<Map<number, Team>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    Promise.all([
      tournamentApi.findById(+tournamentId),
      teamApi.findAll(),
    ])
      .then(([t, allTeams]) => {
        setTournament(t);
        setTeamsMap(new Map(allTeams.map(team => [team.teamId!, team])));
      })
      .catch(() => setError('Failed to load tournament pools.'))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }
  if (error || !tournament) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error ?? 'Tournament not found.'}</Alert>;
  }

  const pools = tournament.pools ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} size="small">
          Back
        </Button>
        <Typography variant="h5">{tournament.name} — Pools</Typography>
        {tournament.cricketFormat && <Chip label={tournament.cricketFormat} size="small" />}
      </Box>

      {pools.length === 0 && (
        <Typography color="text.secondary">No pools have been set up for this tournament.</Typography>
      )}

      {pools.map(pool => {
        const poolTeams = (pool.teams ?? [])
          .map(t => teamsMap.get(t.teamId!))
          .filter((t): t is Team => !!t);

        return (
          <Box key={pool.poolId} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>{pool.poolName}</Typography>
            <Divider sx={{ mb: 2 }} />

            {poolTeams.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No teams assigned to this pool.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {poolTeams.map(team => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={team.teamId}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <Avatar
                            src={team.logoUrl}
                            variant="rounded"
                            sx={{ width: 48, height: 48, flexShrink: 0 }}
                          >
                            {team.teamName.charAt(0)}
                          </Avatar>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                            {team.teamName}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {team.associatedClubName && (
                            <Row label="Club" value={team.associatedClubName} />
                          )}
                          {team.captainName && (
                            <Row label="Captain" value={team.captainName} />
                          )}
                          {team.coach && (
                            <Row label="Coach" value={team.coach} />
                          )}
                          {team.manager && (
                            <Row label="Manager" value={team.manager} />
                          )}
                          {team.homeFieldName && (
                            <Row label="Home field" value={team.homeFieldName} />
                          )}
                        </Box>

                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box sx={{ display: 'flex', gap: 0.5 }}>
    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>{label}:</Typography>
    <Typography variant="caption">{value}</Typography>
  </Box>
);
