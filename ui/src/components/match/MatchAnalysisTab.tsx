import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress,
  Divider, Stack, Typography,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { MatchSide, Player } from '../../types';
import { XiAnalysisView } from './XiAnalysisView';
import { SquadAnalysisView } from '../team/SquadAnalysisView';

interface Props {
  matchId: number;
  teamId: number;
  teamName: string;
  matchTitle: string;
  oppositionTeamId?: number;
  oppositionTeamName?: string;
}

const PACE_TYPES = new Set(['VERY_FAST', 'FAST', 'FAST_MEDIUM', 'MEDIUM_FAST', 'MEDIUM', 'MEDIUM_SLOW']);
const SPIN_TYPES = new Set(['OFF_SPIN', 'LEG_SPIN', 'SLOW_LEFT_ARM_ORTHODOX', 'CHINAMAN']);

interface BalanceMetrics {
  paceCount: number;
  spinCount: number;
  partTimers: number;
  canBowlCount: number;
  leftHandBat: number;
  rightHandBat: number;
  leftArmBowl: number;
  rightArmBowl: number;
  wks: Player[];
  total: number;
  flags: { severity: 'warning' | 'info'; text: string }[];
}

function computeBalance(players: Player[]): BalanceMetrics {
  const canBowl     = players.filter(p => p.bowlingType && p.bowlingType !== 'NONE');
  const specialists = canBowl.filter(p => !p.partTimeBowler);
  const partTimers  = canBowl.filter(p => p.partTimeBowler);
  const paceCount   = specialists.filter(p => PACE_TYPES.has(p.bowlingType!)).length;
  const spinCount   = specialists.filter(p => SPIN_TYPES.has(p.bowlingType!)).length;
  const leftArmBowl = specialists.filter(p => p.bowlingArm === 'LEFT').length;
  const leftHandBat = players.filter(p => p.battingStance === 'LEFT_HANDED').length;
  const wks         = players.filter(p => p.wicketKeeper);

  const flags: { severity: 'warning' | 'info'; text: string }[] = [];
  if (canBowl.length < 5)   flags.push({ severity: 'warning', text: `Only ${canBowl.length} players can bowl — aim for at least 5.` });
  if (spinCount === 0)       flags.push({ severity: 'warning', text: 'No specialist spinner.' });
  if (paceCount === 0)       flags.push({ severity: 'warning', text: 'No specialist pace bowler.' });
  if (wks.length === 0)      flags.push({ severity: 'warning', text: 'No designated wicket-keeper.' });
  if (leftHandBat === 0)     flags.push({ severity: 'info',    text: 'No left-handed batter.' });
  if (leftArmBowl === 0 && specialists.length > 0)
                             flags.push({ severity: 'info',    text: 'No left-arm bowling option.' });

  return {
    paceCount, spinCount, partTimers: partTimers.length,
    canBowlCount: canBowl.length, leftHandBat,
    rightHandBat: players.length - leftHandBat,
    leftArmBowl, rightArmBowl: specialists.length - leftArmBowl,
    wks, total: players.length, flags,
  };
}

// ── Reusable balance dashboard ────────────────────────────────────────────────

