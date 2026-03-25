import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, Autocomplete, TextField,
  List, ListItem, ListItemText, IconButton, Chip, Divider,
  FormControlLabel, Checkbox,
} from '@mui/material';
import { Delete, DragIndicator, SportsCricket } from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { MatchSide, Player } from '../../types';
import { formatEnum } from '../../utils/formatEnum';

interface Props {
  matchId: number;
  teamId: number;
  teamName: string;
  players: Player[];
}

export const TeamSidePanel: React.FC<Props> = ({ matchId, teamId, teamName, players }) => {
  const [side, setSide] = useState<MatchSide>({ matchId, teamId, playingXi: [] });
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    matchApi.getTeamSheet(matchId).then(sides => {
      const existing = sides.find(s => s.teamId === teamId);
      if (existing) setSide(existing);
    });
  }, [matchId, teamId]);

  const persist = async (next: MatchSide) => {
    const saved = await matchApi.saveTeamSheet(matchId, next);
    setSide(saved);
  };

  const addPlayer = (playerId: number) => {
    if (side.playingXi?.includes(playerId)) return;
    const newXi = [...(side.playingXi ?? []), playerId];
    const next: MatchSide = { ...side, playingXi: newXi };
    // Auto-select WK if this is the only keeper in the XI
    const keepers = newXi
      .map(id => players.find(p => p.playerId === id))
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
      // Clear WK if the removed player was selected as WK
      wicketKeeperPlayerId:
        side.wicketKeeperPlayerId === playerId ? undefined : side.wicketKeeperPlayerId,
    };
    // Re-auto-select if exactly one keeper remains
    const keepers = newXi
      .map(id => players.find(p => p.playerId === id))
      .filter(p => p?.wicketKeeper);
    if (keepers.length === 1 && keepers[0] && next.wicketKeeperPlayerId == null) {
      next.wicketKeeperPlayerId = keepers[0].playerId;
    }
    persist(next);
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (index: number) => { dragIndex.current = index; };

  const handleDragOver = (e: React.DragEvent, overIndex: number) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === overIndex) return;
    const xi = [...(side.playingXi ?? [])];
    const [moved] = xi.splice(from, 1);
    xi.splice(overIndex, 0, moved);
    dragIndex.current = overIndex;
    setSide(s => ({ ...s, playingXi: xi }));
  };

  const handleDrop = () => { dragIndex.current = null; persist(side); };
  // ──────────────────────────────────────────────────────────────────────────

  const xi = (side.playingXi ?? [])
    .map(pid => players.find(p => p.playerId === pid))
    .filter(Boolean) as Player[];

  // Only players in the XI who are marked as keepers can be the match WK
  const keepersInXi = xi.filter(p => p.wicketKeeper);
  const selectedWK = xi.find(p => p.playerId === side.wicketKeeperPlayerId) ?? null;
  const selectedCaptain = xi.find(p => p.playerId === side.captainPlayerId) ?? null;
  const twelfthMan = players.find(p => p.playerId === side.twelfthManPlayerId);

  const available = players.filter(
    p => !side.playingXi?.includes(p.playerId!) && p.playerId !== side.twelfthManPlayerId,
  );

  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 260 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight="bold">{teamName}</Typography>
        <Chip label={`${xi.length}/11`} size="small" color={xi.length === 11 ? 'success' : 'warning'} />
      </Box>

      <Autocomplete
        key={xi.length}
        options={available}
        getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
        onChange={(_, p) => { if (p) addPlayer(p.playerId!); }}
        renderInput={params => <TextField {...params} label="Add player" size="small" />}
        sx={{ mb: 1 }}
        disabled={xi.length >= 11}
        blurOnSelect
        clearOnBlur
      />

      <List dense disablePadding>
        {xi.map((p, idx) => {
          const isWK = p.playerId === side.wicketKeeperPlayerId;
          const isCaptain = p.playerId === side.captainPlayerId;
          return (
            <ListItem
              key={p.playerId}
              disablePadding
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={handleDrop}
              sx={{
                display: 'flex',
                alignItems: 'center',
                pr: 5,
                cursor: 'grab',
                borderRadius: 1,
                '&:active': { cursor: 'grabbing' },
              }}
              secondaryAction={
                <IconButton size="small" onClick={() => removePlayer(p.playerId!)}>
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
          );
        })}
      </List>

      {xi.length > 0 && <Divider sx={{ my: 1 }} />}

      {/* WK selector — only shown when there are keepers in the XI */}
      {keepersInXi.length > 0 && (
        <Autocomplete
          options={keepersInXi}
          getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
          value={selectedWK}
          onChange={(_, p) => persist({ ...side, wicketKeeperPlayerId: p?.playerId ?? undefined })}
          renderInput={params => (
            <TextField
              {...params}
              label="🧤 Wicket Keeper"
              size="small"
              helperText={keepersInXi.length > 1 ? `${keepersInXi.length} keepers in XI — select one` : undefined}
            />
          )}
          sx={{ mb: 1 }}
          blurOnSelect
          disableClearable={keepersInXi.length === 1}
        />
      )}

      {/* Captain */}
      {xi.length > 0 && (
        <Autocomplete
          options={xi}
          getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
          value={selectedCaptain}
          onChange={(_, p) => persist({ ...side, captainPlayerId: p?.playerId ?? undefined })}
          renderInput={params => <TextField {...params} label="👑 Captain" size="small" />}
          sx={{ mb: 1 }}
          blurOnSelect
        />
      )}

      {/* 12th Man */}
      <Autocomplete
        options={players.filter(p => !side.playingXi?.includes(p.playerId!))}
        getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
        value={twelfthMan ?? null}
        onChange={(_, p) => persist({ ...side, twelfthManPlayerId: p?.playerId ?? undefined })}
        renderInput={params => <TextField {...params} label="12th Man" size="small" />}
        blurOnSelect
      />

      <Divider />
      <FormControlLabel
        control={
          <Checkbox
            checked={side.teamAnnounced ?? false}
            onChange={e => persist({ ...side, teamAnnounced: e.target.checked })}
            color="success"
          />
        }
        label="Team Announced"
      />
    </Paper>
  );
};
