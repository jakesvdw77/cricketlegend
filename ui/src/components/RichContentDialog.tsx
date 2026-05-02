import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
} from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  html: string;
}

export const RichContentDialog: React.FC<Props> = ({ open, onClose, title, html }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
    <DialogTitle>{title}</DialogTitle>
    <DialogContent dividers>
      <Box
        sx={{
          '& p': { mt: 0, mb: 1 },
          '& ul, & ol': { pl: 3, mb: 1 },
          '& h1, & h2, & h3': { mb: 1 },
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);
