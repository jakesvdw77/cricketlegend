import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Divider, Button, Avatar,
  TextField, MenuItem, IconButton,
} from '@mui/material';
import { CalendarMonth, LocationOn, EmojiEvents, ScoreboardOutlined, AccessTime, Summarize, Groups, Article, SportsScore, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { mediaApi } from '../../api/mediaApi';
import { Match, MediaContent } from '../../types';
import { MediaCarousel } from '../../components/media/MediaCarousel';
import MatchSummaryView, { SummaryView } from './MatchSummaryView';

export const PreviousMatches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [allMedia, setAllMedia] = useState<MediaContent[]>([]);
  const [filterTournament, setFilterTournament] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [summaryMatch, setSummaryMatch] = useState<Match | null>(null);
  const [summaryView, setSummaryView] = useState<SummaryView>('facebook');
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  useEffect(() => { matchApi.findCompleted().then(setMatches); }, []);

  // Fetch media for all previous matches once they load
  useEffect(() => {
    if (matches.length === 0) return;
    const matchIds = matches.map(m => m.matchId).filter(Boolean) as number[];
    Promise.all(matchIds.map(id => mediaApi.search({ matchId: id })))
      .then(results => setAllMedia(results.flat()));
  }, [matches]);

  const tournaments = useMemo(() =>
    [...new Set(matches.map(m => m.tournamentName).filter(Boolean))].sort(),
    [matches]);

  const teams = useMemo(() =>
    [...new Set(matches.flatMap(m => [m.homeTeamName, m.oppositionTeamName]).filter(Boolean))].sort(),
    [matches]);

  const filtered = matches
    .filter(m => {
      if (filterTournament && m.tournamentName !== filterTournament) return false;
      if (filterTeam && m.homeTeamName !== filterTeam && m.oppositionTeamName !== filterTeam) return false;
      return true;
    })
    .sort((a, b) => (b.matchDate ?? '').localeCompare(a.matchDate ?? ''));

  const PAGE_SIZE = 3;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Media for the currently visible matches only
  const visibleMedia = useMemo(() => {
    const visibleIds = new Set(filtered.map(m => m.matchId));
    return allMedia.filter(item => item.matchId != null && visibleIds.has(item.matchId));
  }, [allMedia, filtered]);

  if (summaryMatch) {
    return <MatchSummaryView match={summaryMatch} view={summaryView} onBack={() => setSummaryMatch(null)} />;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Completed Matches</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          select label="Tournament" size="small" sx={{ minWidth: 200 }}
          value={filterTournament} onChange={e => { setFilterTournament(e.target.value); setPage(0); }}
        >
          <MenuItem value="">All Tournaments</MenuItem>
          {tournaments.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField
          select label="Team" size="small" sx={{ minWidth: 200 }}
          value={filterTeam} onChange={e => { setFilterTeam(e.target.value); setPage(0); }}
        >
          <MenuItem value="">All Teams</MenuItem>
          {teams.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
      </Box>
      {filtered.length === 0 && <Typography color="text.secondary">No completed matches found.</Typography>}
      <Grid container spacing={2}>
        {paginated.map(m => (
          <Grid item xs={12} sm={6} md={4} key={m.matchId} sx={{ display: 'flex' }}>
            <Card variant="outlined" sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
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
                <Box sx={{ flexGrow: 1 }} />
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" startIcon={<Groups />} onClick={() => navigate(`/matches/${m.matchId}/teamsheet`)}>
                    Team Sheet
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<Article />} onClick={() => navigate(`/matches/scorecards?matchId=${m.matchId}`)}>
                    Scorecard
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Summarize />}
                    onClick={() => { setSummaryView('facebook'); setSummaryMatch(m); }}
                  >
                    Summary
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SportsScore />}
                    onClick={() => { setSummaryView('whatsapp'); setSummaryMatch(m); }}
                  >
                    Result
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

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
          <IconButton onClick={() => setPage(p => p - 1)} disabled={page === 0}>
            <ChevronLeft />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {page + 1} / {totalPages}
          </Typography>
          <IconButton onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
            <ChevronRight />
          </IconButton>
        </Box>
      )}

      {visibleMedia.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <MediaCarousel items={visibleMedia} title="Match Media" />
        </Box>
      )}
    </Box>
  );
};
