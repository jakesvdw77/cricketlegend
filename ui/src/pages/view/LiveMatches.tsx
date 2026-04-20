import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Divider, Button, Avatar,
} from '@mui/material';
import {
  CalendarMonth, LocationOn, EmojiEvents, ScoreboardOutlined, AccessTime,
  Summarize, Groups, Article, SportsScore, FiberManualRecord, YouTube,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { mediaApi } from '../../api/mediaApi';
import { Match, MediaContent } from '../../types';
import { MediaCarousel } from '../../components/media/MediaCarousel';
import MatchSummaryView, { SummaryView } from './MatchSummaryView';

export const LiveMatches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [allMedia, setAllMedia] = useState<MediaContent[]>([]);
  const [summaryMatch, setSummaryMatch] = useState<Match | null>(null);
  const [summaryView, setSummaryView] = useState<SummaryView>('facebook');
  const navigate = useNavigate();

  useEffect(() => { matchApi.findLive().then(setMatches); }, []);

  useEffect(() => {
    if (matches.length === 0) return;
    const matchIds = matches.map(m => m.matchId).filter(Boolean) as number[];
    Promise.all(matchIds.map(id => mediaApi.search({ matchId: id })))
      .then(results => setAllMedia(results.flat()));
  }, [matches]);

  if (summaryMatch) {
    return <MatchSummaryView match={summaryMatch} view={summaryView} onBack={() => setSummaryMatch(null)} />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h5">Live Matches</Typography>
        <FiberManualRecord sx={{ color: 'error.main', fontSize: 14 }} />
      </Box>
      {matches.length === 0 && (
        <Typography color="text.secondary">No live or upcoming matches at this time.</Typography>
      )}
      <Grid container spacing={2}>
        {matches.map(m => (
          <Grid item xs={12} sm={6} md={4} key={m.matchId} sx={{ display: 'flex' }}>
            <Card variant="outlined" sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label={m.tournamentName} size="small" icon={<EmojiEvents />} color="primary" variant="outlined" />
                  <Chip
                    label="Live"
                    size="small"
                    icon={<FiberManualRecord sx={{ fontSize: '10px !important' }} />}
                    color="error"
                    sx={{ fontWeight: 600 }}
                  />
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
                  <Chip size="small" icon={<CalendarMonth />} label={m.scheduledStartTime ?? 'TBA'} />
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
                  {m.youtubeUrl && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<YouTube />}
                      href={m.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      component="a"
                      sx={{ color: '#FF0000', borderColor: '#FF0000', '&:hover': { borderColor: '#CC0000', bgcolor: 'rgba(255,0,0,0.04)' } }}
                    >
                      Watch Live
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {allMedia.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <MediaCarousel items={allMedia} title="Match Media" />
        </Box>
      )}
    </Box>
  );
};
