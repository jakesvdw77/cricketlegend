import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Chip, Divider, Button, ToggleButton, ToggleButtonGroup,
  Table, TableHead, TableRow, TableCell, TableBody, Tooltip, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import {
  Print, ArrowBack, Star, SportsCricket, WhatsApp, ContentCopy,
  ScoreboardOutlined, Share, Facebook, Refresh,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { teamApi } from '../../api/teamApi';
import { Match, MatchSide, Player, Team } from '../../types';
import { printTeamSheet } from '../../utils/printTeamSheet';

// ── Role icon helpers (UI) ─────────────────────────────────────────────────

const WKGloves: React.FC = () => (
  <Tooltip title="Wicket Keeper">
    <Typography component="span" sx={{ fontSize: '1rem', lineHeight: 1, cursor: 'default' }}>🧤</Typography>
  </Tooltip>
);

const BallIcon: React.FC = () => (
  <Tooltip title="Bowler">
    <Box component="span" sx={{
      display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
      bgcolor: '#c0392b', border: '1px solid #922b21', verticalAlign: 'middle', mx: 0.3,
    }} />
  </Tooltip>
);

const BatIcon: React.FC = () => (
  <Tooltip title="Batsman">
    <SportsCricket sx={{ fontSize: 16, color: 'text.secondary', verticalAlign: 'middle', mx: 0.3 }} />
  </Tooltip>
);

function getRoleIcons(player: Player, battingPosition: number, isWK: boolean): React.ReactNode[] {
  const icons: React.ReactNode[] = [];
  const isBowler = player.bowlingType && player.bowlingType !== 'NONE' && !player.partTimeBowler;
  const showBat = player.battingPosition !== 'LOWER_ORDER' || battingPosition <= 7;
  if (isWK) {
    if (showBat) icons.push(<BatIcon key="bat" />);
    icons.push(<WKGloves key="wk" />);
  } else if (isBowler) {
    if (showBat) icons.push(<BatIcon key="bat" />);
    icons.push(<BallIcon key="ball" />);
  } else {
    if (showBat) icons.push(<BatIcon key="bat" />);
  }
  return icons;
}

// ── Text builders ──────────────────────────────────────────────────────────

function getRoleText(player: Player, battingPosition: number, isWK: boolean): string {
  const isBowler = player.bowlingType && player.bowlingType !== 'NONE' && !player.partTimeBowler;
  const showBat = player.battingPosition !== 'LOWER_ORDER' || battingPosition <= 7;
  if (isWK)     return showBat ? '🏏🧤' : '🧤';
  if (isBowler) return showBat ? '🏏🔴' : '🔴';
  return showBat ? '🏏' : '';
}

function buildTeamWhatsAppLines(
  _match: Match,
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
    const pos = idx + 1;
    const isWK = p.playerId === wicketKeeperPlayerId;
    const isCaptain = p.playerId === captain?.playerId;
    const role = getRoleText(p, pos, isWK);
    lines.push(`${role} ${pos}. ${p.name} ${p.surname}${isCaptain ? ' *(C)*' : ''}`);
  });
  if (twelfth) {
    lines.push('');
    lines.push(`_12th Man: ${twelfth.name} ${twelfth.surname}_`);
  }
  return lines;
}

