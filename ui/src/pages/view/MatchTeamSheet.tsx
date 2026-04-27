import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Chip, Divider, Button, ToggleButton, ToggleButtonGroup,
  Table, TableHead, TableRow, TableCell, TableBody, Tooltip,
} from '@mui/material';
import {
  Print, ArrowBack, Star, SportsCricket, ScoreboardOutlined, Share, YouTube,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { teamApi } from '../../api/teamApi';
import { Match, MatchSide, Player, Team } from '../../types';
import { printTeamSheet } from '../../utils/printTeamSheet';
import TeamsheetTemplatesDialog from '../../components/match/TeamsheetTemplatesDialog';

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
  const [templatesOpen, setTemplatesOpen] = useState(false);

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

  const handlePrint = (scope: 'both' | 'home' | 'away') => {
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
              onClick={() => setTemplatesOpen(true)}
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
        {match.youtubeUrl && (
          <Button
            variant="outlined"
            startIcon={<YouTube />}
            href={match.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            component="a"
            sx={{ color: '#FF0000', borderColor: '#FF0000', '&:hover': { borderColor: '#CC0000', bgcolor: 'rgba(255,0,0,0.04)' } }}
          >
            Watch Live
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

      <TeamsheetTemplatesDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        match={match}
        sides={sides}
        players={players}
        onPrint={handlePrint}
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
