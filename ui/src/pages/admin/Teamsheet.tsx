import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { Match, Player } from '../../types';
import { TeamSidePanel } from '../../components/match/TeamSidePanel';

export const Teamsheet: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
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
      <Typography variant="h5" gutterBottom>
        Team Sheet — {match?.homeTeamName} vs {match?.oppositionTeamName}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {match?.matchDate} | {match?.fieldName}
      </Typography>
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
