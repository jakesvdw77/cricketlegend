import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Avatar, CircularProgress, Alert,
  Card, CardContent, Grid, Divider, IconButton, Tooltip,
} from '@mui/material';
import { ArrowBack, Language, Email, Phone, Person } from '@mui/icons-material';
import { tournamentApi } from '../../api/tournamentApi';
import { Tournament } from '../../types';

export const TournamentSponsors: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    tournamentApi.findById(+tournamentId)
      .then(setTournament)
      .catch(() => setError('Failed to load sponsors.'))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  const sponsors = tournament?.sponsors ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/tournaments')} size="small">
          Tournaments
        </Button>
      </Box>

      <Typography variant="h5" gutterBottom>
        {tournament?.name} — Sponsors
      </Typography>

      {sponsors.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No sponsors listed for this tournament.
        </Typography>
      ) : (
        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          {sponsors.map(s => (
            <Grid item xs={12} sm={6} md={4} key={s.sponsorId}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar
                      src={s.brandLogoUrl}
                      variant="rounded"
                      sx={{ width: 56, height: 56, flexShrink: 0 }}
                    >
                      {s.name.charAt(0)}
                    </Avatar>
                    <Typography variant="h6" sx={{ lineHeight: 1.3 }}>{s.name}</Typography>
                  </Box>

                  {(s.contactPerson || s.contactNumber || s.contactEmail || s.brandWebsite) && (
                    <>
                      <Divider sx={{ mb: 1.5 }} />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {s.contactPerson && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{s.contactPerson}</Typography>
                          </Box>
                        )}
                        {s.contactNumber && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{s.contactNumber}</Typography>
                          </Box>
                        )}
                        {s.contactEmail && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{s.contactEmail}</Typography>
                          </Box>
                        )}
                        {s.brandWebsite && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Language sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Tooltip title={s.brandWebsite}>
                              <Typography
                                variant="body2"
                                component="a"
                                href={s.brandWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                              >
                                {s.brandWebsite}
                              </Typography>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
