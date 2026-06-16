import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccessTime,
  Analytics,
  ArrowBack,
  AutoAwesome,
  CalendarMonth,
  Campaign,
  Cancel,
  CheckCircle,
  Close,
  Edit,
  EmojiEvents,
  HelpOutline,
  LocationOn,
  Warning,
} from '@mui/icons-material';

import { AvailabilityStatus, Club, MatchSide, Player } from '../../types';
import { PlayerRoleIcons } from '../../components/player/PlayerRoleIcons';
import { pollApi } from '../../api/pollApi';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { clubApi } from '../../api/clubApi';
import { TeamSidePanel } from '../../components/match/TeamSidePanel';
import { AiTeamPickView } from '../../components/match/AiTeamPickView';
import { MatchAnalysisTab } from '../../components/match/MatchAnalysisTab';
import { PlayerEditForm } from '../../components/player/PlayerEditForm';
import { XiEntry } from './TeamSelectionOverview';

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const fmtTime = (t?: string) => {
  if (!t) return null;
  const [h, m] = t.split(':');
  const d = new Date(); d.setHours(+h, +m);
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
};

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

interface Props {
  open: boolean;
  onClose: () => void;
  entry: XiEntry | null;
  squadMap: Map<number, Player[]>;
  initialEditing?: boolean;
  onEntryChange?: (updated: XiEntry) => void;
}

const AvailIcon: React.FC<{ status?: AvailabilityStatus }> = ({ status }) => {
  if (status === 'YES') return <CheckCircle sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />;
  if (status === 'UNSURE') return (
    <Tooltip title="Unsure">
      <HelpOutline sx={{ fontSize: 16, color: 'warning.main', flexShrink: 0 }} />
    </Tooltip>
  );
  if (status === 'NO') return (
    <Tooltip title="Not available">
      <Cancel sx={{ fontSize: 16, color: 'error.main', flexShrink: 0 }} />
    </Tooltip>
  );
  return <Box sx={{ width: 16, flexShrink: 0 }} />;
};