function buildWhatsAppText(
  match: Match,
  scope: 'both' | 'home' | 'away',
  sides: MatchSide[],
  players: Player[],
): string {
  const lines: string[] = [];

  lines.push(`🏏 *${match.homeTeamName} vs ${match.oppositionTeamName}*`);
  if (match.tournamentName) lines.push(`🏆 ${match.tournamentName}`);
  const details = [
    match.matchDate          ? `📅 ${match.matchDate}`           : '',
    match.arrivalTime        ? `🚗 Arrive: ${match.arrivalTime}` : '',
    match.tossTime           ? `🕐 Toss: ${match.tossTime}`      : '',
    match.scheduledStartTime ? `⏰ ${match.scheduledStartTime}`   : '',
    match.fieldName          ? `📍 ${match.fieldName}`           : '',
    match.umpire             ? `Umpire: ${match.umpire}`         : '',
  ].filter(Boolean).join('  |  ');
  if (details) lines.push(details);

  const getXi  = (side: MatchSide) => (side.playingXi ?? []).map(pid => players.find(p => p.playerId === pid)).filter(Boolean) as Player[];
  const getCap  = (side: MatchSide) => side.captainPlayerId ? players.find(p => p.playerId === side.captainPlayerId) : undefined;
  const get12th = (side: MatchSide) => side.twelfthManPlayerId ? players.find(p => p.playerId === side.twelfthManPlayerId) : undefined;

  const teamsToShow: Array<{ teamId: number; teamName: string }> = [];
  if (scope === 'both' || scope === 'home') teamsToShow.push({ teamId: match.homeTeamId!, teamName: match.homeTeamName! });
  if (scope === 'both' || scope === 'away') teamsToShow.push({ teamId: match.oppositionTeamId!, teamName: match.oppositionTeamName! });

  for (const team of teamsToShow) {
    const side = sides.find(s => s.teamId === team.teamId);
    if (!side) continue;
    lines.push('');
    lines.push(...buildTeamWhatsAppLines(match, team.teamName, getXi(side), getCap(side), get12th(side), side.wicketKeeperPlayerId));
  }

  lines.push('');
  lines.push('🏏 = Bat  |  🔴 = Bowl  |  🧤 = WK');

  if (match.fieldGoogleMapsUrl) {
    lines.push('');
    lines.push(`📍 ${match.fieldGoogleMapsUrl}`);
  }

  return lines.join('\n');
}

function buildFacebookText(
  match: Match,
  scope: 'both' | 'home' | 'away',
  sides: MatchSide[],
  players: Player[],
): string {
  const paras: string[] = [];

  paras.push(`🏏 Playing XI Announcement\n${match.homeTeamName} vs ${match.oppositionTeamName}`);

  const meta = [
    match.matchDate      && `📅 ${match.matchDate}`,
    match.tournamentName && `🏆 ${match.tournamentName}`,
    match.fieldName      && `📍 ${match.fieldName}`,
  ].filter(Boolean).join('  |  ');
  if (meta) paras.push(meta);

  const getXi   = (side: MatchSide) => (side.playingXi ?? []).map(pid => players.find(p => p.playerId === pid)).filter(Boolean) as Player[];
  const getCap  = (side: MatchSide) => side.captainPlayerId ? players.find(p => p.playerId === side.captainPlayerId) : undefined;
  const get12th = (side: MatchSide) => side.twelfthManPlayerId ? players.find(p => p.playerId === side.twelfthManPlayerId) : undefined;

  const teamsToShow: Array<{ teamId: number; teamName: string }> = [];
  if (scope === 'both' || scope === 'home') teamsToShow.push({ teamId: match.homeTeamId!, teamName: match.homeTeamName! });
  if (scope === 'both' || scope === 'away') teamsToShow.push({ teamId: match.oppositionTeamId!, teamName: match.oppositionTeamName! });

  for (const team of teamsToShow) {
    const side = sides.find(s => s.teamId === team.teamId);
    if (!side) continue;
    const xi      = getXi(side);
    const captain = getCap(side);
    const twelfth = get12th(side);

    const playerLines = xi.map((p, idx) => {
      const isWK = p.playerId === side.wicketKeeperPlayerId;
      const role = getRoleText(p, idx + 1, isWK);
      return `${role} ${p.name} ${p.surname}${p.playerId === captain?.playerId ? ' (C)' : ''}`;
    });

    let teamPara = `*${team.teamName}* take the field with:\n${playerLines.join('\n')}`;
    if (twelfth) teamPara += `\n12th Man: ${twelfth.name} ${twelfth.surname}`;
    paras.push(teamPara);
  }

  paras.push('Good luck to both teams! 🙌');

  const tags = ['#Cricket', '#CricketLegend'];
  if (match.tournamentName)     tags.push(`#${match.tournamentName.replace(/\s+/g, '')}`);
  if (match.homeTeamName)       tags.push(`#${match.homeTeamName.replace(/\s+/g, '')}`);
  if (match.oppositionTeamName) tags.push(`#${match.oppositionTeamName.replace(/\s+/g, '')}`);
  paras.push(tags.join(' '));

  return paras.join('\n\n');
}

