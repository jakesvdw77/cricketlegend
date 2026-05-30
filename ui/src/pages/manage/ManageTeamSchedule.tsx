import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Chip, Avatar, Divider, Stack,
  Card, CardContent, MenuItem, TextField, useTheme, useMediaQuery,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, List, ListItemButton, ListItemIcon, ListItemText, Snackbar, Alert,
  FormControlLabel, Switch, InputAdornment,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, AccessTime, LocationOn, Assignment,
  Share, WhatsApp, PictureAsPdf, Print, Image as ImageIcon, Download, Search, ArrowBack,
  Fullscreen, FullscreenExit,
} from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { tournamentApi } from '../../api/tournamentApi';
import { playerApi } from '../../api/playerApi';
import { mediaApi } from '../../api/mediaApi';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { Match, MatchSide, Player, Team, Tournament, MediaContent } from '../../types';
import { generateMatchPdf, generateTournamentSchedulePdf, generateTeamsheetPdf, generateTournamentTablePdf, generateSquadPdf } from '../../utils/matchPdf';
import { generatePlayingXiImage, generatePlayingXiBattingOrderImage, generateMatchScheduleImage, generateSquadImage, generateMatchCountdownImage, generateTournamentCountdownImage, generatePlayingXiWithPhotoImage } from '../../utils/teamsheetImage';
import { PdfPreviewDialog } from '../../components/PdfPreviewDialog';
import TeamsheetTemplatesDialog from '../../components/match/TeamsheetTemplatesDialog';

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtTime = (t?: string) => (t ? t.substring(0, 5) : null);

const sortKey = (m: Match) =>
  `${m.matchDate ?? '9999-12-31'}T${m.scheduledStartTime ?? '99:99:99'}`;

const isFinal = (m: Match) =>
  !!(m.matchCompleted || m.forfeited || m.noResult || m.matchDrawn);

interface TournamentGroup {
  tournamentId: number | null;
  tournamentName: string;
  matches: Match[];
  earliestDate: string;
}

const groupByTournament = (matches: Match[]): TournamentGroup[] => {
  const map = new Map<string, TournamentGroup>();
  for (const m of matches) {
    const key = m.tournamentId != null ? String(m.tournamentId) : '__none__';
    if (!map.has(key)) {
      map.set(key, {
        tournamentId: m.tournamentId ?? null,
        tournamentName: m.tournamentName ?? 'Friendlies / No Tournament',
        matches: [],
        earliestDate: sortKey(m),
      });
    }
    const g = map.get(key)!;
    g.matches.push(m);
    if (sortKey(m) < g.earliestDate) g.earliestDate = sortKey(m);
  }
  for (const g of map.values()) {
    g.matches.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }
  return [...map.values()]
    .filter(g => g.matches.some(m => !isFinal(m)))
    .sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));
};

// ── Media picker dialog ───────────────────────────────────────────────────────

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp)$/i;

