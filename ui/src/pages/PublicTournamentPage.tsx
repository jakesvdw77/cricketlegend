import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AppBar, Avatar, Box, Button, Chip, CircularProgress, Container, Divider,
  Grid, IconButton, Skeleton, Tab, Tabs, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  AppRegistration, ArrowBack, Article, CalendarMonth, CheckCircle, EmojiEvents,
  Facebook, FiberManualRecord, GridView, Groups, Instagram, LightMode, DarkMode,
  Login, OpenInNew, SportsCricket, TableRows, YouTube,
} from '@mui/icons-material';
import { TournamentScheduleTab } from '../components/admin/TournamentScheduleTab';
import { MatchScheduleVisual } from '../components/admin/MatchScheduleVisual';
import { useColorMode } from '../context/ColorModeContext';
import { tournamentApi } from '../api/tournamentApi';
import { matchApi } from '../api/matchApi';
import { mediaApi } from '../api/mediaApi';
import { Match, MatchResultSummary, PoolStandings, Tournament } from '../types';
import { MediaCarousel } from '../components/media/MediaCarousel';
import { SocialMediaPageEmbed } from '../components/SocialMediaPageEmbed';
import MatchSummaryView from './view/MatchSummaryView';
import {
  MatchCard, MatchCardSkeleton, ResultCard, SkeletonGrid,
  StandingsTable, STAGE_LABEL, STAGE_ORDER,
} from '../components/cricket/shared';
import keycloak from '../keycloak';

// ── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);

function isTournamentLive(t: Tournament): boolean {
  const today = todayStr();
  return !!t.startDate && t.startDate <= today && (!t.endDate || t.endDate >= today);
}

// ── PublicTournamentPage ─────────────────────────────────────────────────────

