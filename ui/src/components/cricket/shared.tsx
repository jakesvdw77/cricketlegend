import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Avatar, Card, CardContent, Chip, Divider,
  Grid, Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Paper, IconButton, Tooltip, Skeleton, Snackbar,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, LocationOn, AccessTime, Article, ScoreboardOutlined,
  FiberManualRecord, YouTube, Summarize, SportsScore, IosShare, CalendarToday, Edit,
} from '@mui/icons-material';
import { Match, MatchResultSummary, PoolStandings } from '../../types';
import keycloak from '../../keycloak';

// ── Stage labels ─────────────────────────────────────────────────────────────

export const STAGE_LABEL: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

export const STAGE_ORDER = ['FRIENDLY', 'POOL', 'PLAYOFFS', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'];

// ── ICS calendar download ────────────────────────────────────────────────────

export function downloadIcs(m: Match) {
  const date = m.matchDate?.replace(/-/g, '') ?? '';
  const time = (m.scheduledStartTime ?? '09:00:00').replace(/:/g, '');
  const dtStart = `${date}T${time}`;
  const startMs = new Date(`${m.matchDate ?? '2000-01-01'}T${m.scheduledStartTime ?? '09:00:00'}`).getTime();
  const endDate = new Date(startMs + 4 * 3_600_000);
  const dtEnd = [
    endDate.getFullYear(),
    String(endDate.getMonth() + 1).padStart(2, '0'),
    String(endDate.getDate()).padStart(2, '0'),
  ].join('') + 'T' + [
    String(endDate.getHours()).padStart(2, '0'),
    String(endDate.getMinutes()).padStart(2, '0'),
    '00',
  ].join('');
  const stage = m.matchStage ? ` – ${STAGE_LABEL[m.matchStage] ?? m.matchStage}` : '';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cricket Legend//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${m.homeTeamName} vs ${m.oppositionTeamName}`,
    `DESCRIPTION:${m.tournamentName ?? ''}${stage}`,
    m.fieldName ? `LOCATION:${m.fieldName}` : null,
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(m.homeTeamName ?? 'Home').replace(/\s+/g, '-')}-vs-${(m.oppositionTeamName ?? 'Away').replace(/\s+/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Countdown hook ───────────────────────────────────────────────────────────

export function parseMatchStart(matchDate?: string, startTime?: string): Date | null {
  if (!matchDate) return null;
  const iso = startTime ? `${matchDate}T${startTime}` : `${matchDate}T00:00:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function useCountdown(target: Date | null) {
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

export const CountdownDisplay: React.FC<{ matchDate?: string; startTime?: string }> = ({ matchDate, startTime }) => {
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

export function parseCoords(url?: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  const q = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  return null;
}

interface WeatherDay { icon: string; maxTemp: number; minTemp: number; precipProb: number; }

export function useWeather(coords: { lat: number; lng: number } | null, date?: string): WeatherDay | null {
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

export const MatchCard: React.FC<{ m: Match; live?: boolean; hideTournament?: boolean; onEdit?: () => void }> = ({ m, live, hideTournament, onEdit }) => {
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
      <CardContent onClick={onEdit} sx={{ cursor: onEdit ? 'pointer' : 'default' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {!hideTournament && m.tournamentName && (
              <Chip label={m.tournamentName} size="small" icon={<EmojiEvents />} color="primary" variant="outlined" />
            )}
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
            <Button size="small" startIcon={<ScoreboardOutlined />} component="a" href={m.scoringUrl} target="_blank" rel="noopener noreferrer">
              Live Scoring
            </Button>
          </Box>
        </>
      )}
      {(!live && m.matchDate) || onEdit ? (
        <>
          <Divider />
          <Box sx={{ px: 1.5, py: 0.75, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
            {!live && m.matchDate && (
              <Button
                size="small"
                startIcon={<CalendarToday sx={{ fontSize: '14px !important' }} />}
                sx={{ px: 1, py: 0.25, fontSize: '0.72rem' }}
                onClick={() => downloadIcs(m)}
              >
                Add to Calendar
              </Button>
            )}
            {onEdit && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Edit sx={{ fontSize: '14px !important' }} />}
                sx={{ px: 1, py: 0.25, fontSize: '0.72rem', ml: 'auto' }}
                onClick={onEdit}
              >
                Edit
              </Button>
            )}
          </Box>
        </>
      ) : null}
    </Card>
  );
};

// ── ResultCard ───────────────────────────────────────────────────────────────

export const ResultCard: React.FC<{ r: MatchResultSummary; onSummary?: () => void; onResult?: () => void; onEdit?: () => void; onScorecard?: () => void }> = ({ r, onSummary, onResult, onEdit, onScorecard }) => {
  const navigate = useNavigate();
  const [toastOpen, setToastOpen] = useState(false);
  const handleShare = async () => {
    const winner = r.winningTeamName ? `${r.winningTeamName} won` : r.matchDrawn ? 'Match drawn' : 'Result';
    const text = `${winner}: ${r.homeTeamName} vs ${r.oppositionTeamName}${r.matchOutcomeDescription ? ` – ${r.matchOutcomeDescription}` : ''}`;
    try {
      if (navigator.share) { await navigator.share({ title: `${r.homeTeamName} vs ${r.oppositionTeamName}`, text }); }
      else { await navigator.clipboard.writeText(text); setToastOpen(true); }
    } catch {}
  };
  const scoreLine = (score?: number, wickets?: number, overs?: string) =>
    score != null ? `${score}/${wickets ?? 0}${overs ? ` (${overs})` : ''}` : null;
  const firstScore  = scoreLine(r.scoreBattingFirst,  r.wicketsLostBattingFirst,  r.oversBattingFirst);
  const secondScore = scoreLine(r.scoreBattingSecond, r.wicketsLostBattingSecond, r.oversBattingSecond);
  const secondTeamName = r.homeTeamName === r.sideBattingFirstName ? r.oppositionTeamName : r.homeTeamName;
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, position: 'relative', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, cursor: onEdit ? 'pointer' : 'default' }} onClick={onEdit}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          {r.winningTeamName
            ? <Chip icon={<EmojiEvents sx={{ fontSize: '14px !important' }} />} label={r.winningTeamName} size="small" color="success" variant="outlined" />
            : r.matchDrawn
              ? <Chip label="Draw" size="small" variant="outlined" />
              : <Box />}
          {r.matchDate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarMonth sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">{r.matchDate.toString()}</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, my: 1.5 }}>
          <Avatar sx={{ width: 40, height: 40 }}>{r.homeTeamName?.charAt(0)}</Avatar>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>{r.homeTeamName}</Typography>
            <Typography variant="caption" color="text.secondary">vs</Typography>
            <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>{r.oppositionTeamName}</Typography>
          </Box>
          <Avatar sx={{ width: 40, height: 40 }}>{r.oppositionTeamName?.charAt(0)}</Avatar>
        </Box>
        <Divider sx={{ my: 1 }} />
        {(firstScore || secondScore) && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 0.5 }}>
            {firstScore && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">{r.sideBattingFirstName}</Typography>
                <Typography variant="body2" fontWeight="bold">{firstScore}</Typography>
              </Box>
            )}
            {secondScore && r.sideBattingFirstName && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">{secondTeamName}</Typography>
                <Typography variant="body2" fontWeight="bold">{secondScore}</Typography>
              </Box>
            )}
          </Box>
        )}
        {r.fieldName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{r.fieldName}</Typography>
          </Box>
        )}
        {r.matchOutcomeDescription && (
          <Typography variant="caption" color="text.secondary" display="block" mt={0.75} sx={{ fontStyle: 'italic' }}>
            {r.matchOutcomeDescription}
          </Typography>
        )}
      </CardContent>
      <>
        <Divider />
        <Box sx={{ px: 1.5, py: 0.75, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
          {keycloak.authenticated && (
            <Button size="small" variant="contained" disableElevation startIcon={<Article sx={{ fontSize: '14px !important' }} />}
              sx={{ px: 1.25, py: 0.4, fontSize: '0.72rem' }}
              onClick={onScorecard ?? (() => navigate(`/matches/scorecards?matchId=${r.matchId}`))}>
              Scorecard
            </Button>
          )}
          {onSummary && (
            <Button size="small" variant="outlined" startIcon={<Summarize sx={{ fontSize: '14px !important' }} />}
              sx={{ px: 1, py: 0.25, fontSize: '0.72rem' }} onClick={onSummary}>
              Summary
            </Button>
          )}
          {onResult && (
            <Button size="small" variant="outlined" startIcon={<SportsScore sx={{ fontSize: '14px !important' }} />}
              sx={{ px: 1, py: 0.25, fontSize: '0.72rem' }} onClick={onResult}>
              Result
            </Button>
          )}
          {r.scoringUrl && (
            <Button size="small" variant="outlined" startIcon={<ScoreboardOutlined sx={{ fontSize: '14px !important' }} />}
              sx={{ px: 1, py: 0.25, fontSize: '0.72rem' }}
              component="a" href={r.scoringUrl} target="_blank" rel="noopener noreferrer">
              Live Scoring
            </Button>
          )}
          {r.youtubeUrl && (
            <Button size="small" variant="outlined" startIcon={<YouTube sx={{ fontSize: '14px !important' }} />}
              sx={{ px: 1, py: 0.25, fontSize: '0.72rem', color: '#FF0000', borderColor: '#FF0000', '&:hover': { borderColor: '#CC0000', bgcolor: 'rgba(255,0,0,0.04)' } }}
              component="a" href={r.youtubeUrl} target="_blank" rel="noopener noreferrer">
              Watch
            </Button>
          )}
          {onEdit && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Edit sx={{ fontSize: '14px !important' }} />}
              sx={{ px: 1, py: 0.25, fontSize: '0.72rem' }}
              onClick={onEdit}
            >
              Edit
            </Button>
          )}
          <Box sx={{ ml: 'auto' }}>
            <Tooltip title="Share result">
              <IconButton size="small" onClick={handleShare} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                <IosShare sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </>
      <Snackbar open={toastOpen} autoHideDuration={2500} onClose={() => setToastOpen(false)}
        message="Copied to clipboard" anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Card>
  );
};

// ── MatchCardSkeleton ────────────────────────────────────────────────────────

export const MatchCardSkeleton: React.FC = () => (
  <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Skeleton variant="rounded" width={100} height={24} />
        <Skeleton variant="rounded" width={80} height={24} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, my: 1.5 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ textAlign: 'center', minWidth: 100 }}>
          <Skeleton width="70%" height={20} sx={{ mx: 'auto', mb: 0.5 }} />
          <Skeleton width="25%" height={14} sx={{ mx: 'auto', mb: 0.5 }} />
          <Skeleton width="70%" height={20} sx={{ mx: 'auto' }} />
        </Box>
        <Skeleton variant="circular" width={40} height={40} />
      </Box>
      <Divider sx={{ my: 1 }} />
      <Skeleton width="55%" height={16} sx={{ mb: 0.5 }} />
      <Skeleton width="45%" height={16} sx={{ mb: 0.5 }} />
      <Skeleton width="65%" height={16} />
    </CardContent>
  </Card>
);

// ── StandingsTable ───────────────────────────────────────────────────────────

export const StandingsTable: React.FC<{ pools: PoolStandings[]; abbreviations?: Map<string, string> }> = ({ pools, abbreviations }) => {
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
                  <TableCell align="center" title="No Result" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>NR</TableCell>
                  <TableCell align="center" title="Drawn" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>D</TableCell>
                  <TableCell align="center" title="Bonus Points" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>BP</TableCell>
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
                      <TableCell sx={{ maxWidth: { xs: 90, sm: 200 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                          <Avatar src={e.logoUrl} variant="rounded" sx={{ width: 26, height: 26, fontSize: 11, flexShrink: 0 }}>{e.teamName.charAt(0)}</Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            {/* Mobile: abbreviation if available, else truncated name */}
                            <Typography variant="body2" fontWeight={idx === 0 ? 700 : 400}
                              sx={{ display: { xs: 'block', sm: 'none' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {abbreviations?.get(e.teamName) ?? e.abbreviation ?? e.teamName}
                            </Typography>
                            {/* Desktop: full name truncated */}
                            <Typography variant="body2" fontWeight={idx === 0 ? 700 : 400}
                              sx={{ display: { xs: 'none', sm: 'block' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {e.teamName}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center"><Typography variant="body2">{e.gamesPlayed}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2" color="success.main" fontWeight={600}>{e.won}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2" color="error.main">{e.lost}</Typography></TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}><Typography variant="body2" color="text.secondary">{e.noResults}</Typography></TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}><Typography variant="body2" color="text.secondary">{e.draws}</Typography></TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}><Typography variant="body2">{e.bonusPoints}</Typography></TableCell>
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
            {[
              ['P','Played',false],['W','Won',false],['L','Lost',false],
              ['NR','No Result',true],['D','Drawn',true],['BP','Bonus Points',true],
              ['Pts','Total Points',false],['NRR','Net Run Rate',false],
            ].map(([l,d,mobileHide]) => (
              <Typography key={l as string} variant="caption" color="text.secondary"
                sx={mobileHide ? { display: { xs: 'none', sm: 'inline' } } : {}}>
                <b>{l}</b> = {d}
              </Typography>
            ))}
          </Box>
        </Box>
      ))}
    </>
  );
};

// ── SkeletonGrid ─────────────────────────────────────────────────────────────

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <Grid container spacing={2}>
    {Array.from({ length: count }).map((_, i) => (
      <Grid item xs={12} sm={6} md={4} key={i}><MatchCardSkeleton /></Grid>
    ))}
  </Grid>
);
