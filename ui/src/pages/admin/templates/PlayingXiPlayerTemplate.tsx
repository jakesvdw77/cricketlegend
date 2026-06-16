import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, FormControl, IconButton, InputLabel, MenuItem, Select, Slider, Tooltip, Typography,
} from '@mui/material';

const FILTERS = [
  { value: 'none',                                              label: 'None' },
  { value: 'grayscale(1)',                                      label: 'Black & White' },
  { value: 'sepia(1)',                                          label: 'Sepia' },
  { value: 'sepia(0.5) hue-rotate(190deg) saturate(1.4)',       label: 'Cool / Blue' },
  { value: 'brightness(0.75) contrast(1.1) saturate(0.8)',      label: 'Dark' },
  { value: 'saturate(1.6) contrast(1.05)',                      label: 'Vivid' },
];
import { AddPhotoAlternate, Close, Download, Person } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import { Match, MatchSide, Player, Tournament } from '../../../types';
import { tournamentApi } from '../../../api/tournamentApi';
import MediaPickerDialog from '../../../components/media/MediaPickerDialog';
import PlayingXiPlayerCardPreview, { PlayerEntry } from './PlayingXiPlayerCardPreview';

interface Props {
  match: Match;
  sides: MatchSide[];
  players: Player[];
  effectiveTeamId: number;
}

const PlayingXiPlayerTemplate: React.FC<Props> = ({
  match, sides, players, effectiveTeamId,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading,   setDownloading]   = useState(false);
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [pickerTarget,  setPickerTarget]  = useState<'photo' | 'logo'>('photo');
  const [customLogos,   setCustomLogos]   = useState<string[]>([]);
  const [photoUrl,      setPhotoUrl]      = useState<string | null>(null);
  const [tournament,    setTournament]    = useState<Tournament | null>(null);
  const [photoOpacity,   setPhotoOpacity]   = useState(100);
  const [photoPositionX, setPhotoPositionX] = useState(50);
  const [photoPositionY, setPhotoPositionY] = useState(0);
  const [photoFilter,    setPhotoFilter]    = useState('none');
  const [processedUrl,   setProcessedUrl]   = useState<string | null>(null);

  useEffect(() => {
    if (match.tournamentId) {
      tournamentApi.findById(match.tournamentId).then(setTournament).catch(() => null);
    }
  }, [match.tournamentId]);

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

  const sidesWithXi = sides.filter(s => (s.playingXi ?? []).length > 0);
  const defaultSideId = sidesWithXi.find(s => s.teamId === effectiveTeamId)?.teamId
    ?? sidesWithXi[0]?.teamId
    ?? effectiveTeamId;
  const [selectedTeamId, setSelectedTeamId] = useState<number>(defaultSideId);

  const selectedSide = sides.find(s => s.teamId === selectedTeamId) ?? sides[0];
  const teamName = selectedTeamId === match.homeTeamId
    ? (match.homeTeamName ?? '')
    : (match.oppositionTeamName ?? '');

  const xiEntries: PlayerEntry[] = (selectedSide?.playingXi ?? [])
    .map(pid => players.find(p => p.playerId === pid))
    .filter(Boolean)
    .map(p => ({
      name: p!.name,
      surname: p!.surname,
      isCaptain: p!.playerId === selectedSide?.captainPlayerId,
      isWicketKeeper: p!.playerId === selectedSide?.wicketKeeperPlayerId,
    }));

  const twelfthManPlayer = selectedSide?.twelfthManPlayerId
    ? players.find(p => p.playerId === selectedSide.twelfthManPlayerId) ?? null
    : null;

  const twelfthManEntry = twelfthManPlayer
    ? {
        name: twelfthManPlayer.name,
        surname: twelfthManPlayer.surname,
        isCaptain: false,
        isWicketKeeper: false,
      }
    : null;

  const openPicker = (target: 'photo' | 'logo') => { setPickerTarget(target); setPickerOpen(true); };
  const handlePickerSelect = (url: string) => {
    if (pickerTarget === 'photo') setPhotoUrl(url);
    else setCustomLogos(prev => [...prev, url]);
  };
  const removeLogo = (idx: number) => setCustomLogos(prev => prev.filter((_, i) => i !== idx));

  const tournamentSponsorUrls = (tournament?.sponsors ?? [])
    .filter(s => s.brandLogoUrl).map(s => s.brandLogoUrl!);
  const sponsorLogoUrls = customLogos.length > 0 ? customLogos : tournamentSponsorUrls;

  const download = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#091509',
      });
      const a = document.createElement('a');
      a.download = `match-day-squad-${match.matchId ?? 'match'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Team selector — only shown if multiple sides have an XI */}
      {sidesWithXi.length > 1 && (
        <FormControl size="small" sx={{ maxWidth: 260 }}>
          <InputLabel>Team</InputLabel>
          <Select
            value={selectedTeamId}
            label="Team"
            onChange={e => setSelectedTeamId(Number(e.target.value))}
          >
            {sidesWithXi.map(s => {
              const name = s.teamId === match.homeTeamId
                ? (match.homeTeamName ?? 'Home')
                : (match.oppositionTeamName ?? 'Away');
              return <MenuItem key={s.teamId} value={s.teamId}>{name}</MenuItem>;
            })}
          </Select>
        </FormControl>
      )}

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
              Featured player shown on the left of the card
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

      {/* Photo adjustments — 3 sliders + filter */}
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
          <PlayingXiPlayerCardPreview
            playerPhotoUrl={processedUrl}
            teamName={teamName}
            players={xiEntries}
            twelfthMan={twelfthManEntry}
            tournamentName={tournament?.name ?? match.tournamentName ?? null}
            tournamentLogoUrl={tournament?.logoUrl ?? null}
            matchLabel={`${match.homeTeamName ?? ''} vs ${match.oppositionTeamName ?? ''}`}
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
        teamId={selectedTeamId || (match.homeTeamId ?? match.oppositionTeamId)}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />
    </Box>
  );
};

export default PlayingXiPlayerTemplate;
