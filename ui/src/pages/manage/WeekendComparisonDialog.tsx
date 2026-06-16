import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccessTime,
  ArrowBack,
  Cancel,
  CalendarMonth,
  CheckCircle,
  Close,
  Edit,
  HelpOutline,
  LocationOn,
  Warning,
} from '@mui/icons-material';
import { AvailabilityStatus, MatchSide, Player } from '../../types';
import { PlayerRoleIcons } from '../../components/player/PlayerRoleIcons';
import { pollApi } from '../../api/pollApi';
import { TeamSidePanel } from '../../components/match/TeamSidePanel';
import { XiEntry } from './TeamSelectionOverview';

const fmtDate = (d?: string) => {
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

interface Props {
  open: boolean;
  onClose: () => void;
  entries: XiEntry[];
  squadMap: Map<number, Player[]>;
  onEntryChange?: (updated: XiEntry) => void;
}

const AvailIcon: React.FC<{ status?: AvailabilityStatus }> = ({ status }) => {
  if (status === 'YES') return <CheckCircle sx={{ fontSize: 15, color: 'success.main', flexShrink: 0 }} />;
  if (status === 'UNSURE') return (
    <Tooltip title="Unsure">
      <HelpOutline sx={{ fontSize: 15, color: 'warning.main', flexShrink: 0 }} />
    </Tooltip>
  );
  if (status === 'NO') return (
    <Tooltip title="Not available">
      <Cancel sx={{ fontSize: 15, color: 'error.main', flexShrink: 0 }} />
    </Tooltip>
  );
  return <Box sx={{ width: 15, flexShrink: 0 }} />;
};

export const WeekendComparisonDialog: React.FC<Props> = ({
  open, onClose, entries, squadMap, onEntryChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileTab, setMobileTab] = useState(0);
  const [availMaps, setAvailMaps] = useState<Map<string, Record<number, AvailabilityStatus>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [localEntries, setLocalEntries] = useState<XiEntry[]>(entries);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileTab(0);
    setLocalEntries(entries);
    setEditingKey(null);
    setColWidths(entries.map(() => 100 / Math.max(1, entries.length)));
  }, [entries]);

  const handleDividerMouseDown = (e: React.MouseEvent, dividerIndex: number) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidths = [...colWidths];
    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 1;

    const onMove = (ev: MouseEvent) => {
      const dPercent = ((ev.clientX - startX) / containerWidth) * 100;
      const left = Math.max(15, Math.min(85, startWidths[dividerIndex] + dPercent));
      const right = startWidths[dividerIndex] + startWidths[dividerIndex + 1] - left;
      if (right >= 15) {
        setColWidths(prev => {
          const next = [...prev];
          next[dividerIndex] = left;
          next[dividerIndex + 1] = right;
          return next;
        });
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    if (!open || entries.length === 0) return;
    setLoading(true);
    Promise.allSettled(
      entries.map(e =>
        pollApi.getPoll(e.match.matchId!, e.teamId)
          .then(poll => ({
            key: `${e.match.matchId}-${e.teamId}`,
            map: Object.fromEntries(
              (poll.availability ?? [])
                .filter(a => a.status)
                .map(a => [a.playerId, a.status!])
            ) as Record<number, AvailabilityStatus>,
          }))
          .catch(() => ({ key: `${e.match.matchId}-${e.teamId}`, map: {} as Record<number, AvailabilityStatus> }))
      )
    ).then(results => {
      const m = new Map<string, Record<number, AvailabilityStatus>>();
      results.forEach(r => { if (r.status === 'fulfilled') m.set(r.value.key, r.value.map); });
      setAvailMaps(m);
    }).finally(() => setLoading(false));
  }, [open, entries]);

  const conflictIds = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of localEntries) {
      for (const id of e.side?.playingXi ?? []) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      const twelfthId = e.side?.twelfthManPlayerId;
      if (twelfthId) counts.set(twelfthId, (counts.get(twelfthId) ?? 0) + 1);
    }
    const s = new Set<number>();
    counts.forEach((n, id) => { if (n > 1) s.add(id); });
    return s;
  }, [localEntries]);

  const handleSideChange = (matchId: number, teamId: number, side: MatchSide) => {
    setLocalEntries(prev => prev.map(e => {
      if (e.match.matchId !== matchId || e.teamId !== teamId) return e;
      const squad = squadMap.get(teamId) ?? [];
      const playerById = new Map(squad.map(p => [p.playerId!, p]));
      const players = (side.playingXi ?? []).map(id => playerById.get(id)).filter(Boolean) as Player[];
      const updated: XiEntry = { ...e, side, players, captainPlayerId: side.captainPlayerId, wicketKeeperPlayerId: side.wicketKeeperPlayerId };
      onEntryChange?.(updated);
      return updated;
    }));
  };

  const renderColumn = (entry: XiEntry, isEditing: boolean, _anyEditing: boolean, width: string) => {
    const { match, teamId, teamName, side, players } = entry;
    const colKey = `${match.matchId}-${teamId}`;
    const avail = availMaps.get(colKey) ?? {};
    const squad = squadMap.get(teamId) ?? [];
    const xiIds = new Set(side?.playingXi ?? []);
    const twelfthId = side?.twelfthManPlayerId;
    const twelfthPlayer = twelfthId ? squad.find(p => p.playerId === twelfthId) : undefined;
    const available = squad.filter(p => !xiIds.has(p.playerId!) && p.playerId !== twelfthId);
    const announced = !!side?.teamAnnounced;

    return (
      <Box
        key={colKey}
        sx={{
          width,
          minWidth: 0,
          flexShrink: 0,
          border: 1,
          borderColor: isEditing ? 'primary.main' : announced ? 'primary.light' : 'divider',
          borderRadius: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Column header */}
        <Box sx={{ p: 1.5, bgcolor: isEditing ? 'action.selected' : 'action.hover', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ mb: 0.5 }}>
                {match.homeTeamName ?? '—'} vs {match.oppositionTeamName ?? '—'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                <Chip label={teamName} size="small" variant="outlined" />
                {announced && <Chip label="Announced" size="small" color="primary" />}
                {isEditing && <Chip label="Editing" size="small" color="primary" variant="filled" />}
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <CalendarMonth sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">{fmtDate(match.matchDate)}</Typography>
                </Box>
                {fmtTime(match.scheduledStartTime) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <AccessTime sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">{fmtTime(match.scheduledStartTime)}</Typography>
                  </Box>
                )}
                {match.fieldName && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <LocationOn sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" noWrap>{match.fieldName}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <Tooltip title={isEditing ? 'Back to compare' : 'Edit team'}>
              <IconButton
                size="small"
                onClick={() => setEditingKey(isEditing ? null : colKey)}
                color={isEditing ? 'primary' : 'default'}
                sx={{ flexShrink: 0, mt: -0.5 }}
              >
                {isEditing ? <ArrowBack fontSize="small" /> : <Edit fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Scrollable body */}
        {isEditing ? (
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <TeamSidePanel
              matchId={match.matchId!}
              teamId={teamId}
              teamName={teamName}
              players={squad}
              onSideChange={s => handleSideChange(match.matchId!, teamId, s)}
            />
          </Box>
        ) : (
          <Box sx={{ px: 1.5, pt: 1, pb: 0.5, flex: 1, overflowY: 'auto' }}>

            {/* Playing XI */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Playing XI
              </Typography>
              <Chip
                label={`${players.length}/11`}
                size="small"
                color={players.length === 11 ? 'success' : 'warning'}
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            </Box>

            {players.length === 0 && !twelfthPlayer ? (
              <Typography variant="body2" color="text.disabled" sx={{ pb: 1, fontStyle: 'italic' }}>
                XI not selected yet
              </Typography>
            ) : (
              <List dense disablePadding sx={{ mb: 0.5 }}>
                {players.map((p, idx) => {
                  const isC = p.playerId === side?.captainPlayerId;
                  const isWK = p.playerId === side?.wicketKeeperPlayerId;
                  const isConflict = conflictIds.has(p.playerId!);
                  return (
                    <ListItem key={p.playerId} disablePadding sx={{ py: 0.15, alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20, flexShrink: 0 }}>
                        {idx + 1}.
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem' }} noWrap>
                          {p.name} {p.surname}
                        </Typography>
                        <PlayerRoleIcons player={p} side={side} isCaptain={isC} isWK={isWK} size="small" />
                      </Box>
                      {isConflict && (
                        <Tooltip title="Selected in multiple teams">
                          <Warning sx={{ fontSize: 14, color: 'warning.main', ml: 0.5, flexShrink: 0 }} />
                        </Tooltip>
                      )}
                    </ListItem>
                  );
                })}
                {twelfthPlayer && (
                  <ListItem disablePadding sx={{ py: 0.15, alignItems: 'center', mt: 0.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20, flexShrink: 0 }}>
                      SS
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', flex: 1, minWidth: 0, color: 'text.secondary', fontStyle: 'italic' }} noWrap>
                      {twelfthPlayer.name} {twelfthPlayer.surname}
                    </Typography>
                    {conflictIds.has(twelfthPlayer.playerId!) && (
                      <Tooltip title="Selected in multiple teams">
                        <Warning sx={{ fontSize: 14, color: 'warning.main', ml: 0.5, flexShrink: 0 }} />
                      </Tooltip>
                    )}
                  </ListItem>
                )}
              </List>
            )}

            {/* Not selected */}
            {available.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" fontWeight="bold" color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                  Not Selected ({available.length})
                </Typography>
                <List dense disablePadding>
                  {available.map(p => {
                    const status = avail[p.playerId!];
                    return (
                      <ListItem key={p.playerId} disablePadding sx={{ py: 0.15, gap: 0.5 }}>
                        <AvailIcon status={status} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: '0.82rem', color: status === 'NO' ? 'text.disabled' : 'text.primary' }}
                            noWrap
                          >
                            {p.name} {p.surname}
                          </Typography>
                          <PlayerRoleIcons player={p} side={null} isWK={p.wicketKeeper} size="small" />
                        </Box>
                      </ListItem>
                    );
                  })}
                </List>
              </>
            )}
          </Box>
        )}

        {/* Footer — only visible while editing */}
        {isEditing && (
          <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Button
              fullWidth
              size="small"
              variant="contained"
              color="primary"
              startIcon={<ArrowBack fontSize="small" />}
              onClick={() => setEditingKey(null)}
            >
              Back to Compare
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  const safeTab = Math.min(mobileTab, Math.max(0, localEntries.length - 1));
  const anyEditing = editingKey !== null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, flexShrink: 0 }}>
        <Typography variant="h6">
          {anyEditing ? 'Edit Team' : 'Game Comparison'}
        </Typography>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: 2,
          gap: 2,
        }}
      >
        {conflictIds.size > 0 && !anyEditing && (
          <Alert severity="warning" sx={{ flexShrink: 0 }}>
            {conflictIds.size} player{conflictIds.size > 1 ? 's are' : ' is'} selected in more than one team — look for the <Warning sx={{ fontSize: 14, verticalAlign: 'middle' }} /> markers.
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <Tabs
              value={safeTab}
              onChange={(_, v) => { setMobileTab(v); setEditingKey(null); }}
              variant="fullWidth"
              sx={{ flexShrink: 0, mb: 1 }}
            >
              {localEntries.map((e, i) => {
                const k = `${e.match.matchId}-${e.teamId}`;
                return (
                  <Tab
                    key={i}
                    label={editingKey === k ? `${e.teamName} ✏️` : e.teamName}
                    sx={{ fontSize: '0.75rem' }}
                  />
                );
              })}
            </Tabs>
            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
              {localEntries[safeTab] && (() => {
                const e = localEntries[safeTab];
                const k = `${e.match.matchId}-${e.teamId}`;
                return renderColumn(e, editingKey === k, anyEditing, '100%');
              })()}
            </Box>
          </Box>
        ) : (
          <Box ref={containerRef} sx={{ display: 'flex', flex: 1, overflow: 'hidden', userSelect: 'none' }}>
            {localEntries.map((e, i) => {
              const k = `${e.match.matchId}-${e.teamId}`;
              const w = `${colWidths[i] ?? 100 / localEntries.length}%`;
              return (
                <React.Fragment key={k}>
                  {i > 0 && (
                    <Box
                      onMouseDown={ev => handleDividerMouseDown(ev, i - 1)}
                      sx={{
                        width: 8,
                        flexShrink: 0,
                        cursor: 'col-resize',
                        display: 'flex',
                        alignItems: 'stretch',
                        justifyContent: 'center',
                        '&:hover > div': { bgcolor: 'primary.main' },
                      }}
                    >
                      <Box sx={{ width: 2, bgcolor: 'divider', borderRadius: 1, transition: 'background-color 0.15s' }} />
                    </Box>
                  )}
                  {renderColumn(e, editingKey === k, anyEditing, w)}
                </React.Fragment>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
