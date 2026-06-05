import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { XiEntry } from './TeamSelectionOverview';

const fmtShortDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'short',
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
  entries: XiEntry[];
  onCompare: (selected: XiEntry[]) => void;
}

const entryKey = (e: XiEntry) => `${e.match.matchId}-${e.teamId}`;

export const GamePickerDialog: React.FC<Props> = ({ open, onClose, entries, onCompare }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleClose = () => {
    onClose();
    setSelected(new Set());
  };

  const toggle = (e: XiEntry) => {
    const k = entryKey(e);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else if (next.size < 4) next.add(k);
      return next;
    });
  };

  const handleCompare = () => {
    onCompare(entries.filter(e => selected.has(entryKey(e))));
    handleClose();
  };

  // Group entries by date, sorted chronologically
  const byDate = new Map<string, XiEntry[]>();
  for (const e of entries) {
    const date = e.match.matchDate ?? '9999-12-31';
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(e);
  }
  const groups = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography variant="h6">Choose Games to Compare</Typography>
          <Typography variant="caption" color="text.secondary">Select 2 to 4 games</Typography>
        </Box>
        <IconButton size="small" onClick={handleClose}><Close /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {groups.map(([date, dayEntries], gi) => (
          <Box key={date}>
            {gi > 0 && <Divider />}
            <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {fmtShortDate(date)}
              </Typography>
            </Box>
            {dayEntries.map(e => {
              const k = entryKey(e);
              const checked = selected.has(k);
              const disabled = !checked && selected.size >= 4;
              const time = fmtTime(e.match.scheduledStartTime);
              return (
                <Box
                  key={k}
                  sx={{
                    px: 1.5,
                    py: 0.25,
                    bgcolor: checked ? 'action.selected' : 'transparent',
                    borderLeft: checked ? '3px solid' : '3px solid transparent',
                    borderColor: checked ? 'primary.main' : 'transparent',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(e)}
                        size="small"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ lineHeight: 1.3, opacity: disabled ? 0.4 : 1 }}>
                          {e.match.homeTeamName} vs {e.match.oppositionTeamName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ opacity: disabled ? 0.4 : 1 }}>
                          {e.teamName}{time ? ` · ${time}` : ''}{e.match.fieldName ? ` · ${e.match.fieldName}` : ''}
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%', alignItems: 'flex-start', py: 0.5 }}
                  />
                </Box>
              );
            })}
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {selected.size < 2 ? 'Pick at least 2 games' : `${selected.size} game${selected.size > 1 ? 's' : ''} selected`}
        </Typography>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" disabled={selected.size < 2} onClick={handleCompare}>
          Compare ({selected.size})
        </Button>
      </DialogActions>
    </Dialog>
  );
};
