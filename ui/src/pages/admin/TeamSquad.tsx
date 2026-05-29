import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Avatar, List, ListItem, ListItemAvatar, ListItemText,
  TextField, MenuItem, Divider, Autocomplete, Chip, InputAdornment, IconButton,
  Tabs, Tab, Menu, useTheme, useMediaQuery,
} from '@mui/material';
import {
  ArrowBack, Print, PersonAdd, PersonRemove, Search, Share, SportsCricket, MoreVert,
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const returnTo: string = (location.state as any)?.returnTo ?? '/admin/teams';
  const id = Number(teamId);

  const [team, setTeam]       = useState<Team | null>(null);
  const [squad, setSquad]     = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [clubs, setClubs]     = useState<Club[]>([]);
  const [availSearch, setAvailSearch] = useState('');
  const [availClubId, setAvailClubId] = useState<number | ''>('');
  const [shareOpen, setShareOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

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

  const closeMenu = () => setMenuAnchor(null);

  // ── Shared squad list ────────────────────────────────────────────────────
  const squadList = (
    <List dense disablePadding>
      {squad.map(p => (
        <ListItem key={p.playerId} disablePadding
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
                  <Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', bgcolor: '#c0392b', border: '1px solid #922b21' }} />
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
  );

  // ── Shared available players list ────────────────────────────────────────
  const availableList = (
    <List dense disablePadding>
      {available.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No players found.</Typography>
      ) : (
        available.map(p => (
          <ListItem key={p.playerId} disablePadding
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
        ))
      )}
    </List>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(returnTo)} sx={{ flexShrink: 0 }}>
            {!isMobile && 'Back'}
          </Button>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant={isMobile ? 'subtitle1' : 'h5'} noWrap>
              {isMobile ? team?.teamName : `Squad — ${team?.teamName}`}
            </Typography>
            {team?.associatedClubName && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {team.associatedClubName}
              </Typography>
            )}
          </Box>
        </Box>

        {isMobile ? (
          <>
            <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} sx={{ flexShrink: 0 }}>
              <MoreVert />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
              <MenuItem onClick={() => { closeMenu(); setShareOpen(true); }} disabled={!team || squad.length === 0}>
                <Share fontSize="small" sx={{ mr: 1 }} /> Share / Notify
              </MenuItem>
              <MenuItem onClick={() => { closeMenu(); printSquad(team!, [...squad].sort((a, b) => a.name.localeCompare(b.name))); }} disabled={!team}>
                <Print fontSize="small" sx={{ mr: 1 }} /> Print / Export PDF
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Button variant="outlined" startIcon={<Share />} onClick={() => setShareOpen(true)} disabled={!team || squad.length === 0}>
              Share / Notify
            </Button>
            <Button variant="outlined" startIcon={<Print />}
              onClick={() => printSquad(team!, [...squad].sort((a, b) => a.name.localeCompare(b.name)))} disabled={!team}>
              Print / Export PDF
            </Button>
          </Box>
        )}
      </Box>

      {/* ── MOBILE layout ─────────────────────────────────────────────────── */}
      {isMobile ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: 'background.paper', minHeight: 0 }}>
          <Tabs value={mobileTab} onChange={(_, v) => setMobileTab(v)} variant="fullWidth" sx={{ flexShrink: 0 }}>
            <Tab label={`Squad (${squad.length})`} />
            <Tab label={`Available (${available.length})`} />
          </Tabs>

          {/* Squad tab */}
          {mobileTab === 0 && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5, minHeight: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {squad.length} player{squad.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <Autocomplete
                options={squad}
                getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
                value={squad.find(p => p.playerId === team?.captainId) ?? null}
                onChange={(_, p) => setCaptain(p?.playerId ?? null)}
                isOptionEqualToValue={(o, v) => o.playerId === v.playerId}
                renderInput={params => <TextField {...params} label="👑 Captain" size="small" />}
                sx={{ mb: 1.5 }}
              />
              <Box sx={{ flex: 1, overflowY: 'auto' }}>{squadList}</Box>
            </Box>
          )}

          {/* Available tab */}
          {mobileTab === 1 && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5, minHeight: 0 }}>
              <TextField fullWidth select size="small" label="Club" value={availClubId}
                onChange={e => setAvailClubId(e.target.value === '' ? '' : Number(e.target.value))}
                sx={{ mb: 1 }}>
                <MenuItem value="">All clubs</MenuItem>
                {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
              </TextField>
              <TextField fullWidth size="small" placeholder="Search name…" value={availSearch}
                onChange={e => setAvailSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
                sx={{ mb: 1.5 }} />
              <Box sx={{ flex: 1, overflowY: 'auto' }}>{availableList}</Box>
            </Box>
          )}
        </Box>
      ) : (
        /* ── DESKTOP layout (unchanged) ───────────────────────────────────── */
        <Box sx={{ display: 'flex', border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: 'background.paper', alignItems: 'flex-start' }}>

          {/* Left: Squad */}
          <Box sx={{ flex: 10, p: 2, minWidth: 0 }}>
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
            {squadList}
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Right: Available Players */}
          <Box sx={{ flex: 8, p: 2, minWidth: 0, position: 'sticky', top: 16 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>Available Players</Typography>
            <TextField fullWidth select size="small" label="Club" value={availClubId}
              onChange={e => setAvailClubId(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ mb: 1 }}>
              <MenuItem value="">All clubs</MenuItem>
              {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
            </TextField>
            <TextField fullWidth size="small" placeholder="Search name…" value={availSearch}
              onChange={e => setAvailSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
              sx={{ mb: 1.5 }} />
            {availableList}
          </Box>

        </Box>
      )}

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
