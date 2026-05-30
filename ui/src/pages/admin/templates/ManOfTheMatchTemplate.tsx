import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, IconButton, TextField, Typography,
} from '@mui/material';
import { AddPhotoAlternate, Download, Person } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import { BattingEntry, BowlingEntry, TeamScorecard } from '../../../types';
import MediaPickerDialog from '../../../components/media/MediaPickerDialog';
import ManOfTheMatchCardPreview from './ManOfTheMatchCardPreview';
import { TemplateProps } from './types';

const findBattingFigures = (name: string, ...cards: TeamScorecard[]): string => {
  for (const card of cards) {
    const e = card.batting?.find((b: BattingEntry) => b.playerName === name);
    if (e?.score != null) {
      const notOut = e.dismissed === false ? '*' : '';
      const balls  = e.ballsFaced != null ? ` (${e.ballsFaced})` : '';
      return `${e.score}${notOut}${balls}`;
    }
  }
  return '';
};

const findBowlingFigures = (name: string, ...cards: TeamScorecard[]): string => {
  for (const card of cards) {
    const e = card.bowling?.find((b: BowlingEntry) => b.playerName === name);
    if (e != null && (e.wickets != null || e.runs != null)) {
      return `${e.wickets ?? 0}/${e.runs ?? 0}`;
    }
  }
  return '';
};

const ManOfTheMatchTemplate: React.FC<TemplateProps> = ({
  match, result, tournament, firstCard, secondCard,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const motmName = result.manOfTheMatchName ?? '';
  const [photoUrl,    setPhotoUrl]    = useState<string | null>(null);
  const [playerName,  setPlayerName]  = useState(motmName);
  const [batting,     setBatting]     = useState('');
  const [bowling,     setBowling]     = useState('');
  const [description, setDescription] = useState('');

  // Pre-populate stats from scorecard whenever the MOTM name or scorecards change
  useEffect(() => {
    const name = result.manOfTheMatchName ?? '';
    setPlayerName(name);
    if (name) {
      setBatting(findBattingFigures(name, firstCard, secondCard));
      setBowling(findBowlingFigures(name, firstCard, secondCard));
    }
  }, [result.manOfTheMatchName, firstCard, secondCard]);

  const download = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#091509',
      });
      const a = document.createElement('a');
      a.download = `motm-${match.matchId ?? 'match'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  const teamId = match.homeTeamId ?? match.oppositionTeamId;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Form */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Photo selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            onClick={() => setPickerOpen(true)}
            sx={{
              width: 80, height: 80, borderRadius: 2, overflow: 'hidden',
              border: '2px dashed', borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              '&:hover': { borderColor: 'primary.main' },
              bgcolor: 'background.paper',
            }}
          >
            {photoUrl ? (
              <Box component="img" src={photoUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Person sx={{ fontSize: 36, color: 'text.disabled' }} />
            )}
          </Box>
          <Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddPhotoAlternate />}
              onClick={() => setPickerOpen(true)}
            >
              {photoUrl ? 'Change Photo' : 'Select Player Photo'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Select a player image from the media gallery
            </Typography>
          </Box>
        </Box>

        {/* Player name */}
        <TextField
          label="Player Name"
          size="small"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          fullWidth
        />

        {/* Figures row */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Batting figures"
            size="small"
            value={batting}
            onChange={e => setBatting(e.target.value)}
            placeholder="e.g. 100* (92)"
            sx={{ flex: 1 }}
            helperText="Auto-populated from scorecard"
          />
          <TextField
            label="Bowling figures"
            size="small"
            value={bowling}
            onChange={e => setBowling(e.target.value)}
            placeholder="e.g. 3/15"
            sx={{ flex: 1 }}
            helperText="Auto-populated from scorecard"
          />
        </Box>

        {/* Description */}
        <TextField
          label="Performance description"
          size="small"
          multiline
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Brilliant all-round performance with bat and ball"
          fullWidth
        />
      </Box>

      {/* Download button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Button
          variant="contained"
          size="small"
          color="secondary"
          startIcon={downloading ? <CircularProgress size={14} color="inherit" /> : <Download />}
          onClick={download}
          disabled={downloading}
        >
          {downloading ? 'Exporting…' : 'Download as Image'}
        </Button>
      </Box>

      {/* Card preview */}
      <Box sx={{ pb: 2 }}>
        <Box ref={cardRef} sx={{ width: '100%', maxWidth: 600 }}>
          <ManOfTheMatchCardPreview
            playerName={playerName}
            playerPhotoUrl={photoUrl}
            homeTeam={match.homeTeamName ?? ''}
            awayTeam={match.oppositionTeamName ?? ''}
            tournamentName={tournament?.name ?? match.tournamentName ?? null}
            tournamentLogoUrl={tournament?.logoUrl ?? null}
            battingFigures={batting}
            bowlingFigures={bowling}
            description={description}
          />
        </Box>
      </Box>

      <MediaPickerDialog
        open={pickerOpen}
        title="Select Player Photo"
        teamId={teamId}
        onClose={() => setPickerOpen(false)}
        onSelect={setPhotoUrl}
      />
    </Box>
  );
};

export default ManOfTheMatchTemplate;
