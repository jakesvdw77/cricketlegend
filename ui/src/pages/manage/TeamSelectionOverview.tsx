import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Alert, Card, CardActionArea, CardContent,
  Chip, Avatar, Divider, Tooltip, IconButton, Button, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import {
  Groups, Share, CompareArrows, ArrowBack,
  Campaign, CheckCircle, Edit, Remove, Person, Cancel, QueryStats,
} from '@mui/icons-material';

import { MatchSharePanel } from '../../components/match/MatchSharePanel';
import { PlayerEditForm } from '../../components/player/PlayerEditForm';
import { WeekendComparisonDialog } from './WeekendComparisonDialog';
import { TeamViewDialog } from './TeamViewDialog';
import { TeamStatsDialog } from './TeamStatsDialog';
import { GamePickerDialog } from './GamePickerDialog';
import { PlayerStatsDialog } from './PlayerStatsDialog';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { playerApi } from '../../api/playerApi';
import { clubApi } from '../../api/clubApi';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { Club, Match, MatchSide, Player } from '../../types';
import { PlayerRoleIcons } from '../../components/player/PlayerRoleIcons';

export interface XiEntry {
  match: Match;
  teamId: number;
  teamName: string;
  side: MatchSide | null;
  players: Player[];          // resolved, in playingXi order
  captainPlayerId?: number;
  wicketKeeperPlayerId?: number;
}

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const fmtDateShort = (d?: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
};

const fmtTime = (t?: string) => {
  if (!t) return null;
  const [h, m] = t.split(':');
  const d = new Date(); d.setHours(+h, +m);
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
};

