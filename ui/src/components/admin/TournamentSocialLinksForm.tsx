import React from 'react';
import {
  Box, InputAdornment, TextField,
} from '@mui/material';
import { Language, Facebook, Instagram, YouTube } from '@mui/icons-material';
import { Tournament } from '../../types';

interface Props {
  value: Tournament;
  onChange: (patch: Partial<Tournament>) => void;
}

export const TournamentSocialLinksForm: React.FC<Props> = ({ value, onChange }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Website" value={value.websiteLink ?? ''}
        onChange={e => onChange({ websiteLink: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start"><Language fontSize="small" /></InputAdornment> }}
      />
      <TextField
        label="Facebook" value={value.facebookLink ?? ''}
        onChange={e => onChange({ facebookLink: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start"><Facebook sx={{ color: '#1877F2', fontSize: 20 }} /></InputAdornment> }}
      />
      <TextField
        label="Instagram" value={value.instagramLink ?? ''}
        onChange={e => onChange({ instagramLink: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start"><Instagram sx={{ color: '#E1306C', fontSize: 20 }} /></InputAdornment> }}
      />
      <TextField
        label="YouTube" value={value.youtubeLink ?? ''}
        onChange={e => onChange({ youtubeLink: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start"><YouTube sx={{ color: '#FF0000', fontSize: 20 }} /></InputAdornment> }}
      />
      <TextField
        label="Registration Page URL" value={value.registrationPageUrl ?? ''}
        onChange={e => onChange({ registrationPageUrl: e.target.value })}
      />
    </Box>
);