// ──────────────────────────────────────────────────────────────────────────

export const MatchTeamSheet: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const id = Number(matchId);

  const [match, setMatch] = useState<Match | null>(null);
  const [sides, setSides] = useState<MatchSide[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [homeTeamData, setHomeTeamData] = useState<Team | null>(null);
  const [awayTeamData, setAwayTeamData] = useState<Team | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Template dialog state
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateType, setTemplateType] = useState<'whatsapp' | 'facebook'>('whatsapp');
  const [templateScope, setTemplateScope] = useState<'both' | 'home' | 'away'>('both');
  const [templateText, setTemplateText] = useState('');

  useEffect(() => {
    Promise.all([
      matchApi.findById(id),
      matchApi.getTeamSheet(id),
      playerApi.findAll(),
    ]).then(([m, s, p]) => {
      setMatch(m);
      setSides(s);
      setPlayers(p);
      if (m.homeTeamId) {
        setSelectedTeamId(m.homeTeamId);
        teamApi.findById(m.homeTeamId).then(setHomeTeamData).catch(() => {});
      }
      if (m.oppositionTeamId) {
        teamApi.findById(m.oppositionTeamId).then(setAwayTeamData).catch(() => {});
      }
    });
  }, [id]);

  const getXi = (side: MatchSide): Player[] =>
    (side.playingXi ?? [])
      .map(pid => players.find(p => p.playerId === pid))
      .filter(Boolean) as Player[];

  const getCaptain = (side: MatchSide | undefined): Player | undefined =>
    side?.captainPlayerId ? players.find(p => p.playerId === side.captainPlayerId) : undefined;

  const get12th = (side: MatchSide): Player | undefined =>
    side.twelfthManPlayerId ? players.find(p => p.playerId === side.twelfthManPlayerId) : undefined;

  if (!match || selectedTeamId === null) return null;

  const teamIds = [match.homeTeamId, match.oppositionTeamId].filter(Boolean) as number[];
  const side = sides.find(s => s.teamId === selectedTeamId);
  const xi = side ? getXi(side) : [];
  const captain = getCaptain(side);
  const twelfth = side ? get12th(side) : undefined;
  const teamName = selectedTeamId === match.homeTeamId ? match.homeTeamName : match.oppositionTeamName;

  const homeSide = sides.find(s => s.teamId === match.homeTeamId);
  const awaySide = sides.find(s => s.teamId === match.oppositionTeamId);
  const homeSideAnnounced  = homeSide?.teamAnnounced ?? false;
  const awaySideAnnounced  = awaySide?.teamAnnounced ?? false;
  const eitherAnnounced    = homeSideAnnounced || awaySideAnnounced;

  const generateTemplateText = (type: typeof templateType, scope: typeof templateScope) => {
    if (!match) return '';
    return type === 'whatsapp'
      ? buildWhatsAppText(match, scope, sides, players)
      : buildFacebookText(match, scope, sides, players);
  };

  const handleOpenTemplates = () => {
    setTemplateText(generateTemplateText(templateType, templateScope));
    setTemplatesOpen(true);
  };

  const handleRegenerateTemplate = () => {
    setTemplateText(generateTemplateText(templateType, templateScope));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(templateText).then(() => {
      setCopied(true);
      setTemplatesOpen(false);
    });
  };

  const handlePrint = (scope: typeof templateScope) => {
    if (scope === 'both') {
      if (homeSide) {
        const homeXi  = getXi(homeSide);
        const homeCap = getCaptain(homeSide);
        const home12  = get12th(homeSide);
        printTeamSheet(match!, homeSide, homeXi, homeCap, home12, match!.homeTeamName!, homeTeamData?.sponsors);
      }
      if (awaySide) {
        const awayXi  = getXi(awaySide);
        const awayCap = getCaptain(awaySide);
        const away12  = get12th(awaySide);
        setTimeout(() => printTeamSheet(match!, awaySide!, awayXi, awayCap, away12, match!.oppositionTeamName!, awayTeamData?.sponsors), 600);
      }
    } else {
      const teamSponsors = selectedTeamId === match!.homeTeamId ? homeTeamData?.sponsors : awayTeamData?.sponsors;
      printTeamSheet(match!, side!, xi, captain, twelfth, teamName!, teamSponsors);
    }
  };

  return (
    <Box>
      {/* Toolbar — hidden on print */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap', '@media print': { display: 'none' } }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>Back</Button>
        <ToggleButtonGroup
          exclusive
          value={selectedTeamId}
          onChange={(_, val) => { if (val !== null) setSelectedTeamId(val); }}
          size="small"
        >
          {teamIds.map(tid => (
            <ToggleButton key={tid} value={tid}>
              {tid === match.homeTeamId ? match.homeTeamName : match.oppositionTeamName}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={!eitherAnnounced ? 'No team has been announced yet' : ''}>
          <span>
            <Button
              variant="outlined"
              onClick={handleOpenTemplates}
              disabled={!eitherAnnounced}
              startIcon={<Share sx={{ fontSize: 18 }} />}
            >
              Share / Templates
            </Button>
          </span>
        </Tooltip>
        {match.scoringUrl && (
          <Button
            variant="outlined"
            startIcon={<ScoreboardOutlined />}
            href={match.scoringUrl}
            target="_blank"
            rel="noopener noreferrer"
            component="a"
          >
            Live Scoring
          </Button>
        )}
        <Tooltip title={!side?.teamAnnounced ? 'Team has not been announced yet' : ''}>
          <span>
            <Button variant="contained" startIcon={<Print />} disabled={!side?.teamAnnounced} onClick={() => {
              const teamSponsors = selectedTeamId === match!.homeTeamId ? homeTeamData?.sponsors : awayTeamData?.sponsors;
              printTeamSheet(match!, side!, xi, captain, twelfth, teamName!, teamSponsors);
            }}>
              Print {teamName}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Printable content */}
      <Box id="print-area">
        <Paper variant="outlined" sx={{ p: 2, mb: 3, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight="bold">
            {match.homeTeamName} vs {match.oppositionTeamName}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
            {match.tournamentName}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2">📅 {match.matchDate}</Typography>
            {match.arrivalTime && <Typography variant="body2">🚗 Arrive: {match.arrivalTime}</Typography>}
            {match.tossTime && <Typography variant="body2">🕐 Toss: {match.tossTime}</Typography>}
            {match.scheduledStartTime && <Typography variant="body2">⏰ {match.scheduledStartTime}</Typography>}
            {match.fieldName && <Typography variant="body2">📍 {match.fieldName}</Typography>}
            {match.umpire && <Typography variant="body2">Umpire: {match.umpire}</Typography>}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" fontWeight="bold">{teamName}</Typography>
            <Chip label={`${xi.length}/11`} size="small" color={xi.length === 11 ? 'success' : 'warning'} />
          </Box>

          {captain && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <Star fontSize="small" sx={{ color: 'warning.main' }} />
              <Typography variant="body2" color="text.secondary">
                Captain: <strong>{captain.name} {captain.surname}</strong>
              </Typography>
            </Box>
          )}

          {xi.length > 0 && !side?.teamAnnounced ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              Team not announced yet.
            </Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap', '@media print': { display: 'none' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '1rem' }}>🧤</Typography>
                  <Typography variant="caption" color="text.secondary">Wicket Keeper</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#c0392b', border: '1px solid #922b21' }} />
                  <Typography variant="caption" color="text.secondary">Bowler</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SportsCricket sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">Batsman</Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 1 }} />

              <Table size="small">
                <TableHead>
                  <TableRow>
                    {(['#', 'Player', 'Shirt', 'Role'] as const).map((label, i) => (
                      <TableCell
                        key={label}
                        width={i === 0 ? 32 : i >= 2 ? 80 : undefined}
                        style={{
                          backgroundColor: '#1a237e',
                          color: '#ffffff',
                          fontWeight: 'bold',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        } as React.CSSProperties}
                      >
                        {label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {xi.map((p, idx) => {
                    const isCaptain = p.playerId === captain?.playerId;
                    const isWK = p.playerId === side?.wicketKeeperPlayerId;
                    const battingPosition = idx + 1;
                    const roleIcons = getRoleIcons(p, battingPosition, isWK);
                    return (
                      <TableRow key={p.playerId}>
                        <TableCell>{battingPosition}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {p.name} {p.surname}
                            {isCaptain && (
                              <Typography component="span" variant="caption" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                                (C)
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{p.shirtNumber ?? '—'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>{roleIcons}</Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {twelfth && (
                <Box sx={{ mt: 1 }}>
                  <Divider sx={{ mb: 0.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    12th Man: <strong>{twelfth.name} {twelfth.surname}</strong>
                    {twelfth.shirtNumber ? ` (#${twelfth.shirtNumber})` : ''}
                  </Typography>
                </Box>
              )}

              {xi.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Team sheet not yet submitted.
                </Typography>
              )}
            </>
          )}

          {xi.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              Team sheet not yet submitted.
            </Typography>
          )}
        </Paper>
      </Box>

      {/* ── Templates dialog ── */}
      <Dialog open={templatesOpen} onClose={() => setTemplatesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Share / Templates</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

          {/* Template type */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Template
            </Typography>
            <ToggleButtonGroup
              exclusive size="small"
              value={templateType}
              onChange={(_, v) => {
                if (!v) return;
                setTemplateType(v);
                setTemplateText(generateTemplateText(v, templateScope));
              }}
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
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Teams
            </Typography>
            <ToggleButtonGroup
              exclusive size="small"
              value={templateScope}
              onChange={(_, v) => {
                if (!v) return;
                setTemplateScope(v);
                setTemplateText(generateTemplateText(templateType, v));
              }}
            >
              <ToggleButton value="both">Both Teams</ToggleButton>
              <ToggleButton value="home" disabled={!homeSideAnnounced}>
                {match.homeTeamName}
              </ToggleButton>
              <ToggleButton value="away" disabled={!awaySideAnnounced}>
                {match.oppositionTeamName}
              </ToggleButton>
            </ToggleButtonGroup>
            {templateScope !== 'both' && !side?.teamAnnounced && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                This team has not been announced yet.
              </Typography>
            )}
          </Box>

          {/* Text area */}
          <TextField
            multiline fullWidth minRows={12}
            value={templateText}
            onChange={e => setTemplateText(e.target.value)}
            variant="outlined"
            inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
          />

          {/* Print option */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Print fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">Print:</Typography>
            <Button size="small" variant="outlined" startIcon={<Print />}
              onClick={() => { handlePrint(templateScope); setTemplatesOpen(false); }}
            >
              Print {templateScope === 'both' ? 'Both Teams' : teamName}
            </Button>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button startIcon={<Refresh />} onClick={handleRegenerateTemplate} size="small">Regenerate</Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setTemplatesOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<ContentCopy />}
            onClick={handleCopy}
          >
            Copy to Clipboard
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={() => setCopied(false)}
        message="Copied! Paste into your message 💬"
      />

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </Box>
  );
};
