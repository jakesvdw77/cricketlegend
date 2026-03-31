import React, { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Print } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { Match, Player } from '../../types';
import { TeamSidePanel } from '../../components/match/TeamSidePanel';

export const Teamsheet: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const id = Number(matchId);
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    matchApi.findById(id).then(setMatch);
    playerApi.findAll().then(setPlayers);
  }, [id]);

  const teamIds = match
    ? [match.homeTeamId, match.oppositionTeamId].filter(Boolean) as number[]
    : [];

  const getTeamName = (teamId: number) =>
    teamId === match?.homeTeamId ? match?.homeTeamName ?? '' : match?.oppositionTeamName ?? '';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5">
            Team Sheet — {match?.homeTeamName} vs {match?.oppositionTeamName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {match?.matchDate} | {match?.fieldName}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={() => navigate(`/matches/${id}/teamsheet`)}
        >
          Print / Export PDF
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
        {teamIds.map(teamId => (
          <TeamSidePanel
            key={teamId}
            matchId={id}
            teamId={teamId}
            teamName={getTeamName(teamId)}
            players={players}
          />
        ))}
      </Box>
    </Box>
  );
};
