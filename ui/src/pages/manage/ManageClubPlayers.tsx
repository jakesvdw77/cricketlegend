import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent,
  Avatar, Button, Chip, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Person, Shield, SportsCricket, ArrowBack, Search, Add, Phone,
} from '@mui/icons-material';
import { playerApi } from '../../api/playerApi';
import { clubApi } from '../../api/clubApi';
import { Player, Club } from '../../types';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { formatEnum } from '../../utils/formatEnum';
import { PlayerEditForm } from '../../components/player/PlayerEditForm';

const emptyPlayer = (homeClubId: number | null, homeClubName: string | undefined): Player => ({
  name: '',
  surname: '',
  homeClubId: homeClubId ?? undefined,
  homeClubName: homeClubName ?? undefined,
});

type OrderBy = 'name' | 'surname';

export const ManageClubPlayers: React.FC = () => {
  const { squadPlayerIds, restrictByTeam, homeClubId, loaded } = useManagerTeams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<OrderBy>('surname');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const homeClub = clubs.find(c => c.clubId === homeClubId);

  const applyRestriction = (all: Player[]) =>
    restrictByTeam ? all.filter(p => squadPlayerIds.has(p.playerId!)) : all;

  const loadAll = (ob: OrderBy) =>
    playerApi.findAll(ob).then(all => setPlayers(applyRestriction(all)));

  const loadSearch = (q: string, ob: OrderBy) =>
    playerApi.search(q, ob).then(all => setPlayers(applyRestriction(all)));

  const load = (q = search, ob = orderBy) =>
    q.trim() ? loadSearch(q.trim(), ob) : loadAll(ob);

  useEffect(() => {
    if (!loaded) return;
    Promise.all([loadAll(orderBy), clubApi.findAll().then(setClubs)]).finally(() => setLoading(false));
  }, [loaded, restrictByTeam, squadPlayerIds]);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(q, orderBy), 300);
  };

  const handleOrderByChange = (ob: OrderBy) => {
    setOrderBy(ob);
    load(search, ob);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: Player = {
        ...editing,
        bowlingType: editing.bowlingType || undefined,
        bowlingArm: editing.bowlingArm || undefined,
        battingStance: editing.battingStance || undefined,
        battingPosition: editing.battingPosition || undefined,
      };
      if (editing.playerId) {
        await playerApi.update(editing.playerId, payload);
      } else {
        await playerApi.create(payload);
      }
      setEditing(null);
      await load(search, orderBy);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !loaded) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 3 }}>Manage Players</Typography>
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Manage Players</Typography>
        <Chip label={`${players.length} player${players.length !== 1 ? 's' : ''}`} size="small" sx={{ mr: 1 }} />
        <Button
          variant="contained"
          startIcon={<Add />}
          size="small"
          onClick={() => setEditing(emptyPlayer(homeClubId, homeClub?.name))}
        >
          Add Player
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'center' }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={orderBy}
          onChange={(_, v) => v && handleOrderByChange(v)}
        >
          <ToggleButton value="name">First Name</ToggleButton>
          <ToggleButton value="surname">Surname</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          size="small"
          placeholder="Search by name or surname…"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {(() => {
        return players.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Person sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6">{search.trim() ? 'No players match your search' : 'No players found'}</Typography>
          {!search.trim() && <Typography variant="body2">Players will appear here once they are added to your team squads.</Typography>}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {players.map(player => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={player.playerId}>
              <PlayerCard
                player={player}
                onEdit={setEditing}
              />
            </Grid>
          ))}
        </Grid>
      );
      })()}

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button startIcon={<ArrowBack />} onClick={() => setEditing(null)} sx={{ mr: 1 }}>
            Back
          </Button>
          {editing
            ? editing.playerId
              ? `${editing.name} ${editing.surname}`
              : 'New Player'
            : ''}
        </DialogTitle>
        <DialogContent dividers>
          {editing && (
            <PlayerEditForm
              editing={editing}
              onChange={patch => setEditing(e => e ? { ...e, ...patch } : e)}
              clubs={clubs}
              readOnlyConsent
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

interface PlayerCardProps {
  player: Player;
  onEdit: (player: Player) => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onEdit }) => {
  const displayName = `${player.name} ${player.surname}`;
  const initials = `${player.name.charAt(0)}${player.surname.charAt(0)}`.toUpperCase();

  const battingLabel = [player.battingPosition, player.battingStance]
    .filter(Boolean)
    .map(v => formatEnum(v))
    .join(' · ');

  const bowlingLabel = [player.bowlingArm, player.bowlingType]
    .filter(Boolean)
    .map(v => formatEnum(v))
    .join(' · ');

  return (
    <Card
      variant="outlined"
      onClick={() => onEdit(player)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <Avatar
            src={player.profilePictureUrl}
            sx={{ width: 56, height: 56, flexShrink: 0, bgcolor: 'primary.main', fontSize: 20 }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight="bold" noWrap>
              {displayName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
              {player.shirtNumber != null && (
                <Chip label={`#${player.shirtNumber}`} size="small" variant="outlined" />
              )}
              {player.wicketKeeper && (
                <Chip label="WK" size="small" color="secondary" variant="outlined" />
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {player.homeClubName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Shield sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" noWrap>{player.homeClubName}</Typography>
            </Box>
          )}
          {player.contactNumber && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Phone sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" noWrap>{player.contactNumber}</Typography>
            </Box>
          )}
          {battingLabel && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SportsCricket sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" noWrap>Bat: {battingLabel}</Typography>
            </Box>
          )}
          {bowlingLabel && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SportsCricket sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0, transform: 'scaleX(-1)' }} />
              <Typography variant="body2" color="text.secondary" noWrap>Bowl: {bowlingLabel}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