const BalanceDashboard: React.FC<{ m: BalanceMetrics; showFlags?: boolean }> = ({ m, showFlags = true }) => {
  const rightHandBatPct = m.total > 0 ? Math.round((m.rightHandBat / m.total) * 100) : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>

        {/* Bowling attack */}
        <Card variant="outlined" sx={{ flex: '1 1 200px', minWidth: 180 }}>
          <CardContent sx={{ pb: '12px !important' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={1}>
              Bowling Attack
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
              {m.paceCount > 0 && <Chip label={`${m.paceCount} Pace`}          size="small" color="primary"   variant="outlined" />}
              {m.spinCount > 0 && <Chip label={`${m.spinCount} Spin`}          size="small" color="secondary" variant="outlined" />}
              {m.partTimers > 0 && <Chip label={`${m.partTimers} Part-time`}   size="small" variant="outlined" />}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {m.canBowlCount} of {m.total} can bowl
            </Typography>
          </CardContent>
        </Card>

        {/* Batting hand */}
        <Card variant="outlined" sx={{ flex: '1 1 180px', minWidth: 160 }}>
          <CardContent sx={{ pb: '12px !important' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={1}>
              Batting — Hand
            </Typography>
            <Stack direction="row" spacing={2} mb={1}>
              <Box>
                <Typography variant="h6" fontWeight="bold" lineHeight={1}>{m.rightHandBat}</Typography>
                <Typography variant="caption" color="text.secondary">Right</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="h6" fontWeight="bold" lineHeight={1}>{m.leftHandBat}</Typography>
                <Typography variant="caption" color="text.secondary">Left</Typography>
              </Box>
            </Stack>
            <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${rightHandBatPct}%`, bgcolor: 'primary.main', borderRadius: 3 }} />
            </Box>
          </CardContent>
        </Card>

        {/* Bowling arm */}
        <Card variant="outlined" sx={{ flex: '1 1 180px', minWidth: 160 }}>
          <CardContent sx={{ pb: '12px !important' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={1}>
              Bowling — Arm
            </Typography>
            <Stack direction="row" spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight="bold" lineHeight={1}>{m.rightArmBowl}</Typography>
                <Typography variant="caption" color="text.secondary">Right-arm</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="h6" fontWeight="bold" lineHeight={1}>{m.leftArmBowl}</Typography>
                <Typography variant="caption" color="text.secondary">Left-arm</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Wicket-keeper */}
        <Card
          variant="outlined"
          sx={{ flex: '1 1 160px', minWidth: 140, borderColor: m.wks.length ? 'success.main' : 'error.main' }}
        >
          <CardContent sx={{ pb: '12px !important' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={1}>
              Wicket-Keeper
            </Typography>
            {m.wks.length > 0 ? (
              <Stack spacing={0.5}>
                {m.wks.map(p => (
                  <Chip key={p.playerId} label={`${p.name} ${p.surname}`} size="small" color="success" variant="outlined" />
                ))}
              </Stack>
            ) : (
              <Chip label="None assigned" size="small" color="error" variant="outlined" />
            )}
          </CardContent>
        </Card>

      </Box>

      {showFlags && m.flags.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {m.flags.map((f, i) => (
            <Alert key={i} severity={f.severity} sx={{ py: 0.5 }}>{f.text}</Alert>
          ))}
        </Box>
      )}
    </Box>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const MatchAnalysisTab: React.FC<Props> = ({
  matchId, teamId, teamName, matchTitle, oppositionTeamId, oppositionTeamName,
}) => {
  const [loading, setLoading]           = useState(true);
  const [side, setSide]                 = useState<MatchSide | null>(null);
  const [xiPlayers, setXiPlayers]       = useState<Player[]>([]);
  const [oppSide, setOppSide]           = useState<MatchSide | null>(null);
  const [oppXiPlayers, setOppXiPlayers] = useState<Player[]>([]);
  const [hasOppSquad, setHasOppSquad]   = useState(false);

  useEffect(() => {
    const load = async () => {
      const [sides, ownSquad] = await Promise.all([
        matchApi.getTeamSheet(matchId),
        teamApi.getSquad(teamId),
      ]);

      // Own side
      const ownSide = sides.find(s => s.teamId === teamId) ?? null;
      setSide(ownSide);
      if (ownSide?.playingXi?.length) {
        const pm = new Map(ownSquad.map(p => [p.playerId!, p]));
        setXiPlayers(ownSide.playingXi.map(id => pm.get(id)).filter(Boolean) as Player[]);
      }

      // Opposition side
      if (oppositionTeamId) {
        const oSide = sides.find(s => s.teamId === oppositionTeamId) ?? null;
        setOppSide(oSide);

        // Try to load opposition squad (may fail if they're not in the system)
        try {
          const oppSquad = await teamApi.getSquad(oppositionTeamId);
          if (oppSquad.length > 0) {
            setHasOppSquad(true);
            if (oSide?.playingXi?.length) {
              const pm = new Map(oppSquad.map(p => [p.playerId!, p]));
              setOppXiPlayers(oSide.playingXi.map(id => pm.get(id)).filter(Boolean) as Player[]);
            }
          }
        } catch {
          // Opposition not managed in this system — no squad data available
        }
      }
    };

    load().catch(() => {}).finally(() => setLoading(false));
  }, [matchId, teamId, oppositionTeamId]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  const ownMetrics  = xiPlayers.length > 0 ? computeBalance(xiPlayers) : null;
  const oppMetrics  = oppXiPlayers.length > 0 ? computeBalance(oppXiPlayers) : null;

  const accordionSx = {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: '8px !important',
    '&:before': { display: 'none' },
    boxShadow: 'none',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* ── Team Balance ──────────────────────────────────────────────────── */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2" fontWeight="bold">{teamName} — Balance</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {!ownMetrics ? (
            <Alert severity="info">
              No XI selected yet — head to the Team Sheet tab to select your players, then come back here.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!side?.teamAnnounced && (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  XI selected but not yet announced — analysis is based on your current selection.
                </Alert>
              )}
              <BalanceDashboard m={ownMetrics} />
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* ── Own team AI Analysis ──────────────────────────────────────────── */}
      {ownMetrics && (
        <Accordion sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2" fontWeight="bold">{teamName} — AI Analysis</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <XiAnalysisView matchId={matchId} teamId={teamId} teamName={teamName} matchTitle={matchTitle} />
          </AccordionDetails>
        </Accordion>
      )}

      {/* ── Opposition ────────────────────────────────────────────────────── */}
      {oppositionTeamId && oppositionTeamName && (
        <Accordion sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2" fontWeight="bold">{oppositionTeamName} — Intelligence</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {oppMetrics ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Based on their selected XI{oppSide?.teamAnnounced ? ' (announced)' : ' (not yet announced)'}.
                </Typography>
                <BalanceDashboard m={oppMetrics} showFlags={false} />
              </Box>
            ) : hasOppSquad ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  No XI selected for the opposition — showing squad analysis instead.
                </Alert>
                <SquadAnalysisView teamId={oppositionTeamId} teamName={oppositionTeamName} />
              </Box>
            ) : (
              <Alert severity="info">
                {oppositionTeamName} is not managed in this system — no squad or XI data available.
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>
      )}

    </Box>
  );
};
