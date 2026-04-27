import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, TextField, Typography, IconButton,
  MenuItem, CircularProgress, Alert,
} from '@mui/material';
import { Check, Close, ContentCopy, Email, Refresh, WhatsApp } from '@mui/icons-material';
import { Team, Player, Tournament } from '../../types';
import { tournamentApi } from '../../api/tournamentApi';
import api from '../../api/axiosConfig';

interface Props {
  open: boolean;
  onClose: () => void;
  team: Team;
  squad: Player[];
}

const DIV  = '━'.repeat(40);
const THIN = '─'.repeat(40);

function getRoleText(p: Player): string {
  const isBowler = p.bowlingType && p.bowlingType !== 'NONE' && !p.partTimeBowler;
  if (p.wicketKeeper) return isBowler ? 'WK / Bat / Bowl' : 'WK / Bat';
  if (isBowler) return 'Bat / Bowl';
  return 'Batsman';
}

function buildWhatsApp(team: Team, squad: Player[], tournament: Tournament | null): string {
  const sorted = [...squad].sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  const captain = squad.find(p => p.playerId === team.captainId);
  const lines: string[] = [];

  lines.push(DIV);
  lines.push('🏏  SQUAD ANNOUNCEMENT');
  lines.push(DIV);
  lines.push('');
  lines.push(`*${team.teamName}*`);
  if (captain) lines.push(`⭐ Captain: ${captain.name} ${captain.surname}`);
  if (team.coach)   lines.push(`🧑‍💼 Coach: ${team.coach}`);
  if (team.manager) lines.push(`👔 Manager: ${team.manager}`);

  if (tournament) {
    lines.push('');
    lines.push(THIN);
    lines.push('🏆  Tournament');
    lines.push(THIN);
    lines.push(`*${tournament.name}*`);
    if (tournament.startDate || tournament.endDate) {
      const dates = [tournament.startDate, tournament.endDate].filter(Boolean).join(' – ');
      lines.push(`📅 ${dates}`);
    }
    if (tournament.cricketFormat) lines.push(`🎯 Format: ${tournament.cricketFormat.replace(/_/g, ' ')}`);
    if (tournament.ageGroup)      lines.push(`👥 Age Group: ${tournament.ageGroup.replace(/_/g, ' ')}`);
    if (tournament.websiteLink)   lines.push(`🌐 ${tournament.websiteLink}`);
  }

  lines.push('');
  lines.push(THIN);
  lines.push('📋  Squad');
  lines.push(THIN);
  sorted.forEach((p, i) => {
    const role = getRoleText(p);
    const isCap = p.playerId === team.captainId;
    lines.push(`${i + 1}. ${p.name} ${p.surname}${isCap ? ' *(C)*' : ''}  —  ${role}`);
  });

  lines.push('');
  lines.push(DIV);
  return lines.join('\n');
}

const SquadShareDialog: React.FC<Props> = ({ open, onClose, team, squad }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [whatsAppText, setWhatsAppText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      tournamentApi.findAll().then(setTournaments).catch(() => {});
    }
  }, [open]);

  const selectedTournament = tournaments.find(t => t.tournamentId === selectedTournamentId) ?? null;

  const regenerate = () => setWhatsAppText(buildWhatsApp(team, squad, selectedTournament));

  useEffect(() => {
    if (open) regenerate();
  }, [open, selectedTournamentId, selectedTournament]);

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsAppText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleSendEmail = async () => {
    setSending(true);
    setError(null);
    setSent(false);
    try {
      await api.post(`/teams/${team.teamId}/squad/notify`, {
        tournamentId: selectedTournamentId !== '' ? selectedTournamentId : null,
      });
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch {
      setError('Failed to send email notifications. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <WhatsApp sx={{ color: '#25D366' }} />
        Share Squad
        <IconButton onClick={onClose} size="small" sx={{ ml: 'auto' }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Tournament selector */}
        <TextField
          select fullWidth size="small" label="Tournament (optional)"
          value={selectedTournamentId}
          onChange={e => setSelectedTournamentId(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ mb: 2 }}
        >
          <MenuItem value="">No tournament</MenuItem>
          {tournaments.map(t => (
            <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>
          ))}
        </TextField>

        {/* WhatsApp section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
            WhatsApp message — edit before copying
          </Typography>
          <Button size="small" variant="outlined" startIcon={<Refresh />} onClick={regenerate}>
            Regenerate
          </Button>
          <Button
            size="small" variant="contained"
            startIcon={copied ? <Check /> : <ContentCopy />}
            color={copied ? 'success' : 'primary'}
            onClick={handleCopy}
            sx={{ minWidth: 150 }}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </Box>

        <TextField
          multiline fullWidth minRows={16}
          value={whatsAppText}
          onChange={e => setWhatsAppText(e.target.value)}
          inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.7 } }}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { bgcolor: '#ffffff' }, '& .MuiInputBase-input': { color: '#000000' } }}
        />

        {/* Email section */}
        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Send email notifications to all squad members who opted in to email.
            {selectedTournament && ` Tournament details for *${selectedTournament.name}* will be included.`}
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {sent  && <Alert severity="success" sx={{ mb: 1 }}>Emails queued successfully!</Alert>}
          <Button
            variant="outlined"
            startIcon={sending ? <CircularProgress size={16} /> : sent ? <Check /> : <Email />}
            onClick={handleSendEmail}
            disabled={sending}
            color={sent ? 'success' : 'primary'}
          >
            {sending ? 'Sending…' : sent ? 'Sent!' : 'Send Email Notifications'}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SquadShareDialog;