const MediaPickerDialog: React.FC<{
  open: boolean;
  teamId?: number;
  onClose: () => void;
  onSelect: (url: string) => void;
}> = ({ open, teamId, onClose, onSelect }) => {
  const [items, setItems] = useState<MediaContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setLoading(true);
    const params = (!teamId || showAll) ? { mediaType: 'IMAGE' as const } : { teamId, mediaType: 'IMAGE' as const };
    mediaApi.search(params)
      .then(res => {
        const imgs = res.filter(m => m.mediaType === 'IMAGE' || IMAGE_EXT.test(m.url));
        setItems(imgs);
        if (!showAll && imgs.length === 0 && teamId) setShowAll(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, teamId, showAll]);

  const q = query.trim().toLowerCase();
  const visible = q
    ? items.filter(m =>
        [m.caption, m.playerName, m.teamName, m.matchLabel, m.tournamentName, m.fieldName]
          .some(v => v?.toLowerCase().includes(q))
      )
    : items;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        Select Feature Photo
        {teamId && (
          <FormControlLabel
            control={<Switch size="small" checked={showAll} onChange={e => setShowAll(e.target.checked)} />}
            label={<Typography variant="caption">Show all images</Typography>}
            sx={{ mr: 0 }}
          />
        )}
      </DialogTitle>
      <Box sx={{ px: 2, pb: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search by caption, player, team, match…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <DialogContent sx={{ p: 1, pt: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : visible.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            {items.length === 0 ? 'No images found. Try enabling "Show all images".' : 'No images match your search.'}
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1 }}>
            {visible.map(item => (
              <Box
                key={item.id ?? item.url}
                sx={{
                  position: 'relative', cursor: 'pointer',
                  borderRadius: 1, overflow: 'hidden', aspectRatio: '1',
                  '&:hover .overlay': { opacity: 1 },
                }}
                onClick={() => { onSelect(item.url); onClose(); }}
              >
                <Box component="img" src={item.url}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {item.caption && (
                  <Box sx={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    px: 0.75, py: 0.4, bgcolor: 'rgba(0,0,0,0.55)',
                  }}>
                    <Typography variant="caption" color="white" noWrap sx={{ display: 'block', fontSize: '0.65rem' }}>
                      {item.caption}
                    </Typography>
                  </Box>
                )}
                <Box className="overlay" sx={{
                  position: 'absolute', inset: 0,
                  bgcolor: 'rgba(0,0,0,0.42)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.15s',
                }}>
                  <Typography variant="caption" color="white" fontWeight="bold">Select</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {visible.length} of {items.length} image{items.length !== 1 ? 's' : ''}
        </Typography>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Playing XI template picker ────────────────────────────────────────────────

const PlayingXiTemplateDialog: React.FC<{
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onPhotoGrid: () => void;
  onBattingOrder: () => void;
  onWithPhoto: () => void;
}> = ({ open, loading, onClose, onPhotoGrid, onBattingOrder, onWithPhoto }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Playing XI — Choose Template</DialogTitle>
    <DialogContent sx={{ p: 0 }}>
      <List disablePadding>
        <ListItemButton onClick={onPhotoGrid} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}
          </ListItemIcon>
          <ListItemText primary="Photo Grid" secondary="Player photos in a 4-column grid" />
        </ListItemButton>
        <ListItemButton onClick={onBattingOrder} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}
          </ListItemIcon>
          <ListItemText primary="Batting Order" secondary="Numbered list with bat / ball / gloves role icons" />
        </ListItemButton>
        <ListItemButton onClick={onWithPhoto} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}
          </ListItemIcon>
          <ListItemText primary="Playing XI with Feature Photo" secondary="Pick a photo from the gallery — shown on the left with player list on the right" />
        </ListItemButton>
      </List>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
    </DialogActions>
  </Dialog>
);

// ── Tournament share dialog ───────────────────────────────────────────────────

interface TournamentShareDialogProps {
  group: TournamentGroup | null;
  loading: boolean;
  onClose: () => void;
  onSchedulePdf: () => void;
  onExportPdf: () => void;
  onImage: () => void;
  onTournamentImage: () => void;
  onSquadPdf: () => void;
  onSquadImage: () => void;
  onCountdownImage: () => void;
}

const TournamentShareDialog: React.FC<TournamentShareDialogProps> = ({
  group, loading, onClose, onSchedulePdf, onExportPdf, onImage, onTournamentImage, onSquadPdf, onSquadImage, onCountdownImage,
}) => (
  <Dialog open={!!group} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>{group?.tournamentName ?? 'Tournament'}</DialogTitle>
    <DialogContent sx={{ p: 0 }}>
      <List disablePadding>
        <ListItemButton onClick={onSchedulePdf} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} color="error" /> : <PictureAsPdf color="error" />}
          </ListItemIcon>
          <ListItemText primary="Team Schedule PDF" secondary="Visual fixture cards per match" />
        </ListItemButton>
        <ListItemButton onClick={onExportPdf} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} color="error" /> : <PictureAsPdf color="error" />}
          </ListItemIcon>
          <ListItemText primary="Tournament Schedule PDF" secondary="Landscape table with all fixtures and results" />
        </ListItemButton>
        <ListItemButton onClick={onSquadPdf} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} color="error" /> : <PictureAsPdf color="error" />}
          </ListItemIcon>
          <ListItemText primary="Squad PDF" secondary="Tournament & squad details document" />
        </ListItemButton>
        <ListItemButton onClick={onImage} disabled={loading}>
          <ListItemIcon><ImageIcon color="primary" /></ListItemIcon>
          <ListItemText primary="Team Match Schedule Image" secondary="Shareable graphic — pick days to include" />
        </ListItemButton>
        <ListItemButton onClick={onTournamentImage} disabled={loading}>
          <ListItemIcon><ImageIcon color="primary" /></ListItemIcon>
          <ListItemText primary="Tournament Match Schedule Image" secondary="All teams — pick days to include" />
        </ListItemButton>
        <ListItemButton onClick={onSquadImage} disabled={loading}>
          <ListItemIcon><ImageIcon color="primary" /></ListItemIcon>
          <ListItemText primary="Squad Image" secondary="Shareable graphic with player photos" />
        </ListItemButton>
        <ListItemButton onClick={onCountdownImage} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}
          </ListItemIcon>
          <ListItemText primary="Tournament Countdown Image" secondary="Countdown to next match with both teams" />
        </ListItemButton>
      </List>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
    </DialogActions>
  </Dialog>
);

