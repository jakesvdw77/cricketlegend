import React from 'react';
import {
  Box, Chip, Dialog, DialogContent, DialogTitle, IconButton, Typography,
} from '@mui/material';
import { AccessTime, CalendarMonth, Close, LocationOn, QueryStats } from '@mui/icons-material';
import { Match } from '../../types';
import { TeamStatsPanel } from './TeamRotationOverview';

const fmtDate = (d?: string) => {
  if (!d) return null;
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const fmtTime = (t?: string) => {
  if (!t) return null;
  const [h, m] = t.split(':');
  const d = new Date(); d.setHours(+h, +m);
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
};

interface Props {
  open: boolean;
  onClose: () => void;
  match: Match | null;
  teamId: number | null;
  teamName?: string;
}

export const TeamStatsDialog: React.FC<Props> = ({ open, onClose, match, teamId, teamName }) => {
  if (!match) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}
    >
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, flexShrink: 0, gap: 1 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {teamName ?? (teamId === match.homeTeamId ? match.homeTeamName : match.oppositionTeamName) ?? '—'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
            <Chip icon={<QueryStats fontSize="small" />} label="Team Stats" size="small" color="primary" variant="outlined" />
            {match.tournamentName && (
              <Chip label={match.tournamentName} size="small" variant="outlined" />
            )}
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>

      {/* Match meta strip */}
      <Box sx={{ px: 3, py: 1.25, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {fmtDate(match.matchDate) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CalendarMonth sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2">{fmtDate(match.matchDate)}</Typography>
            </Box>
          )}
          {fmtTime(match.scheduledStartTime) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2">{fmtTime(match.scheduledStartTime)}</Typography>
            </Box>
          )}
          {match.fieldName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2">{match.fieldName}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <TeamStatsPanel
          embedded
          initialTournamentId={match.tournamentId ?? undefined}
          lockedTeamId={teamId ?? undefined}
        />
      </DialogContent>
    </Dialog>
  );
};
