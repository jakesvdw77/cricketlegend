import { useEffect, useState } from 'react';
import { managerApi } from '../api/managerApi';
import { useAuth } from './useAuth';

/**
 * Returns the team IDs, squad player IDs, and home club ID for the current manager.
 * If the user is admin (not manager), returns empty sets — no restriction applies.
 * homeClubId is the club shared by all the manager's teams (null if ambiguous or not a manager).
 */
export function useManagerTeams() {
  const { isAdmin, isManager } = useAuth();
  const [teamIds, setTeamIds] = useState<Set<number>>(new Set());
  const [squadPlayerIds, setSquadPlayerIds] = useState<Set<number>>(new Set());
  const [homeClubId, setHomeClubId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const restrictByTeam = isManager && !isAdmin;

  useEffect(() => {
    if (!isManager) {
      setLoaded(true);
      return;
    }
    if (restrictByTeam) {
      Promise.all([
        managerApi.getMyTeams(),
        managerApi.getMySquadPlayerIds(),
        managerApi.getMyClubId(),
      ]).then(([teams, players, clubId]) => {
        setTeamIds(new Set(teams));
        setSquadPlayerIds(new Set(players));
        setHomeClubId(clubId ?? null);
      }).finally(() => setLoaded(true));
    } else {
      managerApi.getMyClubId()
        .then(clubId => setHomeClubId(clubId ?? null))
        .finally(() => setLoaded(true));
    }
  }, [isManager, restrictByTeam]);

  return { teamIds, squadPlayerIds, homeClubId, restrictByTeam, loaded };
}
