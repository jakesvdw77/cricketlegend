import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Autocomplete, TextField,
  List, ListItem, ListItemText, IconButton, Chip, Divider,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { teamApi } from '../../api/teamApi';
import { Match, MatchSide, Player, Team } from '../../types';
import { formatEnum } from '../../utils/formatEnum';

export const Teamsheet: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const id = Number(matchId);
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sides, setSides] = useState<MatchSide[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    matchApi.findById(id).then(setMatch);
    playerApi.findAll().then(setPlayers);
    teamApi.findAll().then(setTeams);
    matchApi.getTeamSheet(id).then(setSides);
  }, [id]);

  const getOrInitSide = (teamId: number): MatchSide => {
    return sides.find(s => s.teamId === teamId) ?? { matchId: id, teamId, playingXi: [] };
  };

  const saveSide = async (side: MatchSide) => {
    const saved = await matchApi.saveTeamSheet(id, side);
    setSides(prev => {
      const idx = prev.findIndex(s => s.teamId === side.teamId);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved];
    });
  };

  const addPlayer = (teamId: number, playerId: number) => {
    const side = getOrInitSide(teamId);
    if (!side.playingXi?.includes(playerId)) {
      saveSide({ ...side, playingXi: [...(side.playingXi ?? []), playerId] });
    }
  };

  const removePlayer = (teamId: number, playerId: number) => {
    const side = getOrInitSide(teamId);
    saveSide({ ...side, playingXi: (side.playingXi ?? []).filter(pid => pid !== playerId) });
  };

  const teamIds = match ? [match.homeTeamId, match.oppositionTeamId].filter(Boolean) as number[] : [];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Team Sheet — {match?.homeTeamName} vs {match?.oppositionTeamName}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {match?.matchDate} | {match?.fieldName}
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
        {teamIds.map(teamId => {
          const team = teams.find(t => t.teamId === teamId);
          const side = getOrInitSide(teamId);
          const xi = (side.playingXi ?? []).map(pid => players.find(p => p.playerId === pid)).filter(Boolean) as Player[];

          return (
            <Paper key={teamId} sx={{ p: 2, flex: 1, minWidth: 300 }}>
              <Typography variant="h6" gutterBottom>{team?.teamName}</Typography>
              <Chip label={`${xi.length}/11 selected`} size="small" color={xi.length === 11 ? 'success' : 'warning'} sx={{ mb: 2 }} />
              <Autocomplete
                options={players.filter(p => !side.playingXi?.includes(p.playerId!))}
                getOptionLabel={p => `${p.name} ${p.surname} (#${p.shirtNumber ?? '?'})`}
                onChange={(_, p) => p && addPlayer(teamId, p.playerId!)}
                renderInput={params => <TextField {...params} label="Add Player" size="small" />}
                sx={{ mb: 1 }}
              />
              <List dense>
                {xi.map((p, idx) => (
                  <ListItem key={p.playerId} disablePadding
                    secondaryAction={<IconButton size="small" onClick={() => removePlayer(teamId, p.playerId!)}><Delete fontSize="small" /></IconButton>}>
                    <ListItemText primary={`${idx + 1}. ${p.name} ${p.surname}`} secondary={`#${p.shirtNumber} | ${formatEnum(p.battingStance)} ${formatEnum(p.bowlingType)}`.trim()} />
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ my: 1 }} />
              <Autocomplete
                options={players.filter(p => !side.playingXi?.includes(p.playerId!))}
                getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
                value={players.find(p => p.playerId === side.twelfthManPlayerId) ?? null}
                onChange={(_, p) => saveSide({ ...side, twelfthManPlayerId: p?.playerId ?? undefined })}
                renderInput={params => <TextField {...params} label="12th Man" size="small" />}
                blurOnSelect
              />
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};
