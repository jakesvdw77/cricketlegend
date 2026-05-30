import React, { useEffect, useState } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, InputAdornment, Switch, TextField, Typography,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { mediaApi } from '../../api/mediaApi';
import { MediaContent } from '../../types';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp)$/i;

interface Props {
  open: boolean;
  title?: string;
  teamId?: number;
  onClose: () => void;
  onSelect: (url: string) => void;
}

const MediaPickerDialog: React.FC<Props> = ({ open, title = 'Select Photo', teamId, onClose, onSelect }) => {
  const [items, setItems] = useState<MediaContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setLoading(true);
    const params = (!teamId || showAll) ? { mediaType: 'IMAGE' as const } : { teamId, mediaType: 'IMAGE' as const };
    mediaApi.search(params)
      .then(res => {
        const imgs = res.filter(m => m.mediaType === 'IMAGE' || IMAGE_EXT.test(m.url));
        setItems(imgs);
        if (!showAll && imgs.length === 0 && teamId) setShowAll(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, teamId, showAll]);

  const q = query.trim().toLowerCase();
  const visible = q
    ? items.filter(m =>
        [m.caption, m.playerName, m.teamName, m.matchLabel, m.tournamentName, m.fieldName]
          .some(v => v?.toLowerCase().includes(q))
      )
    : items;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        {title}
        {teamId && (
          <FormControlLabel
            control={<Switch size="small" checked={showAll} onChange={e => setShowAll(e.target.checked)} />}
            label={<Typography variant="caption">Show all images</Typography>}
            sx={{ mr: 0 }}
          />
        )}
      </DialogTitle>
      <Box sx={{ px: 2, pb: 1 }}>
        <TextField
          size="small" fullWidth
          placeholder="Search by caption, player, team, match…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <DialogContent sx={{ p: 1, pt: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : visible.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            {items.length === 0 ? 'No images found.' : 'No images match your search.'}
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1 }}>
            {visible.map(item => (
              <Box
                key={item.id ?? item.url}
                sx={{
                  position: 'relative', cursor: 'pointer',
                  borderRadius: 1, overflow: 'hidden', aspectRatio: '1',
                  '&:hover .overlay': { opacity: 1 },
                }}
                onClick={() => { onSelect(item.url); onClose(); }}
              >
                <Box component="img" src={item.url}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {item.caption && (
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: 0.75, py: 0.4, bgcolor: 'rgba(0,0,0,0.55)' }}>
                    <Typography variant="caption" color="white" noWrap sx={{ display: 'block', fontSize: '0.65rem' }}>
                      {item.caption}
                    </Typography>
                  </Box>
                )}
                <Box className="overlay" sx={{
                  position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.42)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.15s',
                }}>
                  <Typography variant="caption" color="white" fontWeight="bold">Select</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {visible.length} of {items.length} image{items.length !== 1 ? 's' : ''}
        </Typography>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaPickerDialog;