// ── Tournament schedule image — day picker dialog ─────────────────────────────

interface SchedImageDialogProps {
  group: TournamentGroup | null;
  teamName?: string;
  onClose: () => void;
  onGenerated: (url: string) => void;
}

const TournamentScheduleImageDialog: React.FC<SchedImageDialogProps> = ({ group, teamName: selectedTeamName, onClose, onGenerated }) => {
  const [allMatches, setAllMatches]       = useState<Match[]>([]);
  const [tournament, setTournament]       = useState<Tournament | null>(null);
  const [loading, setLoading]             = useState(false);
  const [generating, setGenerating]       = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [showVenue, setShowVenue]         = useState(true);

  useEffect(() => {
    if (!group) return;
    setLoading(true);
    setSelectedDates(new Set());
    Promise.all([
      group.tournamentId
        ? matchApi.findByTournament(group.tournamentId)
        : Promise.resolve(group.matches),
      group.tournamentId
        ? tournamentApi.findById(group.tournamentId).catch(() => null)
        : Promise.resolve(null),
    ]).then(([ms, t]) => {
      setAllMatches([...ms].sort((a, b) => {
        const d = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
        return d !== 0 ? d : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
      }));
      setTournament(t);
    }).finally(() => setLoading(false));
  }, [group?.tournamentId]);

  const uniqueDates = [...new Set(allMatches.map(m => m.matchDate ?? 'TBD'))].sort();

  const toggleDate = (d: string) =>
    setSelectedDates(prev => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; });

  const allSelected = uniqueDates.length > 0 && uniqueDates.every(d => selectedDates.has(d));
  const toggleAll   = () => setSelectedDates(allSelected ? new Set() : new Set(uniqueDates));

  const fmtChip = (d: string) => d === 'TBD' ? 'Date TBD'
    : new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });

  const handleGenerate = async () => {
    if (!group) return;
    setGenerating(true);
    try {
      const filtered = allMatches.filter(m => selectedDates.has(m.matchDate ?? 'TBD'));
      const url = await generateMatchScheduleImage(group.tournamentName, tournament?.logoUrl, filtered, showVenue, selectedTeamName);
      onClose();
      onGenerated(url);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={!!group} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{selectedTeamName ? 'Team Match Schedule Image' : 'Tournament Match Schedule Image'}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select the days to include in the image.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {uniqueDates.length > 1 && (
                <Chip
                  label={allSelected ? 'Deselect All' : 'Select All'}
                  onClick={toggleAll}
                  color={allSelected ? 'primary' : 'default'}
                  variant={allSelected ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 'bold' }}
                />
              )}
              {uniqueDates.map(date => {
                const count = allMatches.filter(m => (m.matchDate ?? 'TBD') === date).length;
                const sel   = selectedDates.has(date);
                return (
                  <Chip
                    key={date}
                    label={`${fmtChip(date)} (${count})`}
                    onClick={() => toggleDate(date)}
                    color={sel ? 'primary' : 'default'}
                    variant={sel ? 'filled' : 'outlined'}
                  />
                );
              })}
              {uniqueDates.length === 0 && (
                <Typography variant="body2" color="text.secondary">No matches found.</Typography>
              )}
            </Box>
            {uniqueDates.length > 0 && (
              <FormControlLabel
                sx={{ mt: 2 }}
                control={<Switch checked={showVenue} onChange={e => setShowVenue(e.target.checked)} />}
                label="Show venue"
              />
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={selectedDates.size === 0 || generating || loading}
          onClick={handleGenerate}
          startIcon={generating ? <CircularProgress size={16} /> : <ImageIcon />}
        >
          {generating ? 'Generating…' : 'Generate Image'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Match share dialog ────────────────────────────────────────────────────────
// (WhatsApp, Print Team Sheet, PDF fixture card, Playing XI Image)

interface ShareDialogProps {
  open: boolean;
  title: string;
  loading: boolean;
  onClose: () => void;
  onPdf: () => void;
  onWhatsApp: () => void;
  onPrint: () => void;
  onImage: () => void;
  onCountdownImage: () => void;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ open, title, loading, onClose, onPdf, onWhatsApp, onPrint, onImage, onCountdownImage }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent sx={{ p: 0 }}>
      <List disablePadding>
        <ListItemButton onClick={onPdf} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} color="error" /> : <PictureAsPdf color="error" />}
          </ListItemIcon>
          <ListItemText primary="Team Sheet PDF" secondary="Open match fixture card" />
        </ListItemButton>
        <ListItemButton onClick={onWhatsApp} disabled={loading}>
          <ListItemIcon><WhatsApp sx={{ color: '#25D366' }} /></ListItemIcon>
          <ListItemText primary="WhatsApp" secondary="Edit and copy team announcement" />
        </ListItemButton>
        <ListItemButton onClick={onPrint} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} /> : <Print />}
          </ListItemIcon>
          <ListItemText primary="Print Team Sheet" secondary="PDF with playing XI and 12th man" />
        </ListItemButton>
        <ListItemButton onClick={onImage} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}
          </ListItemIcon>
          <ListItemText primary="Playing XI Image" secondary="Shareable graphic with player photos" />
        </ListItemButton>
        <ListItemButton onClick={onCountdownImage} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}
          </ListItemIcon>
          <ListItemText primary="Match Countdown Image" secondary="Countdown graphic with both team logos" />
        </ListItemButton>
      </List>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
    </DialogActions>
  </Dialog>
);

