import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Chip, Avatar, Divider,
  Card, CardContent, MenuItem, TextField, Button,
  Dialog, DialogTitle, DialogContent, IconButton, Paper,
} from '@mui/material';
import {
  EmojiEvents, SportsScore,
  CheckCircle, Cancel, Remove, ArrowBack, Share, Close, Psychology, Edit, QueryStats, Assessment,
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
import MatchResultGraphicTemplate from '../admin/templates/MatchResultGraphicTemplate';
import { TemplateProps, TeamFilter } from '../admin/templates/types';
import { GameAnalysisView } from '../../components/match/GameAnalysisView';
import { ResultViewDialog } from './ResultViewDialog';
import { TeamStatsDialog } from './TeamStatsDialog';

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

  if (m.noResult)        return { label: 'No Result', color: 'default', icon: icon('default') };
  if (m.matchDrawn)      return { label: 'Draw',      color: 'default', icon: icon('default') };
  if (m.forfeited)       return { label: 'Forfeited', color: 'default', icon: icon('default') };
  if (!m.matchCompleted) return { label: 'Pending',   color: 'default', icon: icon('default') };

  const desc   = (m.matchOutcomeDescription ?? '').toLowerCase();
  const myName = (m.homeTeamId === teamId ? (m.homeTeamName ?? '') : (m.oppositionTeamName ?? '')).toLowerCase();
  const won    = desc.includes('won') && myName && desc.includes(myName);
  return won
    ? { label: 'Won',  color: 'success', icon: icon('success') }
    : { label: 'Lost', color: 'error',   icon: icon('error') };
}

// ── Week grouping ──────────────────────────────────────────────────────────────

const weekStartOf = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};

