import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, Autocomplete, TextField,
  List, ListItem, ListItemText, IconButton, Chip, Divider,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
  CircularProgress, InputAdornment,
} from '@mui/material';
import { Campaign, Cancel, CheckCircle, Delete, DragIndicator, Edit, HelpOutline, PersonAdd, Search, SportsCricket, Warning } from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { pollApi } from '../../api/pollApi';
import { AvailabilityStatus, MatchSide, Player } from '../../types';
import { formatEnum } from '../../utils/formatEnum';

interface Props {
  matchId: number;
  teamId: number;
  teamName: string;
  players: Player[];
}

type DragSource =
  | { type: 'squad'; playerId: number }
  | { type: 'xi'; index: number };

export const TeamSidePanel: React.FC<Props> = ({ matchId, teamId, teamName, players }) => {
  const [side, setSide] = useState<MatchSide>({ matchId, teamId, playingXi: [] });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [twelfthHover, setTwelfthHover] = useState(false);
  const [availabilityMap, setAvailabilityMap] = useState<Record<number, AvailabilityStatus>>({});
  const [overridePlayer, setOverridePlayer] = useState<Player | null>(null);
  const [subOpen, setSubOpen] = useState(false);
  const [subSearch, setSubSearch] = useState('');
  const [subAllPlayers, setSubAllPlayers] = useState<Player[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [substituteDetails, setSubstituteDetails] = useState<Player[]>([]);
  const dragSource = useRef<DragSource | null>(null);

  useEffect(() => {
    matchApi.getTeamSheet(matchId).then(async sides => {
      const existing = sides.find(s => s.teamId === teamId);
      if (!existing) return;
      setSide(existing);

      const squadIds = new Set(players.map(p => p.playerId));
      const xiIds = existing.playingXi ?? [];
      const twelfthId = existing.twelfthManPlayerId;
      const unknownIds = [
        ...xiIds.filter(id => !squadIds.has(id)),
        ...(twelfthId && !squadIds.has(twelfthId) ? [twelfthId] : []),
      ];
      if (unknownIds.length === 0) return;

      const details = await Promise.all(unknownIds.map(id => playerApi.findById(id)));
      setSubstituteDetails(details);
    });
    pollApi.getPoll(matchId, teamId)
      .then(poll => {
        const map: Record<number, AvailabilityStatus> = {};
        poll.availability?.forEach(a => { if (a.status) map[a.playerId] = a.status; });
        setAvailabilityMap(map);
      })
      .catch(() => {});
  }, [matchId, teamId]);

  const persist = async (next: MatchSide) => {
    const saved = await matchApi.saveTeamSheet(matchId, next);
    setSide(saved);
  };

  const allKnownPlayers = [...players, ...substituteDetails];

  const addPlayerAt = (playerId: number, index: number) => {
    if (side.playingXi?.includes(playerId)) return;
    const newXi = [...(side.playingXi ?? [])];
    newXi.splice(index, 0, playerId);
    const next: MatchSide = { ...side, playingXi: newXi };
    const keepers = newXi
      .map(id => allKnownPlayers.find(p => p.playerId === id))
      .filter(p => p?.wicketKeeper);
    if (keepers.length === 1 && keepers[0]) {
      next.wicketKeeperPlayerId = keepers[0].playerId;
    }
    persist(next);
  };

  const removePlayer = (playerId: number) => {
    const newXi = (side.playingXi ?? []).filter(id => id !== playerId);
    const next: MatchSide = {
      ...side,
      playingXi: newXi,
      wicketKeeperPlayerId:
        side.wicketKeeperPlayerId === playerId ? undefined : side.wicketKeeperPlayerId,
    };
    const keepers = newXi
      .map(id => allKnownPlayers.find(p => p.playerId === id))
      .filter(p => p?.wicketKeeper);
    if (keepers.length === 1 && keepers[0] && next.wicketKeeperPlayerId == null) {
      next.wicketKeeperPlayerId = keepers[0].playerId;
    }
    persist(next);
  };

  const handleXiItemDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const src = dragSource.current;
    if (!src || announced) return;

    if (src.type === 'xi') {
      const from = src.index;
      if (from === idx) return;
      const xi = [...(side.playingXi ?? [])];
      const [moved] = xi.splice(from, 1);
      xi.splice(idx, 0, moved);
      dragSource.current = { type: 'xi', index: idx };
      setSide(s => ({ ...s, playingXi: xi }));
    } else if (src.type === 'squad') {
      const rect = e.currentTarget.getBoundingClientRect();
      const insertAt = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
      setDropIndex(insertAt);
    }
  };

  const handleXiAreaDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const src = dragSource.current;
    if (src?.type === 'squad') {
      setDropIndex((side.playingXi ?? []).length);
    }
  };

  const handleXiDrop = () => {
    const src = dragSource.current;
    const insertAt = dropIndex;
    dragSource.current = null;
    setDropIndex(null);
    if (!src || announced) return;
    if (src.type === 'squad' && availabilityMap[src.playerId] !== 'NO') {
      addPlayerAt(src.playerId, insertAt ?? (side.playingXi ?? []).length);
    } else if (src.type === 'xi') {
      persist(side);
    }
  };

  const handleTwelfthDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSource.current?.type === 'squad') setTwelfthHover(true);
  };

  const handleTwelfthDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setTwelfthHover(false);
  };

  const handleTwelfthDrop = (e: React.DragEvent) => {
    e.stopPropagation();
    setTwelfthHover(false);
    const src = dragSource.current;
    dragSource.current = null;
    setDropIndex(null);
    if (src?.type === 'squad' && !announced) {
      persist({ ...side, twelfthManPlayerId: src.playerId });
    }
  };

  const announced = !!side.teamAnnounced;

  const xi = (side.playingXi ?? [])
    .map(pid => allKnownPlayers.find(p => p.playerId === pid))
    .filter(Boolean) as Player[];

  const keepersInXi = xi.filter(p => p.wicketKeeper);
  const selectedWK = xi.find(p => p.playerId === side.wicketKeeperPlayerId) ?? null;
  const selectedCaptain = xi.find(p => p.playerId === side.captainPlayerId) ?? null;
  const twelfthMan = allKnownPlayers.find(p => p.playerId === side.twelfthManPlayerId);

  const available = players.filter(
    p => !side.playingXi?.includes(p.playerId!) && p.playerId !== side.twelfthManPlayerId,
  );

  const canAddMore = xi.length < 11 && !announced;

  const overrideAvailability = async (status: AvailabilityStatus) => {
    if (!overridePlayer) return;
    await pollApi.setPlayerAvailability(matchId, teamId, overridePlayer.playerId!, status);
    setAvailabilityMap(m => ({ ...m, [overridePlayer.playerId!]: status }));
    setOverridePlayer(null);
  };

  useEffect(() => {
    if (!subOpen) return;
    setSubLoading(true);
    playerApi.findAll()
      .then(setSubAllPlayers)
      .catch(() => setSubAllPlayers([]))
      .finally(() => setSubLoading(false));
  }, [subOpen]);

  const addSubstitute = (player: Player) => {
    setSubOpen(false);
    setSubSearch('');
    setSubstituteDetails(prev => [...prev.filter(p => p.playerId !== player.playerId), player]);
    if (xi.length < 11) {
      addPlayerAt(player.playerId!, xi.length);
    } else {
      persist({ ...side, twelfthManPlayerId: player.playerId });
    }
  };

  const squadIds = new Set(players.map(p => p.playerId));
  const subFiltered = subAllPlayers.filter(p => {
    if (squadIds.has(p.playerId)) return false;
    if (side.playingXi?.includes(p.playerId!) || p.playerId === side.twelfthManPlayerId) return false;
    if (!subSearch.trim()) return true;
    const q = subSearch.toLowerCase();
    return `${p.name} ${p.surname}`.toLowerCase().includes(q);
  });

  const availabilityIcon = (p: Player) => {
    const status = availabilityMap[p.playerId!];
    if (!status) return null;
    if (status === 'YES') return (
      <Tooltip title="Available">
        <CheckCircle sx={{ fontSize: 22, color: 'success.main' }} />
      </Tooltip>
    );
    if (status === 'UNSURE') return (
      <Tooltip title="Unsure — click to override" arrow>
        <IconButton size="small" onClick={() => setOverridePlayer(p)} sx={{ p: 0 }}>
          <HelpOutline sx={{ fontSize: 22, color: 'warning.main' }} />
        </IconButton>
      </Tooltip>
    );
    return (
      <Tooltip title="Not available — click to mark as available" arrow>
        <IconButton size="small" onClick={() => setOverridePlayer(p)} sx={{ p: 0 }}>
          <Cancel sx={{ fontSize: 22, color: 'error.main' }} />
        </IconButton>
      </Tooltip>
    );
  };

  const dropLine = (
    <Box sx={{ height: 2, bgcolor: 'primary.main', borderRadius: 1, mx: 0.5, my: 0.25 }} />
  );

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>

      {/* Left: Available Squad */}
      <Paper variant="outlined" sx={{ p: 2, flex: '0 0 400px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">Available Squad</Typography>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<PersonAdd />}
            disabled={announced}
            onClick={() => { setSubOpen(true); setSubSearch(''); setSubAllPlayers([]); }}
          >
            Add Substitute
          </Button>
        </Box>
        {available.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            All squad members are in the XI
          </Typography>
        ) : (
          <List dense disablePadding>
            {available.map(p => {
              const unavailable = availabilityMap[p.playerId!] === 'NO';
              const draggable = canAddMore && !unavailable;
              return (
                <ListItem
                  key={p.playerId}
                  draggable={draggable}
                  onDragStart={() => {
                    dragSource.current = { type: 'squad', playerId: p.playerId! };
                  }}
                  onDragEnd={() => {
                    dragSource.current = null;
                    setDropIndex(null);
                  }}
                  sx={{
                    borderRadius: 1,
                    cursor: draggable ? 'grab' : 'default',
                    opacity: unavailable || !canAddMore ? 0.5 : 1,
                    '&:hover': draggable ? { bgcolor: 'action.hover' } : {},
                    '&:active': { cursor: draggable ? 'grabbing' : 'default' },
                  }}
                >
                  <DragIndicator sx={{ color: 'text.disabled', mr: 0.5, flexShrink: 0, fontSize: 18 }} />
                  {availabilityIcon(p)}
                  <ListItemText
                    sx={{ ml: availabilityMap[p.playerId!] ? 0.5 : 0 }}
                    primary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {`${p.name} ${p.surname}`}
                        {p.shirtNumber != null && (
                          <Typography component="span" variant="caption" color="text.secondary">
                            #{p.shirtNumber}
                          </Typography>
                        )}
                        {p.wicketKeeper && (
                          <Typography component="span" sx={{ fontSize: '0.75rem' }}>🧤</Typography>
                        )}
                        {p.bowlingType && p.bowlingType !== 'NONE' && !p.partTimeBowler && (
                          <Box component="span" sx={{
                            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                            bgcolor: '#c0392b', border: '1px solid #922b21', flexShrink: 0,
                          }} />
                        )}
                      </Box>
                    }
                    secondary={[
                      formatEnum(p.battingStance),
                      p.bowlingType && p.bowlingType !== 'NONE' ? formatEnum(p.bowlingType) : '',
                    ].filter(Boolean).join(' · ')}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>

      {/* Right: Playing XI + selectors */}
      <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">{teamName}</Typography>
          <Chip label={`${xi.length}/11`} size="small" color={xi.length === 11 ? 'success' : 'warning'} />
        </Box>

        {side.teamAnnounced ? (
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Chip icon={<CheckCircle />} label="Team Announced" color="success" variant="outlined" sx={{ flex: 1 }} />
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<Edit />}
              onClick={() => setEditConfirmOpen(true)}
            >
              Edit
            </Button>
          </Box>
        ) : (
          <Button
            variant="outlined"
            color="success"
            fullWidth
            startIcon={<Campaign />}
            onClick={() => setConfirmOpen(true)}
            disabled={xi.length < 11}
            sx={{ mb: 1 }}
          >
            Announce Team
          </Button>
        )}

        <Divider sx={{ mb: 1 }} />

        {/* XI drop zone */}
        <Box
          onDragOver={handleXiAreaDragOver}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDropIndex(null);
            }
          }}
          onDrop={handleXiDrop}
          sx={{ minHeight: 80 }}
        >
          {xi.length === 0 ? (
            <Box sx={{
              py: 3, textAlign: 'center', border: '2px dashed',
              borderColor: dropIndex != null ? 'primary.main' : 'divider',
              borderRadius: 1,
              bgcolor: dropIndex != null ? 'primary.50' : 'transparent',
              transition: 'all 0.15s',
            }}>
              <Typography variant="body2" color={dropIndex != null ? 'primary.main' : 'text.secondary'}>
                Drag players here
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {xi.map((p, idx) => {
                const isWK = p.playerId === side.wicketKeeperPlayerId;
                const isCaptain = p.playerId === side.captainPlayerId;
                return (
                  <React.Fragment key={p.playerId}>
                    {dropIndex === idx && dropLine}
                    <ListItem
                      disablePadding
                      draggable={!announced}
                      onDragStart={() => {
                        if (!announced) dragSource.current = { type: 'xi', index: idx };
                      }}
                      onDragEnd={() => { dragSource.current = null; }}
                      onDragOver={(e) => !announced && handleXiItemDragOver(e, idx)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        pr: 5,
                        cursor: announced ? 'default' : 'grab',
                        borderRadius: 1,
                        '&:active': { cursor: announced ? 'default' : 'grabbing' },
                      }}
                      secondaryAction={
                        <IconButton size="small" onClick={() => removePlayer(p.playerId!)} disabled={announced}>
                          <Delete fontSize="small" />
                        </IconButton>
                      }
                    >
                      <DragIndicator sx={{ color: 'text.disabled', mr: 0.5, flexShrink: 0 }} />
                      <ListItemText
                        primary={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {`${idx + 1}. ${p.name} ${p.surname}`}
                            {isCaptain && <Typography component="span" sx={{ fontSize: '0.85rem' }}>👑</Typography>}
                            {isWK && <Typography component="span" sx={{ fontSize: '0.85rem' }}>🧤</Typography>}
                            {['OPENER', 'TOP_ORDER', 'MIDDLE_ORDER'].includes(p.battingPosition ?? '') && (
                              <SportsCricket sx={{ fontSize: 13, color: 'text.secondary' }} />
                            )}
                            {p.bowlingType && p.bowlingType !== 'NONE' && !p.partTimeBowler && (
                              <Box component="span" sx={{
                                display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
                                bgcolor: '#c0392b', border: '1px solid #922b21', flexShrink: 0,
                              }} />
                            )}
                          </Box>
                        }
                        secondary={[
                          formatEnum(p.battingStance),
                          p.bowlingType && p.bowlingType !== 'NONE' ? formatEnum(p.bowlingType) : '',
                          p.wicketKeeper ? 'Keeper' : '',
                        ].filter(Boolean).join(' · ')}
                      />
                    </ListItem>
                  </React.Fragment>
                );
              })}
              {dropIndex === xi.length && dropLine}
            </List>
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>12th Man</Typography>
        <Box
          onDragOver={handleTwelfthDragOver}
          onDragLeave={handleTwelfthDragLeave}
          onDrop={handleTwelfthDrop}
          sx={{
            border: '2px dashed',
            borderColor: twelfthHover ? 'primary.main' : 'divider',
            borderRadius: 1,
            px: 1.5,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            bgcolor: twelfthHover ? 'action.hover' : 'transparent',
            transition: 'border-color 0.15s, background-color 0.15s',
            mb: 2,
          }}
        >
          {twelfthMan ? (
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DragIndicator sx={{ color: 'text.disabled', fontSize: 18 }} />
                <Typography variant="body2">
                  {twelfthMan.name} {twelfthMan.surname}
                  {twelfthMan.shirtNumber != null && (
                    <Typography component="span" variant="caption" color="text.secondary"> #{twelfthMan.shirtNumber}</Typography>
                  )}
                </Typography>
              </Box>
              <IconButton size="small" disabled={announced} onClick={() => persist({ ...side, twelfthManPlayerId: undefined })}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ width: '100%', textAlign: 'center' }}>
              Drag 12th man here
            </Typography>
          )}
        </Box>

        {keepersInXi.length > 0 && (
          <Autocomplete
            options={keepersInXi}
            getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
            value={selectedWK}
            onChange={(_, p) => persist({ ...side, wicketKeeperPlayerId: p?.playerId ?? undefined })}
            disabled={announced}
            renderInput={params => (
              <TextField
                {...params}
                label="🧤 Wicket Keeper"
                size="small"
                helperText={keepersInXi.length > 1 ? `${keepersInXi.length} keepers in XI — select one` : undefined}
              />
            )}
            sx={{ mb: 2 }}
            blurOnSelect
            disableClearable={keepersInXi.length === 1}
          />
        )}

        {xi.length > 0 && (
          <Autocomplete
            options={xi}
            getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
            value={selectedCaptain}
            onChange={(_, p) => persist({ ...side, captainPlayerId: p?.playerId ?? undefined })}
            disabled={announced}
            renderInput={params => <TextField {...params} label="👑 Captain" size="small" />}
            sx={{ mb: 1 }}
            blurOnSelect
          />
        )}

        <Dialog open={subOpen} onClose={() => setSubOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Substitute Player</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              placeholder="Search by name..."
              value={subSearch}
              onChange={e => setSubSearch(e.target.value)}
              sx={{ mt: 1, mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {subLoading ? <CircularProgress size={18} /> : <Search fontSize="small" />}
                  </InputAdornment>
                ),
              }}
            />
            {subLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            {!subLoading && subFiltered.length === 0 && (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                {subSearch.trim() ? 'No players found' : 'No non-squad players available'}
              </Typography>
            )}
            <List dense disablePadding>
              {subFiltered.slice(0, 20).map(p => (
                  <ListItem
                    key={p.playerId}
                    button
                    onClick={() => addSubstitute(p)}
                    sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <ListItemText
                      primary={`${p.name} ${p.surname}${p.shirtNumber != null ? ` #${p.shirtNumber}` : ''}`}
                      secondary={[
                        p.homeClubName,
                        formatEnum(p.battingStance),
                        p.bowlingType && p.bowlingType !== 'NONE' ? formatEnum(p.bowlingType) : '',
                        p.wicketKeeper ? 'Keeper' : '',
                      ].filter(Boolean).join(' · ')}
                    />
                  {xi.length >= 11
                    ? <Chip label="→ 12th Man" size="small" color="info" />
                    : <Chip label="→ XI" size="small" color="success" />
                  }
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={!!overridePlayer} onClose={() => setOverridePlayer(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Override Availability</DialogTitle>
          <DialogContent>
            <Typography>
              <strong>{overridePlayer?.name} {overridePlayer?.surname}</strong> has indicated they are not available for this match. You can override their availability below.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOverridePlayer(null)}>Cancel</Button>
            <Button variant="outlined" color="warning" startIcon={<HelpOutline />} onClick={() => overrideAvailability('UNSURE')}>
              Mark Unsure
            </Button>
            <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => overrideAvailability('YES')}>
              Mark Available
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Announce Team</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to announce the {teamName} team? All selected players will receive a notification and this action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="success"
              onClick={async () => {
                setConfirmOpen(false);
                await persist({ ...side, teamAnnounced: true });
              }}
            >
              Confirm &amp; Announce
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={editConfirmOpen} onClose={() => setEditConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" /> Edit Announced Team
          </DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              This team has already been announced and players may have been notified of their selection.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              If you re-announce after making changes, players added to the team will be notified and notifications for any removed players will be withdrawn.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={async () => {
                setEditConfirmOpen(false);
                await persist({ ...side, teamAnnounced: false });
              }}
            >
              Edit Team
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};
