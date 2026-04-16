import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { tournamentApi } from '../../api/tournamentApi';
import { Match, MatchResult, Tournament } from '../../types';
import MatchCardPreview from '../admin/templates/MatchCardPreview';
import FacebookCardPreview from '../admin/templates/FacebookCardPreview';
import { generateFacebookText } from '../admin/templates/generateFacebookText';

export type SummaryView = 'facebook' | 'whatsapp';

interface Props {
  match: Match;
  view: SummaryView;
  onBack: () => void;
}

const MatchSummaryView: React.FC<Props> = ({ match, view, onBack }) => {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetches: Promise<any>[] = [
      matchApi.getResult(match.matchId!).then(setResult).catch(() => setError(true)),
    ];
    if (match.tournamentId) {
      fetches.push(tournamentApi.findById(match.tournamentId).then(setTournament).catch(() => null));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [match.matchId, match.tournamentId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !result) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 2 }}>
          Back
        </Button>
        <Alert severity="warning">No match result found for this match.</Alert>
      </Box>
    );
  }

  const teams = [
    { id: match.homeTeamId,       name: match.homeTeamName },
    { id: match.oppositionTeamId, name: match.oppositionTeamName },
  ].filter(t => t.id != null);

  const firstInningsTeam  = teams.find(t => t.id === result.sideBattingFirstId);
  const secondInningsTeam = teams.find(t => t.id !== result.sideBattingFirstId);

  const firstTeamName  = firstInningsTeam?.name  ?? result.sideBattingFirstName ?? '1st Innings';
  const secondTeamName = secondInningsTeam?.name ?? '2nd Innings';
  const firstCard      = result.scoreCard?.teamA ?? {};
  const secondCard     = result.scoreCard?.teamB ?? {};
  const motmName       = result.manOfTheMatchName ?? null;

  const templateProps = {
    match, result, tournament,
    firstTeamName, secondTeamName,
    firstCard, secondCard,
    motmName,
  };

  const facebookText = view === 'facebook'
    ? generateFacebookText(match, result, tournament, firstTeamName, secondTeamName, firstCard, secondCard, motmName)
    : '';

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 3 }}>
        Back to Matches
      </Button>
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'inline-block', minWidth: 620 }}>
          {view === 'facebook'
            ? <FacebookCardPreview text={facebookText} match={match} tournament={tournament} />
            : <MatchCardPreview {...templateProps} />
          }
        </Box>
      </Box>
    </Box>
  );
};

export default MatchSummaryView;
