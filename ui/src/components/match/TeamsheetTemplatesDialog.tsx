import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { ContentCopy, Facebook, Print, Refresh, WhatsApp } from '@mui/icons-material';
import { Match, MatchSide, Player } from '../../types';

// ── Text builders ─────────────────────────────────────────────────────────────

function getRoleText(player: Player, battingPosition: number, isWK: boolean): string {
  const isBowler = player.bowlingType && player.bowlingType !== 'NONE' && !player.partTimeBowler;
  const showBat  = player.battingPosition !== 'LOWER_ORDER' || battingPosition <= 7;
  if (isWK)     return showBat ? '🏏🧤' : '🧤';
  if (isBowler) return showBat ? '🏏🔴' : '🔴';
  return showBat ? '🏏' : '';
}

function buildTeamWhatsAppLines(
  teamName: string,
  xi: Player[],
  captain: Player | undefined,
  twelfth: Player | undefined,
  wicketKeeperPlayerId: number | undefined,
): string[] {
  const lines: string[] = [];
  lines.push(`*${teamName} — Playing XI*`);
  if (captain) lines.push(`⭐ Captain: ${captain.name} ${captain.surname}`);
  lines.push('');
  xi.forEach((p, idx) => {
    const pos      = idx + 1;
    const isWK     = p.playerId === wicketKeeperPlayerId;
    const isCaptain = p.playerId === captain?.playerId;
    const role     = getRoleText(p, pos, isWK);
    lines.push(`${role} ${pos}. ${p.name} ${p.surname}${isCaptain ? ' *(C)*' : ''}`);
  });
  if (twelfth) {
    lines.push('');
    lines.push(`_12th Man: ${twelfth.name} ${twelfth.surname}_`);
  }
  return lines;
}

export function buildWhatsAppText(match: Match, scope: 'both' | 'home' | 'away', sides: MatchSide[], players: Player[]): string {
  const lines: string[] = [];
  lines.push(`🏏 *${match.homeTeamName} vs ${match.oppositionTeamName}*`);
  if (match.tournamentName) lines.push(`🏆 ${match.tournamentName}`);
  const details = [
    match.matchDate          ? `📅 ${match.matchDate}`            : '',
    match.arrivalTime        ? `🚗 Arrive: ${match.arrivalTime}`  : '',
    match.tossTime           ? `🕐 Toss: ${match.tossTime}`       : '',
    match.scheduledStartTime ? `⏰ ${match.scheduledStartTime}`    : '',
    match.fieldName          ? `📍 ${match.fieldName}`            : '',
    match.umpire             ? `Umpire: ${match.umpire}`          : '',
  ].filter(Boolean).join('  |  ');
  if (details) lines.push(details);

  const getXi   = (s: MatchSide) => (s.playingXi ?? []).map(pid => players.find(p => p.playerId === pid)).filter(Boolean) as Player[];
  const getCap  = (s: MatchSide) => s.captainPlayerId   ? players.find(p => p.playerId === s.captainPlayerId)   : undefined;
  const get12th = (s: MatchSide) => s.twelfthManPlayerId ? players.find(p => p.playerId === s.twelfthManPlayerId) : undefined;

  const teams: Array<{ teamId: number; teamName: string }> = [];
  if (scope === 'both' || scope === 'home') teams.push({ teamId: match.homeTeamId!,        teamName: match.homeTeamName! });
  if (scope === 'both' || scope === 'away') teams.push({ teamId: match.oppositionTeamId!,  teamName: match.oppositionTeamName! });

  for (const t of teams) {
    const side = sides.find(s => s.teamId === t.teamId);
    if (!side) continue;
    lines.push('');
    lines.push(...buildTeamWhatsAppLines(t.teamName, getXi(side), getCap(side), get12th(side), side.wicketKeeperPlayerId));
  }
  lines.push('');
  lines.push('🏏 = Bat  |  🔴 = Bowl  |  🧤 = WK');
  if (match.fieldGoogleMapsUrl) { lines.push(''); lines.push(`📍 ${match.fieldGoogleMapsUrl}`); }
  return lines.join('\n');
}

