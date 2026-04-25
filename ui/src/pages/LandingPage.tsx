import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, AppBar, Toolbar, Avatar, Card, CardContent,
  Chip, Divider, Grid, Container, Tabs, Tab, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, Paper, Dialog, DialogTitle,
  DialogContent, IconButton, CircularProgress, useTheme,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, LocationOn, AccessTime, Login, SportsCricket,
  PhotoLibrary, FiberManualRecord, Handshake, Language, CheckCircle, Facebook,
  AccountBalance, Groups, HowToVote, EventNote, Close, Instagram, YouTube, OpenInNew, AppRegistration, Article, ScoreboardOutlined,
} from '@mui/icons-material';
import { matchApi } from '../api/matchApi';
import { sponsorApi } from '../api/sponsorApi';
import { mediaApi } from '../api/mediaApi';
import { tournamentApi } from '../api/tournamentApi';
import { socialMediaPageApi } from '../api/socialMediaPageApi';
import { Match, MatchResultSummary, Sponsor, MediaContent, Tournament, SocialMediaPage, PoolStandings } from '../types';
import MatchSummaryView from './view/MatchSummaryView';
import { MediaCarousel } from '../components/media/MediaCarousel';
import { SocialMediaPageEmbed } from '../components/SocialMediaPageEmbed';
import keycloak from '../keycloak';

const STAGE_LABEL: Record<string, string> = { FRIENDLY: 'Friendly', POOL: 'Pool', QUARTER_FINAL: 'Quarter-Final', SEMI_FINAL: 'Semi-Final', FINAL: 'Final' };

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

// ── CountdownDisplay ─────────────────────────────────────────────────────────

const CountdownDisplay: React.FC<{ matchDate?: string; startTime?: string }> = ({ matchDate, startTime }) => {
  const target = useMemo(() => parseMatchStart(matchDate, startTime), [matchDate, startTime]);
  const left   = useCountdown(target);
  if (!left) return null;
  const units = left.days > 0
    ? [{ v: left.days, l: 'd' }, { v: left.hours, l: 'h' }, { v: left.minutes, l: 'm' }]
    : [{ v: left.hours, l: 'h' }, { v: left.minutes, l: 'm' }, { v: left.seconds, l: 's' }];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
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

// ── Weather ──────────────────────────────────────────────────────────────────

const WMO_ICON: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '❄️', 77: '🌨️',
  80: '🌦️', 81: '🌦️', 82: '⛈️',
  85: '🌨️', 86: '❄️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function parseCoords(url?: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  const q = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  return null;
}

interface WeatherDay { icon: string; maxTemp: number; minTemp: number; precipProb: number; }

