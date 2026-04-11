import { useEffect, useState } from 'react';
import { managerApi } from '../api/managerApi';
import { useAuth } from './useAuth';

/**
 * Returns the team IDs and squad player IDs for the current manager.
 * If the user is admin (not manager), returns empty sets — no restriction applies.
 */
export function useManagerTeams() {
  const { isAdmin, isManager } = useAuth();
  const [teamIds, setTeamIds] = useState<Set<number>>(new Set());
  const [squadPlayerIds, setSquadPlayerIds] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const restrictByTeam = isManager && !isAdmin;

  useEffect(() => {
    if (!restrictByTeam) {
      setLoaded(true);
      return;
    }
    Promise.all([
      managerApi.getMyTeams(),
      managerApi.getMySquadPlayerIds(),
    ]).then(([teams, players]) => {
      setTeamIds(new Set(teams));
      setSquadPlayerIds(new Set(players));
    }).finally(() => setLoaded(true));
  }, [restrictByTeam]);

  return { teamIds, squadPlayerIds, restrictByTeam, loaded };
}
