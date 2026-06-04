import React, { useRef, useState } from 'react';
import { Box, Button, TextField, Tooltip, Typography } from '@mui/material';
import { Check, ContentCopy, Refresh } from '@mui/icons-material';
import { EmojiPickerButton } from './EmojiPickerButton';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRegenerate?: () => void;
  minRows?: number;
  placeholder?: string;
  label?: string;
}

export const PlainTextEditor: React.FC<Props> = ({
  value, onChange, onRegenerate, minRows = 16, placeholder, label,
}) => {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) { onChange(value + emoji); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const newVal = value.slice(0, start) + emoji + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained" size="small"
          startIcon={copied ? <Check /> : <ContentCopy />}
          color={copied ? 'success' : 'primary'}
          onClick={copy}
          disabled={!value}
          sx={{ minWidth: 90 }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        {onRegenerate && (
          <Tooltip title="Regenerate from current data">
            <span>
              <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={onRegenerate}>
                Regenerate
              </Button>
            </span>
          </Tooltip>
        )}
        <EmojiPickerButton onSelect={insertEmoji} />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {label ?? 'Edit below before copying'}
        </Typography>
      </Box>
      <TextField
        multiline fullWidth minRows={minRows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputRef={inputRef}
        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.7, color: '#1a1a1a' } }}
        sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', alignItems: 'flex-start' } }}
      />
    </Box>
  );
};
