import React from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import {
  AccessTime,
  CalendarMonth,
  Close,
  HowToVote,
  LocationOn,
} from '@mui/icons-material';
import { Match } from '../../types';
import { MatchAvailabilityManager } from '../admin/MatchAvailabilityManager';

const fmtDate = (d?: string) => {
  if (!d) return '—';
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
  pollOpen?: boolean;
}

export const AvailabilityViewDialog: React.FC<Props> = ({
  open, onClose, match, teamId, teamName, pollOpen,
}) => {
  if (!match || teamId == null) return null;

  const metaParts = [
    fmtDate(match.matchDate),
    fmtTime(match.scheduledStartTime),
    match.fieldName,
  ].filter(Boolean).join(' · ');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { display: 'flex', flexDirection: 'column', bgcolor: 'background.default' } }}
    >
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, flexShrink: 0, gap: 1 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {match.homeTeamName ?? '—'} vs {match.oppositionTeamName ?? '—'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
            {teamName && <Chip label={teamName} size="small" variant="outlined" />}
            {pollOpen != null && (
              <Chip
                label={pollOpen ? 'Poll Open' : 'Poll Closed'}
                size="small"
                color={pollOpen ? 'success' : 'default'}
                icon={<HowToVote fontSize="small" />}
              />
            )}
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>

      {/* Match meta strip */}
      <Box sx={{ px: 3, py: 1.25, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CalendarMonth sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">{fmtDate(match.matchDate)}</Typography>
          </Box>
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
        <MatchAvailabilityManager
          embedded
          matchIdProp={match.matchId}
          preselectedTeamIdProp={teamId}
        />
      </DialogContent>
    </Dialog>
  );
};
