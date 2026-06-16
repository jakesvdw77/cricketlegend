import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Avatar, List, ListItem, ListItemAvatar, ListItemText,
  TextField, MenuItem, Divider, Autocomplete, Chip, InputAdornment, IconButton,
  Tabs, Tab, Menu, useTheme, useMediaQuery,
  Dialog, DialogTitle, DialogContent, DialogActions,
  ListItemButton, ListItemIcon, CircularProgress,
} from '@mui/material';
import {
  ArrowBack, Close, Edit, Print, PersonAdd, PersonRemove, Search, Share,
  SportsCricket, MoreVert, WhatsApp, PictureAsPdf, Image as ImageIcon,
  Download, Psychology,
} from '@mui/icons-material';
import { teamApi } from '../../api/teamApi';
import { clubApi } from '../../api/clubApi';
import { playerApi } from '../../api/playerApi';
import { tournamentApi } from '../../api/tournamentApi';
import { Team, Player, Club, Tournament } from '../../types';
import { playerDescription } from '../../utils/playerDescription';
import { printSquad } from '../../utils/printSquad';
import { generateSquadPdf } from '../../utils/matchPdf';
import { generateSquadImage, generateSquadNamesImage } from '../../utils/teamsheetImage';
import { PdfPreviewDialog } from '../../components/PdfPreviewDialog';
import SquadShareDialog from '../admin/SquadShareDialog';
import { SquadAnalysisView } from '../../components/team/SquadAnalysisView';
import { PlayerEditForm } from '../../components/player/PlayerEditForm';

// ── Squad image template picker ───────────────────────────────────────────────