function useWeather(coords: { lat: number; lng: number } | null, date?: string): WeatherDay | null {
  const [data, setData] = useState<WeatherDay | null>(null);
  useEffect(() => {
    if (!coords || !date) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.floor((new Date(date).getTime() - today.getTime()) / 86_400_000);
    if (diff < 0 || diff > 5) return;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`
    )
      .then(r => r.json())
      .then(json => {
        const idx = (json.daily.time as string[]).indexOf(date);
        if (idx === -1) return;
        const code: number = json.daily.weathercode[idx];
        setData({
          icon: WMO_ICON[code] ?? '🌡️',
          maxTemp: Math.round(json.daily.temperature_2m_max[idx]),
          minTemp: Math.round(json.daily.temperature_2m_min[idx]),
          precipProb: json.daily.precipitation_probability_max[idx],
        });
      })
      .catch(() => {});
  }, [coords?.lat, coords?.lng, date]);
  return data;
}

// ── MatchCard ────────────────────────────────────────────────────────────────

const MatchCard: React.FC<{ m: Match; live?: boolean }> = ({ m, live }) => {
  const coords = useMemo(() => parseCoords(m.fieldGoogleMapsUrl), [m.fieldGoogleMapsUrl]);
  const weather = useWeather(coords, m.matchDate);
  return (
  <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, position: 'relative', overflow: 'visible', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Chip label={m.tournamentName} size="small" icon={<EmojiEvents />} color="primary" variant="outlined" />
          {m.matchStage && <Chip label={STAGE_LABEL[m.matchStage] ?? m.matchStage} size="small" variant="outlined" />}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          {!live && <CountdownDisplay matchDate={m.matchDate} startTime={m.scheduledStartTime} />}
          {weather && (
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 0.75, py: 0.25, whiteSpace: 'nowrap' }}>
              <Typography variant="body2">{weather.icon} {weather.maxTemp}°/{weather.minTemp}° · 💧{weather.precipProb}%</Typography>
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, my: 1.5 }}>
        <Avatar src={m.homeTeamLogoUrl} sx={{ width: 40, height: 40 }}>{m.homeTeamName?.charAt(0)}</Avatar>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>{m.homeTeamName}</Typography>
          <Typography variant="caption" color="text.secondary">vs</Typography>
          <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>{m.oppositionTeamName}</Typography>
        </Box>
        <Avatar src={m.oppositionTeamLogoUrl} sx={{ width: 40, height: 40 }}>{m.oppositionTeamName?.charAt(0)}</Avatar>
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
    {live && m.scoringUrl && (
      <>
        <Divider />
        <Box sx={{ px: 1.5, py: 1 }}>
          <Button
            size="small"
            startIcon={<ScoreboardOutlined />}
            component="a"
            href={m.scoringUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Live Scoring
          </Button>
        </Box>
      </>
    )}
  </Card>
  );
};

// ── ResultCard ───────────────────────────────────────────────────────────────

const ResultCard: React.FC<{ r: MatchResultSummary; onSummary?: () => void; onScorecard?: () => void }> = ({ r, onSummary, onScorecard }) => {
  const scoreLine = (score?: number, wickets?: number, overs?: string) =>
    score != null ? `${score}/${wickets ?? 0}${overs ? ` (${overs})` : ''}` : null;
  const firstScore  = scoreLine(r.scoreBattingFirst,  r.wicketsLostBattingFirst,  r.oversBattingFirst);
  const secondScore = scoreLine(r.scoreBattingSecond, r.wicketsLostBattingSecond, r.oversBattingSecond);
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary">{r.matchDate?.toString()}</Typography>
          {r.matchDrawn
            ? <Chip label="Draw" size="small" variant="outlined" />
            : r.winningTeamName && (
              <Chip icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} label={r.winningTeamName} size="small" color="success" variant="outlined" />
            )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="bold" textAlign="right" sx={{ flex: 1 }}>{r.homeTeamName}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>vs</Typography>
          <Typography variant="subtitle1" fontWeight="bold" textAlign="left" sx={{ flex: 1 }}>{r.oppositionTeamName}</Typography>
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
      {(onSummary || onScorecard) && (
        <>
          <Divider />
          <Box sx={{ px: 1.5, py: 1, display: 'flex', gap: 1 }}>
            {onSummary && (
              <Button size="small" startIcon={<Facebook />} onClick={onSummary}>
                Summary
              </Button>
            )}
            {onScorecard && (
              <Button size="small" startIcon={<Article />} onClick={onScorecard}>
                Scorecard
              </Button>
            )}
          </Box>
        </>
      )}
    </Card>
  );
};

// ── NavCountdown (compact navbar widget) ────────────────────────────────────

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
    <Box sx={{
      display: { xs: 'none', sm: 'flex' },
      alignItems: 'center', gap: 1.25, mr: 1,
      pl: 1.5, borderLeft: '1px solid rgba(255,255,255,0.18)',
    }}>
      {/* Label + name */}
      <Box sx={{ display: { sm: 'none', md: 'block' }, textAlign: 'right' }}>
        <Typography sx={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.5, lineHeight: 1 }}>
          Next
        </Typography>
        <Typography sx={{
          fontSize: '0.72rem', fontWeight: 600, opacity: 0.9, lineHeight: 1.3,
          maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {tournament.name}
        </Typography>
      </Box>

      {/* Digit boxes */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.35 }}>
        {units.map(({ v, l }, i) => (
          <React.Fragment key={l}>
            {i > 0 && (
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.35, lineHeight: 1, mt: '3px' }}>:</Typography>
            )}
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.12)', borderRadius: '4px',
                px: 0.6, py: '3px', minWidth: 26,
              }}>
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

// ── Standings table (reused from TournamentStandings page) ──────────────────

const StandingsTable: React.FC<{ pools: PoolStandings[] }> = ({ pools }) => {
  if (pools.length === 0)
    return <Typography color="text.secondary">No standings available yet.</Typography>;
  return (
    <>
      {pools.map(pool => (
        <Box key={pool.poolId} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <EmojiEvents color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight="bold">{pool.poolName}</Typography>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap' } }}>
                  <TableCell width={28}>#</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell align="center" title="Games Played">P</TableCell>
                  <TableCell align="center" title="Won">W</TableCell>
                  <TableCell align="center" title="Lost">L</TableCell>
                  <TableCell align="center" title="No Result">NR</TableCell>
                  <TableCell align="center" title="Drawn">D</TableCell>
                  <TableCell align="center" title="Bonus Points">BP</TableCell>
                  <TableCell align="center" title="Total Points">Pts</TableCell>
                  <TableCell align="right" title="Net Run Rate">NRR</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pool.entries.map((e, idx) => {
                  const nrr = e.netRunRate >= 0 ? `+${e.netRunRate.toFixed(3)}` : e.netRunRate.toFixed(3);
                  return (
                    <TableRow key={e.teamId} sx={{ '&:last-child td': { border: 0 }, ...(idx < 2 ? { bgcolor: 'action.hover' } : {}) }}>
                      <TableCell><Typography variant="body2" color="text.secondary">{idx + 1}</Typography></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={e.logoUrl} variant="rounded" sx={{ width: 26, height: 26, fontSize: 11 }}>{e.teamName.charAt(0)}</Avatar>
                          <Typography variant="body2" fontWeight={idx === 0 ? 700 : 400}>{e.teamName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center"><Typography variant="body2">{e.gamesPlayed}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2" color="success.main" fontWeight={600}>{e.won}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2" color="error.main">{e.lost}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2" color="text.secondary">{e.noResults}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2" color="text.secondary">{e.draws}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2">{e.bonusPoints}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2" fontWeight={700}>{e.points}</Typography></TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={e.netRunRate >= 0 ? 'success.main' : 'error.main'} fontWeight={500}>{nrr}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', gap: 2, mt: 0.75, flexWrap: 'wrap' }}>
            {[['P','Played'],['W','Won'],['L','Lost'],['NR','No Result'],['D','Drawn'],['BP','Bonus Points'],['Pts','Total Points'],['NRR','Net Run Rate']].map(([l,d]) => (
              <Typography key={l} variant="caption" color="text.secondary"><b>{l}</b> = {d}</Typography>
            ))}
          </Box>
        </Box>
      ))}
    </>
  );
};

// ── SectionHeader ────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  live?: boolean;
}> = ({ icon, title, subtitle, live }) => (
  <Box sx={{ mb: 4 }}>
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      pl: 2, borderLeft: '4px solid', borderColor: 'primary.main',
      mb: subtitle ? 0.75 : 0,
    }}>
      {live && (
        <Chip
          icon={<FiberManualRecord sx={{ fontSize: '10px !important' }} />}
          label="LIVE"
          size="small"
          sx={{ bgcolor: '#e53935', color: 'white', fontWeight: 700, '& .MuiChip-icon': { color: 'white' } }}
        />
      )}
      {icon}
      <Typography variant="h5" fontWeight="bold" color="primary">{title}</Typography>
    </Box>
    {subtitle && (
      <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>{subtitle}</Typography>
    )}
  </Box>
);

// ── Page ─────────────────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<MatchResultSummary[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [allMedia, setAllMedia] = useState<MediaContent[]>([]);
  const [nextTournament, setNextTournament] = useState<Tournament | null>(null);
  const [liveTournaments, setLiveTournaments] = useState<Tournament[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [socialMediaPages, setSocialMediaPages] = useState<SocialMediaPage[]>([]);
  const [featureDialog, setFeatureDialog] = useState<{ title: string; desc: string; icon: React.ReactNode } | null>(null);
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
  const [liveTab, setLiveTab] = useState(0);
  const [upcomingTab, setUpcomingTab] = useState(0);
  const [resultsTab, setResultsTab] = useState(0);
  const [standingsMap, setStandingsMap] = useState<Record<number, PoolStandings[]>>({});
  const [selectedStandingsTournament, setSelectedStandingsTournament] = useState<number | null>(null);
  const tournamentsRef = useRef<HTMLDivElement | null>(null);
  const upcomingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    matchApi.findUpcoming().then(setUpcomingMatches).catch(() => {});
    matchApi.findLive().then(setLiveMatches).catch(() => {});
    matchApi.findRecentResults(6).then(setRecentResults).catch(() => {});
    sponsorApi.findAll().then(setSponsors).catch(() => {});
    socialMediaPageApi.findEnabled().then(setSocialMediaPages).catch(() => {});
    tournamentApi.findAll().then(async all => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);
      const relevant = all.filter(t => {
        if (!t.startDate) return false;
        const end = t.endDate ? new Date(`${t.endDate}T23:59:59`) : null;
        return end === null || end >= today;
      });
      if (relevant.length > 0) {
        const results = await Promise.all(
          relevant.map(t => mediaApi.search({ tournamentId: t.tournamentId }).catch(() => []))
        );
        setAllMedia(results.flat());
      }
      const next = all
        .filter(t => t.startDate && new Date(`${t.startDate}T00:00:00`) > today)
        .sort((a, b) => a.startDate!.localeCompare(b.startDate!));
      setNextTournament(next[0] ?? null);
      const live = all.filter(t =>
        t.startDate && t.startDate <= todayStr && (!t.endDate || t.endDate >= todayStr)
      );
      setLiveTournaments(live);
      if (live.length > 0) {
        const entries = await Promise.all(
          live.map(t => tournamentApi.getStandings(t.tournamentId!)
            .then(s => [t.tournamentId!, s] as [number, PoolStandings[]])
            .catch(() => [t.tournamentId!, []] as [number, PoolStandings[]]))
        );
        setStandingsMap(Object.fromEntries(entries));
        setSelectedStandingsTournament(live[0].tournamentId!);
      }
      setUpcomingTournaments(
        all
          .filter(t => t.startDate && t.startDate > todayStr)
          .sort((a, b) => a.startDate!.localeCompare(b.startDate!))
      );
    }).catch(() => {});
  }, []);

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const heroBg = isDark
    ? 'linear-gradient(160deg, #0a160a 0%, #0e2a0e 50%, #1a3a1a 100%)'
    : 'linear-gradient(160deg, #0d3349 0%, #1a5276 55%, #1e7a4a 100%)';

  const stats = [
    { label: 'Active Tournaments', value: liveTournaments.length + upcomingTournaments.length },
    { label: 'Live Matches',       value: liveMatches.length },
    { label: 'Upcoming Fixtures',  value: upcomingMatches.length },
    { label: 'Recent Results',     value: recentResults.length },
  ].filter(s => s.value > 0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar sx={{ gap: 1 }}>
          <SportsCricket sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1, letterSpacing: 0.5 }}>
            Cricket Legend
          </Typography>
          {nextTournament && <NavCountdown tournament={nextTournament} />}
          {!keycloak.authenticated && (
            <Button
              variant="contained"
              disableElevation
              startIcon={<Login />}
              onClick={() => keycloak.login()}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      {!keycloak.authenticated && <Box sx={{
        background: heroBg,
        color: 'white',
        minHeight: { xs: 'auto', md: 'auto' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Dot pattern overlay */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }} />

        <Container maxWidth="md" sx={{ textAlign: 'center', py: { xs: 2.5, md: 3 }, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 2 }}>
            <SportsCricket sx={{ fontSize: { xs: 28, md: 40 }, opacity: 0.85 }} />
            <Typography component="h1" sx={{
              fontSize: { xs: '2.2rem', sm: '3rem', md: '3.8rem' },
              fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.5px',
            }}>
              Cricket Legend
            </Typography>
          </Box>

          <Typography variant="h6" sx={{
            opacity: 0.82, fontWeight: 400,
            maxWidth: 540, mx: 'auto', mb: 4.5,
            fontSize: { xs: '1rem', md: '1.15rem' }, lineHeight: 1.65,
          }}>
            Complete cricket management — tournaments, fixtures, scorecards, team selection and financials in one platform.
          </Typography>

        </Container>

        {/* Stats strip */}
        {stats.length > 0 && (
          <Box sx={{
            bgcolor: 'rgba(0,0,0,0.28)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            py: 1.5, mt: { xs: 2.5, md: 3 },
          }}>
            <Container maxWidth="md">
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 3, sm: 6 }, flexWrap: 'wrap' }}>
                {stats.map(s => (
                  <Box key={s.label} sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, fontWeight: 800, lineHeight: 1 }}>
                      {s.value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.62rem', opacity: 0.65, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                      {s.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Container>
          </Box>
        )}

      </Box>}

      {/* ── Live (Matches + Tournaments combined) ───────────────────────── */}
      {(liveMatches.length > 0 || liveTournaments.length > 0) && (
        <>
          <Divider />
          <Box ref={tournamentsRef} sx={{ py: { xs: 5, md: 7 }, bgcolor: 'background.default' }}>
            <Container maxWidth="lg">
              <Box sx={{ mb: 3 }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  pl: 2, borderLeft: '4px solid', borderColor: '#e53935', mb: 2,
                }}>
                  <Chip
                    icon={<FiberManualRecord sx={{ fontSize: '10px !important' }} />}
                    label="LIVE"
                    size="small"
                    sx={{ bgcolor: '#e53935', color: 'white', fontWeight: 700, '& .MuiChip-icon': { color: 'white' } }}
                  />
                  <Typography variant="h5" fontWeight="bold" color="primary">Live</Typography>
                </Box>
                <Tabs value={liveTab} onChange={(_, v) => setLiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tab
                    icon={<SportsCricket sx={{ fontSize: 16 }} />}
                    iconPosition="start"
                    label={`Matches (${liveMatches.length})`}
                    sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
                  />
                  {liveTournaments.length > 0 && (
                    <Tab
                      icon={<EmojiEvents sx={{ fontSize: 16 }} />}
                      iconPosition="start"
                      label={`Tournaments (${liveTournaments.length})`}
                      sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
                    />
                  )}
                </Tabs>
              </Box>

              {/* Matches tab */}
              {liveTab === 0 && (
                liveMatches.length === 0 ? (
                  <Typography color="text.secondary">No live matches right now.</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {liveMatches.map(m => (
                      <Grid item xs={12} sm={6} md={4} key={m.matchId}>
                        <MatchCard m={m} live />
                      </Grid>
                    ))}
                  </Grid>
                )
              )}

              {/* Tournaments tab */}
              {liveTab === 1 && liveTournaments.length > 0 && (
                <Grid container spacing={2}>
                  {liveTournaments.map(t => (
                    <Grid item xs={12} sm={6} md={4} key={t.tournamentId} sx={{ display: 'flex' }}>
                      <Card variant="outlined" sx={{ borderRadius: 2, position: 'relative', overflow: 'visible', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Box sx={{
                          position: 'absolute', top: -10, right: 12,
                          bgcolor: '#e53935', color: 'white', borderRadius: 1, px: 1, py: 0.25,
                          display: 'flex', alignItems: 'center', gap: 0.4,
                          fontSize: '0.7rem', fontWeight: 700, letterSpacing: 0.5,
                        }}>
                          <FiberManualRecord sx={{ fontSize: 8 }} /> LIVE
                        </Box>
                        <CardContent sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                            <Avatar src={t.logoUrl} variant="rounded" sx={{ width: 44, height: 44, flexShrink: 0 }}>{t.name.charAt(0)}</Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>{t.name}</Typography>
                              {t.cricketFormat && <Chip label={t.cricketFormat} size="small" variant="outlined" sx={{ mt: 0.5 }} />}
                            </Box>
                          </Box>
                          {(t.startDate || t.endDate) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarMonth sx={{ fontSize: 15, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">{t.startDate ?? '?'} — {t.endDate ?? '?'}</Typography>
                            </Box>
                          )}
                        </CardContent>
                        <Divider />
                        <Box sx={{ px: 1.5, py: 1 }}>
                          <Button size="small" startIcon={<EventNote />} onClick={() => navigate(`/tournaments/${t.tournamentId}/schedule`)}>
                            View Schedule
                          </Button>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Container>
          </Box>
        </>
      )}

      {/* ── Results & Standings ─────────────────────────────────────────── */}
      {(recentResults.length > 0 || Object.keys(standingsMap).length > 0) && (
        <>
          <Divider sx={{ borderColor: 'divider', opacity: 0.5 }} />
          <Box sx={{ py: { xs: 5, md: 7 }, bgcolor: 'background.default' }}>
            <Container maxWidth="lg">
              <Box sx={{ mb: 3 }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  pl: 2, borderLeft: '4px solid', borderColor: 'primary.main', mb: 2,
                }}>
                  <CheckCircle color="primary" />
                  <Typography variant="h5" fontWeight="bold" color="primary">Results</Typography>
                </Box>
                <Tabs value={resultsTab} onChange={(_, v) => setResultsTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tab
                    icon={<CheckCircle sx={{ fontSize: 16 }} />}
                    iconPosition="start"
                    label={`Recent Results (${recentResults.length})`}
                    sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
                  />
                  {Object.keys(standingsMap).length > 0 && (
                    <Tab
                      icon={<EmojiEvents sx={{ fontSize: 16 }} />}
                      iconPosition="start"
                      label="Standings"
                      sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
                    />
                  )}
                </Tabs>
              </Box>

              {/* Recent Results tab */}
              {resultsTab === 0 && (
                recentResults.length === 0 ? (
                  <Typography color="text.secondary">No recent results available.</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {recentResults.map(r => (
                      <Grid item xs={12} sm={6} md={4} key={r.matchId}>
                        <ResultCard
                          r={r}
                          onSummary={() => openSummary(r.matchId, 'facebook')}
                          onScorecard={() => openSummary(r.matchId, 'whatsapp')}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )
              )}

              {/* Standings tab */}
              {resultsTab === 1 && Object.keys(standingsMap).length > 0 && (
                <>
                  {/* Tournament selector when multiple live tournaments */}
                  {liveTournaments.length > 1 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
                      {liveTournaments.map(t => (
                        <Chip
                          key={t.tournamentId}
                          label={t.name}
                          onClick={() => setSelectedStandingsTournament(t.tournamentId!)}
                          color={selectedStandingsTournament === t.tournamentId ? 'primary' : 'default'}
                          variant={selectedStandingsTournament === t.tournamentId ? 'filled' : 'outlined'}
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                  <StandingsTable pools={selectedStandingsTournament ? (standingsMap[selectedStandingsTournament] ?? []) : []} />
                </>
              )}
            </Container>
          </Box>
        </>
      )}

      {/* ── Upcoming (Tournaments + Matches combined) ───────────────────── */}
      {(upcomingTournaments.length > 0 || upcomingMatches.length > 0) && (
        <>
          <Divider />
          <Box ref={upcomingRef} sx={{ py: { xs: 5, md: 7 }, bgcolor: 'background.default' }}>
            <Container maxWidth="lg">
              <Box sx={{ mb: 3 }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  pl: 2, borderLeft: '4px solid', borderColor: 'primary.main', mb: 2,
                }}>
                  <CalendarMonth color="primary" />
                  <Typography variant="h5" fontWeight="bold" color="primary">Upcoming</Typography>
                </Box>
                <Tabs
                  value={upcomingTab}
                  onChange={(_, v) => setUpcomingTab(v)}
                  sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                  <Tab
                    icon={<SportsCricket sx={{ fontSize: 16 }} />}
                    iconPosition="start"
                    label={`Matches (${upcomingMatches.length})`}
                    sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
                  />
                  {upcomingTournaments.length > 0 && (
                    <Tab
                      icon={<EmojiEvents sx={{ fontSize: 16 }} />}
                      iconPosition="start"
                      label={`Tournaments (${upcomingTournaments.length})`}
                      sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
                    />
                  )}
                </Tabs>
              </Box>

              {/* Matches tab */}
              {upcomingTab === 0 && (
                upcomingMatches.length === 0 ? (
                  <Typography color="text.secondary">No upcoming matches scheduled at this time.</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {upcomingMatches.map(m => (
                      <Grid item xs={12} sm={6} md={4} key={m.matchId}>
                        <MatchCard m={m} />
                      </Grid>
                    ))}
                  </Grid>
                )
              )}

              {/* Tournaments tab */}
              {upcomingTournaments.length > 0 && upcomingTab === 1 && (
                <Grid container spacing={2}>
                  {upcomingTournaments.map(t => (
                    <Grid item xs={12} sm={6} md={4} key={t.tournamentId} sx={{ display: 'flex' }}>
                      <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <CardContent sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                            <CountdownDisplay matchDate={t.startDate} />
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                            <Avatar src={t.logoUrl} variant="rounded" sx={{ width: 44, height: 44, flexShrink: 0 }}>{t.name.charAt(0)}</Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>{t.name}</Typography>
                              {t.cricketFormat && <Chip label={t.cricketFormat} size="small" variant="outlined" sx={{ mt: 0.5 }} />}
                            </Box>
                          </Box>
                          {(t.startDate || t.endDate) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                              <CalendarMonth sx={{ fontSize: 15, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">{t.startDate ?? '?'} — {t.endDate ?? '?'}</Typography>
                            </Box>
                          )}
                          {(t.websiteLink || t.facebookLink || t.instagramLink || t.youtubeLink || t.registrationPageUrl) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              {t.websiteLink && (
                                <IconButton size="small" component="a" href={t.websiteLink} target="_blank" rel="noopener noreferrer" title="Website">
                                  <OpenInNew sx={{ fontSize: 18, color: 'text.secondary' }} />
                                </IconButton>
                              )}
                              {t.facebookLink && (
                                <IconButton size="small" component="a" href={t.facebookLink} target="_blank" rel="noopener noreferrer" title="Facebook">
                                  <Facebook sx={{ fontSize: 18, color: '#1877F2' }} />
                                </IconButton>
                              )}
                              {t.instagramLink && (
                                <IconButton size="small" component="a" href={t.instagramLink} target="_blank" rel="noopener noreferrer" title="Instagram">
                                  <Instagram sx={{ fontSize: 18, color: '#E1306C' }} />
                                </IconButton>
                              )}
                              {t.youtubeLink && (
                                <IconButton size="small" component="a" href={t.youtubeLink} target="_blank" rel="noopener noreferrer" title="YouTube">
                                  <YouTube sx={{ fontSize: 18, color: '#FF0000' }} />
                                </IconButton>
                              )}
                            </Box>
                          )}
                        </CardContent>
                        <Divider />
                        <Box sx={{ px: 1.5, py: 1, display: 'flex', gap: 1 }}>
                          <Button size="small" startIcon={<EventNote />} onClick={() => navigate(`/tournaments/${t.tournamentId}/schedule`)}>
                            View Schedule
                          </Button>
                          {t.registrationPageUrl && (
                            <Button size="small" startIcon={<AppRegistration />} component="a" href={t.registrationPageUrl} target="_blank" rel="noopener noreferrer">
                              Register
                            </Button>
                          )}
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

            </Container>
          </Box>
        </>
      )}

      {/* ── Media Gallery ───────────────────────────────────────────────── */}
      {allMedia.length > 0 && (
        <>
          <Divider sx={{ borderColor: 'divider', opacity: 0.5 }} />
          <Box sx={{ py: { xs: 5, md: 7 }, bgcolor: 'background.default' }}>
            <Container maxWidth="lg">
              <SectionHeader
                icon={<PhotoLibrary color="primary" />}
                title="Media Gallery"
                subtitle="Photos and highlights from our matches and tournaments."
              />
              <MediaCarousel items={allMedia} height={480} />
            </Container>
          </Box>
        </>
      )}

      {/* ── Social Media ────────────────────────────────────────────────── */}
      {socialMediaPages.length > 0 && (
        <>
          <Divider />
          <Box sx={{ py: { xs: 5, md: 7 }, bgcolor: 'background.default' }}>
            <Container maxWidth="lg">
              <SectionHeader
                icon={<Facebook sx={{ color: '#1877F2' }} />}
                title="Follow Us"
                subtitle="Stay connected on social media."
              />
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
              <SectionHeader
                icon={<Handshake color="primary" />}
                title="Our Sponsors"
                subtitle="Thank you to the partners who make Cricket Legend possible."
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: { xs: 4, sm: 6 } }}>
                {sponsors.map(s => (
                  <Box key={s.sponsorId} sx={{ textAlign: 'center', maxWidth: 140 }}>
                    <Avatar
                      src={s.brandLogoUrl}
                      variant="rounded"
                      sx={{ width: 80, height: 80, mx: 'auto', mb: 1.25, boxShadow: 1 }}
                    >
                      {s.name.charAt(0)}
                    </Avatar>
                    <Typography variant="subtitle2" fontWeight="bold">{s.name}</Typography>
                    {s.brandWebsite && (
                      <Typography
                        component="a"
                        href={s.brandWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                        sx={{
                          color: 'primary.main', textDecoration: 'none',
                          display: 'flex', alignItems: 'center', gap: 0.3, justifyContent: 'center',
                          mt: 0.25, '&:hover': { textDecoration: 'underline' },
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
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

      {/* ── Match summary dialog ────────────────────────────────────────── */}
      <Dialog open={summaryLoading || !!summaryMatch} onClose={() => { setSummaryMatch(null); setSummaryLoading(false); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          Match Summary
          <IconButton size="small" onClick={() => { setSummaryMatch(null); setSummaryLoading(false); }}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {summaryLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {summaryMatch && (
            <MatchSummaryView
              match={summaryMatch}
              view={summaryView}
              onBack={() => setSummaryMatch(null)}
            />
          )}
        </DialogContent>
      </Dialog>

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
        background: isDark
          ? 'linear-gradient(160deg, #0a160a 0%, #0e2a0e 100%)'
          : 'linear-gradient(160deg, #0d3349 0%, #1a5276 100%)',
        color: 'rgba(255,255,255,0.85)',
        pt: 6, pb: 3,
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ mb: 4 }}>

            {/* Brand column */}
            <Grid item xs={12} sm={5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                <SportsCricket sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">Cricket Legend</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.65, maxWidth: 290, lineHeight: 1.75 }}>
                Complete cricket management for clubs, tournaments and players. Built for South African cricket communities.
              </Typography>
            </Grid>

            {/* Quick links */}
            <Grid item xs={6} sm={3.5}>
              <Typography variant="overline" sx={{ letterSpacing: 2.5, opacity: 0.45, display: 'block', mb: 1.5, fontSize: '0.65rem' }}>
                Quick Links
              </Typography>
              {[
                ...(!keycloak.authenticated ? [{ label: 'Login to Dashboard', action: () => keycloak.login() }] : []),
                { label: 'View Tournaments',   action: () => tournamentsRef.current?.scrollIntoView({ behavior: 'smooth' }) },
                { label: 'Upcoming',           action: () => upcomingRef.current?.scrollIntoView({ behavior: 'smooth' }) },
              ].map(link => (
                <Typography
                  key={link.label}
                  variant="body2"
                  onClick={link.action}
                  sx={{ opacity: 0.7, cursor: 'pointer', mb: 1, '&:hover': { opacity: 1 }, transition: 'opacity 0.2s' }}
                >
                  {link.label}
                </Typography>
              ))}
            </Grid>

            {/* Social / Follow */}
            {socialMediaPages.length > 0 && (
              <Grid item xs={6} sm={3.5}>
                <Typography variant="overline" sx={{ letterSpacing: 2.5, opacity: 0.45, display: 'block', mb: 1.5, fontSize: '0.65rem' }}>
                  Follow Us
                </Typography>
                {socialMediaPages.map(page => (
                  <Typography
                    key={page.id}
                    component="a"
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    sx={{
                      opacity: 0.7, display: 'flex', alignItems: 'center', gap: 0.75, mb: 1,
                      textDecoration: 'none', color: 'inherit',
                      '&:hover': { opacity: 1 }, transition: 'opacity 0.2s',
                    }}
                  >
                    <Facebook sx={{ fontSize: 16, color: '#1877F2' }} />
                    {page.label}
                  </Typography>
                ))}
              </Grid>
            )}
          </Grid>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 3 }} />

          {/* Features strip */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { icon: <EmojiEvents sx={{ fontSize: 22 }} />,    title: 'Tournaments',         desc: 'Create and manage tournaments with pools, standings and results.' },
              { icon: <CalendarMonth  sx={{ fontSize: 22 }} />, title: 'Fixtures',             desc: 'Schedule matches, assign grounds and umpires, track upcoming games.' },
              { icon: <SportsCricket  sx={{ fontSize: 22 }} />, title: 'Scorecards',           desc: 'Full match results, scorecards and player statistics.' },
              { icon: <AccountBalance sx={{ fontSize: 22 }} />, title: 'Financials',           desc: 'Track match fees, payments and wallet balances.' },
              { icon: <Groups         sx={{ fontSize: 22 }} />, title: 'Team Management',      desc: 'Manage squads, select teamsheets and organise player roles.' },
              { icon: <HowToVote      sx={{ fontSize: 22 }} />, title: 'Availability Polls',   desc: 'Send availability polls and build your squad with confidence.' },
            ].map(f => (
              <Grid item xs={6} sm={4} md={2} key={f.title}>
                <Box
                  onClick={() => setFeatureDialog(f)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    cursor: 'pointer', opacity: 0.55,
                    transition: 'opacity 0.2s',
                    '&:hover': { opacity: 1 },
                  }}
                >
                  {f.icon}
                  <Typography variant="caption" sx={{ lineHeight: 1.3 }}>{f.title}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 2.5 }} />
          <Typography variant="caption" sx={{ opacity: 0.45 }}>
            © {new Date().getFullYear()} Cricket Legend. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};
