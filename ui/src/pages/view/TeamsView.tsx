import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Avatar, Divider, Grid, TextField, MenuItem,
  Accordion, AccordionSummary, AccordionDetails, Tooltip, IconButton,
  Menu, Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar,
} from '@mui/material';
import {
  ExpandMore, SportsCricket, Person, Phone, Shield, Print,
  MoreVert, WhatsApp, Facebook, ContentCopy,
} from '@mui/icons-material';
import { teamApi } from '../../api/teamApi';
import { playerApi } from '../../api/playerApi';
import { playerDescription, isBatterOnly } from '../../utils/playerDescription';
import { printSquad } from '../../utils/printSquad';
import { Team, Player } from '../../types';

// ── Role icons ─────────────────────────────────────────────────────────────

const BAT_POSITIONS = ['OPENER', 'TOP_ORDER', 'MIDDLE_ORDER'];

function RoleIcons({ p }: { p: Player }) {
  const showBat = BAT_POSITIONS.includes(p.battingPosition ?? '');
  const isBowler = p.bowlingType && p.bowlingType !== 'NONE' && !p.partTimeBowler;

  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, ml: 0.5 }}>
      {p.wicketKeeper && (
        <Tooltip title="Wicket Keeper">
          <Typography component="span" sx={{ fontSize: '0.8rem', lineHeight: 1 }}>🧤</Typography>
        </Tooltip>
      )}
      {showBat && (
        <Tooltip title="Batsman">
          <SportsCricket sx={{ fontSize: 13, color: 'text.secondary' }} />
        </Tooltip>
      )}
      {isBowler && (
        <Tooltip title="Bowler">
          <Box component="span" sx={{
            display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
            bgcolor: '#c0392b', border: '1px solid #922b21',
          }} />
        </Tooltip>
      )}
    </Box>
  );
}

// ── Player card ─────────────────────────────────────────────────────────────

