import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Card, CardActionArea, CardContent,
  Avatar, TextField, MenuItem, IconButton, Tooltip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import { Diversity3, Share, Edit, ArrowBack } from '@mui/icons-material';
import { teamApi } from '../../api/teamApi';
import { playerApi } from '../../api/playerApi';
import { clubApi } from '../../api/clubApi';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { Team, Player, Club } from '../../types';
import { PlayerEditForm } from '../../components/player/PlayerEditForm';
import { SquadViewDialog } from './SquadViewDialog';

interface TeamSquadEntry {
  team: Team;
  squad: Player[];
}

// Compact player badge — clickable to open player info
const SquadPlayerBadge: React.FC<{
  player: Player;
  isCaptain: boolean;
  onClick: (e: React.MouseEvent) => void;
}> = ({ player, isCaptain, onClick }) => (
  <Tooltip title={`${player.name} ${player.surname}${isCaptain ? ' (C)' : ''}`}>
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', width: 52,
        cursor: 'pointer',
        '&:hover .squad-avatar': { borderColor: 'primary.dark' },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Avatar
          className="squad-avatar"
          src={player.profilePictureUrl ?? undefined}
          sx={{
            width: 40, height: 40, fontSize: 14,
            bgcolor: 'primary.main',
            border: '2px solid', borderColor: 'primary.light',
            transition: 'border-color 0.15s',
          }}
        >
          {player.name.charAt(0)}
        </Avatar>
        {isCaptain && (
          <Box sx={{
            position: 'absolute', bottom: -3, right: -3,
            bgcolor: '#1565c0', color: '#fff',
            borderRadius: 1, px: 0.4, lineHeight: 1.4,
            fontSize: '0.55rem', fontWeight: 'bold',
          }}>
            C
          </Box>
        )}
      </Box>
      <Typography variant="caption" sx={{
        mt: 0.5, fontSize: '0.6rem', textAlign: 'center',
        lineHeight: 1.2, width: 52,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {`${player.name} ${player.surname.charAt(0)}.`}
      </Typography>
    </Box>
  </Tooltip>
);

export const TeamSquadOverview: React.FC = () => {
  const { teamIds: managerTeamIds, restrictByTeam, homeClubId, loaded: teamsLoaded } = useManagerTeams();
  const [entries, setEntries] = useState<TeamSquadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<number | ''>('');
  const [viewState, setViewState] = useState<{ teamId: number; autoOpenShare: boolean; editMode: boolean } | null>(null);
  const loadRef = useRef(0);

  // Player info dialog state
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    clubApi.findAll().then(setClubs).catch(() => {});
  }, []);

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

  const load = useCallback(async () => {
    const tick = ++loadRef.current;
    const allTeams = await teamApi.findAll();

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

    const relevantTeams = allTeams
      .filter(t => t.teamId != null && relevantTeamIds.has(t.teamId!))
      .sort((a, b) => a.teamName.localeCompare(b.teamName));

    const squadResults = await Promise.allSettled(
      relevantTeams.map(t => teamApi.getSquad(t.teamId!))
    );

    if (tick !== loadRef.current) return;

    const result: TeamSquadEntry[] = relevantTeams.map((team, i) => {
      const r = squadResults[i];
      const squad: Player[] = r.status === 'fulfilled' ? r.value : [];
      return { team, squad };
    });

    setEntries(result);
  }, [restrictByTeam, managerTeamIds, homeClubId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!teamsLoaded) return;
    setLoading(true);
    load().catch(() => {}).finally(() => setLoading(false));
  }, [teamsLoaded, load]);

  if (!teamsLoaded || loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  const displayEntries = selectedTeamFilter
    ? entries.filter(e => e.team.teamId === selectedTeamFilter)
    : entries;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Diversity3 color="primary" />
          <Typography variant="h5">Team Squad</Typography>
        </Box>
        {entries.length > 1 && (
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
            {entries.map(e => (
              <MenuItem key={e.team.teamId} value={e.team.teamId}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: 'primary.main' }}>
                    {e.team.teamName.charAt(0)}
                  </Avatar>
                  {e.team.teamName}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      {entries.length === 0 ? (
        <Alert severity="info" icon={<Diversity3 />}>
          No teams found for your managed club.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {displayEntries.map(({ team, squad }) => {
            const captainId = team.captainId;

            return (
              <Card
                key={team.teamId}
                variant="outlined"
                sx={{
                  flex: '1 1 300px',
                  minWidth: 280,
                  borderColor: 'divider',
                  borderLeftWidth: 4,
                  borderLeftColor: squad.length > 0 ? 'success.main' : 'divider',
                  borderRadius: 1,
                  position: 'relative',
                }}
              >
                {/* Share button — top-right, outside CardActionArea */}
                <Tooltip title="Share squad">
                  <IconButton
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      setViewState({ teamId: team.teamId!, autoOpenShare: true, editMode: false });
                    }}
                    sx={{ position: 'absolute', top: 6, right: 6, color: 'text.secondary', zIndex: 1 }}
                  >
                    <Share sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>

                {/* Pencil button — bottom-right, opens in edit mode */}
                <Tooltip title="Edit squad">
                  <IconButton
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      setViewState({ teamId: team.teamId!, autoOpenShare: false, editMode: true });
                    }}
                    sx={{ position: 'absolute', bottom: 6, right: 6, color: 'text.secondary', zIndex: 1 }}
                  >
                    <Edit sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>

                <CardActionArea
                  onClick={() => setViewState({ teamId: team.teamId!, autoOpenShare: false, editMode: false })}
                  sx={{ height: '100%', alignItems: 'flex-start' }}
                >
                  <CardContent sx={{ pb: '36px !important', pr: 5 }}>
                    {/* Title row */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.25 }}>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ flex: 1, minWidth: 0 }}>
                        {team.teamName}
                      </Typography>
                      <Typography variant="caption" fontWeight="medium" sx={{ color: squad.length > 0 ? 'success.main' : 'text.disabled', flexShrink: 0 }}>
                        {squad.length > 0 ? `${squad.length} players` : 'No squad'}
                      </Typography>
                    </Box>

                    {/* Club name */}
                    {team.associatedClubName && (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ mb: 1.25 }}>
                        {team.associatedClubName}
                      </Typography>
                    )}

                    {/* Player badges */}
                    {squad.length > 0 && (
                      <>
                        <Divider sx={{ mb: 1.25 }} />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                          {squad.map(p => (
                            <SquadPlayerBadge
                              key={p.playerId}
                              player={p}
                              isCaptain={p.playerId === captainId}
                              onClick={e => openPlayerDialog(e, p.playerId!)}
                            />
                          ))}
                        </Box>
                      </>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}

      <SquadViewDialog
        open={viewState != null}
        onClose={() => setViewState(null)}
        teamId={viewState?.teamId ?? null}
        autoOpenShare={viewState?.autoOpenShare ?? false}
        initialEditing={viewState?.editMode ?? false}
        onSquadChange={() => load().catch(() => {})}
      />

      {/* Player info dialog */}
      <Dialog
        open={playerLoading || !!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        maxWidth="md"
        fullWidth
      >
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
