import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Chip, Avatar, Divider, Stack,
  Card, CardContent, MenuItem, TextField, useTheme, useMediaQuery, Button,
  Dialog, DialogTitle, DialogContent, IconButton, Paper,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, AccessTime, LocationOn, SportsScore,
  CheckCircle, Cancel, Remove, ArrowBack, Share, Close, Psychology,
} from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { tournamentApi } from '../../api/tournamentApi';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { Match, MatchResult, Team, Tournament } from '../../types';
import WhatsAppTemplate from '../admin/templates/WhatsAppTemplate';
import FacebookTemplate from '../admin/templates/FacebookTemplate';
import ScorecardTemplate from '../admin/templates/ScorecardTemplate';
import BroadcastScorecardTemplate from '../admin/templates/BroadcastScorecardTemplate';
import ManOfTheMatchTemplate from '../admin/templates/ManOfTheMatchTemplate';
import { TemplateProps, TeamFilter } from '../admin/templates/types';
import { GameAnalysisView } from '../../components/match/GameAnalysisView';

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtTime = (t?: string) => (t ? t.substring(0, 5) : null);

const sortKey = (m: Match) =>
  `${m.matchDate ?? '0000-01-01'}T${m.scheduledStartTime ?? '00:00:00'}`;

const isFinal = (m: Match) =>
  !!(m.matchCompleted || m.forfeited || m.noResult || m.matchDrawn);

const fmtScore = (runs?: number, wickets?: number, overs?: string) => {
  if (runs == null) return null;
  const w = wickets != null && wickets < 10 ? `/${wickets}` : '';
  const o = overs ? ` (${overs})` : '';
  return `${runs}${w}${o}`;
};

function resultLine(m: Match, teamId: number): { label: string; color: 'success' | 'error' | 'default'; icon: React.ReactElement } {
  const icon = (c: 'success' | 'error' | 'default') =>
    c === 'success' ? <CheckCircle /> : c === 'error' ? <Cancel /> : <Remove />;

  if (m.noResult)   return { label: 'No Result',  color: 'default',  icon: icon('default') };
  if (m.matchDrawn) return { label: 'Draw',        color: 'default',  icon: icon('default') };
  if (m.forfeited)  return { label: 'Forfeited',   color: 'default',  icon: icon('default') };
  if (!m.matchCompleted) return { label: 'Upcoming', color: 'default', icon: icon('default') };

  const desc = (m.matchOutcomeDescription ?? '').toLowerCase();
  const myName = (m.homeTeamId === teamId ? (m.homeTeamName ?? '') : (m.oppositionTeamName ?? '')).toLowerCase();
  const won = desc.includes('won') && myName && desc.includes(myName);
  return won
    ? { label: 'Won', color: 'success', icon: icon('success') }
    : { label: 'Lost', color: 'error', icon: icon('error') };
}

interface TournamentGroup {
  tournamentId: number | null;
  tournamentName: string;
  matches: Match[];
  latestDate: string;
}

const groupByTournament = (matches: Match[]): TournamentGroup[] => {
  const map = new Map<string, TournamentGroup>();
  for (const m of matches) {
    const key = m.tournamentId != null ? String(m.tournamentId) : '__none__';
    if (!map.has(key)) {
      map.set(key, {
        tournamentId: m.tournamentId ?? null,
        tournamentName: m.tournamentName ?? 'Friendlies / No Tournament',
        matches: [],
        latestDate: sortKey(m),
      });
    }
    const g = map.get(key)!;
    g.matches.push(m);
    if (sortKey(m) > g.latestDate) g.latestDate = sortKey(m);
  }
  for (const g of map.values()) {
    g.matches.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  }
  return [...map.values()].sort((a, b) => b.latestDate.localeCompare(a.latestDate));
};

type ShareStep = 'type' | 'template' | 'motm' | 'analysis';

const SHARE_TYPES: { key: ShareStep; label: string; description: string; icon: React.ReactNode }[] = [
  { key: 'template', label: 'Match Result',    description: 'Result, scores & share templates',    icon: <SportsScore sx={{ fontSize: 32 }} /> },
  { key: 'motm',     label: 'Man of the Match', description: 'Player highlight card with photo',   icon: <EmojiEvents  sx={{ fontSize: 32 }} /> },
  { key: 'analysis', label: 'Game Analysis',   description: 'AI-powered insights & chart data',    icon: <Psychology   sx={{ fontSize: 32 }} /> },
];

