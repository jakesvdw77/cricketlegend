import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Alert, Card, CardActionArea, CardContent,
  Chip, Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  IconButton, Tooltip, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, TextField, MenuItem,
} from '@mui/material';
import {
  HowToVote,
  CheckCircle, Cancel, Edit, HelpOutline, Share, Remove, ArrowBack,
} from '@mui/icons-material';
import { MatchSharePanel } from '../../components/match/MatchSharePanel';
import { AvailabilityViewDialog } from './AvailabilityViewDialog';
import { PlayerEditForm } from '../../components/player/PlayerEditForm';
import { pollApi } from '../../api/pollApi';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { playerApi } from '../../api/playerApi';
import { clubApi } from '../../api/clubApi';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { Club, Match, MatchPoll, Player } from '../../types';

interface MatchPollEntry {
  match: Match;
  teamId: number;
  teamName: string;
  poll: MatchPoll | null;
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

type FilterStatus = 'YES' | 'NO' | 'UNSURE' | 'NONE';
type AvailStatus = 'YES' | 'NO' | 'UNSURE' | null;

const StatusIcon: React.FC<{ status: AvailStatus }> = ({ status }) => {
  if (status === 'YES') return <CheckCircle fontSize="small" color="success" />;
  if (status === 'NO') return <Cancel fontSize="small" color="error" />;
  if (status === 'UNSURE') return <HelpOutline fontSize="small" color="warning" />;
  return <Remove fontSize="small" sx={{ color: 'text.disabled' }} />;
};

const statusLabel: Record<string, string> = { YES: 'Available', NO: 'Unavailable', UNSURE: 'Unsure' };

export const TeamAvailabilityOverview: React.FC = () => {
  const location = useLocation();
  const { teamIds: managerTeamIds, restrictByTeam, homeClubId, loaded: teamsLoaded } = useManagerTeams();
  const [entries, setEntries] = useState<MatchPollEntry[]>([]);
  const [managedTeams, setManagedTeams] = useState<{ teamId: number; teamName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMap, setFilterMap] = useState<Record<string, FilterStatus>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [saving, setSaving] = useState(false);
  const [shareEntry, setShareEntry] = useState<{ match: Match; teamId: number; poll: MatchPoll | null } | null>(null);
  const [availEntry, setAvailEntry] = useState<{ match: Match; teamId: number; teamName: string; pollOpen?: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<number>((location.state as any)?.returnToTab ?? 0);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<number | ''>('');

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
          allTeams
            .filter(t => t.teamId != null && t.associatedClubId === homeClubId)
            .map(t => t.teamId!)
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
        if (m.homeTeamId != null && relevantTeamIds.has(m.homeTeamId)) {
          pairs.push({ match: m, teamId: m.homeTeamId, teamName: m.homeTeamName ?? teamNameMap.get(m.homeTeamId) ?? '' });
        }
        if (m.oppositionTeamId != null && relevantTeamIds.has(m.oppositionTeamId)) {
          pairs.push({ match: m, teamId: m.oppositionTeamId, teamName: m.oppositionTeamName ?? teamNameMap.get(m.oppositionTeamId) ?? '' });
        }
      }

      const pollResults = await Promise.allSettled(
        pairs.map(({ match, teamId }) => pollApi.getPoll(match.matchId!, teamId))
      );

      const result: MatchPollEntry[] = pairs.map((p, i) => {
        const r = pollResults[i];
        return { match: p.match, teamId: p.teamId, teamName: p.teamName, poll: r.status === 'fulfilled' ? r.value : null };
      });

      result.sort((a, b) => {
        const ka = `${a.match.matchDate ?? '9999-12-31'}T${a.match.scheduledStartTime ?? '99:99:99'}`;
        const kb = `${b.match.matchDate ?? '9999-12-31'}T${b.match.scheduledStartTime ?? '99:99:99'}`;
        return ka.localeCompare(kb);
      });

      setEntries(result);
    };

