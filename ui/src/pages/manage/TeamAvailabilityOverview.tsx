import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Alert, Card, CardActionArea, CardContent,
  Chip, Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  IconButton, Tooltip, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper,
} from '@mui/material';
import {
  HowToVote, CalendarMonth, AccessTime, LocationOn,
  CheckCircle, Cancel, HelpOutline, Person, Phone, Email, Share, Remove,
} from '@mui/icons-material';
import { MatchSharePanel } from '../../components/match/MatchSharePanel';
import { pollApi } from '../../api/pollApi';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { playerApi } from '../../api/playerApi';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { Match, MatchPoll, Player } from '../../types';

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
  const navigate = useNavigate();
  const { teamIds: managerTeamIds, restrictByTeam, homeClubId, loaded: teamsLoaded } = useManagerTeams();
  const [entries, setEntries] = useState<MatchPollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMap, setFilterMap] = useState<Record<string, FilterStatus>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [shareEntry, setShareEntry] = useState<{ match: Match; teamId: number } | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const openPlayerDialog = (e: React.MouseEvent, playerId: number) => {
    e.stopPropagation();
    setPlayerLoading(true);
    setSelectedPlayer(null);
    playerApi.findById(playerId)
      .then(setSelectedPlayer)
      .catch(() => {})
      .finally(() => setPlayerLoading(false));
  };

  useEffect(() => {
    if (!teamsLoaded) return;

    const load = async () => {
      const [allTeams, allMatches] = await Promise.all([
        teamApi.findAll(),
        matchApi.findAll(),
      ]);

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

  const weekMap = new Map<string, MatchPollEntry[]>();
  for (const entry of entries) {
    const key = getMondayKey(entry.match.matchDate);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(entry);
  }
  const weeks = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  // --- Per-player tab data ---
  // Collect all unique players (by playerId) and all match columns
  const playerMap = new Map<number, string>(); // playerId -> playerName
  for (const { poll } of entries) {
    for (const a of poll?.availability ?? []) {
      if (!playerMap.has(a.playerId)) playerMap.set(a.playerId, a.playerName);
    }
  }
  const sortedPlayers = [...playerMap.entries()].sort(([, a], [, b]) => a.localeCompare(b));

  // Build column definitions: one per entry (match + team)
  const columns = entries.map(e => ({
    key: `${e.match.matchId}-${e.teamId}`,
    match: e.match,
    teamName: e.teamName,
    poll: e.poll,
  }));

  // Build status lookup: [playerId][colKey] = status
  const statusLookup = new Map<number, Map<string, AvailStatus>>();
  for (const { match, teamId, poll } of entries) {
    const colKey = `${match.matchId}-${teamId}`;
    for (const a of poll?.availability ?? []) {
      if (!statusLookup.has(a.playerId)) statusLookup.set(a.playerId, new Map());
      statusLookup.get(a.playerId)!.set(colKey, (a.status as AvailStatus) ?? null);
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <HowToVote color="primary" />
        <Typography variant="h5">Team Availability</Typography>
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {weeks.map(([mondayKey, weekEntries]) => (
                <Box key={mondayKey}>
                  <Typography
                    variant="overline"
                    sx={{ fontWeight: 'bold', letterSpacing: 1.5, color: 'text.secondary', display: 'block', mb: 1.5 }}
                  >
                    {fmtWeekLabel(mondayKey, todayMondayKey)}
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {weekEntries.map(({ match, teamId, teamName, poll }) => {
                      const available = poll?.availability?.filter(a => a.status === 'YES') ?? [];
                      const unavailable = poll?.availability?.filter(a => a.status === 'NO') ?? [];
                      const unsure = poll?.availability?.filter(a => a.status === 'UNSURE') ?? [];
                      const noResponse = poll?.availability?.filter(a => !a.status) ?? [];

                      const cardKey = `${match.matchId}-${teamId}`;
                      const activeFilter: FilterStatus = filterMap[cardKey] ?? 'YES';

                      const setFilter = (e: React.MouseEvent, status: FilterStatus) => {
                        e.stopPropagation();
                        setFilterMap(prev => ({ ...prev, [cardKey]: status }));
                      };

                      const displayPlayers =
                        activeFilter === 'YES' ? available :
                        activeFilter === 'NO' ? unavailable :
                        activeFilter === 'UNSURE' ? unsure :
                        noResponse;

                      const displayLabel =
                        activeFilter === 'YES' ? 'Available Players' :
                        activeFilter === 'NO' ? 'Unavailable Players' :
                        activeFilter === 'UNSURE' ? 'Unsure Players' :
                        'No Response';

                      const playerChipColor =
                        activeFilter === 'YES' ? 'success' :
                        activeFilter === 'NO' ? 'error' :
                        activeFilter === 'UNSURE' ? 'warning' :
                        'default';

                      return (
                        <Card
                          key={cardKey}
                          variant="outlined"
                          sx={{ flex: '1 1 300px', minWidth: 280 }}
                        >
                          <CardActionArea
                            onClick={() => navigate(`/admin/matches/${match.matchId}/detail`, {
                              state: { teamId, initialTab: 0, returnTo: '/manage-club/team-availability' },
                            })}
                            sx={{ height: '100%', alignItems: 'flex-start' }}
                          >
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, gap: 1, flexWrap: 'wrap' }}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
                                  {match.homeTeamName ?? '—'} vs {match.oppositionTeamName ?? '—'}
                                </Typography>
                                <Chip label={teamName} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {poll ? (
                                  <Chip
                                    label={poll.open ? 'Poll Open' : 'Poll Closed'}
                                    color={poll.open ? 'success' : 'default'}
                                    size="small"
                                    icon={<HowToVote fontSize="small" />}
                                  />
                                ) : (
                                  <Chip label="No poll" size="small" variant="outlined" />
                                )}
                                <Tooltip title="Share match">
                                  <IconButton
                                    size="small"
                                    onClick={e => { e.stopPropagation(); setShareEntry({ match, teamId }); }}
                                    sx={{ color: 'text.secondary' }}
                                  >
                                    <Share fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, mb: poll?.availability?.length ? 1.5 : 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarMonth sx={{ fontSize: 14 }} color="action" />
                                <Typography variant="body2">{fmtDate(match.matchDate)}</Typography>
                              </Box>
                              {fmtTime(match.scheduledStartTime) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <AccessTime sx={{ fontSize: 14 }} color="action" />
                                  <Typography variant="body2">{fmtTime(match.scheduledStartTime)}</Typography>
                                </Box>
                              )}
                              {match.fieldName && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <LocationOn sx={{ fontSize: 14 }} color="action" />
                                  <Typography variant="body2" noWrap>{match.fieldName}</Typography>
                                </Box>
                              )}
                            </Box>

                            {poll && (poll.availability?.length ?? 0) > 0 && (
                              <>
                                <Divider sx={{ my: 1.5 }} />

                                <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
                                  <Chip
                                    icon={<CheckCircle />}
                                    label={`${available.length} Available`}
                                    color="success"
                                    size="small"
                                    variant={activeFilter === 'YES' ? 'filled' : 'outlined'}
                                    onClick={e => setFilter(e, 'YES')}
                                    sx={{ cursor: 'pointer' }}
                                  />
                                  {unavailable.length > 0 && (
                                    <Chip
                                      icon={<Cancel />}
                                      label={`${unavailable.length} Unavailable`}
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
                                      label={`${noResponse.length} No response`}
                                      size="small"
                                      variant={activeFilter === 'NONE' ? 'filled' : 'outlined'}
                                      onClick={e => setFilter(e, 'NONE')}
                                      sx={{ cursor: 'pointer' }}
                                    />
                                  )}
                                </Box>

                                {displayPlayers.length > 0 && (
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 'bold' }}
                                    >
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
                                )}
                                {displayPlayers.length === 0 && (
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
                          <Typography variant="caption" fontWeight="bold" display="block" noWrap>
                            {fmtDateShort(col.match.matchDate)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.65rem' }}>
                            {col.match.homeTeamName} vs {col.match.oppositionTeamName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.65rem' }}>
                            {col.teamName}
                          </Typography>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>
                              {playerName.charAt(0)}
                            </Avatar>
                            <Typography variant="body2" noWrap>{playerName}</Typography>
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

      <MatchSharePanel
        open={!!shareEntry}
        match={shareEntry?.match ?? ({} as Match)}
        teamId={shareEntry?.teamId}
        onClose={() => setShareEntry(null)}
      />

      <Dialog open={playerLoading || !!selectedPlayer} onClose={() => setSelectedPlayer(null)} maxWidth="xs" fullWidth>
        {playerLoading ? (
          <DialogContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </DialogContent>
        ) : selectedPlayer && (
          <>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person />
                <Typography variant="h6">Player Details</Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Avatar
                  src={selectedPlayer.profilePictureUrl ?? ''}
                  sx={{ width: 72, height: 72, fontSize: 28, mb: 1 }}
                >
                  {selectedPlayer.name.charAt(0)}
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                  {selectedPlayer.name} {selectedPlayer.surname}
                </Typography>
                {selectedPlayer.homeClubName && (
                  <Typography variant="body2" color="text.secondary">{selectedPlayer.homeClubName}</Typography>
                )}
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {selectedPlayer.contactNumber && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone fontSize="small" color="action" />
                    <Typography
                      component="a"
                      href={`tel:${selectedPlayer.contactNumber}`}
                      variant="body2"
                      sx={{ color: 'primary.main', textDecoration: 'none' }}
                    >
                      {selectedPlayer.contactNumber}
                    </Typography>
                  </Box>
                )}
                {selectedPlayer.alternativeContactNumber && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone fontSize="small" color="action" />
                    <Typography
                      component="a"
                      href={`tel:${selectedPlayer.alternativeContactNumber}`}
                      variant="body2"
                      sx={{ color: 'primary.main', textDecoration: 'none' }}
                    >
                      {selectedPlayer.alternativeContactNumber}
                    </Typography>
                  </Box>
                )}
                {selectedPlayer.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email fontSize="small" color="action" />
                    <Typography
                      component="a"
                      href={`mailto:${selectedPlayer.email}`}
                      variant="body2"
                      sx={{ color: 'primary.main', textDecoration: 'none' }}
                    >
                      {selectedPlayer.email}
                    </Typography>
                  </Box>
                )}
                {!selectedPlayer.contactNumber && !selectedPlayer.email && (
                  <Typography variant="body2" color="text.secondary">No contact details available.</Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedPlayer(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
