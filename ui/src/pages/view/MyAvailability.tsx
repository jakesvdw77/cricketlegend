import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert, Chip, Button,
} from '@mui/material';
import { HowToVote } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { pollApi } from '../../api/pollApi';
import { PlayerNotification } from '../../types';

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
              {!n.read && <Chip label="New" color="primary" size="small" sx={{ mt: 0.5 }} />}
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<HowToVote />}
              onClick={() => {
                if (!n.read) {
                  pollApi.markRead(n.notificationId).catch(() => {});
                }
                navigate(`/poll/${n.matchId}/${n.teamId}`);
              }}
            >
              Respond
            </Button>
          </Paper>
        ))
      )}
    </Box>
  );
};
