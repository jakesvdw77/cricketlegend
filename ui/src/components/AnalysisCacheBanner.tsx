import React from 'react';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface Props {
  generatedAt: string;
  regenerating: boolean;
  onRegenerate: () => void;
}

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-ZA', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const AnalysisCacheBanner: React.FC<Props> = ({ generatedAt, regenerating, onRegenerate }) => (
  <Alert
    severity="info"
    sx={{ mb: 2, alignItems: 'center' }}
    action={
      <Button
        size="small"
        color="inherit"
        startIcon={regenerating ? <CircularProgress size={14} color="inherit" /> : <Refresh fontSize="small" />}
        onClick={onRegenerate}
        disabled={regenerating}
      >
        {regenerating ? 'Regenerating…' : 'Regenerate'}
      </Button>
    }
  >
    <Box component="span">
      Generated {formatGeneratedAt(generatedAt)} — if squad or match data has changed, this report may be outdated.
    </Box>
  </Alert>
);