const getMondayKey = (dateStr?: string): string => {
  if (!dateStr) return '9999-12-31';
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtWeekLabel = (mondayKey: string, todayKey: string): string => {
  const mon = new Date(mondayKey + 'T00:00:00');
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
  const range = `${fmt(mon)} – ${fmt(sun)}`;
  return mondayKey === todayKey ? `This Week  ·  ${range}` : range;
};

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

// ── Player badge: avatar + short name + role indicator ────────────────────────
const PlayerBadge: React.FC<{
  player: Player;
  side?: MatchSide | null;
  isCaptain: boolean;
  isWK: boolean;
  isTwelfth: boolean;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ player, side, isCaptain, isWK, isTwelfth, onClick }) => {
  const fullName = `${player.name} ${player.surname}`;
  const shortName = `${player.name} ${player.surname.charAt(0)}.`;

  return (
    <Tooltip title={`${fullName}${isCaptain ? ' (C)' : ''}${isWK ? ' (WK)' : ''}${isTwelfth ? ' — 12th Man' : ''}`}>
      <Box onClick={onClick} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 52, cursor: onClick ? 'pointer' : 'default' }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar
            src={player.profilePictureUrl ?? undefined}
            sx={{
              width: 40,
              height: 40,
              fontSize: 14,
              bgcolor: isTwelfth ? 'text.disabled' : 'primary.main',
              border: isTwelfth ? '2px dashed' : '2px solid',
              borderColor: isTwelfth ? 'divider' : 'primary.light',
              opacity: isTwelfth ? 0.6 : 1,
            }}
          >
            {player.name.charAt(0)}
          </Avatar>
          {(isCaptain || isWK) && (
            <Box
              sx={{
                position: 'absolute', bottom: -3, right: -3,
                bgcolor: isCaptain ? '#1565c0' : '#6a1b9a', color: '#fff',
                borderRadius: 1, px: 0.4, lineHeight: 1.4,
                fontSize: '0.55rem', fontWeight: 'bold',
              }}
            >
              {isCaptain ? 'C' : 'WK'}
            </Box>
          )}
        </Box>
        <Typography
          variant="caption"
          sx={{
            mt: 0.5, fontSize: '0.6rem', textAlign: 'center',
            lineHeight: 1.2, width: 52,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: isTwelfth ? 'text.disabled' : 'text.primary',
          }}
        >
          {shortName}
        </Typography>
        {!isTwelfth && (
          <PlayerRoleIcons player={player} side={side} isWK={isWK} size="small" />
        )}
      </Box>
    </Tooltip>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const TeamSelectionOverview: React.FC = () => {
  const location = useLocation();
  const { teamIds: managerTeamIds, restrictByTeam, homeClubId, loaded: teamsLoaded } = useManagerTeams();
  const [entries, setEntries]       = useState<XiEntry[]>([]);
  const [managedTeams, setManagedTeams] = useState<{ teamId: number; teamName: string }[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<number | ''>('');
  const [squadMap, setSquadMap]     = useState<Map<number, Player[]>>(new Map());
  const [clubs, setClubs]           = useState<Club[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [statsPlayer, setStatsPlayer]       = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading]   = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [shareEntry, setShareEntry] = useState<{ match: Match; teamId: number } | null>(null);
  const [statsEntry, setStatsEntry] = useState<{ match: Match; teamId: number; teamName: string } | null>(null);
  const [compareEntries, setCompareEntries] = useState<XiEntry[] | null>(null);
  const [pickerOpen, setPickerOpen]         = useState(false);
  const [viewEntry, setViewEntry]           = useState<XiEntry | null>(null);
  const [openInEditMode, setOpenInEditMode] = useState(false);
  const [activeTab, setActiveTab]           = useState<number>((location.state as any)?.returnToTab ?? 0);

  const openPlayerDialog = (e: React.MouseEvent, playerId: number) => {
    e.stopPropagation();
    setPlayerLoading(true);
    setSelectedPlayer(null);
    playerApi.findById(playerId)
      .then(setSelectedPlayer)
      .catch(() => {})
      .finally(() => setPlayerLoading(false));
  };

  const handleSave = async () => {
    if (!selectedPlayer?.playerId) return;
    setSaving(true);
    try {
      await playerApi.update(selectedPlayer.playerId, selectedPlayer);
      setSelectedPlayer(null);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!teamsLoaded) return;

    const load = async () => {
      const [allTeams, allMatches, allClubs] = await Promise.all([
        teamApi.findAll(),
        matchApi.findAll(),
        clubApi.findAll(),
      ]);
      setClubs(allClubs);

      let relevantTeamIds: Set<number>;
      if (restrictByTeam) {
        relevantTeamIds = managerTeamIds;
      } else if (homeClubId != null) {
        relevantTeamIds = new Set(
          allTeams.filter(t => t.teamId != null && t.associatedClubId === homeClubId).map(t => t.teamId!)
        );
      } else {
        relevantTeamIds = new Set(allTeams.map(t => t.teamId!).filter(Boolean));
      }

      const teamNameMap = new Map(allTeams.map(t => [t.teamId!, t.teamName]));

      const relevantTeamsList = allTeams
        .filter(t => t.teamId != null && relevantTeamIds.has(t.teamId!))
        .map(t => ({ teamId: t.teamId!, teamName: t.teamName }))
        .sort((a, b) => a.teamName.localeCompare(b.teamName));
      setManagedTeams(relevantTeamsList);
      if (relevantTeamsList.length === 1) setSelectedTeamFilter(relevantTeamsList[0].teamId);

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const upcoming = allMatches.filter(m =>
        !m.matchCompleted && !m.forfeited && !m.noResult && !m.matchDrawn &&
        (m.matchDate ?? '') >= todayStr &&
        (
          (m.homeTeamId != null && relevantTeamIds.has(m.homeTeamId)) ||
          (m.oppositionTeamId != null && relevantTeamIds.has(m.oppositionTeamId))
        )
      );

      const pairs: { match: Match; teamId: number; teamName: string }[] = [];
      for (const m of upcoming) {
        if (m.homeTeamId != null && relevantTeamIds.has(m.homeTeamId))
          pairs.push({ match: m, teamId: m.homeTeamId, teamName: m.homeTeamName ?? teamNameMap.get(m.homeTeamId) ?? '' });
        if (m.oppositionTeamId != null && relevantTeamIds.has(m.oppositionTeamId))
          pairs.push({ match: m, teamId: m.oppositionTeamId, teamName: m.oppositionTeamName ?? teamNameMap.get(m.oppositionTeamId) ?? '' });
      }

      pairs.sort((a, b) => {
        const ka = `${a.match.matchDate ?? '9999-12-31'}T${a.match.scheduledStartTime ?? '99:99:99'}`;
        const kb = `${b.match.matchDate ?? '9999-12-31'}T${b.match.scheduledStartTime ?? '99:99:99'}`;
        return ka.localeCompare(kb);
      });

      // Load squads and teamsheets in parallel
      const uniqueTeamIds = [...new Set(pairs.map(p => p.teamId))];
      const uniqueMatchIds = [...new Set(pairs.map(p => p.match.matchId!))];

      const [squadsResults, teamsheetsResults] = await Promise.all([
        Promise.allSettled(uniqueTeamIds.map(tid => teamApi.getSquad(tid))),
        Promise.allSettled(uniqueMatchIds.map(mid => matchApi.getTeamSheet(mid))),
      ]);

      // Build playerMap: playerId → Player, and squadMap: teamId → Player[]
      const playerMap = new Map<number, Player>();
      const squadMapData = new Map<number, Player[]>();
      squadsResults.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          squadMapData.set(uniqueTeamIds[i], r.value);
          for (const p of r.value) {
            if (p.playerId != null) playerMap.set(p.playerId, p);
          }
        }
      });
      setSquadMap(squadMapData);

      // Build teamsheetMap: matchId → MatchSide[]
      const teamsheetMap = new Map<number, MatchSide[]>();
      teamsheetsResults.forEach((r, i) => {
        if (r.status === 'fulfilled') teamsheetMap.set(uniqueMatchIds[i], r.value);
      });

      const result: XiEntry[] = pairs.map(p => {
        const sides = teamsheetMap.get(p.match.matchId!) ?? [];
        const side  = sides.find(s => s.teamId === p.teamId) ?? null;
        const xiIds = side?.playingXi ?? [];

        const players = xiIds
          .map(id => playerMap.get(id))
          .filter(Boolean) as Player[];

        return {
          match: p.match,
          teamId: p.teamId,
          teamName: p.teamName,
          side,
          players,
          captainPlayerId: side?.captainPlayerId,
          wicketKeeperPlayerId: side?.wicketKeeperPlayerId,
        };
      });

      setEntries(result);
    };

    load().catch(() => {}).finally(() => setLoading(false));
  }, [teamsLoaded, restrictByTeam, managerTeamIds, homeClubId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!teamsLoaded || loading)
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayMondayKey = getMondayKey(todayStr);

  const displayEntries = selectedTeamFilter
    ? entries.filter(e => e.teamId === selectedTeamFilter)
    : entries;

  const weekMap = new Map<string, XiEntry[]>();
  for (const e of displayEntries) {
    const key = getMondayKey(e.match.matchDate);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(e);
  }
  const weeks = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  // --- Per-player tab data ---
  const allPlayerMap = new Map<number, { name: string; surname: string }>();
  for (const entry of displayEntries) {
    for (const p of squadMap.get(entry.teamId) ?? []) {
      if (p.playerId != null && !allPlayerMap.has(p.playerId))
        allPlayerMap.set(p.playerId, { name: p.name, surname: p.surname });
    }
    for (const p of entry.players) {
      if (p.playerId != null && !allPlayerMap.has(p.playerId))
        allPlayerMap.set(p.playerId, { name: p.name, surname: p.surname });
    }
  }
  const sortedPlayers = [...allPlayerMap.entries()].sort(([, a], [, b]) =>
    `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`)
  );
  const selectionColumns = displayEntries.map(e => ({
    key: `${e.match.matchId}-${e.teamId}`,
    match: e.match,
    teamName: e.teamName,
    teamId: e.teamId,
    entry: e,
  }));

  return (
    <Box>
      {/* ── Toolbar: title + filter + compare ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Groups color="primary" />
          <Typography variant="h5">Team Selection</Typography>
        </Box>
        {managedTeams.length > 1 && (
          <TextField
            select
            label="Filter by Team"
            size="small"
            value={selectedTeamFilter}
            onChange={e => {
              const v = e.target.value;
              setSelectedTeamFilter(v === '' ? '' : Number(v));
            }}
            sx={{ minWidth: 210 }}
          >
            <MenuItem value=""><em>All Teams</em></MenuItem>
            {managedTeams.map(t => (
              <MenuItem key={t.teamId} value={t.teamId}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: 'primary.main' }}>{t.teamName.charAt(0)}</Avatar>
                  {t.teamName}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        )}
        <Box sx={{ flex: 1 }} />
        {displayEntries.length >= 2 && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<CompareArrows fontSize="small" />}
            onClick={() => setPickerOpen(true)}
          >
            Compare Games
          </Button>
        )}
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Per Match" />
        <Tab label="Per Player" />
      </Tabs>

      {displayEntries.length === 0 ? (
        <Alert severity="info" icon={<Groups />}>
          No upcoming matches found for your managed teams.
        </Alert>
      ) : (
        <>
          {/* ── Tab 0: Per Match ── */}
          {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {weeks.map(([mondayKey, weekEntries]) => (
            <Box key={mondayKey}>
              {/* Week divider */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography variant="caption" fontWeight="bold" color="text.secondary"
                  sx={{ letterSpacing: 1.2, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {fmtWeekLabel(mondayKey, todayMondayKey)}
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {weekEntries.map(entry => {
                  const { match, teamId, teamName, side, players, captainPlayerId, wicketKeeperPlayerId } = entry;
                  const announced = side?.teamAnnounced ?? false;
                  const twelfthId = side?.twelfthManPlayerId;
                  const cardKey   = `${match.matchId}-${teamId}`;

                  const borderColor = announced
                    ? 'success.main'
                    : players.length > 0
                      ? 'warning.main'
                      : 'divider';

                  const statusLabel = announced
                    ? 'Announced'
                    : players.length > 0
                      ? `${players.length}/11`
                      : 'Not set';

                  const statusColor = announced
                    ? 'success.main'
                    : players.length > 0
                      ? 'warning.main'
                      : 'text.disabled';

                  // Compact meta line
                  const metaParts = [
                    fmtDate(match.matchDate),
                    fmtTime(match.scheduledStartTime),
                    match.fieldName,
                    match.tournamentName
                      ? `${match.tournamentName}${match.matchStage ? ` (${STAGE_LABELS[match.matchStage] ?? match.matchStage})` : ''}`
                      : null,
                  ].filter(Boolean).join(' · ');

                  return (
                    <Card
                      key={cardKey}
                      variant="outlined"
                      sx={{
                        flex: '1 1 300px', minWidth: 280,
                        borderColor: 'divider',
                        borderLeftWidth: 4,
                        borderLeftColor: borderColor,
                        borderRadius: 1,
                        position: 'relative',
                      }}
                    >
                      {/* Action buttons — outside CardActionArea to avoid nested <button> */}
                      <Box sx={{ position: 'absolute', top: 6, right: 6, display: 'flex', alignItems: 'center', gap: 0.25, zIndex: 1 }}>
                        {match.tournamentId && (
                          <Tooltip title="Team stats">
                            <IconButton size="small" onClick={e => { e.stopPropagation(); setStatsEntry({ match, teamId, teamName }); }} sx={{ color: 'text.secondary' }}>
                              <QueryStats sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Share match">
                          <IconButton size="small" onClick={e => { e.stopPropagation(); setShareEntry({ match, teamId }); }} sx={{ color: 'text.secondary' }}>
                            <Share sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit team">
                          <IconButton
                            size="small"
                            onClick={e => { e.stopPropagation(); setOpenInEditMode(true); setViewEntry(entry); }}
                            sx={{ color: 'text.secondary' }}
                          >
                            <Edit sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <CardActionArea
                        onClick={() => { setOpenInEditMode(false); setViewEntry(entry); }}
                        sx={{ height: '100%', alignItems: 'flex-start' }}
                      >
                        <CardContent sx={{ pt: '36px !important', pb: '8px !important' }}>
                          {/* Title row */}
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ flex: 1, minWidth: 0 }}>
                              {match.homeTeamName ?? '—'} vs {match.oppositionTeamName ?? '—'}
                            </Typography>
                            <Box sx={{ flexShrink: 0 }}>
                              {announced ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                  <Campaign sx={{ fontSize: 14, color: 'success.main' }} />
                                  <Typography variant="caption" fontWeight="medium" sx={{ color: 'success.main' }}>
                                    Announced
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="caption" fontWeight="medium" sx={{ color: statusColor }}>
                                  {statusLabel}
                                </Typography>
                              )}
                            </Box>
                          </Box>

                          {/* Team chip — only when multiple teams shown */}
                          {!selectedTeamFilter && managedTeams.length > 1 && (
                            <Chip label={teamName} size="small" variant="outlined"
                              sx={{ mb: 0.75, height: 18, fontSize: '0.65rem' }} />
                          )}

                          {/* Compact meta */}
                          <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ mb: 1.25 }}>
                            {metaParts}
                          </Typography>

                          <Divider sx={{ mb: 1.25 }} />

                          {/* XI */}
                          {players.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                              {players.map(p => (
                                <PlayerBadge
                                  key={p.playerId}
                                  player={p}
                                  side={side}
                                  isCaptain={p.playerId === captainPlayerId}
                                  isWK={p.playerId === wicketKeeperPlayerId}
                                  isTwelfth={p.playerId === twelfthId}
                                  onClick={e => p.playerId != null ? openPlayerDialog(e, p.playerId) : undefined}
                                />
                              ))}
                              {twelfthId && !players.some(p => p.playerId === twelfthId) && (() => {
                                const twelfth = entries.flatMap(e => e.players).find(p => p.playerId === twelfthId);
                                return twelfth ? (
                                  <PlayerBadge
                                    key={twelfthId}
                                    player={twelfth}
                                    side={side}
                                    isCaptain={false}
                                    isWK={false}
                                    isTwelfth
                                    onClick={e => twelfth.playerId != null ? openPlayerDialog(e, twelfth.playerId) : undefined}
                                  />
                                ) : null;
                              })()}
                            </Box>
                          ) : (
                            <Box sx={{ textAlign: 'center', py: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 0.75 }}>
                                {Array.from({ length: 11 }).map((_, i) => (
                                  <Avatar key={i} sx={{ width: 26, height: 26, bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }} />
                                ))}
                              </Box>
                              <Typography variant="caption" color="text.disabled">
                                Tap to select team
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          ))}
          </Box>
          )}

          {/* ── Tab 1: Per Player ── */}
          {activeTab === 1 && (
            sortedPlayers.length === 0 ? (
              <Alert severity="info">No players in squads found for these matches.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          minWidth: 160,
                          position: 'sticky',
                          left: 0,
                          zIndex: 3,
                          bgcolor: 'background.paper',
                          borderRight: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        Player
                      </TableCell>
                      {selectionColumns.map(col => (
                        <TableCell
                          key={col.key}
                          align="center"
                          sx={{ minWidth: 120, verticalAlign: 'top', pb: 1 }}
                        >
                          <Box
                            onClick={() => setViewEntry(col.entry)}
                            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                          >
                            <Typography variant="caption" fontWeight="bold" display="block" noWrap>
                              {fmtDateShort(col.match.matchDate)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.65rem' }}>
                              {col.match.homeTeamName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem', opacity: 0.6 }}>
                              vs
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.65rem' }}>
                              {col.match.oppositionTeamName}
                            </Typography>
                            <Chip label={col.teamName} size="small" variant="outlined" sx={{ mt: 0.5, fontSize: '0.6rem', height: 18 }} />
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedPlayers.map(([playerId, playerInfo]) => (
                      <TableRow key={playerId} hover>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                            bgcolor: 'background.paper',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', '&:hover .player-name': { textDecoration: 'underline' } }}
                            onClick={e => openPlayerDialog(e as React.MouseEvent, playerId)}
                          >
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>
                              {playerInfo.name.charAt(0)}
                            </Avatar>
                            <Typography className="player-name" variant="body2" noWrap color="primary">
                              {playerInfo.name} {playerInfo.surname}
                            </Typography>
                          </Box>
                        </TableCell>
                        {selectionColumns.map(col => {
                          const squad = squadMap.get(col.teamId) ?? [];
                          const inSquadForTeam = squad.some(p => p.playerId === playerId);
                          const xiIds = col.entry.side?.playingXi ?? [];
                          const inXi = xiIds.includes(playerId);
                          const isTwelfth = col.entry.side?.twelfthManPlayerId === playerId;
                          const isCaptain = col.entry.captainPlayerId === playerId;
                          const isWK = col.entry.wicketKeeperPlayerId === playerId;

                          if (!inSquadForTeam && !inXi && !isTwelfth) {
                            return (
                              <TableCell key={col.key} align="center" sx={{ color: 'text.disabled' }}>
                                <Typography variant="caption">—</Typography>
                              </TableCell>
                            );
                          }

                          const announced = col.entry.side?.teamAnnounced ?? false;
                          const tooltipTitle = inXi
                            ? `In XI${isCaptain ? ' (C)' : ''}${isWK ? ' (WK)' : ''}`
                            : isTwelfth
                            ? '12th Man'
                            : announced
                            ? 'Not Selected'
                            : 'XI not announced';

                          return (
                            <TableCell key={col.key} align="center">
                              <Tooltip title={tooltipTitle}>
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                  {inXi ? (
                                    <CheckCircle fontSize="small" color="success" />
                                  ) : isTwelfth ? (
                                    <Person fontSize="small" sx={{ color: 'warning.main' }} />
                                  ) : announced ? (
                                    <Cancel fontSize="small" color="error" />
                                  ) : (
                                    <Remove fontSize="small" sx={{ color: 'text.disabled' }} />
                                  )}
                                </Box>
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          )}
        </>
      )}

      <GamePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        entries={displayEntries}
        onCompare={selected => { setCompareEntries(selected); }}
      />

      <TeamViewDialog
        open={viewEntry !== null}
        onClose={() => { setViewEntry(null); setOpenInEditMode(false); }}
        entry={viewEntry}
        initialEditing={openInEditMode}
        squadMap={squadMap}
        onEntryChange={updated => {
          setEntries(prev => prev.map(e =>
            e.match.matchId === updated.match.matchId && e.teamId === updated.teamId ? updated : e
          ));
        }}
      />

      <WeekendComparisonDialog
        open={compareEntries !== null}
        onClose={() => setCompareEntries(null)}
        entries={compareEntries ?? []}
        squadMap={squadMap}
        onEntryChange={updated => {
          setEntries(prev => prev.map(e =>
            e.match.matchId === updated.match.matchId && e.teamId === updated.teamId ? updated : e
          ));
          setCompareEntries(prev => prev
            ? prev.map(e => e.match.matchId === updated.match.matchId && e.teamId === updated.teamId ? updated : e)
            : prev
          );
        }}
      />

      <MatchSharePanel
        open={!!shareEntry}
        match={shareEntry?.match ?? ({} as Match)}
        teamId={shareEntry?.teamId}
        onClose={() => setShareEntry(null)}
      />

      <TeamStatsDialog
        open={!!statsEntry}
        match={statsEntry?.match ?? null}
        teamId={statsEntry?.teamId ?? null}
        teamName={statsEntry?.teamName}
        onClose={() => setStatsEntry(null)}
      />

      <Dialog open={playerLoading || !!selectedPlayer} onClose={() => setSelectedPlayer(null)} maxWidth="md" fullWidth>
        {playerLoading ? (
          <DialogContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </DialogContent>
        ) : selectedPlayer && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button startIcon={<ArrowBack />} onClick={() => setSelectedPlayer(null)} sx={{ mr: 1 }} />
              {selectedPlayer.name} {selectedPlayer.surname}
            </DialogTitle>
            <DialogContent dividers>
              <PlayerEditForm
                editing={selectedPlayer}
                onChange={patch => setSelectedPlayer(p => p ? { ...p, ...patch } : p)}
                clubs={clubs}
                readOnlyConsent
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedPlayer(null)}>Cancel</Button>
              {selectedPlayer.playerId && (
                <Button onClick={() => { setStatsPlayer(selectedPlayer); setSelectedPlayer(null); }}>
                  Stats
                </Button>
              )}
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <PlayerStatsDialog
        open={!!statsPlayer}
        player={statsPlayer}
        onClose={() => setStatsPlayer(null)}
      />
    </Box>
  );
};