export const ShareMatchDialog: React.FC<{ match: Match | null; teamId: number | ''; teamName: string; onClose: () => void }> = ({ match, teamId, teamName, onClose }) => {
  const [step, setStep] = useState<ShareStep>('type');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('whatsapp');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('both');

  useEffect(() => {
    if (!match?.matchId) { setResult(null); setTournament(null); setStep('type'); return; }
    setStep('type');
    setLoading(true);
    Promise.all([
      matchApi.getResult(match.matchId).catch(() => null),
      match.tournamentId ? tournamentApi.findById(match.tournamentId).catch(() => null) : Promise.resolve(null),
    ]).then(([r, t]) => { setResult(r); setTournament(t); })
      .finally(() => setLoading(false));
  }, [match?.matchId]);

  if (!match) return null;

  const teams = [
    { id: match.homeTeamId, name: match.homeTeamName },
    { id: match.oppositionTeamId, name: match.oppositionTeamName },
  ].filter(t => t.id);

  const firstInningsTeam  = result ? teams.find(t => t.id === result.sideBattingFirstId) : null;
  const secondInningsTeam = result ? teams.find(t => t.id !== result.sideBattingFirstId && t.id != null) : null;
  const firstTeamName  = firstInningsTeam?.name  ?? match.homeTeamName        ?? '1st Innings';
  const secondTeamName = secondInningsTeam?.name ?? match.oppositionTeamName  ?? '2nd Innings';

  const emptyResult: MatchResult = {
    matchCompleted: false, matchDrawn: false, forfeited: false, noResult: false,
    decidedOnDLS: false, decidedBySuperOver: false, wonWithBonusPoint: false,
    resultVisibility: 'NOT_PUBLISHED',
  };

  const firstCard  = result?.scoreCard?.teamA ?? {};
  const secondCard = result?.scoreCard?.teamB ?? {};
  const hasScorecard = !!(firstCard.batting?.length || secondCard.batting?.length);

  const templateProps: TemplateProps = {
    match,
    result: result ?? emptyResult,
    tournament,
    firstTeamName,
    secondTeamName,
    firstCard,
    secondCard,
    motmName: result?.manOfTheMatchName ?? null,
    teamFilter,
  };

  const stepTitle: Record<ShareStep, string> = {
    type:     'Share',
    template: 'Match Result',
    motm:     'Man of the Match',
    analysis: 'Game Analysis',
  };

  return (
    <Dialog open={!!match} onClose={onClose} maxWidth={step === 'analysis' ? 'lg' : 'md'} fullWidth fullScreen={step === 'analysis'}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        {step !== 'type' && (
          <IconButton size="small" onClick={() => setStep('type')} sx={{ mr: 0.5 }}>
            <ArrowBack fontSize="small" />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="span">{stepTitle[step]}</Typography>
          {step === 'type' && (
            <Typography variant="body2" color="text.secondary">
              {match.homeTeamName} vs {match.oppositionTeamName}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>

      <DialogContent>
        {step === 'type' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2, py: 1 }}>
            {SHARE_TYPES.map(type => (
              <Card
                key={type.key}
                variant="outlined"
                onClick={() => setStep(type.key)}
                sx={{
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                <CardContent sx={{ py: 3 }}>
                  <Box sx={{ color: 'primary.main', mb: 1 }}>{type.icon}</Box>
                  <Typography variant="subtitle2" fontWeight={700}>{type.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{type.description}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

        ) : step === 'motm' ? (
          loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <ManOfTheMatchTemplate {...templateProps} />
          )

        ) : step === 'analysis' ? (
          teamId ? (
            <GameAnalysisView
              matchId={match.matchId!}
              teamId={teamId as number}
              teamName={teamName}
              matchTitle={`${match.homeTeamName ?? ''} vs ${match.oppositionTeamName ?? ''}`}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Typography variant="body2">Select a team before running analysis.</Typography>
            </Box>
          )

        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <>
            <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>Template:</Typography>
                <TextField select size="small" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} sx={{ minWidth: 200 }}>
                  <MenuItem value="whatsapp">📱 WhatsApp Template</MenuItem>
                  <MenuItem value="facebook">📘 Facebook Template</MenuItem>
                  <MenuItem value="scorecard">📺 Scorecard Template</MenuItem>
                  <MenuItem value="broadcast">📡 Broadcast Scorecard</MenuItem>
                </TextField>
              </Box>
              {hasScorecard && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>View:</Typography>
                  <TextField select size="small" value={teamFilter} onChange={e => setTeamFilter(e.target.value as TeamFilter)} sx={{ minWidth: 180 }}>
                    <MenuItem value="both">Both Teams</MenuItem>
                    <MenuItem value="first">{firstTeamName}</MenuItem>
                    <MenuItem value="second">{secondTeamName}</MenuItem>
                  </TextField>
                </Box>
              )}
            </Paper>
            {selectedTemplate === 'whatsapp'  && <WhatsAppTemplate           key="whatsapp"  {...templateProps} />}
            {selectedTemplate === 'facebook'  && <FacebookTemplate           key="facebook"  {...templateProps} />}
            {selectedTemplate === 'scorecard' && <ScorecardTemplate          key="scorecard" {...templateProps} />}
            {selectedTemplate === 'broadcast' && <BroadcastScorecardTemplate key="broadcast" {...templateProps} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const MatchRow: React.FC<{ match: Match; teamId: number; onShare: (m: Match) => void }> = ({ match: m, teamId, onShare }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const isHome = m.homeTeamId === teamId;
  const opponent = isHome ? m.oppositionTeamName : m.homeTeamName;
  const opponentLogo = isHome ? m.oppositionTeamLogoUrl : m.homeTeamLogoUrl;
  const opponentAbbr = isHome ? m.oppositionTeamAbbreviation : m.homeTeamAbbreviation;
  const result = resultLine(m, teamId);

  const homeBattedFirst =
    (m.tossWonBy === 'HOME' && m.tossDecision === 'BAT') ||
    (m.tossWonBy === 'OPPOSITION' && m.tossDecision === 'BOWL');
  const myRuns    = isHome ? (homeBattedFirst ? m.scoreBattingFirst    : m.scoreBattingSecond)   : (homeBattedFirst ? m.scoreBattingSecond   : m.scoreBattingFirst);
  const myWkts    = isHome ? (homeBattedFirst ? m.wicketsLostBattingFirst : m.wicketsLostBattingSecond) : (homeBattedFirst ? m.wicketsLostBattingSecond : m.wicketsLostBattingFirst);
  const myOvers   = isHome ? (homeBattedFirst ? m.oversBattingFirst    : m.oversBattingSecond)   : (homeBattedFirst ? m.oversBattingSecond   : m.oversBattingFirst);
  const oppRuns   = isHome ? (homeBattedFirst ? m.scoreBattingSecond   : m.scoreBattingFirst)    : (homeBattedFirst ? m.scoreBattingFirst    : m.scoreBattingSecond);
  const oppWkts   = isHome ? (homeBattedFirst ? m.wicketsLostBattingSecond : m.wicketsLostBattingFirst) : (homeBattedFirst ? m.wicketsLostBattingFirst : m.wicketsLostBattingSecond);
  const oppOvers  = isHome ? (homeBattedFirst ? m.oversBattingSecond   : m.oversBattingFirst)    : (homeBattedFirst ? m.oversBattingFirst    : m.oversBattingSecond);

  const myScore  = fmtScore(myRuns,  myWkts,  myOvers);
  const oppScore = fmtScore(oppRuns, oppWkts, oppOvers);

  return (
    <Card
      variant="outlined"
      onClick={() => m.matchId && navigate(`/matches/scorecards?matchId=${m.matchId}`)}
      sx={{ mb: 1.5, cursor: m.matchId ? 'pointer' : 'default', '&:hover': m.matchId ? { borderColor: 'primary.main' } : {} }}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>

        {/* Teams + result chip */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar src={opponentLogo} sx={{ width: 26, height: 26, fontSize: 12 }}>
              {opponent?.charAt(0)}
            </Avatar>
            <Typography variant="caption" color="text.secondary">{isHome ? 'vs' : '@'}</Typography>
            <Typography variant="body2" fontWeight="bold">
              {opponentAbbr ?? opponent ?? '—'}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Chip label={result.label} color={result.color} size="small" icon={result.icon} />
            <IconButton size="small" onClick={e => { e.stopPropagation(); onShare(m); }} sx={{ color: 'text.secondary' }}>
              <Share sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        </Stack>

        {/* Scores */}
        {(myScore || oppScore) && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>Us</Typography>
            <Typography variant="body2" fontWeight="bold">{myScore ?? '—'}</Typography>
            <Typography variant="caption" color="text.disabled">·</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>Opp</Typography>
            <Typography variant="body2">{oppScore ?? '—'}</Typography>
          </Stack>
        )}

        {/* Outcome */}
        {m.matchOutcomeDescription && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {m.matchOutcomeDescription}
          </Typography>
        )}

        {/* Meta */}
        <Stack
          direction={isMobile ? 'column' : 'row'}
          spacing={1}
          alignItems={{ sm: 'center' }}
          sx={{ mt: 1, flexWrap: 'wrap' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarMonth sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="caption">{fmtDate(m.matchDate)}</Typography>
          </Box>
          {fmtTime(m.scheduledStartTime) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTime sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption">{fmtTime(m.scheduledStartTime)}</Typography>
            </Box>
          )}
          {m.fieldName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {m.fieldIconUrl
                ? <Avatar src={m.fieldIconUrl} variant="rounded" sx={{ width: 13, height: 13 }} />
                : <LocationOn sx={{ fontSize: 13, color: 'text.secondary' }} />}
              <Typography variant="caption" noWrap sx={{ maxWidth: 180 }}>{m.fieldName}</Typography>
            </Box>
          )}
          {m.matchStage && (
            <Chip label={STAGE_LABELS[m.matchStage] ?? m.matchStage} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
          )}
        </Stack>


      </CardContent>
    </Card>
  );
};

export const ManageTeamResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { returnTo } = (location.state ?? {}) as { returnTo?: string };
  const { teamIds, restrictByTeam, loaded: teamsLoaded } = useManagerTeams();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [shareMatch, setShareMatch] = useState<Match | null>(null);

  const selectedTeamId: number | '' = Number(searchParams.get('teamId')) || '';
  const selectedTeam = teams.find(t => t.teamId === selectedTeamId);

  const setSelectedTeamId = (id: number | '') => {
    setSearchParams(id ? { teamId: String(id) } : {}, { replace: true });
  };

  useEffect(() => {
    if (!teamsLoaded) return;
    teamApi.findAll()
      .then(all => {
        const filtered = restrictByTeam ? all.filter(t => teamIds.has(t.teamId!)) : all;
        setTeams(filtered);
        if (filtered.length === 1 && !searchParams.get('teamId')) setSelectedTeamId(filtered[0].teamId!);
      })
      .finally(() => setTeamsLoading(false));
  }, [teamsLoaded, restrictByTeam, teamIds]);

  useEffect(() => {
    if (!selectedTeamId) { setMatches([]); return; }
    setMatchesLoading(true);
    matchApi.findAll()
      .then(all => setMatches(
        all.filter(m => (m.homeTeamId === selectedTeamId || m.oppositionTeamId === selectedTeamId) && isFinal(m))
      ))
      .finally(() => setMatchesLoading(false));
  }, [selectedTeamId]);

  const groups = groupByTournament(matches);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        {returnTo && (
          <Button startIcon={<ArrowBack />} size="small" onClick={() => navigate(returnTo)} sx={{ mr: 0.5 }}>
            Back
          </Button>
        )}
        <SportsScore color="primary" />
        <Typography variant="h5">Team Results</Typography>
        {selectedTeamId && !matchesLoading && (
          <Chip label={`${matches.length} match${matches.length !== 1 ? 'es' : ''}`} size="small" variant="outlined" sx={{ ml: 1 }} />
        )}
      </Box>

      <TextField
        select
        label="Select Team"
        size="small"
        value={selectedTeamId}
        onChange={e => setSelectedTeamId(e.target.value as number | '')}
        sx={{ minWidth: 260, mb: 3 }}
        disabled={teamsLoading || !teamsLoaded}
      >
        <MenuItem value=""><em>— Choose a team —</em></MenuItem>
        {teams.map(t => (
          <MenuItem key={t.teamId} value={t.teamId}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar src={t.logoUrl} sx={{ width: 22, height: 22, fontSize: 10 }}>{t.teamName.charAt(0)}</Avatar>
              {t.teamName}
            </Box>
          </MenuItem>
        ))}
      </TextField>

      {matchesLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!matchesLoading && selectedTeamId && groups.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <SportsScore sx={{ fontSize: 56, mb: 1, opacity: 0.3 }} />
          <Typography variant="body1">No results found for this team.</Typography>
        </Box>
      )}

      {!matchesLoading && !selectedTeamId && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography variant="body2">Select a team above to view their results.</Typography>
        </Box>
      )}

      {!matchesLoading && groups.map((group, i) => (
        <Box key={group.tournamentId ?? '__none__'} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <EmojiEvents color="action" fontSize="small" />
            <Typography variant="subtitle1" fontWeight="bold">{group.tournamentName}</Typography>
            <Chip label={group.matches.length} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
          </Stack>

          {group.matches.map(m => (
            <MatchRow key={m.matchId} match={m} teamId={selectedTeamId as number} onShare={setShareMatch} />
          ))}

          {i < groups.length - 1 && <Divider sx={{ mt: 2 }} />}
        </Box>
      ))}

      <ShareMatchDialog
        match={shareMatch}
        teamId={selectedTeamId}
        teamName={selectedTeam?.teamName ?? ''}
        onClose={() => setShareMatch(null)}
      />
    </Box>
  );
};
