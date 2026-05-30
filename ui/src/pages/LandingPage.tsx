import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, AppBar, Toolbar, Avatar, Card, CardContent,
  Chip, Divider, Grid, Container, IconButton, useTheme, Tooltip, Skeleton,
  Dialog, DialogTitle, DialogContent,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, Login, SportsCricket,
  Handshake, Language, Facebook, Close, Instagram, YouTube, OpenInNew,
  AccountBalance, Groups, HowToVote, AppRegistration,
  LightMode, DarkMode, FiberManualRecord, ChevronRight, Tune,
  Image as ImageIcon,
} from '@mui/icons-material';
import { SchedulePickerDialog } from '../components/SchedulePickerDialog';
import { useColorMode } from '../context/ColorModeContext';
import { matchApi } from '../api/matchApi';
import { sponsorApi } from '../api/sponsorApi';
import { tournamentApi } from '../api/tournamentApi';
import { socialMediaPageApi } from '../api/socialMediaPageApi';
import { Match, Sponsor, SocialMediaPage, Tournament } from '../types';
import { SocialMediaPageEmbed } from '../components/SocialMediaPageEmbed';
import { useCountdown, CountdownDisplay } from '../components/cricket/shared';
import { TournamentManageDrawer } from '../components/admin/TournamentManageDrawer';
import { useAuth } from '../hooks/useAuth';
import keycloak from '../keycloak';

// ── NavCountdown (compact navbar widget) ─────────────────────────────────────

