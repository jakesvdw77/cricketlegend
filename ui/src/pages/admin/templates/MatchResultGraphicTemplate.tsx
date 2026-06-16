import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, IconButton, MenuItem, Select, Slider, Tooltip, Typography,
} from '@mui/material';
import { AddPhotoAlternate, Close, Download, Image as ImageIcon } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import MediaPickerDialog from '../../../components/media/MediaPickerDialog';
import MatchResultGraphicPreview from './MatchResultGraphicPreview';
import { TemplateProps } from './types';

type PickerTarget = 'bg' | 'logo';

const MatchResultGraphicTemplate: React.FC<TemplateProps> = (props) => {
  const { match } = props;
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading,    setDownloading]    = useState(false);
  const [pickerOpen,     setPickerOpen]     = useState(false);
  const [pickerTarget,   setPickerTarget]   = useState<PickerTarget>('bg');
  const [bgPhotoUrl,     setBgPhotoUrl]     = useState<string | null>(null);
  const [photoOpacity,   setPhotoOpacity]   = useState(80);
  const [photoPositionX, setPhotoPositionX] = useState(50);
  const [photoPositionY, setPhotoPositionY] = useState(50);
  const [inset,          setInset]          = useState(22);
  const [customLogos,    setCustomLogos]    = useState<string[]>([]);
  const [bgFilter,       setBgFilter]       = useState('none');
  const [processedBgUrl, setProcessedBgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!bgPhotoUrl) { setProcessedBgUrl(null); return; }
    if (bgFilter === 'none') { setProcessedBgUrl(bgPhotoUrl); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.filter = bgFilter;
        ctx.drawImage(img, 0, 0);
        setProcessedBgUrl(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        setProcessedBgUrl(bgPhotoUrl);
      }
    };
    img.onerror = () => setProcessedBgUrl(bgPhotoUrl);
    img.src = bgPhotoUrl;
  }, [bgPhotoUrl, bgFilter]);

  const openPicker = (target: PickerTarget) => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const handlePickerSelect = (url: string) => {
    if (pickerTarget === 'bg') {
      setBgPhotoUrl(url);
    } else {
      setCustomLogos(prev => [...prev, url]);
    }
  };

  const removeLogo = (idx: number) =>
    setCustomLogos(prev => prev.filter((_, i) => i !== idx));

  const download = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#040c28',
        width: 1200, height: 675,
      });
      const a = document.createElement('a');
      a.download = `match-result-${match.matchId ?? 'match'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  const teamId = match.homeTeamId ?? match.oppositionTeamId;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Row 1: background photo + download */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          onClick={() => openPicker('bg')}
          sx={{
            width: 80, height: 45, borderRadius: 1, overflow: 'hidden',
            border: '2px dashed', borderColor: 'divider',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            '&:hover': { borderColor: 'primary.main' },
            bgcolor: 'background.paper',
          }}
        >
          {processedBgUrl ? (
            <Box component="img" src={processedBgUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <ImageIcon sx={{ fontSize: 24, color: 'text.disabled' }} />
          )}
        </Box>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddPhotoAlternate />}
              onClick={() => openPicker('bg')}
            >
              {bgPhotoUrl ? 'Change Background' : 'Select Background Photo'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Landscape photos work best for the 16:9 background
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

      {/* Row 2: filter + sponsor logos */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary">Filter:</Typography>
          <Select
            size="small"
            value={bgFilter}
            onChange={e => setBgFilter(e.target.value)}
            disabled={!bgPhotoUrl}
            sx={{ fontSize: 13, minWidth: 130, height: 32 }}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="grayscale(1)">Black & White</MenuItem>
            <MenuItem value="sepia(1)">Sepia</MenuItem>
            <MenuItem value="sepia(0.5) hue-rotate(190deg) saturate(1.4)">Cool / Blue</MenuItem>
            <MenuItem value="brightness(0.75) contrast(1.1) saturate(0.8)">Dark</MenuItem>
            <MenuItem value="saturate(1.6) contrast(1.05)">Vivid</MenuItem>
          </Select>
        </Box>
        <Box sx={{ width: 1, display: { xs: 'none', sm: 'block' }, height: 28, borderLeft: '1px solid', borderColor: 'divider', flexShrink: 0 }} />
      </Box>

      {/* Row 3: sponsor logos */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          Sponsor logos:
        </Typography>
        {customLogos.map((url, i) => (
          <Box key={i} sx={{ position: 'relative', display: 'inline-flex' }}>
            <Box
              component="img"
              src={url}
              sx={{
                height: 36, maxWidth: 80, objectFit: 'contain',
                borderRadius: 1, border: '1px solid', borderColor: 'divider',
                bgcolor: 'background.paper', p: 0.25,
              }}
            />
            <Tooltip title="Remove">
              <IconButton
                size="small"
                onClick={() => removeLogo(i)}
                sx={{
                  position: 'absolute', top: -8, right: -8,
                  width: 16, height: 16, p: 0,
                  bgcolor: 'background.paper',
                  border: '1px solid', borderColor: 'divider',
                  '&:hover': { bgcolor: 'error.main', color: 'white', borderColor: 'error.main' },
                }}
              >
                <Close sx={{ fontSize: 10 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddPhotoAlternate />}
          onClick={() => openPicker('logo')}
          sx={{ height: 36 }}
        >
          Add Logo
        </Button>
        {customLogos.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            Overrides tournament sponsors
          </Typography>
        )}
      </Box>

      {/* Row 3: sliders */}
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Left ← → Right</Typography>
          <Slider
            value={photoPositionX}
            onChange={(_, v) => setPhotoPositionX(v as number)}
            min={0} max={100} step={1}
            valueLabelDisplay="auto"
            valueLabelFormat={v => `${v}%`}
            disabled={!bgPhotoUrl}
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
            disabled={!bgPhotoUrl}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Photo Transparency</Typography>
          <Slider
            value={photoOpacity}
            onChange={(_, v) => setPhotoOpacity(v as number)}
            min={10} max={100} step={1}
            valueLabelDisplay="auto"
            valueLabelFormat={v => `${v}%`}
            disabled={!bgPhotoUrl}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Field Border</Typography>
          <Slider
            value={inset}
            onChange={(_, v) => setInset(v as number)}
            min={0} max={50} step={1}
            valueLabelDisplay="auto"
            valueLabelFormat={v => `${v}px`}
          />
        </Box>
      </Box>

      {/* Card preview */}
      <Box sx={{ overflowX: 'auto', pb: 1 }}>
        <Box ref={cardRef} sx={{ display: 'inline-block', lineHeight: 0 }}>
          <MatchResultGraphicPreview
            {...props}
            bgPhotoUrl={processedBgUrl}
            photoOpacity={photoOpacity}
            photoPositionX={photoPositionX}
            photoPositionY={photoPositionY}
            inset={inset}
            customLogos={customLogos.length > 0 ? customLogos : undefined}
          />
        </Box>
      </Box>

      <MediaPickerDialog
        open={pickerOpen}
        title={pickerTarget === 'bg' ? 'Select Background Photo' : 'Select Sponsor Logo'}
        teamId={teamId}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />
    </Box>
  );
};

export default MatchResultGraphicTemplate;
