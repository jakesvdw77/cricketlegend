import React, { useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import {
  Check, ContentCopy, CropOriginal, Download, Edit as EditIcon, Refresh,
} from '@mui/icons-material';
import html2canvas from 'html2canvas';
import RichEditor from './RichEditor';
import { plainTextToHtml } from './types';

export type ViewMode = 'text' | 'editor' | 'card';

interface Props {
  text: string;
  onTextChange: (v: string) => void;
  html: string;
  onHtmlChange: (v: string) => void;
  /** Bump this to remount the editor with fresh content (e.g. after Regenerate) */
  editorKey: number;
  onRegenerate: () => void;
  card: React.ReactNode;
  downloadPrefix?: string;
}

const TemplateShell: React.FC<Props> = ({
  text, onTextChange,
  html, onHtmlChange,
  editorKey,
  onRegenerate,
  card,
  downloadPrefix = 'match-report',
}) => {
  const [viewMode, setViewMode]   = useState<ViewMode>('editor');
  const [copied, setCopied]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const copy = () =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0d3349',
      });
      const link = document.createElement('a');
      link.download = `${downloadPrefix}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* View mode toggle */}
      <Box>
        <ToggleButtonGroup value={viewMode} exclusive size="small" onChange={(_, v) => v && setViewMode(v)}>
          <ToggleButton value="editor">
            <EditIcon fontSize="small" sx={{ mr: 0.5 }} />Rich Editor
          </ToggleButton>
          <ToggleButton value="card">
            <CropOriginal fontSize="small" sx={{ mr: 0.5 }} />Card Preview
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Action bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {viewMode !== 'card' && (
          <Button
            variant="contained" size="small"
            startIcon={copied ? <Check /> : <ContentCopy />}
            color={copied ? 'success' : 'primary'}
            onClick={copy}
            disabled={!text}
            sx={{ minWidth: 160 }}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        )}
        <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={onRegenerate}>
          Regenerate
        </Button>
        {viewMode === 'card' && (
          <Button
            variant="contained" size="small" color="secondary"
            startIcon={downloading ? <CircularProgress size={14} color="inherit" /> : <Download />}
            onClick={downloadCard}
            disabled={downloading}
          >
            {downloading ? 'Exporting…' : 'Download as Image'}
          </Button>
        )}
        {viewMode !== 'card' && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Edit below before copying
          </Typography>
        )}
      </Box>

      {/* Plain text */}
      {viewMode === 'text' && (
        <TextField
          multiline fullWidth minRows={24}
          value={text}
          onChange={e => onTextChange(e.target.value)}
          placeholder="Click Regenerate to build the template…"
          inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.6 } }}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'grey.50', alignItems: 'flex-start' } }}
        />
      )}

      {/* Rich editor */}
      {viewMode === 'editor' && (
        <RichEditor
          key={editorKey}
          initialHtml={html || plainTextToHtml(text)}
          onChange={onHtmlChange}
        />
      )}

      {/* Card preview */}
      {viewMode === 'card' && (
        <Box sx={{ overflowX: 'auto', pb: 2 }}>
          <Box ref={cardRef} sx={{ display: 'inline-block', minWidth: 620 }}>
            {card}
          </Box>
        </Box>
      )}

    </Box>
  );
};

export default TemplateShell;
