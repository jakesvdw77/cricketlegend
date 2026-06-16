import React, { useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Paper, Typography,
} from '@mui/material';
import { AddPhotoAlternate, Close, Delete } from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { PlayerMatchResult, ScorecardData } from '../../types';

// ── ImageDropZone ─────────────────────────────────────────────────────────────

interface DropZoneProps {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  disabled: boolean;
}

const ImageDropZone: React.FC<DropZoneProps> = ({ label, file, onChange, disabled }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const preview = file ? URL.createObjectURL(file) : null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) onChange(f);
  };

  return (
    <Paper
      variant="outlined"
      onClick={() => !disabled && ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      sx={{
        width: 200, height: 150, cursor: disabled ? 'default' : 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        border: dragging ? '2px dashed' : '1px dashed',
        borderColor: dragging ? 'primary.main' : 'divider',
        bgcolor: dragging ? 'action.hover' : 'background.default',
        overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s',
      }}
    >
      <input
        ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ''; }}
        disabled={disabled}
      />
      {preview ? (
        <>
          <Box component="img" src={preview} alt={label}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <IconButton
            size="small"
            onClick={e => { e.stopPropagation(); onChange(null); }}
            disabled={disabled}
            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
          >
            <Delete fontSize="small" />
          </IconButton>
        </>
      ) : (
        <>
          <AddPhotoAlternate sx={{ fontSize: 36, color: 'text.disabled', mb: 0.5 }} />
          <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ px: 1 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
            click or drop image
          </Typography>
        </>
      )}
    </Paper>
  );
};

// ── Dialog ────────────────────────────────────────────────────────────────────

export interface ScorecardImageImportDialogProps {
  open: boolean;
  matchId: number;
  teamAName: string;
  teamBName: string;
  firstBattingTeamId?: number;
  onClose: () => void;
  onImport: (scorecard: ScorecardData, playerMatches: PlayerMatchResult[]) => void;
}

const ScorecardImageImportDialog: React.FC<ScorecardImageImportDialogProps> = ({
  open, matchId, teamAName, teamBName, firstBattingTeamId, onClose, onImport,
}) => {
  const [files, setFiles] = useState<Record<string, File | null>>({
    teamABatting: null, teamABowling: null, teamBBatting: null, teamBBowling: null,
  });
  const [parsing, setParsing] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const hasImages = Object.values(files).some(Boolean);

  const reset = () => {
    setFiles({ teamABatting: null, teamABowling: null, teamBBatting: null, teamBBowling: null });
    setParsing(false);
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleParse = async () => {
    setParsing(true);
    setError(null);
    try {
      const fd = new FormData();
      if (files.teamABatting) fd.append('teamABatting', files.teamABatting);
      if (files.teamABowling) fd.append('teamABowling', files.teamABowling);
      if (files.teamBBatting) fd.append('teamBBatting', files.teamBBatting);
      if (files.teamBBowling) fd.append('teamBBowling', files.teamBBowling);
      if (firstBattingTeamId != null) fd.append('firstBattingTeamId', String(firstBattingTeamId));

      const result = await matchApi.importScorecardFromImages(matchId, fd);

      // Apply immediately and let the parent handle player resolution
      reset();
      onImport(result.scorecard, result.playerMatches);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to parse images. Please try again.');
      setParsing(false);
    }
  };

  const slots = [
    { key: 'teamABatting', label: `1st Innings — ${teamAName} Batting`  },
    { key: 'teamABowling', label: `1st Innings — ${teamBName} Bowling`  },
    { key: 'teamBBatting', label: `2nd Innings — ${teamBName} Batting`  },
    { key: 'teamBBowling', label: `2nd Innings — ${teamAName} Bowling`  },
  ];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Import Scorecard from Images
        <IconButton size="small" onClick={handleClose} disabled={parsing}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload scorecard images. Any combination of batting and bowling cards works — the AI extracts all visible data.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
          {slots.map(slot => (
            <ImageDropZone
              key={slot.key}
              label={slot.label}
              file={files[slot.key]}
              onChange={f => setFiles(prev => ({ ...prev, [slot.key]: f }))}
              disabled={parsing}
            />
          ))}
        </Box>

        {parsing && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              AI is reading your scorecard images…
            </Typography>
          </Box>
        )}

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={parsing}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!hasImages || parsing}
          onClick={handleParse}
          startIcon={parsing ? <CircularProgress size={16} /> : undefined}
        >
          {parsing ? 'Parsing…' : 'Parse with AI'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScorecardImageImportDialog;
