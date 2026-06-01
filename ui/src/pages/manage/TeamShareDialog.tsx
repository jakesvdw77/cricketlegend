import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography,
  Card, CardContent, CircularProgress, Alert, Button, Stack,
  TextField, MenuItem,
} from '@mui/material';
import {
  ArrowBack, Check, Close, ContentCopy, Email,
  Groups, PictureAsPdf, Psychology, Refresh, WhatsApp,
} from '@mui/icons-material';
import { Team, Player, Tournament } from '../../types';
import { teamApi } from '../../api/teamApi';
import { tournamentApi } from '../../api/tournamentApi';
import { generateSquadPdf } from '../../utils/matchPdf';
import { SquadAnalysisView } from '../../components/team/SquadAnalysisView';
import api from '../../api/axiosConfig';

type ShareStep = 'type' | 'pdf' | 'whatsapp' | 'analysis';

const SHARE_TYPES: { key: ShareStep; label: string; description: string; icon: React.ReactNode }[] = [
  { key: 'pdf',      label: 'Squad PDF',        description: 'Printable team & squad document',   icon: <PictureAsPdf sx={{ fontSize: 32 }} /> },
  { key: 'whatsapp', label: 'WhatsApp / Email',  description: 'Share squad announcement message',  icon: <WhatsApp     sx={{ fontSize: 32 }} /> },
  { key: 'analysis', label: 'Squad Analysis',   description: 'AI-powered squad insights & charts', icon: <Psychology   sx={{ fontSize: 32 }} /> },
];

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
    if (tournament.startDate || tournament.endDate)
      lines.push(`📅 ${[tournament.startDate, tournament.endDate].filter(Boolean).join(' – ')}`);
    if (tournament.cricketFormat) lines.push(`🎯 Format: ${tournament.cricketFormat.replace(/_/g, ' ')}`);
    if (tournament.ageGroup)      lines.push(`👥 Age Group: ${tournament.ageGroup.replace(/_/g, ' ')}`);
    if (tournament.websiteLink)   lines.push(`🌐 ${tournament.websiteLink}`);
  }
  lines.push('');
  lines.push(THIN);
  lines.push('📋  Squad');
  lines.push(THIN);
  sorted.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name} ${p.surname}${p.playerId === team.captainId ? ' *(C)*' : ''}  —  ${getRoleText(p)}`);
  });
  lines.push('');
  lines.push(DIV);
  return lines.join('\n');
}

interface Props {
  team: Team | null;
  onClose: () => void;
}

const TeamShareDialog: React.FC<Props> = ({ team, onClose }) => {
  const [step, setStep] = useState<ShareStep>('type');
  const [squad, setSquad] = useState<Player[]>([]);
  const [squadLoading, setSquadLoading] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [whatsAppText, setWhatsAppText] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!team?.teamId) { setSquad([]); setStep('type'); return; }
    setStep('type');
    setSquadLoading(true);
    Promise.all([
      teamApi.getSquad(team.teamId),
      tournamentApi.findAll().catch(() => [] as Tournament[]),
    ]).then(([sq, ts]) => {
      setSquad(sq);
      setTournaments(ts);
    }).finally(() => setSquadLoading(false));
  }, [team?.teamId]);

  const selectedTournament = tournaments.find(t => t.tournamentId === selectedTournamentId) ?? null;

  const regenerateWhatsApp = () =>
    setWhatsAppText(buildWhatsApp(team!, squad, selectedTournament));

  useEffect(() => {
    if (step === 'whatsapp' && squad.length > 0) regenerateWhatsApp();
  }, [step, squad, selectedTournamentId]);

  const handlePdf = async () => {
    if (!team) return;
    setPdfLoading(true);
    try {
      const url = await generateSquadPdf(team, squad, selectedTournament);
      const a = document.createElement('a');
      a.href = url;
      a.download = `squad-${team.teamName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsAppText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleSendEmail = async () => {
    if (!team) return;
    setSending(true);
    setEmailError(null);
    setSent(false);
    try {
      await api.post(`/teams/${team.teamId}/squad/notify`, {
        tournamentId: selectedTournamentId !== '' ? selectedTournamentId : null,
      });
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch {
      setEmailError('Failed to send email notifications. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!team) return null;

  const stepTitle: Record<ShareStep, string> = {
    type:     'Share',
    pdf:      'Squad PDF',
    whatsapp: 'WhatsApp / Email',
    analysis: 'Squad Analysis',
  };

  return (
    <Dialog open={!!team} onClose={onClose} maxWidth={step === 'analysis' ? 'lg' : 'sm'} fullWidth fullScreen={step === 'analysis'}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        {step !== 'type' && (
          <IconButton size="small" onClick={() => setStep('type')} sx={{ mr: 0.5 }}>
            <ArrowBack fontSize="small" />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="span">{stepTitle[step]}</Typography>
          {step === 'type' && (
            <Typography variant="body2" color="text.secondary">{team.teamName}</Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>

      <DialogContent>
        {squadLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>

        ) : step === 'type' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2, py: 1 }}>
            {SHARE_TYPES.map(type => (
              <Card
                key={type.key}
                variant="outlined"
                onClick={() => setStep(type.key)}
                sx={{
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                <CardContent sx={{ py: 3 }}>
                  <Box sx={{ color: 'primary.main', mb: 1 }}>{type.icon}</Box>
                  <Typography variant="subtitle2" fontWeight={700}>{type.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{type.description}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

        ) : step === 'pdf' ? (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Generates a printable PDF with the team profile and full squad list.
              Optionally link a tournament to include its details.
            </Typography>

            <TextField
              select fullWidth size="small" label="Tournament (optional)"
              value={selectedTournamentId}
              onChange={e => setSelectedTournamentId(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ mb: 3 }}
            >
              <MenuItem value="">No tournament</MenuItem>
              {tournaments.map(t => (
                <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>
              ))}
            </TextField>

            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Groups fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {squad.length} player{squad.length !== 1 ? 's' : ''} in squad
              </Typography>
            </Stack>

            <Button
              variant="contained"
              startIcon={pdfLoading ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdf />}
              onClick={handlePdf}
              disabled={pdfLoading || squad.length === 0}
              sx={{ mt: 1 }}
            >
              {pdfLoading ? 'Generating…' : 'Download Squad PDF'}
            </Button>
          </Box>

        ) : step === 'analysis' ? (
          <SquadAnalysisView teamId={team.teamId!} teamName={team.teamName} />

        ) : (
          /* WhatsApp / Email step */
          <Box>
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

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                WhatsApp message — edit before copying
              </Typography>
              <Button size="small" variant="outlined" startIcon={<Refresh />} onClick={regenerateWhatsApp}>
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
              multiline fullWidth minRows={14}
              value={whatsAppText}
              onChange={e => setWhatsAppText(e.target.value)}
              inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.7 } }}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { bgcolor: '#ffffff' }, '& .MuiInputBase-input': { color: '#000000' } }}
            />

            <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Send email notifications to all squad members who opted in.
                {selectedTournament && ` Tournament details for *${selectedTournament.name}* will be included.`}
              </Typography>
              {emailError && <Alert severity="error" sx={{ mb: 1 }}>{emailError}</Alert>}
              {sent && <Alert severity="success" sx={{ mb: 1 }}>Emails queued successfully!</Alert>}
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
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TeamShareDialog;