function PlayerCard({ p }: { p: Player }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
      <Avatar
        src={p.profilePictureUrl}
        sx={{ width: 44, height: 44, flexShrink: 0 }}
      >
        {p.name.charAt(0)}
      </Avatar>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" fontWeight="medium">
            {p.surname}, {p.name}
            {p.shirtNumber != null && (
              <Typography component="span" variant="caption" color="text.secondary"> #{p.shirtNumber}</Typography>
            )}
          </Typography>
          <RoleIcons p={p} />
        </Box>
        {playerDescription(p) && (
          <Typography variant="caption" color="text.secondary">
            {playerDescription(p)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ── Management info ──────────────────────────────────────────────────────────

function ManagementRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
      {icon}
      <Typography variant="caption" color="text.secondary">{label}:</Typography>
      <Typography variant="caption">{value}</Typography>
    </Box>
  );
}

// ── Squad text builders ──────────────────────────────────────────────────────

function buildSquadWhatsAppText(team: Team, squad: Player[]): string {
  const lines: string[] = [];
  lines.push(`🏏 *${team.teamName} — Squad*`);
  const meta = [
    team.associatedClubName && `Club: ${team.associatedClubName}`,
    team.captainName        && `⭐ Captain: ${team.captainName}`,
    team.coach              && `Coach: ${team.coach}`,
    team.manager            && `Manager: ${team.manager}`,
  ].filter(Boolean);
  if (meta.length) lines.push(meta.join('  |  '));
  lines.push('');
  squad.forEach((p, i) => {
    const role = p.wicketKeeper ? '🧤' : isBatterOnly(p) ? '🏏' : '🔴';
    lines.push(`${role} ${i + 1}. ${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`);
  });
  lines.push('');
  lines.push('🏏 = Bat only  |  🔴 = Bowler  |  🧤 = Wicket Keeper');
  return lines.join('\n');
}

function buildSquadFacebookText(team: Team, squad: Player[]): string {
  const paras: string[] = [];
  paras.push(`🏏 ${team.teamName} — Current Squad`);
  const meta = [
    team.associatedClubName && `Club: ${team.associatedClubName}`,
    team.captainName        && `Captain: ${team.captainName}`,
    team.coach              && `Coach: ${team.coach}`,
    team.manager            && `Manager: ${team.manager}`,
    team.homeFieldName      && `Home Ground: ${team.homeFieldName}`,
  ].filter(Boolean);
  if (meta.length) paras.push(meta.join('\n'));
  const playerLines = squad.map(p => {
    const desc = playerDescription(p);
    return `• ${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}${desc ? ` — ${desc}` : ''}`;
  });
  paras.push(`Here's our squad (${squad.length} players):\n${playerLines.join('\n')}`);
  paras.push('We look forward to seeing you all on the field! 🙌');
  const tags = ['#Cricket', '#CricketLegend'];
  if (team.teamName)           tags.push(`#${team.teamName.replace(/\s+/g, '')}`);
  if (team.associatedClubName) tags.push(`#${team.associatedClubName.replace(/\s+/g, '')}`);
  paras.push(tags.join(' '));
  return paras.join('\n\n');
}

// ── Squad share menu per team ────────────────────────────────────────────────

function SquadShareMenu({
  team, squad,
  onText,
}: {
  team: Team;
  squad: Player[] | undefined;
  onText: (text: string) => void;
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const requireSquad = (fn: () => void) => {
    if (!squad) { alert('Squad not loaded yet — please expand the team first.'); return; }
    fn();
  };

  const sortedByName = (s: Player[]) => [...s].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <Tooltip title="Share / Print">
        <IconButton size="small" onClick={e => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
          <MoreVert fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={e => e.stopPropagation()}
      >
        <MenuItem onClick={() => {
          requireSquad(() => { onText(buildSquadWhatsAppText(team, sortedByName(squad!))); });
          setAnchor(null);
        }}>
          <WhatsApp sx={{ mr: 1, fontSize: 18, color: '#25D366' }} /> Copy for WhatsApp
        </MenuItem>
        <MenuItem onClick={() => {
          requireSquad(() => { onText(buildSquadFacebookText(team, sortedByName(squad!))); });
          setAnchor(null);
        }}>
          <Facebook sx={{ mr: 1, fontSize: 18, color: '#1877F2' }} /> Copy for Facebook
        </MenuItem>
        <MenuItem onClick={() => {
          requireSquad(() => { printSquad(team, sortedByName(squad!)); });
          setAnchor(null);
        }}>
          <Print sx={{ mr: 1, fontSize: 18 }} /> Print / Export PDF
        </MenuItem>
      </Menu>
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export const TeamsView: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [squads, setSquads] = useState<Record<number, Player[]>>({});

  // Share dialog
  const [shareText, setShareText] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    playerApi.findMyTeams().then(setTeams);
  }, []);

  const handleExpand = async (teamId: number) => {
    if (squads[teamId]) return;
    const players = await teamApi.getSquad(teamId);
    setSquads(prev => ({ ...prev, [teamId]: players }));
  };

  const openShareDialog = (text: string) => {
    setShareText(text);
    setShareOpen(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setShareOpen(false);
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h5">My Teams</Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {teams.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            You are not in any team squad yet.
          </Typography>
        )}
        {teams.map(team => {
          const squad = squads[team.teamId!] ?? [];
          // Display: sort by surname; share/print: sort by first name (handled in SquadShareMenu)
          const sortedBySurname = [...squad].sort((a, b) => a.surname.localeCompare(b.surname));

          return (
            <Accordion
              key={team.teamId}
              onChange={(_, expanded) => { if (expanded) handleExpand(team.teamId!); }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Avatar src={team.logoUrl} variant="rounded" sx={{ width: 48, height: 48 }}>
                    {team.teamName.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight="bold">
                      {team.teamName}{team.abbreviation && ` (${team.abbreviation})`}
                    </Typography>
                  </Box>
                  <SquadShareMenu
                    team={team}
                    squad={squads[team.teamId!]}
                    onText={openShareDialog}
                  />
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ pt: 0 }}>
                {/* Management info */}
                <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Management
                  </Typography>
                  <Box sx={{ mt: 0.75 }}>
                    <ManagementRow icon={<Person sx={{ fontSize: 14, color: 'text.secondary' }} />} label="Captain" value={team.captainName} />
                    <ManagementRow icon={<Person sx={{ fontSize: 14, color: 'text.secondary' }} />} label="Manager" value={team.manager} />
                    <ManagementRow icon={<Person sx={{ fontSize: 14, color: 'text.secondary' }} />} label="Administrator" value={team.administrator} />
                    <ManagementRow icon={<Phone sx={{ fontSize: 14, color: 'text.secondary' }} />} label="Contact" value={team.contactNumber} />
                    <ManagementRow icon={<Shield sx={{ fontSize: 14, color: 'text.secondary' }} />} label="Club" value={team.associatedClubName} />
                  </Box>
                </Paper>

                {/* Squad */}
                <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Squad — {squad.length} player{squad.length !== 1 ? 's' : ''}
                </Typography>
                <Divider sx={{ my: 1 }} />
                {sortedBySurname.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No players in squad.
                  </Typography>
                ) : (
                  <Grid container spacing={0}>
                    {sortedBySurname.map((p, idx) => (
                      <React.Fragment key={p.playerId}>
                        <Grid item xs={12} sm={6}>
                          <PlayerCard p={p} />
                        </Grid>
                        {idx < sortedBySurname.length - 1 && idx % 2 === 1 && (
                          <Grid item xs={12}><Divider /></Grid>
                        )}
                      </React.Fragment>
                    ))}
                  </Grid>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {/* Share dialog */}
      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share Squad</DialogTitle>
        <DialogContent>
          <TextField
            multiline fullWidth minRows={14}
            value={shareText}
            onChange={e => setShareText(e.target.value)}
            variant="outlined"
            sx={{ mt: 1 }}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareOpen(false)}>Close</Button>
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
    </Box>
  );
};
