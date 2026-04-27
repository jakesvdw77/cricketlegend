import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, IconButton, Tooltip,
} from '@mui/material';
import { Check, ContentCopy, Refresh, Close, WhatsApp } from '@mui/icons-material';
import { Match, MatchPoll } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  match: Match;
  poll: MatchPoll;
}

const DIV  = '━'.repeat(40);
const THIN = '─'.repeat(40);

const stageLabel: Record<string, string> = {
  FRIENDLY:     'Friendly',
  POOL:         'Pool Stage',
  QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL:   'Semi-Final',
  FINAL:        'Final',
};

function generateMessage(match: Match, poll: MatchPoll): string {
  const pollUrl = `${window.location.origin}/poll/${poll.matchId}/${poll.teamId}`;
  const lines: string[] = [];
  const add = (s = '') => lines.push(s);

  add(DIV);
  add('🏏  AVAILABILITY POLL');
  add(DIV);
  add();

  // Match title
  const home = match.homeTeamName ?? '?';
  const away = match.oppositionTeamName ?? '?';
  add(`${home}  vs  ${away}`);
  add();

  // Meta row
  if (match.matchDate)    add(`📅  ${match.matchDate}`);
  if (poll.teamName)      add(`⚔️   Team: ${poll.teamName}`);
  if (match.fieldName)    add(`🏟️   Venue: ${match.fieldName}`);
  if (match.fieldAddress) add(`📍  ${match.fieldAddress}`);

  const tournament = match.tournamentName;
  const stage = match.matchStage ? stageLabel[match.matchStage] ?? match.matchStage : null;
  if (tournament || stage) {
    const parts = [tournament, stage].filter(Boolean).join('  •  ');
    add(`🏆  ${parts}`);
  }

  // Times
  if (match.arrivalTime || match.tossTime || match.scheduledStartTime) {
    add();
    add(THIN);
    add('🕐  Match Times');
    add(THIN);
    if (match.arrivalTime)         add(`  Arrival:   ${match.arrivalTime}`);
    if (match.tossTime)            add(`  Toss:      ${match.tossTime}`);
    if (match.scheduledStartTime)  add(`  Start:     ${match.scheduledStartTime}`);
  }

  // Poll link
  add();
  add(THIN);
  add('📋  Please confirm your availability:');
  add(THIN);
  add(`🔗  ${pollUrl}`);
  add();
  add(DIV);

  return lines.join('\n');
}

const PollWhatsAppDialog: React.FC<Props> = ({ open, onClose, match, poll }) => {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => setText(generateMessage(match, poll));

  useEffect(() => {
    if (open) generate();
  }, [open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <WhatsApp sx={{ color: '#25D366' }} />
        WhatsApp Message
        <IconButton onClick={onClose} size="small" sx={{ ml: 'auto' }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={copied ? <Check /> : <ContentCopy />}
            color={copied ? 'success' : 'primary'}
            onClick={handleCopy}
            disabled={!text}
            sx={{ minWidth: 160 }}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
          <Tooltip title="Regenerate from current match data">
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={generate}>
              Regenerate
            </Button>
          </Tooltip>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Edit below before copying
          </Typography>
        </Box>

        <TextField
          multiline
          fullWidth
          minRows={18}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Click Regenerate to build the message…"
          inputProps={{
            style: { fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.7 },
          }}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'grey.50', alignItems: 'flex-start' } }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PollWhatsAppDialog;
