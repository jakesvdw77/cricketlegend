import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardHeader, Divider,
  TextField, Button, InputAdornment, IconButton, Alert, CircularProgress,
  MenuItem,
} from '@mui/material';
import { Psychology, Visibility, VisibilityOff, Save } from '@mui/icons-material';
import { aiSettingsApi } from '../../api/aiSettingsApi';
import { AiSettings } from '../../types';

const MODELS = [
  { value: 'claude-haiku-4-5',  label: 'Claude Haiku 4.5 (Fastest)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanced)' },
  { value: 'claude-opus-4-8',   label: 'Claude Opus 4.8 (Most Capable)' },
];

const defaultForm: AiSettings = { apiKey: '', defaultModel: 'claude-haiku-4-5' };

export const AiSettingsPage: React.FC = () => {
  const [form, setForm] = useState<AiSettings>(defaultForm);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    aiSettingsApi.get()
      .then(data => setForm(prev => ({ ...prev, defaultModel: data.defaultModel, apiKey: '' })))
      .catch(() => {});
  }, []);

  const set = (patch: Partial<AiSettings>) => {
    setForm(f => ({ ...f, ...patch }));
    setSaved(false);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await aiSettingsApi.update(form);
      setForm(f => ({ ...f, apiKey: '' }));
      setSaved(true);
    } catch {
      setError('Failed to save AI settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5">AI Settings</Typography>

      <Card variant="outlined" sx={{ maxWidth: 560 }}>
        <CardHeader
          avatar={<Psychology color="action" />}
          title="Admin API Key"
          subheader="This key is used for AI features across the application (e.g. auto-generating question options). It is stored securely on the server and never exposed to students."
          titleTypographyProps={{ variant: 'h6' }}
          subheaderTypographyProps={{ variant: 'body2' }}
        />
        <Divider />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            <TextField
              label="Anthropic API Key"
              type={showKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={e => set({ apiKey: e.target.value })}
              placeholder={form.defaultModel ? '••••••••••••••••••••••••••••••••••••••••' : ''}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowKey(v => !v)} edge="end" size="small">
                      {showKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              label="Default Model"
              value={form.defaultModel}
              onChange={e => set({ defaultModel: e.target.value })}
              fullWidth
            >
              {MODELS.map(m => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </TextField>

            {saved && (
              <Alert severity="success" onClose={() => setSaved(false)}>
                AI settings saved successfully.
              </Alert>
            )}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
    </Box>
  );
};
