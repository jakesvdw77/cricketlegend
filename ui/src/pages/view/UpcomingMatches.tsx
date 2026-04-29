import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Divider, Button, Avatar,
  TextField, MenuItem,
} from '@mui/material';
import { CalendarMonth, LocationOn, EmojiEvents, ScoreboardOutlined, AccessTime, YouTube } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { Match } from '../../types';

// ── Weather ───────────────────────────────────────────────────────────────────

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

// ── MatchCard ─────────────────────────────────────────────────────────────────

const MatchCard: React.FC<{ m: Match }> = ({ m }) => {
  const navigate = useNavigate();
  const coords = useMemo(() => parseCoords(m.fieldGoogleMapsUrl), [m.fieldGoogleMapsUrl]);
  const weather = useWeather(coords, m.matchDate);

  return (
    <Card variant="outlined" sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Chip label={m.tournamentName} size="small" icon={<EmojiEvents />} color="primary" variant="outlined" />
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{m.matchDate}</Typography>
            {weather && (
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 0.75, py: 0.25, whiteSpace: 'nowrap' }}>
                <Typography variant="caption">{weather.icon} {weather.maxTemp}°/{weather.minTemp}° · 💧{weather.precipProb}%</Typography>
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, my: 1 }}>
          <Avatar src={m.homeTeamLogoUrl} sx={{ width: 36, height: 36 }}>{m.homeTeamName?.charAt(0)}</Avatar>
          <Typography variant="h6" align="center">
            {m.homeTeamName}
            <Typography component="span" color="text.secondary"> vs </Typography>
            {m.oppositionTeamName}
          </Typography>
          <Avatar src={m.oppositionTeamLogoUrl} sx={{ width: 36, height: 36 }}>{m.oppositionTeamName?.charAt(0)}</Avatar>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {m.tossTime && <Chip size="small" icon={<AccessTime />} label={`Toss: ${m.tossTime}`} variant="outlined" />}
          <Chip size="small" icon={<CalendarMonth />} label={`${m.scheduledStartTime ?? 'TBA'}`} />
          <Chip
            size="small"
            icon={<LocationOn />}
            label={m.fieldName ?? 'TBA'}
            clickable={!!m.fieldGoogleMapsUrl}
            component={m.fieldGoogleMapsUrl ? 'a' : 'div'}
            href={m.fieldGoogleMapsUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
          />
        </Box>
        {m.umpire && <Typography variant="caption" display="block" mt={1}>Umpire: {m.umpire}</Typography>}
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <Button size="small" onClick={() => navigate(`/matches/${m.matchId}/teamsheet`)}>
            View Team Sheet
          </Button>
          {m.scoringUrl && (
            <Button size="small" variant="outlined" startIcon={<ScoreboardOutlined />}
              href={m.scoringUrl} target="_blank" rel="noopener noreferrer" component="a">
              Live Scoring
            </Button>
          )}
          {m.youtubeUrl && (
            <Button size="small" variant="outlined" startIcon={<YouTube />}
              href={m.youtubeUrl} target="_blank" rel="noopener noreferrer" component="a"
              sx={{ color: '#FF0000', borderColor: '#FF0000', '&:hover': { borderColor: '#CC0000', bgcolor: 'rgba(255,0,0,0.04)' } }}>
              Watch
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const UpcomingMatches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filterTournament, setFilterTournament] = useState('');
  const [filterTeam, setFilterTeam] = useState('');

  useEffect(() => { matchApi.findUpcoming().then(setMatches); }, []);

  const tournaments = useMemo(() =>
    [...new Set(matches.map(m => m.tournamentName).filter(Boolean))].sort(),
    [matches]);

  const teams = useMemo(() =>
    [...new Set(matches.flatMap(m => [m.homeTeamName, m.oppositionTeamName]).filter(Boolean))].sort(),
    [matches]);

  const filtered = matches.filter(m => {
    if (filterTournament && m.tournamentName !== filterTournament) return false;
    if (filterTeam && m.homeTeamName !== filterTeam && m.oppositionTeamName !== filterTeam) return false;
    return true;
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Upcoming Matches</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          select label="Tournament" size="small" sx={{ minWidth: 200 }}
          value={filterTournament} onChange={e => setFilterTournament(e.target.value)}
        >
          <MenuItem value="">All Tournaments</MenuItem>
          {tournaments.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField
          select label="Team" size="small" sx={{ minWidth: 200 }}
          value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
        >
          <MenuItem value="">All Teams</MenuItem>
          {teams.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
      </Box>
      {filtered.length === 0 && <Typography color="text.secondary">No upcoming matches scheduled.</Typography>}
      <Grid container spacing={2}>
        {filtered.map(m => (
          <Grid item xs={12} sm={6} md={4} key={m.matchId} sx={{ display: 'flex' }}>
            <MatchCard m={m} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
