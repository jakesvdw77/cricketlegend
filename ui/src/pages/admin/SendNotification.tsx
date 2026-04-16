import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert, Paper,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { pollApi } from '../../api/pollApi';
import RichEditor from './templates/RichEditor';

export const SendNotification: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!subject.trim()) { setError('Subject is required.'); return; }
    if (!message || message === '<p></p>') { setError('Message is required.'); return; }
    setSending(true);
    setError('');
    setSuccess(false);
    try {
      await pollApi.sendNotification(subject.trim(), message);
      setSuccess(true);
      setSubject('');
      setMessage('');
    } catch {
      setError('Failed to send notification. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Send Notification</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Send a message to all players in your squads. Players will see the notification bell update and can read the message by clicking on it.
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
            {sending ? 'Sending…' : 'Send to My Players'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
