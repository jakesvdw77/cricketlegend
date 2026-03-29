import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, AppBar, Toolbar, Avatar, Card, CardContent,
  Chip, Divider, Grid, Container, Paper,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, LocationOn, AccessTime, Login, SportsCricket,
  PhotoLibrary, FiberManualRecord,
} from '@mui/icons-material';
import { matchApi } from '../api/matchApi';
import { Match } from '../types';
import keycloak from '../keycloak';

const STAGE_LABEL: Record<string, string> = { POOL: 'Pool', SEMI_FINAL: 'Semi-Final', FINAL: 'Final' };

const today = () => new Date().toISOString().slice(0, 10);
const tenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 10);
  return d.toISOString().slice(0, 10);
};

const isToday = (date?: string) => !!date && date === today();
const isRecent = (date?: string) => !!date && date >= tenDaysAgo() && date < today();

// ── Shared match card ────────────────────────────────────────────────────────

const MatchCard: React.FC<{ m: Match; live?: boolean }> = ({ m, live }) => (
  <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, position: 'relative', overflow: 'visible' }}>
    {live && (
      <Box sx={{
        position: 'absolute', top: -10, right: 12,
        bgcolor: '#e53935', color: 'white',
        borderRadius: 1, px: 1, py: 0.25,
        display: 'flex', alignItems: 'center', gap: 0.4,
        fontSize: '0.7rem', fontWeight: 700, letterSpacing: 0.5,
      }}>
        <FiberManualRecord sx={{ fontSize: 8 }} /> LIVE
      </Box>
    )}
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Chip label={m.tournamentName} size="small" icon={<EmojiEvents />} color="primary" variant="outlined" />
        {m.matchStage && (
          <Chip label={STAGE_LABEL[m.matchStage] ?? m.matchStage} size="small" variant="outlined" />
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, my: 1.5 }}>
        <Avatar src={m.homeTeamLogoUrl} sx={{ width: 40, height: 40 }}>
          {m.homeTeamName?.charAt(0)}
        </Avatar>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>{m.homeTeamName}</Typography>
          <Typography variant="caption" color="text.secondary">vs</Typography>
          <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>{m.oppositionTeamName}</Typography>
        </Box>
        <Avatar src={m.oppositionTeamLogoUrl} sx={{ width: 40, height: 40 }}>
          {m.oppositionTeamName?.charAt(0)}
        </Avatar>
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {m.matchDate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarMonth sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">{m.matchDate}</Typography>
          </Box>
        )}
        {m.tossTime && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">Toss: {m.tossTime}</Typography>
          </Box>
        )}
        {m.scheduledStartTime && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">Start: {m.scheduledStartTime}</Typography>
          </Box>
        )}
        {m.fieldName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography
              variant="body2"
              component={m.fieldGoogleMapsUrl ? 'a' : 'span'}
              href={m.fieldGoogleMapsUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              sx={m.fieldGoogleMapsUrl ? { color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } } : {}}
            >
              {m.fieldName}
            </Typography>
          </Box>
        )}
      </Box>
    </CardContent>
  </Card>
);

