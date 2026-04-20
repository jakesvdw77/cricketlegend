import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Box, Typography, Button, AppBar, Toolbar, Avatar, Card, CardContent,
  Chip, Divider, Grid, Container, Paper, Fade, Collapse, IconButton, useTheme,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, LocationOn, AccessTime, Login, SportsCricket,
  PhotoLibrary, FiberManualRecord, Handshake, Language, ExpandMore, CheckCircle, Facebook,
  AccountBalance, Groups, HowToVote,
} from '@mui/icons-material';
import { matchApi } from '../api/matchApi';
import { sponsorApi } from '../api/sponsorApi';
import { mediaApi } from '../api/mediaApi';
import { tournamentApi } from '../api/tournamentApi';
import { socialMediaPageApi } from '../api/socialMediaPageApi';
import { Match, MatchResultSummary, Sponsor, MediaContent, Tournament, SocialMediaPage } from '../types';
import { MediaCarousel } from '../components/media/MediaCarousel';
import { SocialMediaPageEmbed } from '../components/SocialMediaPageEmbed';
import keycloak from '../keycloak';

const STAGE_LABEL: Record<string, string> = { POOL: 'Pool', SEMI_FINAL: 'Semi-Final', FINAL: 'Final' };

// ── Countdown hook ───────────────────────────────────────────────────────────

