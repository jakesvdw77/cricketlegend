import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Chip, Divider, Button, ToggleButton, ToggleButtonGroup,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress,
} from '@mui/material';
import {
  ArrowBack, Star, SportsCricket,
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { teamApi } from '../../api/teamApi';
import { Match, MatchSide, Player, Team } from '../../types';
import { printTeamSheet } from '../../utils/printTeamSheet';
import TeamsheetTemplatesDialog from '../../components/match/TeamsheetTemplatesDialog';
import { PlayerRoleIcons } from '../../components/player/PlayerRoleIcons';

// ──────────────────────────────────────────────────────────────────────────

export const MatchTeamSheet: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo: string | undefined = (location.state as any)?.returnTo;
  const id = Number(matchId);

  const [match, setMatch] = useState<Match | null>(null);
  const [sides, setSides] = useState<MatchSide[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [homeTeamData, setHomeTeamData] = useState<Team | null>(null);
  const [awayTeamData, setAwayTeamData] = useState<Team | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
    }).finally(() => setLoading(false));
  }, [id]);

  const getXi = (side: MatchSide): Player[] =>
    (side.playingXi ?? [])
      .map(pid => players.find(p => p.playerId === pid))
      .filter(Boolean) as Player[];

  const getCaptain = (side: MatchSide | undefined): Player | undefined =>
    side?.captainPlayerId ? players.find(p => p.playerId === side.captainPlayerId) : undefined;

  const get12th = (side: MatchSide): Player | undefined =>
    side.twelfthManPlayerId ? players.find(p => p.playerId === side.twelfthManPlayerId) : undefined;

  if (loading || !match || selectedTeamId === null) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <CircularProgress />
    </Box>
  );

  const teamIds = [match.homeTeamId, match.oppositionTeamId].filter(Boolean) as number[];
  const side = sides.find(s => s.teamId === selectedTeamId);
  const xi = side ? getXi(side) : [];
  const captain = getCaptain(side);
  const twelfth = side ? get12th(side) : undefined;
  const teamName = selectedTeamId === match.homeTeamId ? match.homeTeamName : match.oppositionTeamName;

  const homeSide = sides.find(s => s.teamId === match.homeTeamId);
  const awaySide = sides.find(s => s.teamId === match.oppositionTeamId);
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
        <Button startIcon={<ArrowBack />} onClick={() => returnTo ? navigate(returnTo) : navigate(-1)}>Back</Button>
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

        <Paper variant="outlined" sx={{ p: 2 }}>
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
                  <SportsCricket sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">Batsman</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#c0392b', border: '1px solid #922b21' }} />
                  <Typography variant="caption" color="text.secondary">Bowler</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SportsCricket sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#c0392b', border: '1px solid #922b21' }} />
                  <Typography variant="caption" color="text.secondary">All-Rounder</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '1rem' }}>🧤</Typography>
                  <Typography variant="caption" color="text.secondary">Wicket Keeper</Typography>
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
                    return (
                      <TableRow key={p.playerId}>
                        <TableCell>{idx + 1}</TableCell>
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
                          <PlayerRoleIcons player={p} side={side} isWK={isWK} />
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
