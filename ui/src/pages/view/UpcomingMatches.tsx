import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Divider, Button, Avatar,
  TextField, MenuItem,
} from '@mui/material';
import { CalendarMonth, LocationOn, EmojiEvents, ScoreboardOutlined, AccessTime } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { Match } from '../../types';

export const UpcomingMatches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filterTournament, setFilterTournament] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const navigate = useNavigate();

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
          <Grid item xs={12} sm={6} md={4} key={m.matchId}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label={m.tournamentName} size="small" icon={<EmojiEvents />} color="primary" variant="outlined" />
                  <Typography variant="caption" color="text.secondary">{m.matchDate}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, my: 1 }}>
                  <Avatar src={m.homeTeamLogoUrl} sx={{ width: 36, height: 36 }}>
                    {m.homeTeamName?.charAt(0)}
                  </Avatar>
                  <Typography variant="h6" align="center">
                    {m.homeTeamName}
                    <Typography component="span" color="text.secondary"> vs </Typography>
                    {m.oppositionTeamName}
                  </Typography>
                  <Avatar src={m.oppositionTeamLogoUrl} sx={{ width: 36, height: 36 }}>
                    {m.oppositionTeamName?.charAt(0)}
                  </Avatar>
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
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <Button size="small" onClick={() => navigate(`/matches/${m.matchId}/teamsheet`)}>
                    View Team Sheet
                  </Button>
                  {m.scoringUrl && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ScoreboardOutlined />}
                      href={m.scoringUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      component="a"
                    >
                      Live Scoring
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
