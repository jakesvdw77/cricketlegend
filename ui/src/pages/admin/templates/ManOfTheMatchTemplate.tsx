import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, IconButton, MenuItem, Select, Slider, TextField, Tooltip, Typography,
} from '@mui/material';
import { AddPhotoAlternate, Close, Download, Person } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import { BattingEntry, BowlingEntry, TeamScorecard } from '../../../types';
import MediaPickerDialog from '../../../components/media/MediaPickerDialog';
import ManOfTheMatchCardPreview from './ManOfTheMatchCardPreview';
import { TemplateProps } from './types';

const FILTERS = [
  { value: 'none',                                              label: 'None' },
  { value: 'grayscale(1)',                                      label: 'Black & White' },
  { value: 'sepia(1)',                                          label: 'Sepia' },
  { value: 'sepia(0.5) hue-rotate(190deg) saturate(1.4)',       label: 'Cool / Blue' },
  { value: 'brightness(0.75) contrast(1.1) saturate(0.8)',      label: 'Dark' },
  { value: 'saturate(1.6) contrast(1.05)',                      label: 'Vivid' },
];

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
  const [downloading,  setDownloading]  = useState(false);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'photo' | 'logo'>('photo');
  const [customLogos,  setCustomLogos]  = useState<string[]>([]);

  const motmName = result.manOfTheMatchName ?? '';
  const [photoUrl,       setPhotoUrl]       = useState<string | null>(null);
  const [processedUrl,   setProcessedUrl]   = useState<string | null>(null);
  const [photoFilter,    setPhotoFilter]    = useState('none');
  const [playerName,     setPlayerName]     = useState(motmName);
  const [batting,        setBatting]        = useState('');
  const [bowling,        setBowling]        = useState('');
  const [description,    setDescription]    = useState('');
  const [photoOpacity,   setPhotoOpacity]   = useState(100);
  const [photoPositionX, setPhotoPositionX] = useState(50);
  const [photoPositionY, setPhotoPositionY] = useState(0);

  useEffect(() => {
    const name = result.manOfTheMatchName ?? '';
    setPlayerName(name);
    if (name) {
      setBatting(findBattingFigures(name, firstCard, secondCard));
      setBowling(findBowlingFigures(name, firstCard, secondCard));
    }
  }, [result.manOfTheMatchName, firstCard, secondCard]);

  useEffect(() => {
    if (!photoUrl) { setProcessedUrl(null); return; }
    if (photoFilter === 'none') { setProcessedUrl(photoUrl); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.filter = photoFilter;
        ctx.drawImage(img, 0, 0);
        setProcessedUrl(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        setProcessedUrl(photoUrl);
      }
    };
    img.onerror = () => setProcessedUrl(photoUrl);
    img.src = photoUrl;
  }, [photoUrl, photoFilter]);

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

  const openPicker = (target: 'photo' | 'logo') => { setPickerTarget(target); setPickerOpen(true); };
  const handlePickerSelect = (url: string) => {
    if (pickerTarget === 'photo') setPhotoUrl(url);
    else setCustomLogos(prev => [...prev, url]);
  };
  const removeLogo = (idx: number) => setCustomLogos(prev => prev.filter((_, i) => i !== idx));

  const tournamentSponsorUrls = (tournament?.sponsors ?? [])
    .filter(s => s.brandLogoUrl).map(s => s.brandLogoUrl!);
  const sponsorLogoUrls = customLogos.length > 0 ? customLogos : tournamentSponsorUrls;

  const teamId = match.homeTeamId ?? match.oppositionTeamId;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Form */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Photo selector + download */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            onClick={() => openPicker('photo')}
            sx={{
              width: 80, height: 80, borderRadius: 2, overflow: 'hidden',
              border: '2px dashed', borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              '&:hover': { borderColor: 'primary.main' },
              bgcolor: 'background.paper',
            }}
          >
            {processedUrl ? (
              <Box component="img" src={processedUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Person sx={{ fontSize: 36, color: 'text.disabled' }} />
            )}
          </Box>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddPhotoAlternate />}
                onClick={() => openPicker('photo')}
              >
                {photoUrl ? 'Change Photo' : 'Select Player Photo'}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Select a player image from the media gallery
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              color="secondary"
              startIcon={downloading ? <CircularProgress size={14} color="inherit" /> : <Download />}
              onClick={download}
              disabled={downloading}
              sx={{ flexShrink: 0 }}
            >
              {downloading ? 'Exporting…' : 'Download as Image'}
            </Button>
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

      {/* Sponsor logos */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Sponsor logos:</Typography>
        {customLogos.map((url, i) => (
          <Box key={i} sx={{ position: 'relative', display: 'inline-flex' }}>
            <Box component="img" src={url} sx={{ height: 36, maxWidth: 80, objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 0.25 }} />
            <Tooltip title="Remove">
              <IconButton size="small" onClick={() => removeLogo(i)}
                sx={{ position: 'absolute', top: -8, right: -8, width: 16, height: 16, p: 0, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'error.main', color: 'white', borderColor: 'error.main' } }}>
                <Close sx={{ fontSize: 10 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
        <Button variant="outlined" size="small" startIcon={<AddPhotoAlternate />} onClick={() => openPicker('logo')} sx={{ height: 36 }}>
          Add Logo
        </Button>
        {tournamentSponsorUrls.length > 0 && customLogos.length === 0 && (
          <Typography variant="caption" color="text.secondary">Using tournament sponsors</Typography>
        )}
      </Box>

      {/* Photo adjustments — 3 sliders + filter, shown when photo is selected */}
      {photoUrl && (
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Left ← → Right</Typography>
            <Slider
              value={photoPositionX}
              onChange={(_, v) => setPhotoPositionX(v as number)}
              min={0} max={100} step={1}
              valueLabelDisplay="auto"
              valueLabelFormat={v => `${v}%`}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Top ↑ ↓ Bottom</Typography>
            <Slider
              value={photoPositionY}
              onChange={(_, v) => setPhotoPositionY(v as number)}
              min={0} max={100} step={1}
              valueLabelDisplay="auto"
              valueLabelFormat={v => `${v}%`}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Transparency</Typography>
            <Slider
              value={photoOpacity}
              onChange={(_, v) => setPhotoOpacity(v as number)}
              min={10} max={100} step={1}
              valueLabelDisplay="auto"
              valueLabelFormat={v => `${v}%`}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Filter</Typography>
            <Select
              size="small"
              fullWidth
              value={photoFilter}
              onChange={e => setPhotoFilter(e.target.value)}
            >
              {FILTERS.map(f => (
                <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
              ))}
            </Select>
          </Box>
        </Box>
      )}

      {/* Card preview */}
      <Box sx={{ pb: 2 }}>
        <Box ref={cardRef} sx={{ width: '100%', maxWidth: 600 }}>
          <ManOfTheMatchCardPreview
            playerName={playerName}
            playerPhotoUrl={processedUrl}
            homeTeam={match.homeTeamName ?? ''}
            awayTeam={match.oppositionTeamName ?? ''}
            tournamentName={tournament?.name ?? match.tournamentName ?? null}
            tournamentLogoUrl={tournament?.logoUrl ?? null}
            battingFigures={batting}
            bowlingFigures={bowling}
            description={description}
            photoOpacity={photoOpacity}
            photoPositionX={photoPositionX}
            photoPositionY={photoPositionY}
            sponsorLogoUrls={sponsorLogoUrls}
          />
        </Box>
      </Box>

      <MediaPickerDialog
        open={pickerOpen}
        title={pickerTarget === 'photo' ? 'Select Player Photo' : 'Select Sponsor Logo'}
        teamId={teamId}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />
    </Box>
  );
};

export default ManOfTheMatchTemplate;