// ── Match row ─────────────────────────────────────────────────────────────────

const MatchRow: React.FC<{ match: Match; teamId: number; onShare: (m: Match) => void }> = ({ match: m, teamId, onShare }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isHome = m.homeTeamId === teamId;
  const opponent = isHome ? m.oppositionTeamName : m.homeTeamName;
  const opponentLogo = isHome ? m.oppositionTeamLogoUrl : m.homeTeamLogoUrl;
  const opponentAbbr = isHome ? m.oppositionTeamAbbreviation : m.homeTeamAbbreviation;

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
            <Avatar src={opponentLogo} sx={{ width: 28, height: 28, fontSize: 13 }}>
              {opponent?.charAt(0)}
            </Avatar>
            <Typography variant="caption" color="text.secondary">{isHome ? 'vs' : '@'}</Typography>
            <Typography variant="body2" fontWeight="bold">
              {opponentAbbr ?? opponent ?? '—'}
            </Typography>
          </Stack>

          <Stack direction={isMobile ? 'column' : 'row'} spacing={1} alignItems={{ sm: 'center' }} flexShrink={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarMonth sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption">{fmtDate(m.matchDate)}</Typography>
            </Box>
            {fmtTime(m.scheduledStartTime) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime sx={{ fontSize: 13, color: 'text.secondary' }} />
                <Typography variant="caption">{fmtTime(m.scheduledStartTime)}</Typography>
              </Box>
            )}
            {m.fieldName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {m.fieldIconUrl
                  ? <Avatar src={m.fieldIconUrl} variant="rounded" sx={{ width: 13, height: 13 }} />
                  : <LocationOn sx={{ fontSize: 13, color: 'text.secondary' }} />}
                <Typography variant="caption" noWrap sx={{ maxWidth: 160 }}>{m.fieldName}</Typography>
              </Box>
            )}
            {m.matchStage && (
              <Chip label={STAGE_LABELS[m.matchStage] ?? m.matchStage} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
            )}
            <Tooltip title="Share match">
              <IconButton size="small" onClick={() => onShare(m)} sx={{ color: 'text.secondary' }}>
                <Share fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

// ── Image preview / download dialog ──────────────────────────────────────────