function parseMatchStart(matchDate?: string, startTime?: string): Date | null {
  if (!matchDate) return null;
  const iso = startTime ? `${matchDate}T${startTime}` : `${matchDate}T00:00:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function useCountdown(target: Date | null) {
  const calc = () => {
    if (!target) return null;
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000)  / 60_000),
      seconds: Math.floor((diff % 60_000)     / 1_000),
    };
  };

  const [left, setLeft] = useState(calc);

  useEffect(() => {
    if (!target) return;
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [target?.getTime()]);

  return left;
}

// ── Countdown display ────────────────────────────────────────────────────────

const CountdownDisplay: React.FC<{ matchDate?: string; startTime?: string }> = ({ matchDate, startTime }) => {
  const target = useMemo(() => parseMatchStart(matchDate, startTime), [matchDate, startTime]);
  const left   = useCountdown(target);

  if (!left) return null;

  const units = left.days > 0
    ? [{ v: left.days, l: 'd' }, { v: left.hours, l: 'h' }, { v: left.minutes, l: 'm' }]
    : [{ v: left.hours, l: 'h' }, { v: left.minutes, l: 'm' }, { v: left.seconds, l: 's' }];

  return (
    <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
      <AccessTime sx={{ fontSize: 13, color: 'text.secondary' }} />
      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.25 }}>Starts in</Typography>
      {units.map(({ v, l }, i) => (
        <React.Fragment key={l}>
          {i > 0 && <Typography variant="caption" color="text.secondary">:</Typography>}
          <Box sx={{
            bgcolor: 'primary.main', color: 'primary.contrastText',
            borderRadius: 1, px: 0.75, py: 0.25, minWidth: 32, textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}>
            <Typography variant="caption" fontWeight="bold" lineHeight={1.2} display="block">
              {String(v).padStart(2, '0')}
            </Typography>
            <Typography sx={{ fontSize: '0.55rem', opacity: 0.8, lineHeight: 1 }}>{l}</Typography>
          </Box>
        </React.Fragment>
      ))}
    </Box>
  );
};

// ── Shared match card ────────────────────────────────────────────────────────

const MatchCard: React.FC<{ m: Match; live?: boolean }> = ({ m, live }) => (
  <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, position: 'relative', overflow: 'visible', bgcolor: 'background.paper' }}>
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

      {!live && (
        <CountdownDisplay matchDate={m.matchDate} startTime={m.scheduledStartTime} />
      )}
    </CardContent>
  </Card>
);

// ── Result card ──────────────────────────────────────────────────────────────

const ResultCard: React.FC<{ r: MatchResultSummary }> = ({ r }) => {
  const scoreLine = (score?: number, wickets?: number, overs?: string) =>
    score != null ? `${score}/${wickets ?? 0}${overs ? ` (${overs})` : ''}` : null;

  const firstScore  = scoreLine(r.scoreBattingFirst,  r.wicketsLostBattingFirst,  r.oversBattingFirst);
  const secondScore = scoreLine(r.scoreBattingSecond, r.wicketsLostBattingSecond, r.oversBattingSecond);

  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, bgcolor: 'background.paper' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary">{r.matchDate?.toString()}</Typography>
          {r.matchDrawn
            ? <Chip label="Draw" size="small" variant="outlined" />
            : r.winningTeamName && (
              <Chip icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} label={r.winningTeamName} size="small" color="success" variant="outlined" />
            )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="bold" textAlign="right" sx={{ flex: 1 }}>
            {r.homeTeamName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>vs</Typography>
          <Typography variant="subtitle1" fontWeight="bold" textAlign="left" sx={{ flex: 1 }}>
            {r.oppositionTeamName}
          </Typography>
        </Box>

        {(firstScore || secondScore) && (
          <>
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {firstScore && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{r.sideBattingFirstName}</Typography>
                  <Typography variant="body2" fontWeight="bold">{firstScore}</Typography>
                </Box>
              )}
              {secondScore && r.sideBattingFirstName && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {r.homeTeamName === r.sideBattingFirstName ? r.oppositionTeamName : r.homeTeamName}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">{secondScore}</Typography>
                </Box>
              )}
            </Box>
          </>
        )}

        {r.matchOutcomeDescription && (
          <Typography variant="caption" color="text.secondary" display="block" mt={1} sx={{ fontStyle: 'italic' }}>
            {r.matchOutcomeDescription}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// ── Tournament countdown ─────────────────────────────────────────────────────

const TournamentCountdown: React.FC<{ tournament: Tournament; outlineSx: object }> = ({ tournament, outlineSx }) => {
  const target = useMemo(() => {
    if (!tournament.startDate) return null;
    const d = new Date(`${tournament.startDate}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }, [tournament.startDate]);

  const left = useCountdown(target);
  if (!left) return null;

  const startLabel = target
    ? target.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const units = [
    { value: left.days,    label: 'Days' },
    { value: left.hours,   label: 'Hours' },
    { value: left.minutes, label: 'Minutes' },
    { value: left.seconds, label: 'Seconds' },
  ];

  return (
    <Box sx={{
      py: { xs: 3, md: 4 },
      bgcolor: 'background.paper',
      textAlign: 'center',
    }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: { xs: 1.5, sm: 3 } }}>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 3, fontSize: '0.65rem', display: 'block' }}>
              Next Tournament
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="primary" sx={{ lineHeight: 1.2, ...outlineSx }}>
              {tournament.name}
            </Typography>
            {startLabel && (
              <Typography variant="caption" color="text.secondary">
                {startLabel}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
            {units.map(({ value, label }, i) => (
              <React.Fragment key={label}>
                {i > 0 && (
                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: 'text.disabled', mt: 0.25, lineHeight: 1 }}>
                    :
                  </Typography>
                )}
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{
                    bgcolor: 'primary.main',
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                    minWidth: 44,
                  }}>
                    <Typography sx={{
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      lineHeight: 1,
                      color: 'primary.contrastText',
                    }}>
                      {String(value).padStart(2, '0')}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1, textTransform: 'uppercase', mt: 0.5, display: 'block', fontSize: '0.55rem' }}>
                    {label}
                  </Typography>
                </Box>
              </React.Fragment>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<MatchResultSummary[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [allMedia, setAllMedia] = useState<MediaContent[]>([]);
  const [nextTournament, setNextTournament] = useState<Tournament | null>(null);
  const [socialMediaPages, setSocialMediaPages] = useState<SocialMediaPage[]>([]);
  const [sponsorIndex, setSponsorIndex] = useState(0);
  const [sponsorVisible, setSponsorVisible] = useState(true);
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    matchApi.findUpcoming().then(setUpcomingMatches).catch(() => {});
    matchApi.findLive().then(setLiveMatches).catch(() => {});
    matchApi.findRecentResults(6).then(setRecentResults).catch(() => {});
    sponsorApi.findAll().then(setSponsors).catch(() => {});
    socialMediaPageApi.findEnabled().then(setSocialMediaPages).catch(() => {});
    tournamentApi.findAll().then(async all => {
      const today = new Date(); today.setHours(0, 0, 0, 0);

      // Active or upcoming tournaments (not yet ended)
      const relevant = all.filter(t => {
        if (!t.startDate) return false;
        const end = t.endDate ? new Date(`${t.endDate}T23:59:59`) : null;
        return end === null || end >= today;
      });

      // Fetch media for each relevant tournament and combine
      if (relevant.length > 0) {
        const results = await Promise.all(
          relevant.map(t => mediaApi.search({ tournamentId: t.tournamentId }).catch(() => []))
        );
        setAllMedia(results.flat());
      }

      // Next upcoming tournament (not yet started)
      const next = all
        .filter(t => t.startDate && new Date(`${t.startDate}T00:00:00`) > today)
        .sort((a, b) => a.startDate!.localeCompare(b.startDate!));
      setNextTournament(next[0] ?? null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (sponsors.length <= 1) return;
    rotateRef.current = setInterval(() => {
      setSponsorVisible(false);
      setTimeout(() => {
        setSponsorIndex(i => (i + 1) % sponsors.length);
        setSponsorVisible(true);
      }, 400);
    }, 4000);
    return () => { if (rotateRef.current) clearInterval(rotateRef.current); };
  }, [sponsors.length]);

  const [infoOpen, setInfoOpen] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const outlineSx = isDark
    ? {
        color: '#dce8dc',
        WebkitTextStroke: '1px #4fa83a',
        textShadow: '0 0 6px rgba(79,168,58,0.25)',
      }
    : {};

  const handleLogin = () => keycloak.login();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Navbar */}
      <AppBar position="sticky" elevation={2}>
        <Toolbar sx={{ gap: 1 }}>
          <SportsCricket sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
            Cricket Legend
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Login />}
            onClick={handleLogin}
            sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            Login
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box sx={{
        background: isDark
          ? 'linear-gradient(135deg, #0e1f0e 0%, #1a3a1a 100%)'
          : `linear-gradient(135deg, #1a5276 0%, #1a5276 60%, #28b463 100%)`,
        color: 'white',
        py: { xs: 3, md: 4 },
        textAlign: 'center',
      }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <SportsCricket sx={{ fontSize: 36, opacity: 0.9 }} />
            <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, ...outlineSx }}>
              Cricket Legend
            </Typography>
          </Box>
          {/* Feature highlights */}
          <Box sx={{ bgcolor: 'background.paper' }}>
            <Container maxWidth="lg">
              <Box
                  onClick={() => setInfoOpen(o => !o)}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 1, cursor: 'pointer', py: 3, userSelect: 'none',
                  }}
              >
                <Typography variant="h5" fontWeight="bold" color="primary" sx={outlineSx}>
                  Everything you need for cricket
                </Typography>
                <IconButton size="small" sx={{ color: 'primary.main', transition: 'transform 0.25s', transform: infoOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <ExpandMore />
                </IconButton>
              </Box>
              <Collapse in={infoOpen} timeout={300}>
                <Box sx={{ pb: 6 }}>
                  <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}>
                    Manage tournaments, track results, view standings, and stay up to date with upcoming fixtures all in one place.
                  </Typography>
                  <Grid container spacing={3} justifyContent="center">
                    {[
                      { icon: <EmojiEvents sx={{ fontSize: 40, color: 'secondary.main' }} />, title: 'Tournaments', desc: 'Create and manage tournaments with pools, standings and results.' },
                      { icon: <CalendarMonth sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Fixtures', desc: 'Schedule matches, assign grounds and umpires, and track upcoming games.' },
                      { icon: <SportsCricket sx={{ fontSize: 40, color: 'secondary.main' }} />, title: 'Scorecards', desc: 'Full match results, scorecards and player statistics in one place.' },
                      { icon: <AccountBalance sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Financials', desc: 'Track match fees, payments and wallet balances for players and clubs.' },
                      { icon: <Groups sx={{ fontSize: 40, color: 'secondary.main' }} />, title: 'Team Management & Selection', desc: 'Manage squads, select teamsheets and organise player roles for every match.' },
                      { icon: <HowToVote sx={{ fontSize: 40, color: 'primary.main' }} />, title: 'Availability Polls', desc: 'Send availability polls to players and build your squad with confidence.' },
                    ].map(f => (
                        <Grid item xs={12} sm={6} md={4} key={f.title}>
                          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%', borderRadius: 2, bgcolor: 'background.paper' }}>
                            {f.icon}
                            <Typography variant="h6" fontWeight="bold" mt={1}>{f.title}</Typography>
                            <Typography variant="body2" color="text.secondary" mt={0.5}>{f.desc}</Typography>
                          </Paper>
                        </Grid>
                    ))}
                  </Grid>
                </Box>
              </Collapse>
            </Container>
          </Box>
        </Container>
      </Box>

      <Divider sx={{ borderColor: 'primary.main', opacity: 0.25 }} />

      {/* Tournament Countdown */}
      {nextTournament && <TournamentCountdown tournament={nextTournament} outlineSx={outlineSx} />}

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <>
        <Divider sx={{ borderColor: 'primary.main', opacity: 0.25 }} />
        <Box sx={{ py: 8 }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
              <Chip
                icon={<FiberManualRecord sx={{ fontSize: '10px !important' }} />}
                label="LIVE"
                size="small"
                sx={{ bgcolor: '#e53935', color: 'white', fontWeight: 700, '& .MuiChip-icon': { color: 'white' } }}
              />
              <Typography variant="h4" fontWeight="bold" color="primary" sx={outlineSx}>
                Live Matches
              </Typography>
            </Box>
            <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
              Matches happening today.
            </Typography>
            <Grid container spacing={2}>
              {liveMatches.map(m => (
                <Grid item xs={12} sm={6} md={4} key={m.matchId}>
                  <MatchCard m={m} live />
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
        </>
      )}

      <Divider sx={{ borderColor: 'primary.main', opacity: 0.25 }} />

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <Box sx={{ py: 8, bgcolor: 'background.default' }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <EmojiEvents color="primary" />
              <Typography variant="h4" fontWeight="bold" color="primary" sx={outlineSx}>
                Recent Results
              </Typography>
            </Box>
            <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
              Latest completed match outcomes.
            </Typography>
            <Grid container spacing={2}>
              {recentResults.map(r => (
                <Grid item xs={12} sm={6} md={4} key={r.matchId}>
                  <ResultCard r={r} />
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      )}

      <Divider sx={{ borderColor: 'primary.main', opacity: 0.25 }} />

      {/* Upcoming Matches */}
      <Box sx={{ py: 8, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom color="primary" sx={outlineSx}>
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

      <Divider sx={{ borderColor: 'primary.main', opacity: 0.25 }} />

      {/* Media Gallery */}
      {allMedia.length > 0 && (
        <Box sx={{ py: 8, bgcolor: 'background.paper' }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <PhotoLibrary color="primary" />
              <Typography variant="h4" fontWeight="bold" color="primary" sx={outlineSx}>
                Media Gallery
              </Typography>
            </Box>
            <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
              Photos and highlights from our matches and tournaments.
            </Typography>
            <MediaCarousel items={allMedia} height={480} />
          </Container>
        </Box>
      )}

      <Divider sx={{ borderColor: 'primary.main', opacity: 0.25 }} />

      {/* Facebook Pages */}
      {socialMediaPages.length > 0 && (
        <Box sx={{ py: 6, bgcolor: 'background.default' }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
              <Facebook sx={{ color: '#1877F2' }} />
              <Typography variant="h5" fontWeight="bold" color="primary" sx={outlineSx}>
                Follow Us
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
              {socialMediaPages.map(page => (
                <SocialMediaPageEmbed key={page.id} url={page.url} label={page.label} />
              ))}
            </Box>
          </Container>
        </Box>
      )}

      <Divider sx={{ borderColor: 'primary.main', opacity: 0.25 }} />

      {/* Sponsors */}
      {sponsors.length > 0 && (
          <Box sx={{ py: 6, bgcolor: 'background.paper' }}>
            <Container maxWidth="sm">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
                <Handshake color="primary" />
                <Typography variant="h5" fontWeight="bold" color="primary" sx={outlineSx}>
                  Our Sponsors
                </Typography>
              </Box>
              <Fade in={sponsorVisible} timeout={400}>
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2.5, bgcolor: 'background.paper' }}
                >
                  <Avatar
                      src={sponsors[sponsorIndex].brandLogoUrl}
                      variant="rounded"
                      sx={{ width: 64, height: 64, flexShrink: 0 }}
                  >
                    {sponsors[sponsorIndex].name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {sponsors[sponsorIndex].name}
                    </Typography>
                    {sponsors[sponsorIndex].brandWebsite && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <Language sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography
                              variant="body2"
                              component="a"
                              href={sponsors[sponsorIndex].brandWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {sponsors[sponsorIndex].brandWebsite}
                          </Typography>
                        </Box>
                    )}
                  </Box>
                  {sponsors.length > 1 && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        {sponsors.map((_, i) => (
                            <Box
                                key={i}
                                sx={{
                                  width: 6, height: 6, borderRadius: '50%',
                                  bgcolor: i === sponsorIndex ? 'primary.main' : 'action.disabled',
                                  transition: 'background-color 0.3s',
                                  cursor: 'pointer',
                                }}
                                onClick={() => { setSponsorVisible(false); setTimeout(() => { setSponsorIndex(i); setSponsorVisible(true); }, 400); }}
                            />
                        ))}
                      </Box>
                  )}
                </Paper>
              </Fade>
            </Container>
          </Box>
      )}

      {/* Footer */}
      <Box sx={{
        background: isDark
          ? 'linear-gradient(135deg, #0e1f0e 0%, #1a3a1a 100%)'
          : 'linear-gradient(135deg, #1a5276 0%, #1a5276 60%, #28b463 100%)',
        color: 'rgba(255,255,255,0.7)',
        py: 3,
        textAlign: 'center',
      }}>
        <Typography variant="body2">
          © {new Date().getFullYear()} Cricket Legend. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};