export const PublicTournamentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const tournamentId = Number(id ?? '0');
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode, toggleMode } = useColorMode();
  const isMobile = !useMediaQuery(theme.breakpoints.up('sm'));
  const isDark = theme.palette.mode === 'dark';

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<MatchResultSummary[]>([]);
  const [standings, setStandings] = useState<PoolStandings[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(true);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [selectedSocial, setSelectedSocial] = useState<'facebook' | 'instagram' | 'youtube' | 'website' | null>(null);
  const [summaryMatch, setSummaryMatch] = useState<Match | null>(null);
  const [summaryView, setSummaryView] = useState<'whatsapp' | 'facebook'>('whatsapp');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const openSummary = (matchId: number, view: 'whatsapp' | 'facebook') => {
    setSummaryView(view);
    setSummaryLoading(true);
    matchApi.findById(matchId)
      .then(setSummaryMatch)
      .catch(() => setSummaryLoading(false))
      .finally(() => setSummaryLoading(false));
  };
  const [tab, setTab] = useState(0);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [scheduleView, setScheduleView] = useState<'cards' | 'table' | 'visual'>('cards');

  useEffect(() => {
    if (isMobile && scheduleView === 'table') setScheduleView('cards');
  }, [isMobile]);

  useEffect(() => {
    setLoadingTournament(true);
    tournamentApi.findById(tournamentId)
      .then(setTournament)
      .finally(() => setLoadingTournament(false));

    setLoadingMatches(true);
    Promise.all([
      matchApi.findByTournament(tournamentId),
      matchApi.findResultsByTournament(tournamentId),
    ])
      .then(([ms, rs]) => {
        setMatches([...ms].sort((a, b) => {
          const dc = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
          return dc !== 0 ? dc : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
        }));
        setResults(rs);
      })
      .finally(() => setLoadingMatches(false));

    setLoadingStandings(true);
    tournamentApi.getStandings(tournamentId)
      .then(setStandings)
      .catch(() => setStandings([]))
      .finally(() => setLoadingStandings(false));

    mediaApi.search({ tournamentId })
      .then(setMedia)
      .catch(() => {});

    matchApi.findLive()
      .then(all => setLiveMatches(all.filter(m => m.tournamentId === tournamentId)))
      .catch(() => {});
  }, [tournamentId]);

  const resultMap = useMemo(() => new Map(results.map(r => [r.matchId, r])), [results]);

  const abbreviationMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const pool of tournament?.pools ?? []) {
      for (const team of pool.teams ?? []) {
        if (team.teamName && team.abbreviation) map.set(team.teamName, team.abbreviation);
      }
    }
    // Also pick up from match data as fallback
    for (const m of matches) {
      if (m.homeTeamName && m.homeTeamAbbreviation) map.set(m.homeTeamName, m.homeTeamAbbreviation);
      if (m.oppositionTeamName && m.oppositionTeamAbbreviation) map.set(m.oppositionTeamName, m.oppositionTeamAbbreviation);
    }
    return map;
  }, [tournament, matches]);

  const isLive = liveMatches.length > 0 || (tournament ? isTournamentLive(tournament) : false);

  const liveMatchIds = useMemo(() => new Set(liveMatches.map(m => m.matchId)), [liveMatches]);

  const upcomingMatches = useMemo(
    () => matches.filter(m => !resultMap.has(m.matchId!) && !m.matchCompleted && !liveMatchIds.has(m.matchId)),
    [matches, resultMap, liveMatchIds],
  );
  const nextMatch = upcomingMatches[0] ?? null;

  const hasStandings = standings.length > 0;
  const hasPools = (tournament?.pools?.length ?? 0) > 0;
  const hasTeams = (tournament?.pools ?? []).some(p => (p.teams?.length ?? 0) > 0);
  const hasMedia = media.length > 0;

  const tabs = [
    { label: 'Overview',  show: true },
    { label: 'Schedule', show: true },
    { label: 'Standings', show: hasStandings || loadingStandings },
    { label: 'Results',   show: false },
    { label: 'Teams',     show: hasTeams },
    { label: 'Media',     show: hasMedia },
    { label: 'Social',    show: !!(tournament?.facebookLink || tournament?.instagramLink || tournament?.youtubeLink || tournament?.websiteLink) },
  ].filter(t => t.show);

  const tabLabel = (label: string) => tabs.findIndex(t => t.label === label);

  const showingSummary = summaryLoading || !!summaryMatch;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ── Summary overlay ───────────────────────────────────────────── */}
      {showingSummary && (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, sm: 4 } }}>
          {summaryLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
              <CircularProgress />
            </Box>
          )}
          {summaryMatch && (
            <MatchSummaryView
              match={summaryMatch}
              view={summaryView}
              onBack={() => { setSummaryMatch(null); setSummaryLoading(false); }}
            />
          )}
        </Box>
      )}

      <Box sx={{ display: showingSummary ? 'none' : 'block' }}>

      {/* ── AppBar ───────────────────────────────────────────────────────── */}
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton color="inherit" size="small" onClick={() => navigate('/')}>
            <ArrowBack />
          </IconButton>

          {loadingTournament ? (
            <>
              <Skeleton variant="rounded" width={36} height={36} sx={{ flexShrink: 0, bgcolor: 'rgba(255,255,255,0.15)' }} />
              <Skeleton variant="text" width={180} height={24} sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.15)' }} />
            </>
          ) : tournament ? (
            <>
              <Avatar src={tournament.logoUrl} variant="rounded" sx={{ width: 36, height: 36, flexShrink: 0 }}>
                {tournament.name.charAt(0)}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{ fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' }, lineHeight: 1.2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {tournament.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                  {tournament.cricketFormat && (
                    <Chip label={tournament.cricketFormat} size="small"
                      sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
                  )}
                  {isLive && (
                    <Chip
                      icon={<FiberManualRecord sx={{ fontSize: '8px !important' }} />}
                      label="LIVE"
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#e53935', color: 'white', fontWeight: 700,
                        '& .MuiChip-icon': { color: 'white' } }}
                    />
                  )}
                </Box>
              </Box>
            </>
          ) : null}

          {/* Social links — top right, hidden on xs to save space */}
          {tournament && (
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.25 }}>
              {tournament.websiteLink && (
                <Tooltip title="Website">
                  <IconButton size="small" color="inherit" component="a" href={tournament.websiteLink} target="_blank" rel="noopener noreferrer" sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                    <OpenInNew sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
              {tournament.facebookLink && (
                <Tooltip title="Facebook">
                  <IconButton size="small" component="a" href={tournament.facebookLink} target="_blank" rel="noopener noreferrer" sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                    <Facebook sx={{ fontSize: 18, color: '#1877F2' }} />
                  </IconButton>
                </Tooltip>
              )}
              {tournament.instagramLink && (
                <Tooltip title="Instagram">
                  <IconButton size="small" component="a" href={tournament.instagramLink} target="_blank" rel="noopener noreferrer" sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                    <Instagram sx={{ fontSize: 18, color: '#E1306C' }} />
                  </IconButton>
                </Tooltip>
              )}
              {tournament.youtubeLink && (
                <Tooltip title="YouTube">
                  <IconButton size="small" component="a" href={tournament.youtubeLink} target="_blank" rel="noopener noreferrer" sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                    <YouTube sx={{ fontSize: 18, color: '#FF0000' }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}

          {!keycloak.authenticated && (
            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton color="inherit" size="small" onClick={toggleMode}>
                {mode === 'dark' ? <LightMode /> : <DarkMode />}
              </IconButton>
            </Tooltip>
          )}
          {!keycloak.authenticated && (
            <Button
              size="small"
              variant="contained"
              disableElevation
              startIcon={<Login />}
              onClick={() => keycloak.login()}
              sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.4)' }, flexShrink: 0,
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Login</Box>
            </Button>
          )}
        </Box>

        {/* Tab strip */}
        {tournament && (
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 40,
              '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' },
              '& .Mui-selected': { color: 'white' },
              '& .MuiTabs-indicator': { bgcolor: 'white' },
            }}
          >
            {tabs.map(t => <Tab key={t.label} label={t.label} />)}
          </Tabs>
        )}
      </AppBar>

      {loadingTournament ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      ) : !tournament ? (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <Typography variant="h6" color="text.secondary">Tournament not found.</Typography>
        </Box>
      ) : (
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>

        {/* ── Overview ──────────────────────────────────────────────────── */}
        {tabs[tab]?.label === 'Overview' && (
          <Box>
            {/* Tournament meta */}
            <Box sx={{ mb: 4 }}>
              {tournament.bannerUrl && (
                <Box
                  component="img"
                  src={tournament.bannerUrl}
                  alt={tournament.name}
                  sx={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 2, mb: 2,
                    filter: isDark ? 'brightness(0.85)' : 'none' }}
                />
              )}

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
                {tournament.startDate && (
                  <Chip icon={<CalendarMonth sx={{ fontSize: '14px !important' }} />}
                    label={`${tournament.startDate}${tournament.endDate ? ` – ${tournament.endDate}` : ''}`}
                    size="small" variant="outlined" />
                )}
                {tournament.cricketFormat && <Chip label={tournament.cricketFormat} size="small" variant="outlined" />}
                {tournament.ageGroup && <Chip label={tournament.ageGroup} size="small" variant="outlined" />}
                {tournament.tournamentGender && <Chip label={tournament.tournamentGender} size="small" variant="outlined" />}
                {tournament.winningTeamName && (
                  <Chip icon={<EmojiEvents sx={{ fontSize: '14px !important' }} />}
                    label={`Winner: ${tournament.winningTeamName}`} size="small" color="success" variant="outlined" />
                )}
              </Box>

              {tournament.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.7 }}>
                  {tournament.description}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {tournament.playingConditionsUrl && (
                  <Button
                    variant="outlined"
                    startIcon={<Article />}
                    component="a"
                    href={tournament.playingConditionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Playing Conditions
                  </Button>
                )}
                {tournament.registrationPageUrl && (
                  <Button
                    variant="outlined"
                    startIcon={<AppRegistration />}
                    component="a"
                    href={tournament.registrationPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Register
                  </Button>
                )}
              </Box>
            </Box>

            {/* Live matches */}
            {liveMatches.length > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 2,
                  borderLeft: '4px solid #e53935', mb: 2 }}>
                  <Chip
                    icon={<FiberManualRecord sx={{ fontSize: '10px !important' }} />}
                    label="LIVE"
                    size="small"
                    sx={{ bgcolor: '#e53935', color: 'white', fontWeight: 700, '& .MuiChip-icon': { color: 'white' } }}
                  />
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    Live {liveMatches.length > 1 ? `Matches (${liveMatches.length})` : 'Match'}
                  </Typography>
                </Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {liveMatches.map(m => (
                    <Grid item xs={12} sm={6} md={4} key={m.matchId}>
                      <MatchCard m={m} live hideTournament />
                    </Grid>
                  ))}
                </Grid>
                <Divider sx={{ mb: 4 }} />
              </>
            )}

            {/* Next match */}
            {(loadingMatches || nextMatch) && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 2, borderLeft: '4px solid', borderColor: 'primary.main', mb: 2 }}>
                  <SportsCricket color="primary" />
                  <Typography variant="h6" fontWeight="bold" color="primary">Next Match</Typography>
                </Box>
                {loadingMatches ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}><MatchCardSkeleton /></Grid>
                  </Grid>
                ) : nextMatch && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <MatchCard m={nextMatch} hideTournament />
                    </Grid>
                  </Grid>
                )}
                <Divider sx={{ my: 4 }} />
              </>
            )}

            {/* Recent results */}
            {(loadingMatches || results.length > 0) && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                    <CheckCircle color="primary" />
                    <Typography variant="h6" fontWeight="bold" color="primary">Recent Results</Typography>
                  </Box>
                  {results.length > 3 && (
                    <Button size="small" onClick={() => setTab(tabLabel('Results'))} sx={{ textTransform: 'none' }}>
                      See all {results.length} →
                    </Button>
                  )}
                </Box>
                {loadingMatches ? (
                  <SkeletonGrid count={3} />
                ) : (
                  <Grid container spacing={2}>
                    {results.slice(0, 3).map(r => (
                      <Grid item xs={12} sm={6} md={4} key={r.matchId}>
                        <ResultCard r={r}
                          onSummary={() => openSummary(r.matchId, 'facebook')}
                          onResult={() => openSummary(r.matchId, 'whatsapp')}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </>
            )}

            {!loadingMatches && !nextMatch && results.length === 0 && (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                No matches scheduled yet. Check back soon.
              </Typography>
            )}

          </Box>
        )}

        {/* ── Schedule ──────────────────────────────────────────────────── */}
        {tabs[tab]?.label === 'Schedule' && (
          <Box>
            {/* Single toolbar: filter chips left, view icon toggles right */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 1, flexWrap: 'wrap' }}>
              {/* Filter chips — only relevant for cards view */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {(['all', 'upcoming', 'completed'] as const).map(f => (
                  <Chip
                    key={f}
                    label={f.charAt(0).toUpperCase() + f.slice(1)}
                    onClick={() => { setScheduleFilter(f); setScheduleView('cards'); }}
                    color={scheduleView === 'cards' && scheduleFilter === f ? 'primary' : 'default'}
                    variant={scheduleView === 'cards' && scheduleFilter === f ? 'filled' : 'outlined'}
                    sx={{ textTransform: 'capitalize' }}
                  />
                ))}
              </Box>

              {/* View icon toggles */}
              <Box sx={{ display: 'flex', gap: 0.5, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                {([
                  { key: 'cards',  label: 'Cards',    icon: <GridView sx={{ fontSize: 18 }} />,  hideXs: false },
                  { key: 'table',  label: 'Table',    icon: <TableRows sx={{ fontSize: 18 }} />, hideXs: true },
                  { key: 'visual', label: 'Visual',   icon: <EmojiEvents sx={{ fontSize: 18 }} />, hideXs: false },
                ] as const).map((v, i, arr) => (
                  <Tooltip key={v.key} title={v.label}>
                    <IconButton
                      size="small"
                      onClick={() => setScheduleView(v.key)}
                      sx={{
                        display: v.hideXs ? { xs: 'none', sm: 'inline-flex' } : 'inline-flex',
                        borderRadius: 0,
                        borderRight: i < arr.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        bgcolor: scheduleView === v.key ? 'primary.main' : 'transparent',
                        color: scheduleView === v.key ? 'primary.contrastText' : 'text.secondary',
                        px: 1.25, py: 0.75,
                        '&:hover': { bgcolor: scheduleView === v.key ? 'primary.dark' : 'action.hover' },
                      }}
                    >
                      {v.icon}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
            </Box>

            {/* Cards view */}
            {scheduleView === 'cards' && (
              <>

                {loadingMatches ? (
                  <SkeletonGrid count={3} />
                ) : (() => {
                  const filtered = matches.filter(m => {
                    const hasResult = resultMap.has(m.matchId!) || m.matchCompleted;
                    if (scheduleFilter === 'upcoming') return !hasResult;
                    if (scheduleFilter === 'completed') return hasResult;
                    return true;
                  });

                  if (filtered.length === 0) {
                    return <Typography color="text.secondary">No matches in this filter.</Typography>;
                  }

                  const byStage = new Map<string, Match[]>();
                  for (const m of filtered) {
                    const key = m.matchStage ?? 'OTHER';
                    if (!byStage.has(key)) byStage.set(key, []);
                    byStage.get(key)!.push(m);
                  }
                  const stageGroups = [...byStage.entries()].sort(([a], [b]) => {
                    const ai = STAGE_ORDER.indexOf(a);
                    const bi = STAGE_ORDER.indexOf(b);
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                  });

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {stageGroups.map(([stage, stageMatches]) => (
                        <Box key={stage}>
                          <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 2, color: 'text.secondary', display: 'block', mb: 2 }}>
                            {STAGE_LABEL[stage] ?? stage}
                          </Typography>
                          <Grid container spacing={2}>
                            {stageMatches.map(m => {
                              const result = resultMap.get(m.matchId!);
                              return (
                                <Grid item xs={12} sm={6} md={4} key={m.matchId}>
                                  {result
                                    ? <ResultCard r={result}
                                        onSummary={() => openSummary(result.matchId, 'facebook')}
                                        onResult={() => openSummary(result.matchId, 'whatsapp')}
                                      />
                                    : <MatchCard m={m} hideTournament />
                                  }
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Box>
                      ))}
                    </Box>
                  );
                })()}
              </>
            )}

            {/* Table view — reuses existing TournamentScheduleTab component */}
            {scheduleView === 'table' && tournament && (
              <TournamentScheduleTab tournament={tournament} />
            )}

            {/* Visual schedule — reuses existing MatchScheduleVisual component */}
            {scheduleView === 'visual' && tournament && (
              <MatchScheduleVisual
                matches={matches}
                resultMap={resultMap}
                tournament={tournament}
                showExport={false}
              />
            )}
          </Box>
        )}

        {/* ── Standings ─────────────────────────────────────────────────── */}
        {tabs[tab]?.label === 'Standings' && (
          <Box>
            {loadingStandings ? (
              <Box>
                <Skeleton variant="rounded" height={40} sx={{ mb: 2, maxWidth: 400 }} />
                <Skeleton variant="rounded" height={220} />
              </Box>
            ) : (
              <StandingsTable pools={standings} abbreviations={abbreviationMap} />
            )}
          </Box>
        )}

        {/* ── Teams ─────────────────────────────────────────────────────── */}
        {tabs[tab]?.label === 'Teams' && (
          <Box>
            {(tournament.pools ?? []).filter(p => (p.teams?.length ?? 0) > 0).map(pool => (
              <Box key={pool.poolId} sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Groups color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight="bold">{pool.poolName}</Typography>
                  <Chip label={`${pool.teams!.length} teams`} size="small" variant="outlined" />
                </Box>
                <Grid container spacing={1.5}>
                  {pool.teams!.map(team => (
                    <Grid item xs={12} sm={6} md={4} key={team.tournamentTeamId}>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        p: 1.25, borderRadius: 2, border: '1px solid',
                        borderColor: 'divider', bgcolor: 'background.paper',
                      }}>
                        <Avatar variant="rounded" sx={{ width: 36, height: 36, fontSize: 14, bgcolor: 'primary.light' }}>
                          {team.teamName?.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>{team.teamName}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
            {!hasPools && (
              <Typography color="text.secondary">No team information available yet.</Typography>
            )}
          </Box>
        )}

        {/* ── Media ─────────────────────────────────────────────────────── */}
        {tabs[tab]?.label === 'Media' && (
          <Box>
            <MediaCarousel items={media} height={480} />
          </Box>
        )}

        {/* ── Social Media ──────────────────────────────────────────────── */}
        {tabs[tab]?.label === 'Social' && (() => {
          const platforms = [
            tournament.facebookLink  && { key: 'facebook'  as const, label: 'Facebook',  icon: <Facebook sx={{ fontSize: 24, color: '#1877F2' }} />,  url: tournament.facebookLink },
            tournament.instagramLink && { key: 'instagram' as const, label: 'Instagram', icon: <Instagram sx={{ fontSize: 24, color: '#E1306C' }} />, url: tournament.instagramLink },
            tournament.youtubeLink   && { key: 'youtube'   as const, label: 'YouTube',   icon: <YouTube sx={{ fontSize: 24, color: '#FF0000' }} />,   url: tournament.youtubeLink },
            tournament.websiteLink   && { key: 'website'   as const, label: 'Website',   icon: <OpenInNew sx={{ fontSize: 24 }} />,                   url: tournament.websiteLink },
          ].filter(Boolean) as { key: string; label: string; icon: React.ReactNode; url: string }[];

          const active = selectedSocial ?? platforms[0]?.key;
          const current = platforms.find(p => p.key === active) ?? platforms[0];

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 560 }}>
              {/* Embed / content area */}
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', pb: 3 }}>
                {current?.key === 'facebook' ? (
                  <SocialMediaPageEmbed key={current.url} url={current.url} label={current.label} />
                ) : current ? (
                  <Box sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 2, p: 6, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                    bgcolor: 'background.paper', maxWidth: 360, width: '100%', mt: 4,
                  }}>
                    {current.icon}
                    <Typography variant="h6" fontWeight={600}>{current.label}</Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Visit the {current.label} page to see the latest updates.
                    </Typography>
                    <Button
                      variant="contained"
                      disableElevation
                      endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
                      component="a"
                      href={current.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Open {current.label}
                    </Button>
                  </Box>
                ) : null}
              </Box>

              {/* Platform switcher — icon buttons at the bottom */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                {platforms.map(p => {
                  const isActive = p.key === active;
                  return (
                    <Tooltip key={p.key} title={p.label}>
                      <IconButton
                        onClick={() => setSelectedSocial(p.key as any)}
                        sx={{
                          border: '1px solid',
                          borderColor: isActive ? 'primary.main' : 'divider',
                          borderRadius: 2,
                          bgcolor: isActive ? 'primary.main' : 'transparent',
                          '&:hover': { borderColor: 'primary.main', bgcolor: isActive ? 'primary.dark' : 'action.hover' },
                        }}
                      >
                        {React.cloneElement(p.icon as React.ReactElement, {
                          sx: { fontSize: 22, color: isActive ? 'white' : (p.icon as any).props.sx?.color },
                        })}
                      </IconButton>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          );
        })()}

      </Container>
      )}

      {/* Fixed copyright bar */}
      <Box sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
        background: isDark
          ? 'linear-gradient(160deg, #0a160a 0%, #0e2a0e 100%)'
          : 'linear-gradient(160deg, #0d3349 0%, #1a5276 100%)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        py: 0.75, px: 2, textAlign: 'center',
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          © {new Date().getFullYear()} Cricket Legend. All rights reserved.
        </Typography>
      </Box>
      <Box sx={{ height: 36 }} />
      </Box>{/* end display:none wrapper */}
    </Box>
  );
};
