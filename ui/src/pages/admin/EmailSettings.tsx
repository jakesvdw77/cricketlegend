import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardHeader, Divider,
  TextField, Button, InputAdornment, IconButton, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Email, Visibility, VisibilityOff, Save, Send } from '@mui/icons-material';
import { mailSettingsApi } from '../../api/mailSettingsApi';
import { MailSettings } from '../../types';

const defaultSettings: MailSettings = {
  smtpHost: '',
  smtpPort: 587,
  username: '',
  password: '',
};

export const EmailSettings: React.FC = () => {
  const [form, setForm] = useState<MailSettings>(defaultSettings);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    mailSettingsApi.get()
      .then(data => setForm(prev => ({ ...prev, ...data, password: '' })))
      .catch(() => {});
  }, []);

  const set = (patch: Partial<MailSettings>) => {
    setForm(f => ({ ...f, ...patch }));
    setSaved(false);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await mailSettingsApi.update(form);
      setForm(f => ({ ...f, password: '' }));
      setSaved(true);
    } catch {
      setError('Failed to save mail settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openTestDialog = () => {
    setTestEmail(form.username || '');
    setTestResult(null);
    setTestOpen(true);
  };

  const sendTest = async () => {
    if (!testEmail.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      await mailSettingsApi.sendTest(testEmail.trim());
      setTestResult({ ok: true, message: `Test email sent to ${testEmail.trim()}` });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to send test email.';
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5">Email Settings</Typography>

      <Card variant="outlined" sx={{ maxWidth: 560 }}>
        <CardHeader
          avatar={<Email color="action" />}
          title="Mail Server"
          subheader="SMTP server used to send notification emails. Use an app password (e.g. a Google App Password) rather than your account password."
          titleTypographyProps={{ variant: 'h6' }}
          subheaderTypographyProps={{ variant: 'body2' }}
        />
        <Divider />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="SMTP Host"
                value={form.smtpHost}
                onChange={e => set({ smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
                fullWidth
              />
              <TextField
                label="Port"
                type="number"
                value={form.smtpPort}
                onChange={e => set({ smtpPort: parseInt(e.target.value, 10) || 587 })}
                sx={{ width: 110, flexShrink: 0 }}
                inputProps={{ min: 1, max: 65535 }}
              />
            </Box>

            <TextField
              label="Username / Email"
              value={form.username}
              onChange={e => set({ username: e.target.value })}
              placeholder="you@gmail.com"
              fullWidth
            />

            <TextField
              label="App Password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => set({ password: e.target.value })}
              placeholder={form.username ? '••••••••••••••••' : ''}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(v => !v)} edge="end" size="small">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {saved && (
              <Alert severity="success" onClose={() => setSaved(false)}>
                Mail server settings saved successfully.
              </Alert>
            )}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Send />}
                onClick={openTestDialog}
              >
                Send Test Email
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                onClick={save}
                disabled={saving}
              >
                Save
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={testOpen} onClose={() => setTestOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Send Test Email</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            A test email will be sent using the <strong>saved</strong> mail server settings.
          </Typography>
          <TextField
            label="Send test to"
            type="email"
            value={testEmail}
            onChange={e => { setTestEmail(e.target.value); setTestResult(null); }}
            placeholder="recipient@example.com"
            fullWidth
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') sendTest(); }}
          />
          {testResult && (
            <Alert severity={testResult.ok ? 'success' : 'error'}>
              {testResult.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={testing ? <CircularProgress size={16} color="inherit" /> : <Send />}
            onClick={sendTest}
            disabled={testing || !testEmail.trim()}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
