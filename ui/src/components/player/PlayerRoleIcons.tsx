import React from 'react';
import { Box, Typography } from '@mui/material';
import { SportsCricket } from '@mui/icons-material';
import { MatchSide, Player } from '../../types';
import { getEffectiveRole } from '../../utils/matchRole';

interface Props {
  player: Player;
  side?: MatchSide | null;
  isCaptain?: boolean;
  isWK?: boolean;
  size?: 'small' | 'normal';
}

const BowlerDot: React.FC<{ size?: 'small' | 'normal' }> = ({ size = 'normal' }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-block',
      width: size === 'small' ? 7 : 9,
      height: size === 'small' ? 7 : 9,
      borderRadius: '50%',
      bgcolor: '#c0392b',
      border: '1px solid #922b21',
      flexShrink: 0,
    }}
  />
);

export const PlayerRoleIcons: React.FC<Props> = ({ player, side, isCaptain, isWK, size = 'normal' }) => {
  const role = getEffectiveRole(player, side);
  const emojiSize = size === 'small' ? '0.75rem' : '0.85rem';

  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
      {isCaptain && (
        <Typography component="span" sx={{ fontSize: emojiSize, lineHeight: 1 }}>👑</Typography>
      )}
      {isWK && (
        <Typography component="span" sx={{ fontSize: emojiSize, lineHeight: 1 }}>🧤</Typography>
      )}
      {(role === 'BATSMAN' || role === 'ALL_ROUNDER') && (
        <SportsCricket sx={{ fontSize: size === 'small' ? 12 : 14, color: 'text.secondary' }} />
      )}
      {(role === 'BOWLER' || role === 'ALL_ROUNDER') && (
        <BowlerDot size={size} />
      )}
    </Box>
  );
};
