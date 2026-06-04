import React, { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { playerApi } from '../../api/playerApi';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { tournamentApi } from '../../api/tournamentApi';
import { Player } from '../../types';
import { MediaLibrary, MediaPlayerContext } from '../admin/MediaLibrary';

export const PlayerMediaLibrary: React.FC = () => {
  const [context, setContext] = useState<MediaPlayerContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [me, myMatches] = await Promise.all([
        playerApi.findMe(),
        matchApi.getMySchedule(),
      ]);

      const teamIdSet = new Set<number>(
        myMatches.flatMap(m => [m.homeTeamId, m.oppositionTeamId]).filter(Boolean) as number[]
      );
      const tournamentIdSet = new Set<number>(
        myMatches.map(m => m.tournamentId).filter(Boolean) as number[]
      );

      const [allTeams, allTournaments] = await Promise.all([
        teamApi.findAll(),
        tournamentApi.findAll(),
      ]);

      const playerTeams = allTeams.filter(t => t.teamId && teamIdSet.has(t.teamId));

      // Fetch squads for all the player's teams in parallel, deduplicate
      const squadArrays = await Promise.all(
        playerTeams.map(t => teamApi.getSquad(t.teamId!).catch(() => [] as Player[]))
      );
      const seenIds = new Set<number>();
      const squadPlayers: Player[] = [];
      for (const squad of squadArrays) {
        for (const p of squad) {
          if (p.playerId && !seenIds.has(p.playerId)) {
            seenIds.add(p.playerId);
            squadPlayers.push(p);
          }
        }
      }
      squadPlayers.sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));

      setContext({
        player: me,
        players: squadPlayers,
        teams: playerTeams,
        matches: myMatches,
        tournaments: allTournaments.filter(t => t.tournamentId && tournamentIdSet.has(t.tournamentId)),
      });
    };

    load().catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  if (!context) return null;

  return <MediaLibrary playerContext={context} />;
};
