import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Avatar, List, ListItem, ListItemAvatar, ListItemText,
  TextField, MenuItem, Divider, Autocomplete, Chip, InputAdornment, IconButton,
} from '@mui/material';
import { ArrowBack, Print, PersonAdd, PersonRemove, Search, Share, SportsCricket } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { teamApi } from '../../api/teamApi';
import { clubApi } from '../../api/clubApi';
import { playerApi } from '../../api/playerApi';
import { Team, Player, Club } from '../../types';
import { playerDescription } from '../../utils/playerDescription';
import { printSquad } from '../../utils/printSquad';
import SquadShareDialog from './SquadShareDialog';

export const TeamSquad: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const id = Number(teamId);

  const [team, setTeam]       = useState<Team | null>(null);
  const [squad, setSquad]     = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [clubs, setClubs]     = useState<Club[]>([]);
  const [availSearch, setAvailSearch] = useState('');
  const [availClubId, setAvailClubId] = useState<number | ''>('');
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    teamApi.findById(id).then(t => {
      setTeam(t);
      setAvailClubId(t.associatedClubId ?? '');
    });
    teamApi.getSquad(id).then(setSquad);
    playerApi.findAll().then(setAllPlayers);
    clubApi.findAll().then(setClubs);
  }, [id]);

  const addToSquad = async (player: Player) => {
    await teamApi.addToSquad(id, player.playerId!);
    setSquad(s => [...s, player]);
  };

  const removeFromSquad = async (playerId: number) => {
    await teamApi.removeFromSquad(id, playerId);
    setSquad(s => s.filter(p => p.playerId !== playerId));
  };

  const setCaptain = async (playerId: number | null) => {
    if (!team) return;
    const updated = {
      ...team,
      captainId: playerId ?? undefined,
      captainName: squad.find(p => p.playerId === playerId)?.name,
    };
    await teamApi.update(id, updated);
    setTeam(updated);
  };

  const available = allPlayers
    .filter(p => {
      if (squad.some(s => s.playerId === p.playerId)) return false;
      if (availClubId && p.homeClubId !== availClubId) return false;
      const q = availSearch.toLowerCase();
      if (q && !`${p.name} ${p.surname}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5">Squad — {team?.teamName}</Typography>
          {team?.associatedClubName && (
            <Typography variant="body2" color="text.secondary">{team.associatedClubName}</Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/admin/teams')}>
            Back
          </Button>
          <Button
            variant="outlined"
            startIcon={<Share />}
            onClick={() => setShareOpen(true)}
            disabled={!team || squad.length === 0}
          >
            Share / Notify
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => printSquad(team!, [...squad].sort((a, b) => a.name.localeCompare(b.name)))}
            disabled={!team}
          >
            Print / Export PDF
          </Button>
        </Box>
      </Box>

      {/* Two-panel layout */}
      <Box sx={{ display: 'flex', flex: 1, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', minHeight: 0, bgcolor: 'background.paper' }}>

        {/* Left: Available Players */}
        <Box sx={{ flex: 8, display: 'flex', flexDirection: 'column', p: 2, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>Available Players</Typography>

          <TextField
            select size="small" label="Club" value={availClubId}
            onChange={e => setAvailClubId(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ mb: 1 }}
          >
            <MenuItem value="">All clubs</MenuItem>
            {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
          </TextField>

          <TextField
            size="small" placeholder="Search name…" value={availSearch}
            onChange={e => setAvailSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
            sx={{ mb: 1.5 }}
          />

          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {available.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No players found.</Typography>
            ) : (
              <List dense disablePadding>
                {available.map(p => (
                  <ListItem
                    key={p.playerId}
                    disablePadding
                    secondaryAction={
                      <IconButton size="small" color="primary" onClick={() => addToSquad(p)} title="Add to squad">
                        <PersonAdd fontSize="small" />
                      </IconButton>
                    }
                    sx={{ py: 0.5, cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => addToSquad(p)}
                  >
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <Avatar src={p.profilePictureUrl} sx={{ width: 28, height: 28, fontSize: 12 }}>
                        {p.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
                      secondary={playerDescription(p)}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Right: Squad */}
        <Box sx={{ flex: 10, display: 'flex', flexDirection: 'column', p: 2, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
            Squad · {squad.length} player{squad.length !== 1 ? 's' : ''}
          </Typography>

          <Autocomplete
            options={squad}
            getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
            value={squad.find(p => p.playerId === team?.captainId) ?? null}
            onChange={(_, p) => setCaptain(p?.playerId ?? null)}
            isOptionEqualToValue={(o, v) => o.playerId === v.playerId}
            renderInput={params => <TextField {...params} label="Captain" size="small" />}
            sx={{ mb: 1.5 }}
          />

          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <List dense disablePadding>
              {squad.map(p => (
                <ListItem
                  key={p.playerId}
                  disablePadding
                  secondaryAction={
                    <IconButton size="small" onClick={() => removeFromSquad(p.playerId!)} title="Remove from squad">
                      <PersonRemove fontSize="small" />
                    </IconButton>
                  }
                  sx={{ py: 0.5 }}
                >
                  <ListItemAvatar sx={{ minWidth: 36 }}>
                    <Avatar src={p.profilePictureUrl} sx={{ width: 28, height: 28, fontSize: 12 }}>
                      {p.name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {p.wicketKeeper && <Box component="span" sx={{ fontSize: 13, lineHeight: 1 }}>🧤</Box>}
                        {['OPENER', 'TOP_ORDER', 'MIDDLE_ORDER'].includes(p.battingPosition!) && (
                          <SportsCricket sx={{ fontSize: 14, color: 'text.secondary' }} />
                        )}
                        {p.bowlingType && p.bowlingType !== 'NONE' && !p.partTimeBowler && (
                          <Box component="span" sx={{
                            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                            bgcolor: '#c0392b', border: '1px solid #922b21',
                          }} />
                        )}
                        {`${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
                        {p.playerId === team?.captainId && (
                          <Chip label="C" size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem', ml: 0.5 }} />
                        )}
                      </Box>
                    }
                    secondary={playerDescription(p)}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Box>

      </Box>

      {team && (
        <SquadShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          team={team}
          squad={squad}
        />
      )}
    </Box>
  );
};