export function buildFacebookText(match: Match, scope: 'both' | 'home' | 'away', sides: MatchSide[], players: Player[]): string {
  const paras: string[] = [];
  paras.push(`🏏 Playing XI Announcement\n${match.homeTeamName} vs ${match.oppositionTeamName}`);
  const meta = [
    match.matchDate      && `📅 ${match.matchDate}`,
    match.tournamentName && `🏆 ${match.tournamentName}`,
    match.fieldName      && `📍 ${match.fieldName}`,
  ].filter(Boolean).join('  |  ');
  if (meta) paras.push(meta);

  const getXi   = (s: MatchSide) => (s.playingXi ?? []).map(pid => players.find(p => p.playerId === pid)).filter(Boolean) as Player[];
  const getCap  = (s: MatchSide) => s.captainPlayerId    ? players.find(p => p.playerId === s.captainPlayerId)   : undefined;
  const get12th = (s: MatchSide) => s.twelfthManPlayerId ? players.find(p => p.playerId === s.twelfthManPlayerId) : undefined;

  const teams: Array<{ teamId: number; teamName: string }> = [];
  if (scope === 'both' || scope === 'home') teams.push({ teamId: match.homeTeamId!,       teamName: match.homeTeamName! });
  if (scope === 'both' || scope === 'away') teams.push({ teamId: match.oppositionTeamId!, teamName: match.oppositionTeamName! });

  for (const t of teams) {
    const side = sides.find(s => s.teamId === t.teamId);
    if (!side) continue;
    const xi      = getXi(side);
    const captain = getCap(side);
    const twelfth = get12th(side);
    const lines   = xi.map((p, idx) => {
      const role = getRoleText(p, idx + 1, p.playerId === side.wicketKeeperPlayerId);
      return `${role} ${p.name} ${p.surname}${p.playerId === captain?.playerId ? ' (C)' : ''}`;
    });
    let para = `*${t.teamName}* take the field with:\n${lines.join('\n')}`;
    if (twelfth) para += `\n12th Man: ${twelfth.name} ${twelfth.surname}`;
    paras.push(para);
  }

  paras.push('Good luck to both teams! 🙌');
  const tags = ['#Cricket', '#CricketLegend'];
  if (match.tournamentName)     tags.push(`#${match.tournamentName.replace(/\s+/g, '')}`);
  if (match.homeTeamName)       tags.push(`#${match.homeTeamName.replace(/\s+/g, '')}`);
  if (match.oppositionTeamName) tags.push(`#${match.oppositionTeamName.replace(/\s+/g, '')}`);
  paras.push(tags.join(' '));
  return paras.join('\n\n');
}

// ── Dialog component ──────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  match: Match;
  sides: MatchSide[];
  players: Player[];
  onPrint?: (scope: 'both' | 'home' | 'away') => void;
}

const TeamsheetTemplatesDialog: React.FC<Props> = ({ open, onClose, match, sides, players, onPrint }) => {
  const [templateType,  setTemplateType]  = useState<'whatsapp' | 'facebook'>('whatsapp');
  const [templateScope, setTemplateScope] = useState<'both' | 'home' | 'away'>('both');
  const [templateText,  setTemplateText]  = useState('');
  const [copied, setCopied] = useState(false);

  const homeSide      = sides.find(s => s.teamId === match.homeTeamId);
  const awaySide      = sides.find(s => s.teamId === match.oppositionTeamId);
  const homeSideAnnounced = homeSide?.teamAnnounced ?? false;
  const awaySideAnnounced = awaySide?.teamAnnounced ?? false;

  const generate = (type: typeof templateType, scope: typeof templateScope) =>
    type === 'whatsapp'
      ? buildWhatsAppText(match, scope, sides, players)
      : buildFacebookText(match, scope, sides, players);

  const handleOpen = () => setTemplateText(generate(templateType, templateScope));

  React.useEffect(() => { if (open) handleOpen(); }, [open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(templateText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      onClose();
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Share / Templates</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

        {/* Template type */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Template</Typography>
          <ToggleButtonGroup exclusive size="small" value={templateType}
            onChange={(_, v) => { if (!v) return; setTemplateType(v); setTemplateText(generate(v, templateScope)); }}
          >
            <ToggleButton value="whatsapp">
              <WhatsApp sx={{ fontSize: 16, mr: 0.5, color: '#25D366' }} />WhatsApp
            </ToggleButton>
            <ToggleButton value="facebook">
              <Facebook sx={{ fontSize: 16, mr: 0.5, color: '#1877F2' }} />Facebook
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Team scope */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Teams</Typography>
          <ToggleButtonGroup exclusive size="small" value={templateScope}
            onChange={(_, v) => { if (!v) return; setTemplateScope(v); setTemplateText(generate(templateType, v)); }}
          >
            <ToggleButton value="both">Both Teams</ToggleButton>
            <ToggleButton value="home" disabled={!homeSideAnnounced}>{match.homeTeamName}</ToggleButton>
            <ToggleButton value="away" disabled={!awaySideAnnounced}>{match.oppositionTeamName}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Editable text */}
        <TextField
          multiline fullWidth minRows={12}
          value={templateText}
          onChange={e => setTemplateText(e.target.value)}
          variant="outlined"
          inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
        />

        {/* Print row */}
        {onPrint && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Print fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">Print:</Typography>
            <Button size="small" variant="outlined" startIcon={<Print />}
              onClick={() => { onPrint(templateScope); onClose(); }}
            >
              Print {templateScope === 'both' ? 'Both Teams' : templateScope === 'home' ? match.homeTeamName : match.oppositionTeamName}
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button startIcon={<Refresh />} size="small" onClick={() => setTemplateText(generate(templateType, templateScope))}>
          Regenerate
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          color={copied ? 'success' : 'primary'}
          startIcon={<ContentCopy />}
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TeamsheetTemplatesDialog;
