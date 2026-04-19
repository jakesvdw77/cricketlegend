import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert, Paper,
  FormControl, InputLabel, Select, MenuItem, Chip,
} from '@mui/material';
import { Send, People, Groups } from '@mui/icons-material';
import { pollApi } from '../../api/pollApi';
import { useAuth } from '../../hooks/useAuth';
import { ManagerTeamDTO } from '../../types';
import RichEditor from './templates/RichEditor';

export const SendNotification: React.FC = () => {
  const { isAdmin } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [managedTeams, setManagedTeams] = useState<ManagerTeamDTO[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');

  useEffect(() => {
    if (!isAdmin) {
      pollApi.getManagedTeams().then(setManagedTeams).catch(() => {});
    }
  }, [isAdmin]);

  const handleSend = async () => {
    if (!subject.trim()) { setError('Subject is required.'); return; }
    if (!message || message === '<p></p>') { setError('Message is required.'); return; }
    if (!isAdmin && managedTeams.length > 1 && !selectedTeamId) {
      setError('Please select a team to send to.');
      return;
    }
    setSending(true);
    setError('');
    setSuccess(false);
    try {
      const teamId = !isAdmin && selectedTeamId ? selectedTeamId as number : undefined;
      await pollApi.sendNotification(subject.trim(), message, teamId);
      setSuccess(true);
      setSubject('');
      setMessage('');
      setSelectedTeamId('');
    } catch {
      setError('Failed to send notification. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const audienceLabel = isAdmin
    ? 'All players in the system'
    : selectedTeamId
      ? managedTeams.find(t => t.teamId === selectedTeamId)?.teamName ?? 'Selected team'
      : managedTeams.length === 1
        ? managedTeams[0].teamName
        : 'All my managed teams';

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Send Notification</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isAdmin
          ? 'As an admin, your message will be sent to every player in the system.'
          : 'Send a message to players in your squad. Select a specific team or send to all your managed teams.'}
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          Notification sent successfully.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>

        {/* Audience selector — managers only */}
        {!isAdmin && managedTeams.length > 1 && (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Send To</InputLabel>
            <Select
              value={selectedTeamId}
              label="Send To"
              onChange={e => setSelectedTeamId(e.target.value as number | '')}
            >
              <MenuItem value="">All my managed teams</MenuItem>
              {managedTeams.map(t => (
                <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Audience badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Chip
            icon={isAdmin ? <People /> : <Groups />}
            label={`Recipients: ${audienceLabel}`}
            color={isAdmin ? 'error' : 'primary'}
            variant="outlined"
            size="small"
          />
        </Box>

        <TextField
          label="Subject"
          fullWidth
          value={subject}
          onChange={e => setSubject(e.target.value)}
          sx={{ mb: 3 }}
          inputProps={{ maxLength: 255 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Message
        </Typography>
        <RichEditor initialHtml={message} onChange={setMessage} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? 'Sending…' : `Send to ${isAdmin ? 'Everyone' : audienceLabel}`}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