export const TeamViewDialog: React.FC<Props> = ({
  open, onClose, entry, squadMap, initialEditing, onEntryChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isEditing, setIsEditing] = useState(false);
  const [aiPickOpen, setAiPickOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [announceConfirmOpen, setAnnounceConfirmOpen] = useState(false);
  const [editAnnounceConfirmOpen, setEditAnnounceConfirmOpen] = useState(false);
  const [announcing, setAnnouncing] = useState(false);
  const [localEntry, setLocalEntry] = useState<XiEntry | null>(entry);
  const [availMap, setAvailMap] = useState<Record<number, AvailabilityStatus>>({});
  const [loading, setLoading] = useState(false);

  // Player info dialog
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalEntry(entry);
    setIsEditing(initialEditing ?? false);
    setAiPickOpen(false);
    setAnalysisOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.match.matchId, entry?.teamId, initialEditing]);

  useEffect(() => {
    if (!open || !entry) return;
    setLoading(true);
    pollApi.getPoll(entry.match.matchId!, entry.teamId)
      .then(poll => {
        const m: Record<number, AvailabilityStatus> = {};
        (poll.availability ?? []).forEach(a => { if (a.status) m[a.playerId] = a.status; });
        setAvailMap(m);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, entry]);

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

  const handlePlayerSave = async () => {
    if (!selectedPlayer?.playerId) return;
    setSaving(true);
    try {
      await playerApi.update(selectedPlayer.playerId, selectedPlayer);
      setSelectedPlayer(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSideChange = (side: MatchSide) => {
    if (!localEntry) return;
    const squad = squadMap.get(localEntry.teamId) ?? [];
    const playerById = new Map(squad.map(p => [p.playerId!, p]));
    const players = (side.playingXi ?? []).map(id => playerById.get(id)).filter(Boolean) as Player[];
    const updated: XiEntry = {
      ...localEntry,
      side,
      players,
      captainPlayerId: side.captainPlayerId,
      wicketKeeperPlayerId: side.wicketKeeperPlayerId,
    };
    setLocalEntry(updated);
    onEntryChange?.(updated);
  };

  const handleAnnounce = async () => {
    if (!localEntry) return;
    setAnnouncing(true);
    try {
      const updated = await matchApi.saveTeamSheet(localEntry.match.matchId!, {
        ...(localEntry.side ?? {}),
        matchId: localEntry.match.matchId!,
        teamId: localEntry.teamId,
        teamAnnounced: true,
      } as MatchSide);
      handleSideChange(updated);
    } finally {
      setAnnouncing(false);
      setAnnounceConfirmOpen(false);
    }
  };

  const handleUnannounce = async () => {
    if (!localEntry) return;
    setAnnouncing(true);
    try {
      const updated = await matchApi.saveTeamSheet(localEntry.match.matchId!, {
        ...(localEntry.side ?? {}),
        matchId: localEntry.match.matchId!,
        teamId: localEntry.teamId,
        teamAnnounced: false,
      } as MatchSide);
      handleSideChange(updated);
    } finally {
      setAnnouncing(false);
      setEditAnnounceConfirmOpen(false);
    }
  };

  if (!localEntry) return null;

  const { match, teamId, teamName, side, players } = localEntry;
  const squad = squadMap.get(teamId) ?? [];
  const xiIds = new Set(side?.playingXi ?? []);
  const twelfthId = side?.twelfthManPlayerId;
  const twelfthPlayer = twelfthId ? squad.find(p => p.playerId === twelfthId) : undefined;
  const notSelected = squad.filter(p => !xiIds.has(p.playerId!) && p.playerId !== twelfthId);
  const announced = !!side?.teamAnnounced;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}
    >
      {/* Title bar */}
      <DialogTitle
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          py: 1.5, flexShrink: 0, gap: 1,
          bgcolor: isEditing ? 'action.selected' : undefined,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {match.homeTeamName ?? '—'} vs {match.oppositionTeamName ?? '—'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
            <Chip label={teamName} size="small" variant="outlined" />
            {announced && <Chip label="Announced" size="small" color="primary" icon={<Campaign fontSize="small" />} />}
            {isEditing && <Chip label="Editing" size="small" color="primary" variant="filled" />}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Analyse match">
            <IconButton size="small" onClick={() => setAnalysisOpen(true)}>
              <Analytics fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Pick XI with AI">
            <IconButton size="small" onClick={() => setAiPickOpen(true)} color="default">
              <AutoAwesome fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isEditing ? 'Back to view' : 'Edit team'}>
            <IconButton
              size="small"
              onClick={() => setIsEditing(v => !v)}
              color={isEditing ? 'primary' : 'default'}
            >
              {isEditing ? <ArrowBack /> : <Edit />}
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}><Close /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 0 }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : isEditing ? (
          /* ── Edit mode ── */
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <TeamSidePanel
              matchId={match.matchId!}
              teamId={teamId}
              teamName={teamName}
              players={squad}
              onSideChange={handleSideChange}
            />
          </Box>
        ) : (
          /* ── View mode ── */
          <Box sx={{ flex: 1, overflowY: 'auto' }}>

            {/* Match meta card */}
            <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <CalendarMonth sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{fmtDate(match.matchDate)}</Typography>
                </Box>
                {fmtTime(match.scheduledStartTime) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">{fmtTime(match.scheduledStartTime)}</Typography>
                  </Box>
                )}
                {match.fieldName && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">{match.fieldName}</Typography>
                  </Box>
                )}
                {match.tournamentName && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <EmojiEvents sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {match.tournamentName}
                      {match.matchStage ? ` — ${STAGE_LABELS[match.matchStage] ?? match.matchStage}` : ''}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Body: XI + Not Selected, side by side on desktop */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: 0,
                flex: 1,
              }}
            >
              {/* Playing XI */}
              <Box
                sx={{
                  flex: 1,
                  p: 3,
                  borderRight: isMobile ? 0 : 1,
                  borderBottom: isMobile ? 1 : 0,
                  borderColor: 'divider',
                  minWidth: 0,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight="bold">Playing XI</Typography>
                  <Chip
                    label={`${players.length}/11`}
                    size="small"
                    color={players.length === 11 ? 'success' : 'warning'}
                  />
                </Box>

                {players.length === 0 && !twelfthPlayer ? (
                  <Alert severity="info" icon={false}>
                    XI not selected yet — tap the edit button to pick your team.
                  </Alert>
                ) : (
                  <List dense disablePadding>
                    {players.map((p, idx) => {
                      const isC = p.playerId === side?.captainPlayerId;
                      const isWK = p.playerId === side?.wicketKeeperPlayerId;
                      return (
                        <ListItem
                          key={p.playerId}
                          disablePadding
                          onClick={e => openPlayerDialog(e, p.playerId!)}
                          sx={{
                            py: 0.4, alignItems: 'center', cursor: 'pointer', borderRadius: 1,
                            '&:hover': { bgcolor: 'action.hover' },
                            '&:hover .player-name': { textDecoration: 'underline' },
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 28, flexShrink: 0, pl: 0.5 }}>
                            {idx + 1}.
                          </Typography>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography className="player-name" variant="body1" color="primary" sx={{ lineHeight: 1.3 }}>
                                {p.name} {p.surname}
                              </Typography>
                              <PlayerRoleIcons player={p} side={side} isCaptain={isC} isWK={isWK} />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {[
                                p.battingStance?.replace(/_/g, ' '),
                                p.bowlingType && p.bowlingType !== 'NONE' ? p.bowlingType.replace(/_/g, ' ') : null,
                              ].filter(Boolean).join(' · ')}
                            </Typography>
                          </Box>
                        </ListItem>
                      );
                    })}
                    {twelfthPlayer && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <ListItem
                          disablePadding
                          onClick={e => openPlayerDialog(e, twelfthPlayer.playerId!)}
                          sx={{
                            py: 0.4, alignItems: 'center', cursor: 'pointer', borderRadius: 1,
                            '&:hover': { bgcolor: 'action.hover' },
                            '&:hover .player-name': { textDecoration: 'underline' },
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 28, flexShrink: 0, pl: 0.5 }}>
                            SS
                          </Typography>
                          <Typography className="player-name" variant="body1" color="primary" sx={{ fontStyle: 'italic' }}>
                            {twelfthPlayer.name} {twelfthPlayer.surname}
                          </Typography>
                        </ListItem>
                      </>
                    )}
                  </List>
                )}
              </Box>

              {/* Not Selected */}
              <Box sx={{ flex: 1, p: 3, minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
                  Available Squad
                  {notSelected.length > 0 && (
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      ({notSelected.length} not selected)
                    </Typography>
                  )}
                </Typography>

                {notSelected.length === 0 ? (
                  <Alert severity="success" icon={false}>
                    All available squad members are in the XI.
                  </Alert>
                ) : (
                  <List dense disablePadding>
                    {notSelected.map(p => {
                      const status = availMap[p.playerId!];
                      return (
                        <ListItem
                          key={p.playerId}
                          disablePadding
                          onClick={e => openPlayerDialog(e, p.playerId!)}
                          sx={{
                            py: 0.4, gap: 1, alignItems: 'flex-start', cursor: 'pointer', borderRadius: 1,
                            '&:hover': { bgcolor: 'action.hover' },
                            '&:hover .player-name': { textDecoration: 'underline' },
                          }}
                        >
                          <Box sx={{ pt: 0.3 }}>
                            <AvailIcon status={status} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography
                                className="player-name"
                                variant="body1"
                                color={status === 'NO' ? 'text.disabled' : 'primary'}
                                sx={{ lineHeight: 1.3 }}
                              >
                                {p.name} {p.surname}
                              </Typography>
                              <PlayerRoleIcons player={p} side={null} isWK={p.wicketKeeper} size="small" />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {[
                                p.battingStance?.replace(/_/g, ' '),
                                p.bowlingType && p.bowlingType !== 'NONE' ? p.bowlingType.replace(/_/g, ' ') : null,
                              ].filter(Boolean).join(' · ')}
                            </Typography>
                          </Box>
                          {status === 'NO' && (
                            <Tooltip title="Not available">
                              <Warning sx={{ fontSize: 16, color: 'error.light', flexShrink: 0, mt: 0.3 }} />
                            </Tooltip>
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </Box>
            </Box>

            {/* CTA buttons at bottom of view mode */}
            <Box sx={{ p: 3, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {players.length === 0 && (
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={() => setIsEditing(true)}
                  fullWidth
                >
                  Select {teamName} XI
                </Button>
              )}
              {players.length > 0 && !announced && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Campaign />}
                  onClick={() => setAnnounceConfirmOpen(true)}
                  fullWidth
                >
                  Announce {teamName} Team
                </Button>
              )}
              {announced && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Warning />}
                  onClick={() => setEditAnnounceConfirmOpen(true)}
                  fullWidth
                >
                  Edit Announced Team
                </Button>
              )}
            </Box>
          </Box>
        )}

        {/* Footer — only in edit mode */}
        {isEditing && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<ArrowBack />}
              onClick={() => setIsEditing(false)}
            >
              Back to View
            </Button>
          </Box>
        )}
      </DialogContent>

      {/* Analysis dialog */}
      <Dialog
        open={analysisOpen}
        onClose={() => setAnalysisOpen(false)}
        fullScreen
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1, flexShrink: 0 }}>
          <Analytics color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6">Match Analysis</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {teamName} — {match.homeTeamName} vs {match.oppositionTeamName}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setAnalysisOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, overflowY: 'auto' }}>
          <MatchAnalysisTab
            matchId={match.matchId!}
            teamId={teamId}
            teamName={teamName}
            matchTitle={`${match.homeTeamName} vs ${match.oppositionTeamName}`}
            oppositionTeamId={teamId === match.homeTeamId ? match.oppositionTeamId ?? undefined : match.homeTeamId ?? undefined}
            oppositionTeamName={teamId === match.homeTeamId ? match.oppositionTeamName ?? undefined : match.homeTeamName ?? undefined}
          />
        </DialogContent>
      </Dialog>

      {/* AI Pick dialog */}
      <Dialog
        open={aiPickOpen}
        onClose={() => setAiPickOpen(false)}
        fullScreen
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1, flexShrink: 0 }}>
          <AutoAwesome color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6">Pick XI with AI</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {teamName} — {match.homeTeamName} vs {match.oppositionTeamName}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setAiPickOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, overflowY: 'auto' }}>
          <AiTeamPickView
            matchId={match.matchId!}
            teamId={teamId}
            teamName={teamName}
            matchTitle={`${match.homeTeamName} vs ${match.oppositionTeamName}`}
            onApply={(xiIds, twelfthId) => {
              const updated = {
                ...(side ?? {}),
                matchId: match.matchId!,
                teamId,
                playingXi: xiIds,
                twelfthManPlayerId: twelfthId ?? undefined,
              };
              matchApi.saveTeamSheet(match.matchId!, updated as MatchSide)
                .then(saved => {
                  handleSideChange(saved);
                  setAiPickOpen(false);
                  setIsEditing(false);
                })
                .catch(() => {});
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Announce confirmation dialog */}
      <Dialog open={announceConfirmOpen} onClose={() => setAnnounceConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Announce {teamName}</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to announce the {teamName} team? All selected players will receive a notification and this cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnounceConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleAnnounce} disabled={announcing}>
            {announcing ? 'Announcing…' : 'Confirm & Announce'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit announced team confirmation dialog */}
      <Dialog open={editAnnounceConfirmOpen} onClose={() => setEditAnnounceConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" /> Edit Announced Team
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>This team has already been announced and players may have been notified.</Typography>
          <Typography variant="body2" color="text.secondary">
            If you re-announce after making changes, players added will be notified and removed players' notifications will be withdrawn.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAnnounceConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleUnannounce} disabled={announcing}>
            {announcing ? 'Updating…' : 'Edit Team'}
          </Button>
        </DialogActions>
      </Dialog>

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
              <Button variant="contained" onClick={handlePlayerSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Dialog>
  );
};