    load().catch(() => {}).finally(() => setLoading(false));
  }, [teamsLoaded, restrictByTeam, managerTeamIds, homeClubId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!teamsLoaded || loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayMondayKey = getMondayKey(todayStr);

  const displayEntries = selectedTeamFilter
    ? entries.filter(e => e.teamId === selectedTeamFilter)
    : entries;

  const weekMap = new Map<string, MatchPollEntry[]>();
  for (const entry of displayEntries) {
    const key = getMondayKey(entry.match.matchDate);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(entry);
  }
  const weeks = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  // --- Per-player tab data ---
  // Collect all unique players (by playerId) and all match columns
  const playerMap = new Map<number, string>(); // playerId -> playerName
  for (const { poll } of displayEntries) {
    for (const a of poll?.availability ?? []) {
      if (!playerMap.has(a.playerId)) playerMap.set(a.playerId, a.playerName);
    }
  }
  const sortedPlayers = [...playerMap.entries()].sort(([, a], [, b]) => a.localeCompare(b));

  // Build column definitions: one per entry (match + team)
  const columns = displayEntries.map(e => ({
    key: `${e.match.matchId}-${e.teamId}`,
    match: e.match,
    teamName: e.teamName,
    teamId: e.teamId,
    poll: e.poll,
  }));

  // Build status lookup: [playerId][colKey] = status
  const statusLookup = new Map<number, Map<string, AvailStatus>>();
  for (const { match, teamId, poll } of displayEntries) {
    const colKey = `${match.matchId}-${teamId}`;
    for (const a of poll?.availability ?? []) {
      if (!statusLookup.has(a.playerId)) statusLookup.set(a.playerId, new Map());
      statusLookup.get(a.playerId)!.set(colKey, (a.status as AvailStatus) ?? null);
    }
  }

  return (
    <Box>
      {/* ── Toolbar: title + filter ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HowToVote color="primary" />
          <Typography variant="h5">Team Availability</Typography>
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
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Per Match" />
        <Tab label="Per Player" />
      </Tabs>

      {entries.length === 0 ? (
        <Alert severity="info" icon={<HowToVote />}>
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
                    {weekEntries.map(({ match, teamId, teamName, poll }) => {
                      const available   = poll?.availability?.filter(a => a.status === 'YES')    ?? [];
                      const unavailable = poll?.availability?.filter(a => a.status === 'NO')     ?? [];
                      const unsure      = poll?.availability?.filter(a => a.status === 'UNSURE') ?? [];
                      const noResponse  = poll?.availability?.filter(a => !a.status)             ?? [];

                      const cardKey = `${match.matchId}-${teamId}`;
                      const activeFilter: FilterStatus = filterMap[cardKey] ?? 'YES';

                      const setFilter = (e: React.MouseEvent, status: FilterStatus) => {
                        e.stopPropagation();
                        setFilterMap(prev => ({ ...prev, [cardKey]: status }));
                      };

                      const displayPlayers =
                        activeFilter === 'YES'    ? available :
                        activeFilter === 'NO'     ? unavailable :
                        activeFilter === 'UNSURE' ? unsure :
                        noResponse;

                      const displayLabel =
                        activeFilter === 'YES'    ? 'Available' :
                        activeFilter === 'NO'     ? 'Unavailable' :
                        activeFilter === 'UNSURE' ? 'Unsure' :
                        'No Response';

                      const playerChipColor =
                        activeFilter === 'YES'    ? 'success' :
                        activeFilter === 'NO'     ? 'error' :
                        activeFilter === 'UNSURE' ? 'warning' :
                        'default';

                      const borderColor = poll?.open
                        ? 'success.main'
                        : poll
                          ? 'divider'
                          : 'divider';

                      const statusText = poll?.open
                        ? 'Poll Open'
                        : poll
                          ? 'Poll Closed'
                          : 'No poll';

                      const statusColor = poll?.open ? 'success.main' : 'text.disabled';

                      const metaParts = [
                        fmtDate(match.matchDate),
                        fmtTime(match.scheduledStartTime),
                        match.fieldName,
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
                          {/* Share button — top-right, outside clickable area */}
                          <Tooltip title="Share match">
                            <IconButton
                              size="small"
                              onClick={e => { e.stopPropagation(); setShareEntry({ match, teamId, poll }); }}
                              sx={{ position: 'absolute', top: 6, right: 6, color: 'text.secondary', zIndex: 1 }}
                            >
                              <Share sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>

                          {/* Pencil button — bottom-right */}
                          <Tooltip title="Manage availability">
                            <IconButton
                              size="small"
                              onClick={e => { e.stopPropagation(); setAvailEntry({ match, teamId, teamName, pollOpen: poll?.open }); }}
                              sx={{ position: 'absolute', bottom: 6, right: 6, color: 'text.secondary', zIndex: 1 }}
                            >
                              <Edit sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>

                          <CardActionArea
                            onClick={() => setAvailEntry({ match, teamId, teamName, pollOpen: poll?.open })}
                            sx={{ height: '100%', alignItems: 'flex-start' }}
                          >
                            <CardContent sx={{ pb: '36px !important' }}>
                              {/* Title row */}
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5, pr: 3 }}>
                                <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ flex: 1, minWidth: 0 }}>
                                  {match.homeTeamName ?? '—'} vs {match.oppositionTeamName ?? '—'}
                                </Typography>
                                <Typography variant="caption" fontWeight="medium" sx={{ color: statusColor, flexShrink: 0 }}>
                                  {statusText}
                                </Typography>
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

                              {poll && (poll.availability?.length ?? 0) > 0 && (
                                <>
                                  <Divider sx={{ mb: 1.25 }} />

                                  {/* Filter chips */}
                                  <Box sx={{ display: 'flex', gap: 0.75, mb: 1.25, flexWrap: 'wrap' }}>
                                    <Chip
                                      icon={<CheckCircle />}
                                      label={`${available.length} Yes`}
                                      color="success"
                                      size="small"
                                      variant={activeFilter === 'YES' ? 'filled' : 'outlined'}
                                      onClick={e => setFilter(e, 'YES')}
                                      sx={{ cursor: 'pointer' }}
                                    />
                                    {unavailable.length > 0 && (
                                      <Chip
                                        icon={<Cancel />}
                                        label={`${unavailable.length} No`}
                                        color="error"
                                        size="small"
                                        variant={activeFilter === 'NO' ? 'filled' : 'outlined'}
                                        onClick={e => setFilter(e, 'NO')}
                                        sx={{ cursor: 'pointer' }}
                                      />
                                    )}
                                    {unsure.length > 0 && (
                                      <Chip
                                        icon={<HelpOutline />}
                                        label={`${unsure.length} Unsure`}
                                        color="warning"
                                        size="small"
                                        variant={activeFilter === 'UNSURE' ? 'filled' : 'outlined'}
                                        onClick={e => setFilter(e, 'UNSURE')}
                                        sx={{ cursor: 'pointer' }}
                                      />
                                    )}
                                    {noResponse.length > 0 && (
                                      <Chip
                                        label={`${noResponse.length} Pending`}
                                        size="small"
                                        variant={activeFilter === 'NONE' ? 'filled' : 'outlined'}
                                        onClick={e => setFilter(e, 'NONE')}
                                        sx={{ cursor: 'pointer' }}
                                      />
                                    )}
                                  </Box>

                                  {/* Player list */}
                                  {displayPlayers.length > 0 ? (
                                    <Box>
                                      <Typography variant="caption" color="text.secondary"
                                        sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 'bold' }}>
                                        {displayLabel}
                                      </Typography>
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                        {displayPlayers.map(p => (
                                          <Chip
                                            key={p.playerId}
                                            avatar={
                                              <Avatar src={p.profilePictureUrl ?? undefined} sx={{ bgcolor: `${playerChipColor}.main`, fontSize: 12 }}>
                                                {p.playerName.charAt(0)}
                                              </Avatar>
                                            }
                                            label={p.playerName}
                                            size="small"
                                            color={playerChipColor as any}
                                            variant="outlined"
                                            onClick={e => openPlayerDialog(e, p.playerId)}
                                            sx={{ cursor: 'pointer' }}
                                          />
                                        ))}
                                      </Box>
                                    </Box>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
                                      No players in this group.
                                    </Typography>
                                  )}
                                </>
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
              <Alert severity="info">No availability responses recorded yet.</Alert>
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
                      {columns.map(col => (
                        <TableCell
                          key={col.key}
                          align="center"
                          sx={{ minWidth: 120, verticalAlign: 'top', pb: 1 }}
                        >
                          <Box
                            onClick={() => setAvailEntry({ match: col.match, teamId: col.teamId, teamName: col.teamName, pollOpen: col.poll?.open })}
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
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedPlayers.map(([playerId, playerName]) => (
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
                              {playerName.charAt(0)}
                            </Avatar>
                            <Typography className="player-name" variant="body2" noWrap color="primary">{playerName}</Typography>
                          </Box>
                        </TableCell>
                        {columns.map(col => {
                          const colPlayers = col.poll?.availability ?? [];
                          const isInPoll = colPlayers.some(a => a.playerId === playerId);
                          if (!isInPoll) {
                            return (
                              <TableCell key={col.key} align="center" sx={{ color: 'text.disabled' }}>
                                <Typography variant="caption">—</Typography>
                              </TableCell>
                            );
                          }
                          const status = statusLookup.get(playerId)?.get(col.key) ?? null;
                          return (
                            <TableCell key={col.key} align="center">
                              <Tooltip title={status ? statusLabel[status] : 'No response'}>
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                  <StatusIcon status={status} />
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

      <AvailabilityViewDialog
        open={!!availEntry}
        onClose={() => setAvailEntry(null)}
        match={availEntry?.match ?? null}
        teamId={availEntry?.teamId ?? null}
        teamName={availEntry?.teamName}
        pollOpen={availEntry?.pollOpen}
        onPollChange={isOpen => {
          if (!availEntry) return;
          setEntries(prev => prev.map(e =>
            e.match.matchId === availEntry.match.matchId && e.teamId === availEntry.teamId && e.poll
              ? { ...e, poll: { ...e.poll, open: isOpen } }
              : e
          ));
        }}
      />

      <MatchSharePanel
        open={!!shareEntry}
        match={shareEntry?.match ?? ({} as Match)}
        teamId={shareEntry?.teamId}
        poll={shareEntry?.poll ?? undefined}
        onClose={() => setShareEntry(null)}
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
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