const NavCountdown: React.FC<{ tournament: Tournament }> = ({ tournament }) => {
  const target = useMemo(() => {
    if (!tournament.startDate) return null;
    const d = new Date(`${tournament.startDate}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }, [tournament.startDate]);
  const left = useCountdown(target);
  if (!left) return null;
  const units = [
    { v: left.days,    l: 'd' },
    { v: left.hours,   l: 'h' },
    { v: left.minutes, l: 'm' },
    { v: left.seconds, l: 's' },
  ];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mr: 1, pl: 1.5, borderRight: '1px solid rgba(255,255,255,0.18)' }}>
      <Box sx={{ display: { sm: 'none', md: 'block' }, textAlign: 'right' }}>
        <Typography sx={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.5, lineHeight: 1 }}>Next</Typography>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, opacity: 0.9, lineHeight: 1.3, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tournament.name}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.35 }}>
        {units.map(({ v, l }, i) => (
          <React.Fragment key={l}>
            {i > 0 && <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.35, lineHeight: 1, mt: '3px' }}>:</Typography>}
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.12)', borderRadius: '4px', px: 0.6, py: '3px', minWidth: 26 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {String(v).padStart(2, '0')}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.48rem', opacity: 0.45, lineHeight: 1, mt: '2px', display: 'block' }}>{l}</Typography>
            </Box>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

// ── TournamentDirectoryCard ───────────────────────────────────────────────────

const TournamentCardSkeleton: React.FC = () => (
  <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', width: '100%', minHeight: 230 }}>
    <Skeleton variant="rectangular" height={150} />
    <CardContent sx={{ py: 1.25, px: 1.5 }}>
      <Skeleton width="60%" height={14} sx={{ mb: 0.75 }} />
      <Skeleton width="45%" height={14} />
    </CardContent>
    <Divider />
    <Box sx={{ p: 1.5 }}><Skeleton variant="rounded" height={32} /></Box>
  </Card>
);

interface TournamentCardProps {
  tournament: Tournament;
  isLive: boolean;
  isPast: boolean;
  featured?: boolean;
  onManage?: (t: Tournament) => void;
}

const TournamentDirectoryCard: React.FC<TournamentCardProps> = ({ tournament, isLive, isPast, featured, onManage }) => {
  const navigate = useNavigate();
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const teamCount = (tournament.pools ?? []).reduce((n, p) => n + (p.teams?.length ?? 0), 0);
  const poolCount = tournament.pools?.length ?? 0;

  const fallbackGradient = isLive
    ? 'linear-gradient(135deg, #0a2e0a 0%, #1a5e1a 100%)'
    : isPast
      ? 'linear-gradient(135deg, #1a1a2e 0%, #2e2e4a 100%)'
      : 'linear-gradient(135deg, #0d3349 0%, #1a5276 100%)';

  return (
    <Card variant="outlined" sx={{
      borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      width: '100%', minHeight: 230,
      transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 },
      ...(isLive ? { borderColor: '#e53935', borderWidth: 2 } : {}),
    }}>
      {/* ── Banner — flex column: [countdown row] → [identity row] ── */}
      <Box
        onClick={() => navigate(`/tournament/${tournament.tournamentId}`)}
        sx={{
          height: featured ? 220 : 150, overflow: 'hidden', flexShrink: 0, position: 'relative',
          background: tournament.bannerUrl ? undefined : fallbackGradient,
          display: 'flex', flexDirection: 'column',
          cursor: 'pointer',
          '&:hover': { filter: 'brightness(1.1)' },
          transition: 'filter 0.2s',
        }}
      >
        {/* Background image (absolute so it doesn't affect flex flow) */}
        {tournament.bannerUrl && (
          <Box component="img" src={tournament.bannerUrl} alt=""
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5)' }} />
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)' }} />

        {/* Row 1 — status badge right-aligned */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1.25, pt: 1.25, position: 'relative', zIndex: 1 }}>
          {isLive ? (
            <Chip
              icon={<FiberManualRecord sx={{ fontSize: '8px !important' }} />}
              label="LIVE"
              size="small"
              sx={{ bgcolor: '#e53935', color: 'white', fontWeight: 700, '& .MuiChip-icon': { color: 'white' } }}
            />
          ) : isPast ? (
            <Chip label="Completed" size="small"
              sx={{ bgcolor: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.75)', fontSize: '0.65rem' }} />
          ) : (
            <CountdownDisplay matchDate={tournament.startDate} startTime="00:00:00" />
          )}
        </Box>

        {/* Row 2 — logo + name + chips, just below the countdown */}
        <Box sx={{
          px: 1.5, pt: 1.25, pb: 1.5,
          display: 'flex', alignItems: 'flex-start', gap: 1.25,
          position: 'relative', zIndex: 1,
        }}>
          <Avatar src={tournament.logoUrl} variant="rounded"
            sx={{ width: featured ? 80 : 44, height: featured ? 80 : 44, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            {tournament.name.charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={700} sx={{
              color: 'white', lineHeight: 1.2, mb: 1.25,
              fontSize: featured ? { xs: '1.4rem', sm: '1.8rem' } : { xs: '0.9rem', sm: '0.95rem' },
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {tournament.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {tournament.cricketFormat && (
                <Chip label={tournament.cricketFormat} size="small"
                  sx={{ height: featured ? 26 : 20, fontSize: featured ? '0.75rem' : '0.65rem',
                    bgcolor: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} />
              )}
              {tournament.ageGroup && (
                <Chip label={tournament.ageGroup} size="small"
                  sx={{ height: featured ? 26 : 20, fontSize: featured ? '0.75rem' : '0.65rem',
                    bgcolor: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} />
              )}
              {tournament.tournamentGender && (
                <Chip label={tournament.tournamentGender} size="small"
                  sx={{ height: featured ? 26 : 20, fontSize: featured ? '0.75rem' : '0.65rem',
                    bgcolor: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Body — dates, teams, winner ── */}
      <CardContent sx={{ flex: 1, py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
        {(tournament.startDate || tournament.endDate) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.6 }}>
            <CalendarMonth sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {tournament.startDate ?? '?'}{tournament.endDate ? ` – ${tournament.endDate}` : ''}
            </Typography>
          </Box>
        )}
        {teamCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.6 }}>
            <Groups sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {teamCount} team{teamCount !== 1 ? 's' : ''}{poolCount > 0 ? ` · ${poolCount} pool${poolCount !== 1 ? 's' : ''}` : ''}
            </Typography>
          </Box>
        )}
        {tournament.winningTeamName && (
          <Chip icon={<EmojiEvents sx={{ fontSize: '13px !important' }} />}
            label={`Winner: ${tournament.winningTeamName}`} size="small" color="success" variant="outlined"
            sx={{ mt: 0.25, height: 22, fontSize: '0.68rem' }} />
        )}
      </CardContent>

      <Divider />
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="small"
          disableElevation
          endIcon={<ChevronRight />}
          onClick={() => navigate(`/tournament/${tournament.tournamentId}`)}
          sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
        >
          View Tournament
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ImageIcon sx={{ fontSize: '14px !important' }} />}
          disabled={!tournament.tournamentId}
          onClick={e => { e.stopPropagation(); setSchedulePickerOpen(true); }}
          sx={{ textTransform: 'none', flexShrink: 0 }}
        >
          Full Schedule
        </Button>
        {onManage && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Tune sx={{ fontSize: '14px !important' }} />}
            onClick={e => { e.stopPropagation(); onManage(tournament); }}
            sx={{ textTransform: 'none', flexShrink: 0 }}
          >
            Manage
          </Button>
        )}

        <SchedulePickerDialog
          tournament={schedulePickerOpen ? tournament : null}
          onClose={() => setSchedulePickerOpen(false)}
        />

        {/* Social icons + Register — right-aligned group */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 'auto' }}>
          {tournament.websiteLink && (
            <Tooltip title="Website">
              <IconButton size="small" component="a" href={tournament.websiteLink} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <OpenInNew sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          {tournament.facebookLink && (
            <Tooltip title="Facebook">
              <IconButton size="small" component="a" href={tournament.facebookLink} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Facebook sx={{ fontSize: 16, color: '#1877F2' }} />
              </IconButton>
            </Tooltip>
          )}
          {tournament.instagramLink && (
            <Tooltip title="Instagram">
              <IconButton size="small" component="a" href={tournament.instagramLink} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Instagram sx={{ fontSize: 16, color: '#E1306C' }} />
              </IconButton>
            </Tooltip>
          )}
          {tournament.youtubeLink && (
            <Tooltip title="YouTube">
              <IconButton size="small" component="a" href={tournament.youtubeLink} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <YouTube sx={{ fontSize: 16, color: '#FF0000' }} />
              </IconButton>
            </Tooltip>
          )}
          {tournament.registrationPageUrl && !isPast && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AppRegistration sx={{ fontSize: '14px !important' }} />}
              component="a"
              href={tournament.registrationPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textTransform: 'none', flexShrink: 0 }}
              onClick={e => e.stopPropagation()}
            >
              Register
            </Button>
          )}
        </Box>
      </Box>
    </Card>
  );
};

// ── DirectorySection ──────────────────────────────────────────────────────────

const DirectorySection: React.FC<{
  title: string;
  icon: React.ReactNode;
  accentColor?: string;
  children: React.ReactNode;
}> = ({ title, icon, accentColor = 'primary.main', children }) => (
  <Box sx={{ mb: 6 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 2, borderLeft: '4px solid', borderColor: accentColor, mb: 3 }}>
      {icon}
      <Typography variant="h5" fontWeight="bold" color="primary">{title}</Typography>
    </Box>
    {children}
  </Box>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [socialMediaPages, setSocialMediaPages] = useState<SocialMediaPage[]>([]);
  const [featureDialog, setFeatureDialog] = useState<{ title: string; desc: string; icon: React.ReactNode } | null>(null);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [liveMatchIndex, setLiveMatchIndex] = useState(0);
  const [manageTournament, setManageTournament] = useState<Tournament | null>(null);

  const { isAdmin } = useAuth();
  const canManage = keycloak.authenticated && isAdmin;

  useEffect(() => {
    if (liveMatches.length <= 1) return;
    const id = setInterval(() => setLiveMatchIndex(i => (i + 1) % liveMatches.length), 4000);
    return () => clearInterval(id);
  }, [liveMatches.length]);

  const theme = useTheme();
  const { mode, toggleMode } = useColorMode();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    sponsorApi.findAll().then(setSponsors).catch(() => {});
    socialMediaPageApi.findEnabled().then(setSocialMediaPages).catch(() => {});
    matchApi.findLive().then(setLiveMatches).catch(() => {});
    tournamentApi.findAll()
      .then(all => setAllTournaments(all.filter(t => t.showOnFrontPage !== false)))
      .catch(() => {})
      .finally(() => setLoadingTournaments(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const nd = (d?: string) => d?.replace(/\//g, '-');

  const liveTournaments = useMemo(() =>
    allTournaments.filter(t => t.startDate && nd(t.startDate)! <= today && (!t.endDate || nd(t.endDate)! >= today)),
    [allTournaments, today],
  );
  const upcomingTournaments = useMemo(() =>
    allTournaments
      .filter(t => t.startDate && nd(t.startDate)! > today)
      .sort((a, b) => nd(a.startDate)!.localeCompare(nd(b.startDate)!)),
    [allTournaments, today],
  );
  const pastTournaments = useMemo(() =>
    allTournaments
      .filter(t => t.endDate && nd(t.endDate)! < today)
      .sort((a, b) => nd(b.endDate)!.localeCompare(nd(a.endDate)!)),
    [allTournaments, today],
  );

  const nextTournament = upcomingTournaments[0] ?? null;
  const heroBg = isDark
    ? 'linear-gradient(160deg, #0a160a 0%, #0e2a0e 50%, #1a3a1a 100%)'
    : 'linear-gradient(160deg, #0d3349 0%, #1a5276 55%, #1e7a4a 100%)';

  const stats = [
    { label: 'Live Now',   value: liveTournaments.length },
    { label: 'Upcoming',   value: upcomingTournaments.length },
    { label: 'Live Matches', value: liveMatches.length },
  ].filter(s => s.value > 0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar sx={{ gap: 1 }}>
          {nextTournament && <NavCountdown tournament={nextTournament} />}
          <Box sx={{ flexGrow: 1 }} />
          {!keycloak.authenticated && (
            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton color="inherit" onClick={toggleMode}>
                {mode === 'dark' ? <LightMode /> : <DarkMode />}
              </IconButton>
            </Tooltip>
          )}
          {!keycloak.authenticated && (
            <Button
              variant="contained"
              disableElevation
              startIcon={<Login />}
              onClick={() => keycloak.login()}
              sx={{ bgcolor: 'rgba(255,255,255,0.35)', color: 'white', fontWeight: 700, '&:hover': { bgcolor: 'rgba(255,255,255,0.5)' } }}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      {!keycloak.authenticated && (
        <Box>
          <Box sx={{ position: 'relative' }}>
            <Box component="img" src="/cricket_banner_1.svg" alt="Cricket Legend"
              sx={{ display: 'block', width: '100%', height: 'auto',
                filter: 'sepia(70%) hue-rotate(65deg) saturate(220%) brightness(0.62)' }} />
            <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.45) 100%)' }} />
          </Box>

          {stats.length > 0 && (
            <Box sx={{ background: heroBg, borderTop: '2px solid rgba(255,255,255,0.08)', py: { xs: 1.25, md: 1.75 } }}>
              <Container maxWidth="md">
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 3, sm: 6 }, flexWrap: 'wrap' }}>
                  {stats.map(s => (
                    <Box key={s.label} sx={{ textAlign: 'center', color: 'white' }}>
                      <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem' }, fontWeight: 800, lineHeight: 1 }}>{s.value}</Typography>
                      <Typography sx={{ fontSize: '0.6rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>{s.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Container>
            </Box>
          )}
        </Box>
      )}

      {/* ── Live match carousel ──────────────────────────────────────────── */}
      {liveMatches.length > 0 && (() => {
        const m = liveMatches[liveMatchIndex] ?? liveMatches[0];
        return (
          <Box sx={{ bgcolor: '#b71c1c', color: 'white', py: 1.25, px: 2 }}>
            <Container maxWidth="lg">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {/* LIVE label */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                  <FiberManualRecord sx={{ fontSize: 10, animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
                  <Typography fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.72rem' }}>Live Now</Typography>
                </Box>

                {/* Rotating match text */}
                <Typography
                  key={liveMatchIndex}
                  variant="body2"
                  sx={{
                    flex: 1,
                    animation: 'fadeIn 0.4s ease-in',
                    '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
                  }}
                >
                  {m.homeTeamName} vs {m.oppositionTeamName}
                  {m.tournamentName && (
                    <Typography component="span" sx={{ opacity: 0.7, fontSize: '0.72rem', ml: 1 }}>
                      · {m.tournamentName}
                    </Typography>
                  )}
                </Typography>

                {/* Dot indicators — only when multiple matches */}
                {liveMatches.length > 1 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    {liveMatches.map((_, i) => (
                      <Box
                        key={i}
                        onClick={() => setLiveMatchIndex(i)}
                        sx={{
                          width: i === liveMatchIndex ? 16 : 6, height: 6,
                          borderRadius: 3, cursor: 'pointer',
                          bgcolor: i === liveMatchIndex ? 'white' : 'rgba(255,255,255,0.4)',
                          transition: 'all 0.3s',
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Container>
          </Box>
        );
      })()}

      {/* ── Tournament Directory ─────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>

        {loadingTournaments && (
          <Box>
            <Skeleton variant="text" width={180} height={36} sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {[0, 1, 2].map(i => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <TournamentCardSkeleton />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {!loadingTournaments && allTournaments.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <SportsCricket sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No tournaments available right now.</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>Check back soon for upcoming fixtures.</Typography>
          </Box>
        )}

        {liveTournaments.length > 0 && (
          <DirectorySection title="Active" icon={<FiberManualRecord sx={{ color: '#e53935', fontSize: 14 }} />} accentColor="#e53935">
            <Grid container spacing={2} alignItems="stretch">
              {liveTournaments.map(t => {
                const solo = liveTournaments.length === 1;
                return (
                  <Grid item xs={12} sm={solo ? 12 : 6} md={solo ? 12 : 4} key={t.tournamentId} sx={{ display: 'flex', '& > *': { width: '100%' } }}>
                    <TournamentDirectoryCard tournament={t} isLive isPast={false} featured={solo} onManage={canManage ? setManageTournament : undefined} />
                  </Grid>
                );
              })}
            </Grid>
          </DirectorySection>
        )}

        {upcomingTournaments.length > 0 && (
          <DirectorySection title="Upcoming" icon={<CalendarMonth color="primary" />}>
            <Grid container spacing={2} alignItems="stretch">
              {upcomingTournaments.map(t => {
                const solo = upcomingTournaments.length === 1;
                return (
                  <Grid item xs={12} sm={solo ? 12 : 6} md={solo ? 12 : 4} key={t.tournamentId} sx={{ display: 'flex', '& > *': { width: '100%' } }}>
                    <TournamentDirectoryCard tournament={t} isLive={false} isPast={false} featured={solo} onManage={canManage ? setManageTournament : undefined} />
                  </Grid>
                );
              })}
            </Grid>
          </DirectorySection>
        )}

        {pastTournaments.length > 0 && (
          <DirectorySection title="Past Tournaments" icon={<EmojiEvents color="action" />} accentColor="text.disabled">
            <Grid container spacing={2} alignItems="stretch">
              {pastTournaments.map(t => {
                const solo = pastTournaments.length === 1;
                return (
                  <Grid item xs={12} sm={solo ? 12 : 6} md={solo ? 12 : 4} key={t.tournamentId} sx={{ display: 'flex', '& > *': { width: '100%' } }}>
                    <TournamentDirectoryCard tournament={t} isLive={false} isPast featured={solo} onManage={canManage ? setManageTournament : undefined} />
                  </Grid>
                );
              })}
            </Grid>
          </DirectorySection>
        )}

      </Container>

      {/* ── Social Media ────────────────────────────────────────────────── */}
      {socialMediaPages.length > 0 && (
        <>
          <Divider />
          <Box sx={{ py: { xs: 5, md: 7 }, bgcolor: 'background.default' }}>
            <Container maxWidth="lg">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 2, borderLeft: '4px solid', borderColor: 'primary.main', mb: 4 }}>
                <Facebook sx={{ color: '#1877F2' }} />
                <Typography variant="h5" fontWeight="bold" color="primary">Follow Us</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
                {socialMediaPages.map(page => (
                  <SocialMediaPageEmbed key={page.id} url={page.url} label={page.label} />
                ))}
              </Box>
            </Container>
          </Box>
        </>
      )}

      {/* ── Sponsors ────────────────────────────────────────────────────── */}
      {sponsors.length > 0 && (
        <>
          <Divider />
          <Box sx={{ py: { xs: 5, md: 7 }, bgcolor: 'background.paper' }}>
            <Container maxWidth="lg">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 2, borderLeft: '4px solid', borderColor: 'primary.main', mb: 4 }}>
                <Handshake color="primary" />
                <Typography variant="h5" fontWeight="bold" color="primary">Our Sponsors</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: { xs: 4, sm: 6 } }}>
                {sponsors.map(s => (
                  <Box key={s.sponsorId} sx={{ textAlign: 'center', maxWidth: 140 }}>
                    <Avatar src={s.brandLogoUrl} variant="rounded" sx={{ width: 80, height: 80, mx: 'auto', mb: 1.25, boxShadow: 1 }}>
                      {s.name.charAt(0)}
                    </Avatar>
                    <Typography variant="subtitle2" fontWeight="bold">{s.name}</Typography>
                    {s.brandWebsite && (
                      <Typography component="a" href={s.brandWebsite} target="_blank" rel="noopener noreferrer" variant="caption"
                        sx={{ color: 'primary.main', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.3, justifyContent: 'center',
                          mt: 0.25, '&:hover': { textDecoration: 'underline' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Language sx={{ fontSize: 11, flexShrink: 0 }} />
                        {s.brandWebsite.replace(/^https?:\/\//, '')}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Container>
          </Box>
        </>
      )}

      {/* ── Feature info dialog ─────────────────────────────────────────── */}
      <Dialog open={!!featureDialog} onClose={() => setFeatureDialog(null)} maxWidth="xs" fullWidth>
        {featureDialog && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 6 }}>
              <Box sx={{ color: 'primary.main' }}>{featureDialog.icon}</Box>
              {featureDialog.title}
              <IconButton onClick={() => setFeatureDialog(null)} size="small" sx={{ position: 'absolute', right: 8, top: 8 }}>
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary">{featureDialog.desc}</Typography>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <Box sx={{
        background: isDark ? 'linear-gradient(160deg, #0a160a 0%, #0e2a0e 100%)' : 'linear-gradient(160deg, #0d3349 0%, #1a5276 100%)',
        color: 'rgba(255,255,255,0.85)', pt: 6, pb: 3,
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                <SportsCricket sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">Cricket Legend</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.65, maxWidth: 290, lineHeight: 1.75 }}>
                Complete cricket management for clubs, tournaments and players. Built for South African cricket communities.
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3.5}>
              <Typography variant="overline" sx={{ letterSpacing: 2.5, opacity: 0.45, display: 'block', mb: 1.5, fontSize: '0.65rem' }}>
                Quick Links
              </Typography>
              {[
                ...(!keycloak.authenticated ? [{ label: 'Login to Dashboard', action: () => keycloak.login() }] : []),
                { label: 'Tournaments', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
              ].map(link => (
                <Typography key={link.label} variant="body2" onClick={link.action}
                  sx={{ opacity: 0.7, cursor: 'pointer', mb: 1, '&:hover': { opacity: 1 }, transition: 'opacity 0.2s' }}>
                  {link.label}
                </Typography>
              ))}
            </Grid>

            {socialMediaPages.length > 0 && (
              <Grid item xs={6} sm={3.5}>
                <Typography variant="overline" sx={{ letterSpacing: 2.5, opacity: 0.45, display: 'block', mb: 1.5, fontSize: '0.65rem' }}>
                  Follow Us
                </Typography>
                {socialMediaPages.map(page => (
                  <Typography key={page.id} component="a" href={page.url} target="_blank" rel="noopener noreferrer" variant="body2"
                    sx={{ opacity: 0.7, display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, textDecoration: 'none', color: 'inherit', '&:hover': { opacity: 1 }, transition: 'opacity 0.2s' }}>
                    <Facebook sx={{ fontSize: 16, color: '#1877F2' }} />
                    {page.label}
                  </Typography>
                ))}
              </Grid>
            )}
          </Grid>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 3 }} />

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { icon: <EmojiEvents sx={{ fontSize: 22 }} />,    title: 'Tournaments',       desc: 'Create and manage tournaments with pools, standings and results.' },
              { icon: <CalendarMonth sx={{ fontSize: 22 }} />,  title: 'Fixtures',           desc: 'Schedule matches, assign grounds and umpires, track upcoming games.' },
              { icon: <SportsCricket sx={{ fontSize: 22 }} />,  title: 'Scorecards',         desc: 'Full match results, scorecards and player statistics.' },
              { icon: <AccountBalance sx={{ fontSize: 22 }} />, title: 'Financials',         desc: 'Track match fees, payments and wallet balances.' },
              { icon: <Groups sx={{ fontSize: 22 }} />,         title: 'Team Management',    desc: 'Manage squads, select teamsheets and organise player roles.' },
              { icon: <HowToVote sx={{ fontSize: 22 }} />,      title: 'Availability Polls', desc: 'Send availability polls and build your squad with confidence.' },
            ].map(f => (
              <Grid item xs={6} sm={4} md={2} key={f.title}>
                <Box onClick={() => setFeatureDialog(f)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', opacity: 0.55, transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }}>
                  {f.icon}
                  <Typography variant="caption" sx={{ lineHeight: 1.3 }}>{f.title}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
        background: isDark ? 'linear-gradient(160deg, #0a160a 0%, #0e2a0e 100%)' : 'linear-gradient(160deg, #0d3349 0%, #1a5276 100%)',
        borderTop: '1px solid rgba(255,255,255,0.1)', py: 0.75, px: 2, textAlign: 'center',
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          © {new Date().getFullYear()} Cricket Legend. All rights reserved.
        </Typography>
      </Box>
      <Box sx={{ height: 36 }} />

      <TournamentManageDrawer
        tournament={manageTournament}
        open={!!manageTournament}
        onClose={() => setManageTournament(null)}
        onSaved={saved => {
          setAllTournaments(prev => prev.map(t => t.tournamentId === saved.tournamentId ? saved : t));
          setManageTournament(saved);
        }}
      />

    </Box>
  );
};