const weekLabelOf = (weekStartStr: string): string => {
  const d = new Date(weekStartStr + 'T00:00:00');
  return 'Week of ' + d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

interface WeekGroup { weekStart: string; label: string; matches: Match[] }

const groupByWeek = (matches: Match[]): WeekGroup[] => {
  const map = new Map<string, WeekGroup>();
  for (const m of matches) {
    const ws = m.matchDate ? weekStartOf(m.matchDate) : '0000-01-01';
    if (!map.has(ws)) map.set(ws, { weekStart: ws, label: weekLabelOf(ws), matches: [] });
    map.get(ws)!.matches.push(m);
  }
  for (const g of map.values()) {
    g.matches.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  }
  return [...map.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
};

// ── ShareMatchDialog ───────────────────────────────────────────────────────────

type ShareStep = 'type' | 'template' | 'motm' | 'analysis' | 'graphic';

const SHARE_TYPES: { key: ShareStep; label: string; description: string; icon: React.ReactNode }[] = [
  { key: 'template', label: 'Match Result',     description: 'Result, scores & share templates',  icon: <SportsScore sx={{ fontSize: 32 }} /> },
  { key: 'motm',     label: 'Man of the Match',  description: 'Player highlight card with photo',  icon: <EmojiEvents  sx={{ fontSize: 32 }} /> },
  { key: 'graphic',  label: 'Result Graphic',   description: 'TV-style 16:9 scorecard graphic',   icon: <Assessment   sx={{ fontSize: 32 }} /> },
  { key: 'analysis', label: 'Game Analysis',    description: 'AI-powered insights & chart data',   icon: <Psychology   sx={{ fontSize: 32 }} /> },
];

export const ShareMatchDialog: React.FC<{
  match: Match | null;
  teamId: number | '';
  teamName: string;
  onClose: () => void;
}> = ({ match, teamId, teamName, onClose }) => {
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
  const firstTeamName  = firstInningsTeam?.name  ?? match.homeTeamName       ?? '1st Innings';
  const secondTeamName = secondInningsTeam?.name ?? match.oppositionTeamName ?? '2nd Innings';

  const emptyResult: MatchResult = {
    matchCompleted: false, matchDrawn: false, forfeited: false, noResult: false,
    decidedOnDLS: false, decidedBySuperOver: false, wonWithBonusPoint: false,
    resultVisibility: 'NOT_PUBLISHED',
  };

  const firstCard  = result?.scoreCard?.teamA ?? {};
  const secondCard = result?.scoreCard?.teamB ?? {};
  const hasScorecard = !!(firstCard.batting?.length || secondCard.batting?.length);

  const templateProps: TemplateProps = {
    match, result: result ?? emptyResult, tournament,
    firstTeamName, secondTeamName, firstCard, secondCard,
    motmName: result?.manOfTheMatchName ?? null, teamFilter,
  };

  const stepTitle: Record<ShareStep, string> = {
    type: 'Share', template: 'Match Result', motm: 'Man of the Match', analysis: 'Game Analysis', graphic: 'Result Graphic',
  };

  return (
    <Dialog open={!!match} onClose={onClose} maxWidth={step === 'analysis' ? 'lg' : 'md'} fullWidth fullScreen={step === 'analysis' || step === 'motm' || step === 'graphic'}>
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
          loading
            ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            : <ManOfTheMatchTemplate {...templateProps} />

        ) : step === 'graphic' ? (
          loading
            ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            : <MatchResultGraphicTemplate {...templateProps} />

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

// ── Match card ─────────────────────────────────────────────────────────────────

const MatchCard: React.FC<{ match: Match; teamId: number; onShare: (m: Match) => void; onEdit: (m: Match) => void; onStats: (m: Match) => void; onAnalysis: (m: Match) => void }> = ({ match: m, teamId, onShare, onEdit, onStats, onAnalysis }) => {
  const navigate = useNavigate();
  const isHome = m.homeTeamId === teamId;
  const opponent     = isHome ? m.oppositionTeamName     : m.homeTeamName;
  const opponentLogo = isHome ? m.oppositionTeamLogoUrl  : m.homeTeamLogoUrl;
  const opponentAbbr = isHome ? m.oppositionTeamAbbreviation : m.homeTeamAbbreviation;
  const hasResult    = isFinal(m);
  const result       = resultLine(m, teamId);

  const homeBattedFirst =
    (m.tossWonBy === 'HOME' && m.tossDecision === 'BAT') ||
    (m.tossWonBy === 'OPPOSITION' && m.tossDecision === 'BOWL');

  const myRuns   = isHome ? (homeBattedFirst ? m.scoreBattingFirst  : m.scoreBattingSecond) : (homeBattedFirst ? m.scoreBattingSecond : m.scoreBattingFirst);
  const myWkts   = isHome ? (homeBattedFirst ? m.wicketsLostBattingFirst : m.wicketsLostBattingSecond) : (homeBattedFirst ? m.wicketsLostBattingSecond : m.wicketsLostBattingFirst);
  const myOvers  = isHome ? (homeBattedFirst ? m.oversBattingFirst  : m.oversBattingSecond) : (homeBattedFirst ? m.oversBattingSecond : m.oversBattingFirst);
  const oppRuns  = isHome ? (homeBattedFirst ? m.scoreBattingSecond : m.scoreBattingFirst)  : (homeBattedFirst ? m.scoreBattingFirst  : m.scoreBattingSecond);
  const oppWkts  = isHome ? (homeBattedFirst ? m.wicketsLostBattingSecond : m.wicketsLostBattingFirst) : (homeBattedFirst ? m.wicketsLostBattingFirst : m.wicketsLostBattingSecond);
  const oppOvers = isHome ? (homeBattedFirst ? m.oversBattingSecond : m.oversBattingFirst)  : (homeBattedFirst ? m.oversBattingFirst  : m.oversBattingSecond);

  const myScore  = fmtScore(myRuns,  myWkts,  myOvers);
  const oppScore = fmtScore(oppRuns, oppWkts, oppOvers);

  const metaParts = [
    fmtDate(m.matchDate),
    fmtTime(m.scheduledStartTime),
    m.fieldName,
    m.tournamentName,
  ].filter(Boolean).join(' · ');

  const borderLeftColor = hasResult
    ? (result.color === 'success' ? 'success.main' : result.color === 'error' ? 'error.main' : 'grey.400')
    : 'divider';

  return (
    <Card
      variant="outlined"
      onClick={() => m.matchId && navigate(`/matches/scorecards?matchId=${m.matchId}`)}
      sx={{
        mb: 1,
        cursor: m.matchId ? 'pointer' : 'default',
        borderLeftWidth: 4,
        borderLeftColor,
        '&:hover': m.matchId
          ? { borderTopColor: 'primary.main', borderRightColor: 'primary.main', borderBottomColor: 'primary.main' }
          : {},
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        {/* Opponent + result */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Avatar src={opponentLogo ?? undefined} sx={{ width: 24, height: 24, fontSize: 11 }}>
              {opponent?.charAt(0)}
            </Avatar>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {isHome ? 'vs' : '@'}
            </Typography>
            <Typography variant="body2" fontWeight="bold" noWrap>
              {opponentAbbr ?? opponent ?? '—'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            {hasResult ? (
              <Chip label={result.label} color={result.color} size="small" icon={result.icon} />
            ) : (
              <Typography variant="caption" color="text.disabled">No result yet</Typography>
            )}
            {m.matchId && (
              <IconButton
                size="small"
                onClick={e => { e.stopPropagation(); onAnalysis(m); }}
                sx={{ color: 'text.secondary' }}
                title="AI match analysis"
              >
                <Psychology sx={{ fontSize: 16 }} />
              </IconButton>
            )}
            {m.tournamentId && (
              <IconButton
                size="small"
                onClick={e => { e.stopPropagation(); onStats(m); }}
                sx={{ color: 'text.secondary' }}
                title="Team stats"
              >
                <QueryStats sx={{ fontSize: 16 }} />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={e => { e.stopPropagation(); onEdit(m); }}
              sx={{ color: 'text.secondary' }}
              title="Edit result"
            >
              <Edit sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={e => { e.stopPropagation(); onShare(m); }}
              sx={{ color: 'text.secondary' }}
              title="Share"
            >
              <Share sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Scores */}
        {(myScore || oppScore) && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {[myScore ? `Us ${myScore}` : null, oppScore ? `Opp ${oppScore}` : null].filter(Boolean).join(' · ')}
          </Typography>
        )}

        {/* Outcome */}
        {m.matchOutcomeDescription && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {m.matchOutcomeDescription}
          </Typography>
        )}

        {/* Meta */}
        <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block', mt: 0.5 }}>
          {metaParts}
        </Typography>

        {/* Tap hint */}
        {m.matchId && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 1, pt: 0.75, borderTop: '1px dashed', borderColor: 'divider' }}>
            <Assessment sx={{ fontSize: 13, color: 'primary.main', opacity: 0.7 }} />
            <Typography variant="caption" sx={{ color: 'primary.main', opacity: 0.7, fontWeight: 500, letterSpacing: 0.2 }}>
              Tap for full Match Details
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

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
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [statsMatch, setStatsMatch] = useState<Match | null>(null);
  const [analysisMatch, setAnalysisMatch] = useState<Match | null>(null);

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
      })
      .finally(() => setTeamsLoading(false));
  }, [teamsLoaded, restrictByTeam, teamIds]);

  useEffect(() => {
    if (teams.length === 1 && !selectedTeamId) setSelectedTeamId(teams[0].teamId!);
  }, [teams, selectedTeamId]);

  useEffect(() => {
    if (!selectedTeamId) { setMatches([]); return; }
    setMatchesLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    matchApi.findAll()
      .then(all => setMatches(
        all.filter(m =>
          (m.homeTeamId === selectedTeamId || m.oppositionTeamId === selectedTeamId) &&
          (m.matchDate ?? '') <= today
        )
      ))
      .finally(() => setMatchesLoading(false));
  }, [selectedTeamId]);

  const groups = groupByWeek(matches);

  return (
    <Box sx={{ pb: 4 }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {returnTo && (
          <Button startIcon={<ArrowBack />} size="small" onClick={() => navigate(returnTo)} sx={{ flexShrink: 0 }} />
        )}
        <SportsScore color="primary" sx={{ flexShrink: 0 }} />
        <Typography variant="h6" fontWeight={700} sx={{ flexShrink: 0 }}>Team Results</Typography>

        {teams.length > 1 && (
          <TextField
            select
            size="small"
            value={selectedTeamId}
            onChange={e => setSelectedTeamId(e.target.value as number | '')}
            sx={{ minWidth: 200, ml: 1 }}
            disabled={teamsLoading || !teamsLoaded}
          >
            <MenuItem value=""><em>— Choose a team —</em></MenuItem>
            {teams.map(t => (
              <MenuItem key={t.teamId} value={t.teamId}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar src={t.logoUrl} sx={{ width: 20, height: 20, fontSize: 10 }}>{t.teamName.charAt(0)}</Avatar>
                  {t.teamName}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        )}

        <Box sx={{ flex: 1 }} />

        {selectedTeamId && !matchesLoading && (
          <Chip label={`${matches.length} match${matches.length !== 1 ? 'es' : ''}`} size="small" variant="outlined" />
        )}
      </Box>

      {/* Single-team label */}
      {teams.length === 1 && selectedTeam && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Avatar src={selectedTeam.logoUrl} sx={{ width: 22, height: 22, fontSize: 10 }}>
            {selectedTeam.teamName.charAt(0)}
          </Avatar>
          <Typography variant="body2" color="text.secondary">{selectedTeam.teamName}</Typography>
        </Box>
      )}

      {matchesLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
      )}

      {!matchesLoading && selectedTeamId && groups.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <SportsScore sx={{ fontSize: 56, mb: 1, opacity: 0.3 }} />
          <Typography variant="body1">No past matches found for this team.</Typography>
        </Box>
      )}

      {!matchesLoading && !selectedTeamId && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography variant="body2">Select a team above to view their results.</Typography>
        </Box>
      )}

      {!matchesLoading && groups.map(group => (
        <Box key={group.weekStart} sx={{ mb: 2 }}>
          {/* Week divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Divider sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
              {group.label}
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          {group.matches.map(m => (
            <MatchCard key={m.matchId} match={m} teamId={selectedTeamId as number} onShare={setShareMatch} onEdit={setEditMatch} onStats={setStatsMatch} onAnalysis={setAnalysisMatch} />
          ))}
        </Box>
      ))}

      <ShareMatchDialog
        match={shareMatch}
        teamId={selectedTeamId}
        teamName={selectedTeam?.teamName ?? ''}
        onClose={() => setShareMatch(null)}
      />

      <TeamStatsDialog
        open={!!statsMatch}
        match={statsMatch}
        teamId={selectedTeamId || null}
        teamName={selectedTeam?.teamName}
        onClose={() => setStatsMatch(null)}
      />

      <ResultViewDialog
        open={!!editMatch}
        match={editMatch}
        onClose={() => {
          setEditMatch(null);
          // Re-fetch matches so the card reflects any saved result
          if (selectedTeamId) {
            const today = new Date().toISOString().slice(0, 10);
            matchApi.findAll().then(all => setMatches(
              all.filter(m =>
                (m.homeTeamId === selectedTeamId || m.oppositionTeamId === selectedTeamId) &&
                (m.matchDate ?? '') <= today
              )
            ));
          }
        }}
      />

      {/* AI Match Analysis Dialog */}
      <Dialog
        open={!!analysisMatch}
        onClose={() => setAnalysisMatch(null)}
        fullScreen
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, flexShrink: 0, gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {analysisMatch ? `${analysisMatch.homeTeamName} vs ${analysisMatch.oppositionTeamName}` : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
              <Chip icon={<Psychology fontSize="small" />} label="Game Analysis" size="small" color="primary" variant="outlined" />
              {analysisMatch?.tournamentName && (
                <Chip label={analysisMatch.tournamentName} size="small" variant="outlined" />
              )}
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setAnalysisMatch(null)}><Close /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {analysisMatch && selectedTeamId && (
            <GameAnalysisView
              matchId={analysisMatch.matchId!}
              teamId={selectedTeamId as number}
              teamName={selectedTeam?.teamName ?? ''}
              matchTitle={`${analysisMatch.homeTeamName ?? ''} vs ${analysisMatch.oppositionTeamName ?? ''}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