const ImagePreviewDialog: React.FC<{ imageUrl: string | null; filename: string; title?: string; onClose: () => void }> = ({ imageUrl, filename, title = 'Image', onClose }) => {
  const [fullscreen, setFullscreen] = useState(false);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    a.click();
  };

  const handleClose = () => { setFullscreen(false); onClose(); };

  return (
    <Dialog open={!!imageUrl} onClose={handleClose} fullScreen={fullscreen} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: '#0d3b1e' } }}
    >
      <DialogTitle sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
        <ImageIcon fontSize="small" />
        <Box sx={{ flex: 1 }}>{title}</Box>
        <IconButton size="small" onClick={() => setFullscreen(f => !f)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          {fullscreen ? <FullscreenExit /> : <Fullscreen />}
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
        {imageUrl && (
          <Box component="img" src={imageUrl} alt={title}
            sx={{ maxWidth: '100%', maxHeight: fullscreen ? '85vh' : '72vh', borderRadius: 2, display: 'block' }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} sx={{ color: 'rgba(255,255,255,0.6)' }}>Close</Button>
        <Button variant="contained" startIcon={<Download />} onClick={handleDownload}>
          Download PNG
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

interface TeamsheetData {
  match: Match;
  sides: MatchSide[];
  players: Player[];
}

export const ManageTeamSchedule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { filterTournamentId, tournamentName: filterTournamentName, returnTo } =
    (location.state ?? {}) as { filterTournamentId?: number; tournamentName?: string; returnTo?: string };

  const { teamIds, restrictByTeam, loaded: teamsLoaded } = useManagerTeams();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageTitle, setImageTitle] = useState('Image');
  const [xiTemplateOpen, setXiTemplateOpen] = useState(false);
  const [xiTemplateData, setXiTemplateData] = useState<TeamsheetData | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [matchTarget, setMatchTarget] = useState<Match | null>(null);
  const [tournamentTarget, setTournamentTarget] = useState<TournamentGroup | null>(null);
  const [schedImageTarget, setSchedImageTarget] = useState<TournamentGroup | null>(null);
  const [schedTournImageTarget, setSchedTournImageTarget] = useState<TournamentGroup | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [teamsheetData, setTeamsheetData] = useState<TeamsheetData | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  useEffect(() => {
    if (!teamsLoaded) return;
    teamApi.findAll()
      .then(all => {
        const filtered = restrictByTeam ? all.filter(t => teamIds.has(t.teamId!)) : all;
        setTeams(filtered);
        if (filtered.length === 1) setSelectedTeamId(filtered[0].teamId!);
      })
      .finally(() => setTeamsLoading(false));
  }, [teamsLoaded, restrictByTeam, teamIds]);

  useEffect(() => {
    if (!selectedTeamId) { setMatches([]); return; }
    setMatchesLoading(true);
    matchApi.findAll()
      .then(all => setMatches(
        all.filter(m => m.homeTeamId === selectedTeamId || m.oppositionTeamId === selectedTeamId)
      ))
      .finally(() => setMatchesLoading(false));
  }, [selectedTeamId]);

  const upcoming = matches.filter(m => !isFinal(m));
  const allGroups = groupByTournament(upcoming);
  const groups = filterTournamentId
    ? allGroups.filter(g => g.tournamentId === filterTournamentId)
    : allGroups;
  const total = groups.reduce((acc, g) => acc + g.matches.length, 0);
  const selectedTeam = teams.find(t => t.teamId === selectedTeamId);

  const fetchTeamsheetData = async (match: Match): Promise<TeamsheetData> => {
    const [sides, allPlayers] = await Promise.all([
      matchApi.getTeamSheet(match.matchId!),
      playerApi.findAll(),
    ]);
    return { match, sides, players: allPlayers };
  };

  // ── Match share handlers ───────────────────────────────────────────────────

  const handleMatchPdf = async () => {
    if (!matchTarget) return;
    setShareLoading(true);
    try {
      const url = await generateMatchPdf(matchTarget);
      setMatchTarget(null);
      setPdfUrl(url);
    } finally {
      setShareLoading(false);
    }
  };

  const handleMatchWhatsApp = async () => {
    if (!matchTarget) return;
    setShareLoading(true);
    try {
      const data = await fetchTeamsheetData(matchTarget);
      setMatchTarget(null);
      setTeamsheetData(data);
    } catch {
      setSnackbar({ open: true, message: 'Could not load team sheet data.' });
    } finally {
      setShareLoading(false);
    }
  };

  const handleMatchPrint = async () => {
    if (!matchTarget) return;
    setShareLoading(true);
    try {
      const data = await fetchTeamsheetData(matchTarget);
      const url = await generateTeamsheetPdf(
        data.match, data.sides, data.players,
        selectedTeamId !== '' ? selectedTeamId : undefined,
      );
      setMatchTarget(null);
      setPdfUrl(url);
    } catch {
      setSnackbar({ open: true, message: 'Could not generate team sheet PDF.' });
    } finally {
      setShareLoading(false);
    }
  };

  const handleMatchImage = async () => {
    if (!matchTarget) return;
    setShareLoading(true);
    try {
      const data = await fetchTeamsheetData(matchTarget);
      setMatchTarget(null);
      setXiTemplateData(data);
      setXiTemplateOpen(true);
    } catch {
      setSnackbar({ open: true, message: 'Could not load team sheet data.' });
    } finally {
      setShareLoading(false);
    }
  };

  const handleXiPhotoGrid = async () => {
    if (!xiTemplateData) return;
    setShareLoading(true);
    try {
      const url = await generatePlayingXiImage(
        xiTemplateData.match, xiTemplateData.sides, xiTemplateData.players,
        selectedTeamId !== '' ? selectedTeamId : undefined,
      );
      setXiTemplateOpen(false);
      setImageTitle('Playing XI');
      setImageUrl(url);
    } catch {
      setSnackbar({ open: true, message: 'Could not generate Playing XI image.' });
    } finally {
      setShareLoading(false);
    }
  };

  const handleXiBattingOrder = async () => {
    if (!xiTemplateData) return;
    setShareLoading(true);
    try {
      const url = await generatePlayingXiBattingOrderImage(
        xiTemplateData.match, xiTemplateData.sides, xiTemplateData.players,
        selectedTeamId !== '' ? selectedTeamId : undefined,
      );
      setXiTemplateOpen(false);
      setImageTitle('Playing XI — Batting Order');
      setImageUrl(url);
    } catch {
      setSnackbar({ open: true, message: 'Could not generate batting order image.' });
    } finally {
      setShareLoading(false);
    }
  };

  const handleXiWithPhoto = () => {
    setXiTemplateOpen(false);
    setMediaPickerOpen(true);
  };

  const handlePhotoSelected = async (photoUrl: string) => {
    if (!xiTemplateData) return;
    setMediaPickerOpen(false);
    setShareLoading(true);
    try {
      const url = await generatePlayingXiWithPhotoImage(
        xiTemplateData.match, xiTemplateData.sides, xiTemplateData.players,
        photoUrl,
        selectedTeamId !== '' ? selectedTeamId as number : undefined,
      );
      setXiTemplateData(null);
      setImageTitle('Playing XI with Photo');
      setImageUrl(url);
    } catch {
      setSnackbar({ open: true, message: 'Could not generate Playing XI image.' });
    } finally {
      setShareLoading(false);
    }
  };

  // ── Tournament share handlers ──────────────────────────────────────────────

  const handleTournamentPdf = async () => {
    if (!tournamentTarget) return;
    setShareLoading(true);
    try {
      const logoUrl = tournamentTarget.tournamentId
        ? await tournamentApi.findById(tournamentTarget.tournamentId).then(t => t.logoUrl).catch(() => undefined)
        : undefined;
      const url = await generateTournamentSchedulePdf(
        tournamentTarget.tournamentName, tournamentTarget.matches, selectedTeam?.teamName, logoUrl,
      );
      setTournamentTarget(null);
      setPdfUrl(url);
    } finally {
      setShareLoading(false);
    }
  };

  const handleTournamentExportPdf = async () => {
    if (!tournamentTarget) return;
    setShareLoading(true);
    try {
      const [tournament, results] = await Promise.all([
        tournamentTarget.tournamentId
          ? tournamentApi.findById(tournamentTarget.tournamentId)
          : Promise.resolve({ name: tournamentTarget.tournamentName } as any),
        tournamentTarget.tournamentId
          ? matchApi.findResultsByTournament(tournamentTarget.tournamentId).catch(() => [])
          : Promise.resolve([]),
      ]);
      const url = await generateTournamentTablePdf(tournament, tournamentTarget.matches, results);
      setTournamentTarget(null);
      setPdfUrl(url);
    } finally {
      setShareLoading(false);
    }
  };

  const handleTournamentImage = () => {
    setSchedImageTarget(tournamentTarget);
    setTournamentTarget(null);
  };

  const handleTournamentImageFull = () => {
    setSchedTournImageTarget(tournamentTarget);
    setTournamentTarget(null);
  };

  const fetchSquadContext = async () => {
    if (!selectedTeamId || selectedTeamId === '') throw new Error('No team selected');
    const tid = selectedTeamId as number;
    const [team, squad, tournament] = await Promise.all([
      teamApi.findById(tid),
      teamApi.getSquad(tid),
      tournamentTarget?.tournamentId
        ? tournamentApi.findById(tournamentTarget.tournamentId).catch(() => null)
        : Promise.resolve(null),
    ]);
    return { team, squad, tournament };
  };

  const handleTournamentSquadPdf = async () => {
    if (!selectedTeamId) return;
    setShareLoading(true);
    try {
      const { team, squad, tournament } = await fetchSquadContext();
      const url = await generateSquadPdf(team, squad, tournament);
      setTournamentTarget(null);
      setPdfUrl(url);
    } catch {
      setSnackbar({ open: true, message: 'Could not generate squad PDF.' });
    } finally {
      setShareLoading(false);
    }
  };

  const handleTournamentSquadImage = async () => {
    if (!selectedTeamId) return;
    setShareLoading(true);
    try {
      const { team, squad, tournament } = await fetchSquadContext();
      const url = await generateSquadImage(team, squad, tournament);
      setTournamentTarget(null);
      setImageTitle('Squad');
      setImageUrl(url);
    } catch {
      setSnackbar({ open: true, message: 'Could not generate squad image.' });
    } finally {
      setShareLoading(false);
    }
  };

  const handleMatchCountdownImage = async () => {
    if (!matchTarget) return;
    setShareLoading(true);
    try {
      const url = await generateMatchCountdownImage(matchTarget);
      setMatchTarget(null);
      setImageTitle('Match Countdown');
      setImageUrl(url);
    } catch {
      setSnackbar({ open: true, message: 'Could not generate countdown image.' });
    } finally {
      setShareLoading(false);
    }
  };

  const handleTournamentCountdownImage = async () => {
    if (!tournamentTarget) return;
    setShareLoading(true);
    try {
      const logoUrl = tournamentTarget.tournamentId
        ? await tournamentApi.findById(tournamentTarget.tournamentId).then(t => t.logoUrl).catch(() => undefined)
        : undefined;
      const firstMatch = tournamentTarget.matches[0];
      if (!firstMatch) return;
      const url = await generateTournamentCountdownImage(tournamentTarget.tournamentName, logoUrl, firstMatch);
      setTournamentTarget(null);
      setImageTitle('Tournament Countdown');
      setImageUrl(url);
    } catch {
      setSnackbar({ open: true, message: 'Could not generate countdown image.' });
    } finally {
      setShareLoading(false);
    }
  };

  const matchDialogTitle = matchTarget
    ? `Share — ${matchTarget.homeTeamName} vs ${matchTarget.oppositionTeamName}`
    : 'Share';

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        {returnTo && (
          <Button startIcon={<ArrowBack />} size="small" onClick={() => navigate(returnTo)} sx={{ mr: 0.5 }}>
            Back
          </Button>
        )}
        <Assignment color="primary" />
        <Typography variant="h5">
          {filterTournamentName ?? 'Team Schedule'}
        </Typography>
        {selectedTeamId && !matchesLoading && (
          <Chip label={`${total} match${total !== 1 ? 'es' : ''}`} size="small" variant="outlined" sx={{ ml: 1 }} />
        )}
      </Box>

      <TextField
        select
        label="Select Team"
        size="small"
        value={selectedTeamId}
        onChange={e => setSelectedTeamId(e.target.value as number | '')}
        sx={{ minWidth: 260, mb: 3 }}
        disabled={teamsLoading || !teamsLoaded}
      >
        <MenuItem value=""><em>— Choose a team —</em></MenuItem>
        {teams.map(t => (
          <MenuItem key={t.teamId} value={t.teamId}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar src={t.logoUrl} sx={{ width: 22, height: 22, fontSize: 10 }}>{t.teamName.charAt(0)}</Avatar>
              {t.teamName}
            </Box>
          </MenuItem>
        ))}
      </TextField>

      {matchesLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!matchesLoading && selectedTeamId && groups.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Assignment sx={{ fontSize: 56, mb: 1, opacity: 0.3 }} />
          <Typography variant="body1">No upcoming matches for this team.</Typography>
        </Box>
      )}

      {!matchesLoading && !selectedTeamId && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography variant="body2">Select a team above to view their schedule.</Typography>
        </Box>
      )}

      {!matchesLoading && groups.map((group, i) => (
        <Box key={group.tournamentId ?? '__none__'} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <EmojiEvents color="action" fontSize="small" />
            <Typography variant="subtitle1" fontWeight="bold">{group.tournamentName}</Typography>
            <Chip label={group.matches.length} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            <Tooltip title="Share tournament schedule">
              <IconButton
                size="small"
                onClick={() => setTournamentTarget(group)}
                sx={{ color: 'text.secondary', ml: 0.5 }}
              >
                <Share fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {group.matches.map(m => (
            <MatchRow
              key={m.matchId}
              match={m}
              teamId={selectedTeamId as number}
              onShare={m => setMatchTarget(m)}
            />
          ))}

          {i < groups.length - 1 && <Divider sx={{ mt: 2 }} />}
        </Box>
      ))}

      {/* Match share dialog */}
      <ShareDialog
        open={!!matchTarget}
        title={matchDialogTitle}
        loading={shareLoading}
        onClose={() => setMatchTarget(null)}
        onPdf={handleMatchPdf}
        onWhatsApp={handleMatchWhatsApp}
        onPrint={handleMatchPrint}
        onImage={handleMatchImage}
        onCountdownImage={handleMatchCountdownImage}
      />

      {/* Tournament share dialog */}
      <TournamentShareDialog
        group={tournamentTarget}
        loading={shareLoading}
        onClose={() => setTournamentTarget(null)}
        onSchedulePdf={handleTournamentPdf}
        onExportPdf={handleTournamentExportPdf}
        onImage={handleTournamentImage}
        onTournamentImage={handleTournamentImageFull}
        onSquadPdf={handleTournamentSquadPdf}
        onSquadImage={handleTournamentSquadImage}
        onCountdownImage={handleTournamentCountdownImage}
      />

      {/* Team day picker → team match schedule image */}
      <TournamentScheduleImageDialog
        group={schedImageTarget}
        teamName={selectedTeam?.teamName}
        onClose={() => setSchedImageTarget(null)}
        onGenerated={url => { setImageTitle('Match Schedule'); setImageUrl(url); }}
      />

      {/* Tournament day picker → full tournament schedule image (no team filter) */}
      <TournamentScheduleImageDialog
        group={schedTournImageTarget}
        onClose={() => setSchedTournImageTarget(null)}
        onGenerated={url => { setImageTitle('Tournament Schedule'); setImageUrl(url); }}
      />

      {/* Playing XI template picker */}
      <PlayingXiTemplateDialog
        open={xiTemplateOpen}
        loading={shareLoading}
        onClose={() => { setXiTemplateOpen(false); setXiTemplateData(null); }}
        onPhotoGrid={handleXiPhotoGrid}
        onBattingOrder={handleXiBattingOrder}
        onWithPhoto={handleXiWithPhoto}
      />

      {/* Gallery photo picker for Playing XI with Feature Photo */}
      <MediaPickerDialog
        open={mediaPickerOpen}
        teamId={selectedTeamId !== '' ? selectedTeamId as number : undefined}
        onClose={() => { setMediaPickerOpen(false); setXiTemplateData(null); }}
        onSelect={handlePhotoSelected}
      />

      {/* WhatsApp template editor (full TeamsheetTemplatesDialog) */}
      {teamsheetData && (
        <TeamsheetTemplatesDialog
          open={!!teamsheetData}
          onClose={() => setTeamsheetData(null)}
          match={teamsheetData.match}
          sides={teamsheetData.sides}
          players={teamsheetData.players}
        />
      )}

      <PdfPreviewDialog pdfUrl={pdfUrl} onClose={() => setPdfUrl(null)} />

      <ImagePreviewDialog
        imageUrl={imageUrl}
        title={imageTitle}
        filename={
          imageTitle === 'Match Schedule'     ? 'match-schedule.png'      :
          imageTitle === 'Tournament Schedule' ? 'tournament-schedule.png' :
          imageTitle === 'Match Countdown'     ? 'match-countdown.png'     :
          imageTitle === 'Tournament Countdown'? 'tournament-countdown.png':
          imageTitle === 'Playing XI with Photo'? 'playing-xi-photo.png'   :
          'playing-xi.png'
        }
        onClose={() => setImageUrl(null)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