// ── Page ─────────────────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [previousMatches, setPreviousMatches] = useState<Match[]>([]);

  useEffect(() => {
    matchApi.findUpcoming().then(setUpcomingMatches).catch(() => {});
    matchApi.findPrevious().then(setPreviousMatches).catch(() => {});
  }, []);

  const handleLogin = () => keycloak.login();

  const liveAndRecent = previousMatches.filter(m => isToday(m.matchDate) || isRecent(m.matchDate));
  const liveMatches = liveAndRecent.filter(m => isToday(m.matchDate));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Navbar */}
      <AppBar position="sticky" sx={{ bgcolor: '#1a5276' }} elevation={2}>
        <Toolbar sx={{ gap: 1 }}>
          <SportsCricket sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
            Cricket Legend
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Login />}
            onClick={handleLogin}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            Login
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1a5276 0%, #1a5276 60%, #28b463 100%)',
        color: 'white',
        py: { xs: 8, md: 12 },
        textAlign: 'center',
      }}>
        <Container maxWidth="md">
          <SportsCricket sx={{ fontSize: 72, mb: 2, opacity: 0.9 }} />
          <Typography variant="h2" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '2.2rem', md: '3.5rem' } }}>
            Cricket Legend
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.85, mb: 4, fontWeight: 400 }}>
            Your complete cricket management platform — fixtures, results, standings and more.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<Login />}
            onClick={handleLogin}
            sx={{ bgcolor: '#28b463', '&:hover': { bgcolor: '#1e8449' }, px: 4, py: 1.5, fontSize: '1rem', borderRadius: 2 }}
          >
            Sign In to the App
          </Button>
        </Container>
      </Box>

      {/* Feature highlights */}
      <Box sx={{ py: 8, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom color="primary">
            Everything you need for cricket
          </Typography>
          <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}>
            Manage tournaments, track results, view standings, and stay up to date with upcoming fixtures all in one place.
          </Typography>
          <Grid container spacing={3} justifyContent="center">
            {[
              { icon: <EmojiEvents sx={{ fontSize: 40, color: '#28b463' }} />, title: 'Tournaments', desc: 'Create and manage tournaments with pools, standings and results.' },
              { icon: <CalendarMonth sx={{ fontSize: 40, color: '#1a5276' }} />, title: 'Fixtures', desc: 'Schedule matches, assign grounds and umpires, and track upcoming games.' },
              { icon: <SportsCricket sx={{ fontSize: 40, color: '#28b463' }} />, title: 'Scorecards', desc: 'Full match results, scorecards and player statistics in one place.' },
            ].map(f => (
              <Grid item xs={12} sm={6} md={4} key={f.title}>
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%', borderRadius: 2 }}>
                  {f.icon}
                  <Typography variant="h6" fontWeight="bold" mt={1}>{f.title}</Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>{f.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Live & Recent Matches */}
      {liveAndRecent.length > 0 && (
        <Box sx={{ py: 8 }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
              {liveMatches.length > 0 && (
                <Chip
                  icon={<FiberManualRecord sx={{ fontSize: '10px !important' }} />}
                  label="LIVE"
                  size="small"
                  sx={{ bgcolor: '#e53935', color: 'white', fontWeight: 700, '& .MuiChip-icon': { color: 'white' } }}
                />
              )}
              <Typography variant="h4" fontWeight="bold" color="primary">
                Live &amp; Recent Matches
              </Typography>
            </Box>
            <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
              Matches played today or in the last 10 days.
            </Typography>
            <Grid container spacing={2}>
              {liveAndRecent.map(m => (
                <Grid item xs={12} sm={6} md={4} key={m.matchId}>
                  <MatchCard m={m} live={isToday(m.matchDate)} />
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      )}

      {/* Upcoming Matches */}
      <Box sx={{ py: 8, bgcolor: liveAndRecent.length > 0 ? 'grey.50' : undefined }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom color="primary">
            Upcoming Matches
          </Typography>
          <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
            Stay up to date with what's on the schedule.
          </Typography>
          {upcomingMatches.length === 0 ? (
            <Typography textAlign="center" color="text.secondary">
              No upcoming matches scheduled at this time.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {upcomingMatches.map(m => (
                <Grid item xs={12} sm={6} md={4} key={m.matchId}>
                  <MatchCard m={m} />
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>

      {/* Media Gallery */}
      <Box sx={{ py: 8, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <PhotoLibrary color="primary" />
            <Typography variant="h4" fontWeight="bold" color="primary">
              Media Gallery
            </Typography>
          </Box>
          <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
            Photos and highlights from our matches and tournaments.
          </Typography>
          <Box sx={{ border: '2px dashed', borderColor: 'grey.300', borderRadius: 3, py: 8, textAlign: 'center', color: 'text.disabled' }}>
            <PhotoLibrary sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6">No photos yet</Typography>
            <Typography variant="body2">Match and tournament photos will appear here.</Typography>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1a5276', color: 'rgba(255,255,255,0.7)', py: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          © {new Date().getFullYear()} Cricket Legend. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};
