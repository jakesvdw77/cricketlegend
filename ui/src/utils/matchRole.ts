import { MatchPlayerRole, MatchSide, Player } from '../types';

export function deriveRoleFromProfile(player: Player): MatchPlayerRole {
  const bowls = player.bowlingType && player.bowlingType !== 'NONE' && !player.partTimeBowler;
  if (!bowls) return 'BATSMAN';
  const upperOrder = ['OPENER', 'TOP_ORDER', 'MIDDLE_ORDER'].includes(player.battingPosition ?? '');
  return upperOrder ? 'ALL_ROUNDER' : 'BOWLER';
}

export function getEffectiveRole(player: Player, side: MatchSide | null | undefined): MatchPlayerRole {
  const override = player.playerId != null ? side?.playerRoles?.[player.playerId] : undefined;
  return (override as MatchPlayerRole | undefined) ?? deriveRoleFromProfile(player);
}

export const ROLE_LABELS: Record<MatchPlayerRole, string> = {
  BATSMAN: 'Batsman',
  ALL_ROUNDER: 'All-Rounder',
  BOWLER: 'Bowler',
};

export const ROLE_OPTIONS: MatchPlayerRole[] = ['BATSMAN', 'ALL_ROUNDER', 'BOWLER'];