const SquadImageTemplateDialog: React.FC<{
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onPhotoGrid: () => void;
  onNames: () => void;
}> = ({ open, loading, onClose, onPhotoGrid, onNames }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Squad Image — Choose Template</DialogTitle>
    <DialogContent sx={{ p: 0 }}>
      <List disablePadding>
        <ListItemButton onClick={onPhotoGrid} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}
          </ListItemIcon>
          <ListItemText primary="Photo Grid" secondary="Player photos in a grid layout" />
        </ListItemButton>
        <ListItemButton onClick={onNames} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}
          </ListItemIcon>
          <ListItemText primary="Squad Names Template" secondary="Team name, player list in columns with logo" />
        </ListItemButton>
      </List>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
    </DialogActions>
  </Dialog>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  teamId: number | null;
  onSquadChange?: () => void;
  autoOpenShare?: boolean;
  initialEditing?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const SquadViewDialog: React.FC<Props> = ({ open, onClose, teamId, onSquadChange, autoOpenShare, initialEditing }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Core data
  const [team, setTeam] = useState<Team | null>(null);
  const [squad, setSquad] = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [availSearch, setAvailSearch] = useState('');
  const [availClubId, setAvailClubId] = useState<number | ''>('');
  const [mobileTab, setMobileTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Share state
  const [shareOptionsOpen, setShareOptionsOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [shareLoading, setShareLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [squadTemplateOpen, setSquadTemplateOpen] = useState(false);

  // Analysis state
  const [squadAnalysisOpen, setSquadAnalysisOpen] = useState(false);

  // Player info dialog state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const didAutoShare = useRef(false);

  // Auto-open share hub when triggered from an overview card
  useEffect(() => {
    if (autoOpenShare && team && !didAutoShare.current) {
      didAutoShare.current = true;
      setShareOptionsOpen(true);
    }
  }, [autoOpenShare, team]);

  // Load data when dialog opens
  useEffect(() => {
    if (!open || teamId == null) return;
    didAutoShare.current = false;
    setIsEditing(initialEditing ?? false);
    setTeam(null);
    setSquad([]);
    setAllPlayers([]);
    setClubs([]);
    setAvailSearch('');
    setAvailClubId('');
    setMobileTab(0);
    setTournaments([]);
    setSelectedPlayer(null);
    teamApi.findById(teamId).then(t => {
      setTeam(t);
      setAvailClubId(t.associatedClubId ?? '');
    });
    teamApi.getSquad(teamId).then(setSquad);
    playerApi.findAll().then(setAllPlayers);
    clubApi.findAll().then(setClubs);
  }, [open, teamId]);

  // Lazy-load tournaments when share opens
  useEffect(() => {
    if (shareOptionsOpen && tournaments.length === 0) {
      tournamentApi.findAll().then(setTournaments).catch(() => {});
    }
  }, [shareOptionsOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Share handlers ──────────────────────────────────────────────────────────

  const selectedTournament = tournaments.find(t => t.tournamentId === selectedTournamentId) ?? null;

  const handleWhatsapp = () => { setShareOptionsOpen(false); setWhatsappOpen(true); };

  const handlePrint = () => {
    setShareOptionsOpen(false);
    printSquad(team!, [...squad].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleProfessionalPdf = async () => {
    if (!team) return;
    setShareLoading(true);
    try {
      const url = await generateSquadPdf(team, squad, selectedTournament);
      setShareOptionsOpen(false);
      setPdfUrl(url);
    } finally {
      setShareLoading(false);
    }
  };

  const handleSquadImage = () => { setShareOptionsOpen(false); setSquadTemplateOpen(true); };

  const handleSquadPhotoGrid = async () => {
    if (!team) return;
    setShareLoading(true);
    try {
      const url = await generateSquadImage(team, squad, selectedTournament);
      setSquadTemplateOpen(false);
      setImageUrl(url);
    } finally {
      setShareLoading(false);
    }
  };

  const handleSquadNamesTemplate = async () => {
    if (!team) return;
    setShareLoading(true);
    try {
      const url = await generateSquadNamesImage(team, squad, selectedTournament);
      setSquadTemplateOpen(false);
      setImageUrl(url);
    } finally {
      setShareLoading(false);
    }
  };

  // ── Squad edit handlers ─────────────────────────────────────────────────────

  const addToSquad = async (player: Player) => {
    if (teamId == null) return;
    await teamApi.addToSquad(teamId, player.playerId!);
    setSquad(s => [...s, player]);
    onSquadChange?.();
  };

  const removeFromSquad = async (playerId: number) => {
    if (teamId == null) return;
    await teamApi.removeFromSquad(teamId, playerId);
    setSquad(s => s.filter(p => p.playerId !== playerId));
    onSquadChange?.();
  };

  const setCaptain = async (playerId: number | null) => {
    if (!team || teamId == null) return;
    const updated = {
      ...team,
      captainId: playerId ?? undefined,
      captainName: squad.find(p => p.playerId === playerId)?.name,
    };
    await teamApi.update(teamId, updated);
    setTeam(updated);
  };

  // ── Player info dialog ──────────────────────────────────────────────────────

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

  // ── Derived data ────────────────────────────────────────────────────────────

  const available = allPlayers
    .filter(p => {
      if (squad.some(s => s.playerId === p.playerId)) return false;
      if (availClubId && p.homeClubId !== availClubId) return false;
      const q = availSearch.toLowerCase();
      if (q && !`${p.name} ${p.surname}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));

  const sortedSquad = [...squad].sort((a, b) =>
    `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)
  );

  const closeMenu = () => setMenuAnchor(null);

  // ── Shared squad list (edit mode) ───────────────────────────────────────────

  const editSquadList = (
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

  const availableList = (
    <List dense disablePadding>
      {available.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No players found.</Typography>
      ) : (
        available.map(p => (
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
        ))
      )}
    </List>
  );

  // ── Read-only squad view ────────────────────────────────────────────────────

  const viewSquadList = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      }}
    >
      {sortedSquad.map(p => {
        const isCaptain = p.playerId === team?.captainId;
        return (
          <Box
            key={p.playerId}
            onClick={e => openPlayerDialog(e, p.playerId!)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
              '&:hover .player-name': { textDecoration: 'underline' },
            }}
          >
            <Avatar
              src={p.profilePictureUrl}
              sx={{ width: 36, height: 36, fontSize: 14, flexShrink: 0 }}
            >
              {p.name.charAt(0)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Typography className="player-name" variant="body2" fontWeight={isCaptain ? 600 : 400} noWrap color="primary">
                  {p.name} {p.surname}
                  {p.shirtNumber != null && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      #{p.shirtNumber}
                    </Typography>
                  )}
                </Typography>
                {isCaptain && <Chip label="C" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />}
                {p.wicketKeeper && <Typography component="span" sx={{ fontSize: 14, lineHeight: 1 }}>🧤</Typography>}
                {p.bowlingType && p.bowlingType !== 'NONE' && !p.partTimeBowler && (
                  <SportsCricket sx={{ fontSize: 14, color: 'text.secondary' }} />
                )}
              </Box>
              {playerDescription(p) && (
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  {playerDescription(p)}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );

  if (!open || teamId == null) return null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column', bgcolor: 'background.default' } }}
      >
        {/* ── Title bar ── */}
        <DialogTitle
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            py: 1.5, flexShrink: 0, gap: 1,
            bgcolor: isEditing ? 'action.selected' : undefined,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <IconButton size="small" onClick={onClose}>
              <Close />
            </IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} noWrap>
                {team ? `Squad — ${team.teamName}` : 'Squad'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                {team?.associatedClubName && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {team.associatedClubName}
                  </Typography>
                )}
                {squad.length > 0 && (
                  <Chip
                    label={`${squad.length} player${squad.length !== 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                )}
                {isEditing && (
                  <Chip label="Editing" size="small" color="primary" variant="filled" sx={{ height: 18, fontSize: '0.65rem' }} />
                )}
              </Box>
            </Box>
          </Box>

          {isMobile ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                <IconButton
                  size="small"
                  onClick={() => setIsEditing(v => !v)}
                  color={isEditing ? 'primary' : 'default'}
                  disabled={!team}
                >
                  {isEditing ? <ArrowBack /> : <Edit />}
                </IconButton>
                <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)}>
                  <MoreVert />
                </IconButton>
              </Box>
              <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
                <MenuItem onClick={() => { closeMenu(); setSquadAnalysisOpen(true); }} disabled={!team || squad.length === 0}>
                  <Psychology fontSize="small" sx={{ mr: 1 }} /> Squad Analysis
                </MenuItem>
                <MenuItem onClick={() => { closeMenu(); setShareOptionsOpen(true); }} disabled={!team || squad.length === 0}>
                  <Share fontSize="small" sx={{ mr: 1 }} /> Share
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <IconButton
                size="small"
                onClick={() => setSquadAnalysisOpen(true)}
                disabled={!team || squad.length === 0}
                title="Squad analysis"
              >
                <Psychology fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setShareOptionsOpen(true)}
                disabled={!team || squad.length === 0}
                title="Share squad"
              >
                <Share fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setIsEditing(v => !v)}
                color={isEditing ? 'primary' : 'default'}
                disabled={!team}
                title={isEditing ? 'Back to view' : 'Edit squad'}
              >
                {isEditing ? <ArrowBack /> : <Edit />}
              </IconButton>
            </Box>
          )}
        </DialogTitle>

        {/* ── Body ── */}
        <DialogContent sx={{ flex: 1, p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!team ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <CircularProgress />
            </Box>
          ) : isEditing ? (
            /* ── Edit mode ── */
            isMobile ? (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.paper', minHeight: 0 }}>
                <Tabs value={mobileTab} onChange={(_, v) => setMobileTab(v)} variant="fullWidth" sx={{ flexShrink: 0 }}>
                  <Tab label={`Squad (${squad.length})`} />
                  <Tab label={`Available (${available.length})`} />
                </Tabs>
                {mobileTab === 0 && (
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5, minHeight: 0 }}>
                    <Autocomplete
                      options={squad}
                      getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
                      value={squad.find(p => p.playerId === team.captainId) ?? null}
                      onChange={(_, p) => setCaptain(p?.playerId ?? null)}
                      isOptionEqualToValue={(o, v) => o.playerId === v.playerId}
                      renderInput={params => <TextField {...params} label="👑 Captain" size="small" />}
                      sx={{ mb: 1.5 }}
                    />
                    <Box sx={{ flex: 1, overflowY: 'auto' }}>{editSquadList}</Box>
                  </Box>
                )}
                {mobileTab === 1 && (
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5, minHeight: 0 }}>
                    <TextField
                      fullWidth select size="small" label="Club" value={availClubId}
                      onChange={e => setAvailClubId(e.target.value === '' ? '' : Number(e.target.value))}
                      sx={{ mb: 1 }}
                    >
                      <MenuItem value="">All clubs</MenuItem>
                      {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
                    </TextField>
                    <TextField
                      fullWidth size="small" placeholder="Search name…" value={availSearch}
                      onChange={e => setAvailSearch(e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
                      sx={{ mb: 1.5 }}
                    />
                    <Box sx={{ flex: 1, overflowY: 'auto' }}>{availableList}</Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', borderTop: 1, borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper', flex: 1, minHeight: 0 }}>
                <Box sx={{ flex: 10, p: 2, minWidth: 0, overflowY: 'auto' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
                    Squad · {squad.length} player{squad.length !== 1 ? 's' : ''}
                  </Typography>
                  <Autocomplete
                    options={squad}
                    getOptionLabel={p => `${p.name} ${p.surname}${p.shirtNumber != null ? ` (#${p.shirtNumber})` : ''}`}
                    value={squad.find(p => p.playerId === team.captainId) ?? null}
                    onChange={(_, p) => setCaptain(p?.playerId ?? null)}
                    isOptionEqualToValue={(o, v) => o.playerId === v.playerId}
                    renderInput={params => <TextField {...params} label="Captain" size="small" />}
                    sx={{ mb: 1.5 }}
                  />
                  {editSquadList}
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ flex: 8, p: 2, minWidth: 0, overflowY: 'auto' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>Available Players</Typography>
                  <TextField
                    fullWidth select size="small" label="Club" value={availClubId}
                    onChange={e => setAvailClubId(e.target.value === '' ? '' : Number(e.target.value))}
                    sx={{ mb: 1 }}
                  >
                    <MenuItem value="">All clubs</MenuItem>
                    {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
                  </TextField>
                  <TextField
                    fullWidth size="small" placeholder="Search name…" value={availSearch}
                    onChange={e => setAvailSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
                    sx={{ mb: 1.5 }}
                  />
                  {availableList}
                </Box>
              </Box>
            )
          ) : (
            /* ── View mode ── */
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {squad.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                  <Psychology sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                  <Typography variant="body2" sx={{ mb: 2 }}>No squad members yet.</Typography>
                  <Button variant="contained" startIcon={<Edit />} onClick={() => setIsEditing(true)}>
                    Build Squad
                  </Button>
                </Box>
              ) : (
                <>
                  <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                    <Chip
                      size="small"
                      label={`${squad.length} player${squad.length !== 1 ? 's' : ''}`}
                      variant="outlined"
                    />
                  </Box>
                  {viewSquadList}
                </>
              )}
            </Box>
          )}
        </DialogContent>

        {/* Back-to-view footer — only in edit mode */}
        {isEditing && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<ArrowBack />}
              onClick={() => setIsEditing(false)}
            >
              Back to View
            </Button>
          </Box>
        )}
      </Dialog>

      {/* ── Share options hub ── */}
      <Dialog open={shareOptionsOpen} onClose={() => setShareOptionsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Share Squad</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            select fullWidth size="small" label="Tournament (optional)"
            value={selectedTournamentId}
            onChange={e => setSelectedTournamentId(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ mb: 1 }}
          >
            <MenuItem value="">No tournament</MenuItem>
            {tournaments.map(t => (
              <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>
            ))}
          </TextField>
          <List disablePadding>
            <ListItemButton onClick={handleWhatsapp} disabled={shareLoading}>
              <ListItemIcon><WhatsApp sx={{ color: '#25D366' }} /></ListItemIcon>
              <ListItemText primary="WhatsApp / Email" secondary="Edit and share squad announcement" />
            </ListItemButton>
            <ListItemButton onClick={handlePrint} disabled={shareLoading}>
              <ListItemIcon><Print /></ListItemIcon>
              <ListItemText primary="Print" secondary="Open browser print dialog" />
            </ListItemButton>
            <ListItemButton onClick={handleProfessionalPdf} disabled={shareLoading}>
              <ListItemIcon>
                {shareLoading ? <CircularProgress size={22} color="error" /> : <PictureAsPdf color="error" />}
              </ListItemIcon>
              <ListItemText primary="Professional PDF" secondary="Tournament & squad details document" />
            </ListItemButton>
            <ListItemButton onClick={handleSquadImage} disabled={shareLoading}>
              <ListItemIcon>
                {shareLoading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}
              </ListItemIcon>
              <ListItemText primary="Squad Image" secondary="Shareable graphic with player photos" />
            </ListItemButton>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareOptionsOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <SquadImageTemplateDialog
        open={squadTemplateOpen}
        loading={shareLoading}
        onClose={() => setSquadTemplateOpen(false)}
        onPhotoGrid={handleSquadPhotoGrid}
        onNames={handleSquadNamesTemplate}
      />

      {team && (
        <SquadShareDialog
          open={whatsappOpen}
          onClose={() => setWhatsappOpen(false)}
          team={team}
          squad={squad}
        />
      )}

      {team && (
        <Dialog open={squadAnalysisOpen} onClose={() => setSquadAnalysisOpen(false)} maxWidth="lg" fullWidth fullScreen={isMobile}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology fontSize="small" /> Squad Analysis — {team.teamName}
          </DialogTitle>
          <DialogContent sx={{ p: isMobile ? 1 : 2 }}>
            <SquadAnalysisView teamId={teamId!} teamName={team.teamName} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSquadAnalysisOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      <PdfPreviewDialog pdfUrl={pdfUrl} onClose={() => setPdfUrl(null)} />

      <Dialog
        open={!!imageUrl}
        onClose={() => setImageUrl(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0d3b1e' } }}
      >
        <DialogTitle sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ImageIcon fontSize="small" /> Squad
        </DialogTitle>
        <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          {imageUrl && (
            <Box
              component="img"
              src={imageUrl}
              alt="Squad"
              sx={{ maxWidth: '100%', maxHeight: '72vh', borderRadius: 2, display: 'block' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageUrl(null)} sx={{ color: 'rgba(255,255,255,0.6)' }}>Close</Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => { const a = document.createElement('a'); a.href = imageUrl!; a.download = 'squad.png'; a.click(); }}
          >
            Download PNG
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
    </>
  );
};
