import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { playerApi } from '../api/playerApi';
import { clubApi } from '../api/clubApi';
import { Player, Club } from '../types';
import { PlayerEditForm } from '../components/player/PlayerEditForm';
import { useAuth } from '../hooks/useAuth';

export const MyProfile: React.FC = () => {
  const { email } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    clubApi.findAll().then(setClubs);
    playerApi.findMe()
      .then(setPlayer)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!player) return;
    setSaving(true);
    setSaved(false);
    try {
      const payload: Player = {
        ...player,
        bowlingType: player.bowlingType || undefined,
        bowlingArm: player.bowlingArm || undefined,
        battingStance: player.battingStance || undefined,
        battingPosition: player.battingPosition || undefined,
      };
      const updated = await playerApi.updateMe(payload);
      setPlayer(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (notFound) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="info">
          No player profile is linked to <strong>{email}</strong>. Please contact an administrator to set up your profile.
        </Alert>
      </Box>
    );
  }

  if (!player) return null;

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>My Profile</Typography>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Profile updated successfully.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <PlayerEditForm
          editing={player}
          onChange={patch => setPlayer(p => ({ ...p!, ...patch }))}
          clubs={clubs}
          readOnlyEmail
        />
      </Paper>
    </Box>
  );
};
