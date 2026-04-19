import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert, Chip, Button,
} from '@mui/material';
import { HowToVote, CheckCircle, Cancel, HelpOutline } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { pollApi } from '../../api/pollApi';
import { AvailabilityStatus, PlayerNotification } from '../../types';

const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  YES: 'Available',
  NO: 'Not Available',
  UNSURE: 'Unsure',
};
const STATUS_COLORS: Record<AvailabilityStatus, 'success' | 'error' | 'warning'> = {
  YES: 'success',
  NO: 'error',
  UNSURE: 'warning',
};
const STATUS_ICONS: Record<AvailabilityStatus, React.ReactElement> = {
  YES: <CheckCircle fontSize="small" />,
  NO: <Cancel fontSize="small" />,
  UNSURE: <HelpOutline fontSize="small" />,
};

export const MyAvailability: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pollApi.getMyNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pollNotifications = notifications.filter(n => n.type === 'POLL_AVAILABLE');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>My Availability</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Open polls where your availability is requested.
      </Typography>

      {pollNotifications.length === 0 ? (
        <Alert severity="info" icon={<HowToVote />}>
          No open availability polls at the moment.
        </Alert>
      ) : (
        pollNotifications.map(n => (
          <Paper key={n.notificationId} sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography fontWeight="medium">
                {n.homeTeamName} vs {n.oppositionTeamName}
              </Typography>
              <Typography variant="body2" color="text.secondary">{n.matchDate}</Typography>
              <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                {!n.read && <Chip label="New" color="primary" size="small" />}
                {n.availabilityStatus ? (
                  <Chip
                    icon={STATUS_ICONS[n.availabilityStatus]}
                    label={`My response: ${STATUS_LABELS[n.availabilityStatus]}`}
                    color={STATUS_COLORS[n.availabilityStatus]}
                    size="small"
                    variant="outlined"
                  />
                ) : (
                  <Chip
                    icon={<HowToVote fontSize="small" />}
                    label="No response yet"
                    size="small"
                    variant="outlined"
                    color="default"
                  />
                )}
              </Box>
            </Box>
            <Button
              variant={n.availabilityStatus ? 'outlined' : 'contained'}
              size="small"
              startIcon={<HowToVote />}
              onClick={() => {
                if (!n.read) {
                  pollApi.markRead(n.notificationId).catch(() => {});
                }
                navigate(`/poll/${n.matchId}/${n.teamId}`);
              }}
            >
              {n.availabilityStatus ? 'Change' : 'Respond'}
            </Button>
          </Paper>
        ))
      )}
    </Box>
  );
};
