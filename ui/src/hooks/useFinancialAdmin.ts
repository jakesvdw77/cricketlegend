import { useEffect, useState } from 'react';
import { financialAdminApi } from '../api/financialAdminApi';
import { useAuth } from './useAuth';

/**
 * Resolves the club ID for the current financial admin.
 * Returns null if the user has no financial admin assignment.
 * Admins do not auto-resolve (they select a club manually).
 */
export function useFinancialAdmin() {
  const { isFinancialAdmin, isAdmin } = useAuth();
  const [clubId, setClubId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isFinancialAdmin || isAdmin) {
      setLoaded(true);
      return;
    }
    financialAdminApi.getMyClubId()
      .then(id => setClubId(id ?? null))
      .finally(() => setLoaded(true));
  }, [isFinancialAdmin, isAdmin]);

  return { clubId, loaded, isScoped: isFinancialAdmin && !isAdmin };
}
