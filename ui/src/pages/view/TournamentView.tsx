import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActions, Avatar,
  Chip, Divider, Button, CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, SportsCricket, Language, Facebook,
  PictureAsPdf, AppRegistration, Groups, AttachMoney, Leaderboard, Assignment, Handshake,
} from '@mui/icons-material';
import { tournamentApi } from '../../api/tournamentApi';
import { Tournament } from '../../types';

export const TournamentView: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    tournamentApi.findAll()
      .then(setTournaments)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Tournaments</Typography>
      {tournaments.length === 0 && (
        <Typography color="text.secondary">No tournaments available.</Typography>
      )}
      <Grid container spacing={3}>
        {tournaments.map(t => (
          <Grid item xs={12} sm={6} md={4} key={t.tournamentId}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>

                {/* Header: logo + name + format */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar src={t.logoUrl} variant="rounded" sx={{ width: 52, height: 52, flexShrink: 0 }}>
                    {t.name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{t.name}</Typography>
                    {t.cricketFormat && (
                      <Chip
                        icon={<SportsCricket sx={{ fontSize: '14px !important' }} />}
                        label={t.cricketFormat}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </Box>
                </Box>

                {t.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {t.description}
                  </Typography>
                )}

                <Divider sx={{ my: 1 }} />

                {/* Dates */}
                {(t.startDate || t.endDate) && (
                  <InfoRow icon={<CalendarMonth fontSize="small" color="action" />}>
                    {t.startDate ?? '?'} — {t.endDate ?? '?'}
                  </InfoRow>
                )}

                {/* Pools */}
                {(t.pools?.length ?? 0) > 0 && (
                  <InfoRow icon={<Groups fontSize="small" color="action" />}>
                    {t.pools!.length} pool{t.pools!.length !== 1 ? 's' : ''}
                    {' · '}
                    {t.pools!.reduce((n, p) => n + (p.teams?.length ?? 0), 0)} teams
                  </InfoRow>
                )}


                {/* Winner */}
                {t.winningTeamName && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmojiEvents sx={{ color: 'warning.main', fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={700}>{t.winningTeamName}</Typography>
                      <Typography variant="caption" color="text.secondary">Tournament Winner</Typography>
                    </Box>
                  </>
                )}

                {/* Sponsors */}
                {(t.sponsors?.length ?? 0) > 0 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {t.sponsors!.map(s => (
                        <Chip key={s.sponsorId} label={s.name} size="small" icon={<EmojiEvents sx={{ fontSize: '13px !important' }} />} variant="outlined" />
                      ))}
                    </Box>
                  </>
                )}
              </CardContent>

              <Divider />

              <CardActions sx={{ justifyContent: 'space-between', px: 1.5, py: 1 }}>
                {/* Link icons */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {t.websiteLink && (
                    <Tooltip title="Website">
                      <IconButton size="small" component="a" href={t.websiteLink} target="_blank" rel="noopener noreferrer">
                        <Language fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {t.facebookLink && (
                    <Tooltip title="Facebook">
                      <IconButton size="small" component="a" href={t.facebookLink} target="_blank" rel="noopener noreferrer" sx={{ color: '#1877F2' }}>
                        <Facebook fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {t.playingConditionsUrl && (
                    <Tooltip title="Playing Conditions">
                      <IconButton size="small" component="a" href={t.playingConditionsUrl} target="_blank" rel="noopener noreferrer" color="error">
                        <PictureAsPdf fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {t.registrationPageUrl && (
                    <Tooltip title="Register">
                      <IconButton size="small" component="a" href={t.registrationPageUrl} target="_blank" rel="noopener noreferrer" color="success">
                        <AppRegistration fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {(t.pools?.length ?? 0) > 0 && (
                    <Button size="small" startIcon={<Groups />} onClick={() => navigate(`/tournaments/${t.tournamentId}/pools`)}>
                      Pools
                    </Button>
                  )}
                  {(t.pools?.length ?? 0) > 0 && (
                    <Button size="small" startIcon={<Leaderboard />} onClick={() => navigate(`/tournaments/${t.tournamentId}/standings`)}>
                      Standings
                    </Button>
                  )}
                  <Button size="small" startIcon={<Assignment />} onClick={() => navigate(`/tournaments/${t.tournamentId}/results`)}>
                    Results
                  </Button>
                  {(t.sponsors?.length ?? 0) > 0 && (
                    <Button size="small" startIcon={<Handshake />} onClick={() => navigate(`/tournaments/${t.tournamentId}/sponsors`)}>
                      Sponsors
                    </Button>
                  )}
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mt: 0.75 }}>
    <Box sx={{ mt: '1px', flexShrink: 0 }}>{icon}</Box>
    <Typography variant="body2" color="text.secondary">{children}</Typography>
  </Box>
);

const FeeChip: React.FC<{ label: string; amount: number }> = ({ label, amount }) => (
  <Chip label={`${label}: R${amount.toLocaleString()}`} size="small" variant="outlined" />
);
