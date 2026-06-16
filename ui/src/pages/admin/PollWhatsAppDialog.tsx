import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton,
} from '@mui/material';
import { Close, WhatsApp } from '@mui/icons-material';
import { Match, MatchPoll } from '../../types';
import { PlainTextEditor } from '../../components/PlainTextEditor';

interface Props {
  open: boolean;
  onClose: () => void;
  match: Match;
  poll: MatchPoll;
  variant?: 'open' | 'closed';
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

function matchMeta(match: Match, poll: MatchPoll, _lines: string[], add: (s?: string) => void) {
  const home = match.homeTeamName ?? '?';
  const away = match.oppositionTeamName ?? '?';
  add(`${home}  vs  ${away}`);
  add();

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
}

function generateMessage(match: Match, poll: MatchPoll): string {
  const pollUrl = `${window.location.origin}/poll/${poll.matchId}/${poll.teamId}`;
  const lines: string[] = [];
  const add = (s = '') => lines.push(s);

  add(DIV);
  add('🏏  AVAILABILITY POLL');
  add(DIV);
  add();

  matchMeta(match, poll, lines, add);

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

function generateClosedMessage(match: Match, poll: MatchPoll): string {
  const pollUrl = `${window.location.origin}/poll/${poll.matchId}/${poll.teamId}`;
  const lines: string[] = [];
  const add = (s = '') => lines.push(s);

  add(DIV);
  add('🔒  AVAILABILITY POLL CLOSED');
  add(DIV);
  add();

  matchMeta(match, poll, lines, add);

  add();
  add(THIN);
  add('The availability poll for this match is now closed.');
  add('You can still view the results here:');
  add(THIN);
  add(`🔗  ${pollUrl}`);
  add();
  add(DIV);

  return lines.join('\n');
}

const PollWhatsAppDialog: React.FC<Props> = ({ open, onClose, match, poll, variant = 'open' }) => {
  const [text, setText] = useState('');

  const generate = () => setText(
    variant === 'closed' ? generateClosedMessage(match, poll) : generateMessage(match, poll)
  );

  useEffect(() => {
    if (open) generate();
  }, [open, variant]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <WhatsApp sx={{ color: '#25D366' }} />
        {variant === 'closed' ? 'WhatsApp – Poll Closed' : 'WhatsApp Message'}
        <IconButton onClick={onClose} size="small" sx={{ ml: 'auto' }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <PlainTextEditor
          value={text}
          onChange={setText}
          onRegenerate={generate}
          minRows={18}
          placeholder="Click Regenerate to build the message…"
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PollWhatsAppDialog;
