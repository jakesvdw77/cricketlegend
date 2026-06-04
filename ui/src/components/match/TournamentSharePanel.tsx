import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItemButton, ListItemIcon, ListItemText,
  Button, CircularProgress, IconButton, Box, Snackbar,
  Chip, FormControlLabel, Switch, Typography, Avatar,
} from '@mui/material';
import {
  PictureAsPdf, Image as ImageIcon,
  Fullscreen, FullscreenExit, Download, Groups,
} from '@mui/icons-material';
import { Match, Tournament, TournamentTeam, Player } from '../../types';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { tournamentApi } from '../../api/tournamentApi';
import {
  generateTournamentSchedulePdf,
  generateTournamentTablePdf,
  generateSquadPdf,
} from '../../utils/matchPdf';
import {
  generateMatchScheduleImage,
  generateSquadImage,
  generateSquadNamesImage,
  generateTournamentCountdownImage,
} from '../../utils/teamsheetImage';
import { PdfPreviewDialog } from '../PdfPreviewDialog';

interface TournamentGroup {
  tournamentId: number | null;
  tournamentName: string;
  matches: Match[];
}

// ── Image preview dialog ──────────────────────────────────────────────────────

const ImagePreviewDialog: React.FC<{
  imageUrl: string | null; title: string; filename: string; onClose: () => void;
}> = ({ imageUrl, title, filename, onClose }) => {
  const [fullscreen, setFullscreen] = useState(false);
  const handleClose = () => { setFullscreen(false); onClose(); };
  return (
    <Dialog open={!!imageUrl} onClose={handleClose} fullScreen={fullscreen} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: '#0d3b1e' } }}>
      <DialogTitle sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
        <ImageIcon fontSize="small" />
        <Box sx={{ flex: 1 }}>{title}</Box>
        <IconButton size="small" onClick={() => setFullscreen(f => !f)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          {fullscreen ? <FullscreenExit /> : <Fullscreen />}
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
        {imageUrl && <Box component="img" src={imageUrl} alt={title} sx={{ maxWidth: '100%', maxHeight: fullscreen ? '85vh' : '72vh', borderRadius: 2, display: 'block' }} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} sx={{ color: 'rgba(255,255,255,0.6)' }}>Close</Button>
        <Button variant="contained" startIcon={<Download />}
          onClick={() => { const a = document.createElement('a'); a.href = imageUrl!; a.download = filename; a.click(); }}>
          Download PNG
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Schedule image day-picker dialog ─────────────────────────────────────────

const ScheduleImageDialog: React.FC<{
  group: TournamentGroup | null;
  teamName?: string;
  onClose: () => void;
  onGenerated: (url: string) => void;
}> = ({ group, teamName, onClose, onGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [showVenue, setShowVenue] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>();

  React.useEffect(() => {
    if (!group) return;
    setLoading(true);
    setSelectedDates(new Set());
    Promise.all([
      group.tournamentId
        ? matchApi.findByTournament(group.tournamentId)
        : Promise.resolve(group.matches),
      group.tournamentId
        ? tournamentApi.findById(group.tournamentId).then(t => t.logoUrl).catch(() => undefined)
        : Promise.resolve(undefined),
    ]).then(([ms, logo]) => {
      const sorted = [...ms].sort((a, b) => {
        const d = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
        return d !== 0 ? d : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
      });
      setAllMatches(sorted);
      setLogoUrl(logo);
    }).finally(() => setLoading(false));
  }, [group?.tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = teamName
    ? allMatches.filter(m => m.homeTeamName === teamName || m.oppositionTeamName === teamName)
    : allMatches;

  const uniqueDates = [...new Set(filtered.map(m => m.matchDate ?? 'TBD'))].sort();
  const allSel = uniqueDates.length > 0 && uniqueDates.every(d => selectedDates.has(d));
  const toggle = (d: string) => setSelectedDates(p => { const n = new Set(p); n.has(d) ? n.delete(d) : n.add(d); return n; });
  const fmtChip = (d: string) => d === 'TBD' ? 'Date TBD'
    : new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });

  const handleGenerate = async () => {
    if (!group) return;
    setGenerating(true);
    try {
      const toInclude = filtered.filter(m => selectedDates.has(m.matchDate ?? 'TBD'));
      const url = await generateMatchScheduleImage(group.tournamentName, logoUrl, toInclude, showVenue, teamName);
      onClose();
      onGenerated(url);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={!!group} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{teamName ? 'Team Match Schedule Image' : 'Tournament Match Schedule Image'}</DialogTitle>
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
                <Chip label={allSel ? 'Deselect All' : 'Select All'} onClick={() => setSelectedDates(allSel ? new Set() : new Set(uniqueDates))}
                  color={allSel ? 'primary' : 'default'} variant={allSel ? 'filled' : 'outlined'} sx={{ fontWeight: 'bold' }} />
              )}
              {uniqueDates.map(d => {
                const count = filtered.filter(m => (m.matchDate ?? 'TBD') === d).length;
                const sel = selectedDates.has(d);
                return (
                  <Chip key={d} label={`${fmtChip(d)} (${count})`} onClick={() => toggle(d)}
                    color={sel ? 'primary' : 'default'} variant={sel ? 'filled' : 'outlined'} />
                );
              })}
              {uniqueDates.length === 0 && <Typography variant="body2" color="text.secondary">No matches found.</Typography>}
            </Box>
            {uniqueDates.length > 0 && (
              <FormControlLabel sx={{ mt: 2 }} control={<Switch checked={showVenue} onChange={e => setShowVenue(e.target.checked)} />} label="Show venue" />
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={selectedDates.size === 0 || generating || loading}
          onClick={handleGenerate} startIcon={generating ? <CircularProgress size={16} /> : <ImageIcon />}>
          {generating ? 'Generating…' : 'Generate Image'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Team picker dialog ────────────────────────────────────────────────────────

const TeamPickerDialog: React.FC<{
  open: boolean;
  teams: TournamentTeam[];
  loading: boolean;
  onSelect: (team: TournamentTeam) => void;
  onClose: () => void;
}> = ({ open, teams, loading, onSelect, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Select a Team</DialogTitle>
    <DialogContent sx={{ p: 0 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
      ) : (
        <List disablePadding>
          {teams.map(t => (
            <ListItemButton key={t.teamId} onClick={() => onSelect(t)}>
              <ListItemIcon>
                <Avatar src={t.logoUrl} sx={{ width: 32, height: 32, fontSize: 14 }}>
                  {t.teamName?.charAt(0)}
                </Avatar>
              </ListItemIcon>
              <ListItemText primary={t.teamName} />
            </ListItemButton>
          ))}
          {teams.length === 0 && (
            <ListItemButton disabled>
              <ListItemIcon><Groups /></ListItemIcon>
              <ListItemText primary="No teams found" />
            </ListItemButton>
          )}
        </List>
      )}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Cancel</Button></DialogActions>
  </Dialog>
);

// ── Squad image template picker ───────────────────────────────────────────────

const SquadTemplateDialog: React.FC<{
  open: boolean; loading: boolean; onClose: () => void; onPhotoGrid: () => void; onNames: () => void;
}> = ({ open, loading, onClose, onPhotoGrid, onNames }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Squad Image — Choose Template</DialogTitle>
    <DialogContent sx={{ p: 0 }}>
      <List disablePadding>
        <ListItemButton onClick={onPhotoGrid} disabled={loading}>
          <ListItemIcon>{loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}</ListItemIcon>
          <ListItemText primary="Photo Grid" secondary="Player photos in a grid layout" />
        </ListItemButton>
        <ListItemButton onClick={onNames} disabled={loading}>
          <ListItemIcon>{loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}</ListItemIcon>
          <ListItemText primary="Squad Names Template" secondary="Team name, player list in columns with logo" />
        </ListItemButton>
      </List>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Cancel</Button></DialogActions>
  </Dialog>
);

// ── Main share panel ──────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  tournament: Tournament;
  teamId?: number;
  teamName?: string;
  onClose: () => void;
}

type SquadCtx = { team: any; squad: Player[]; tournament: Tournament | null };
type SquadAction = 'pdf' | 'image';

export const TournamentSharePanel: React.FC<Props> = ({ open, tournament, teamId, teamName, onClose }) => {
  const [listOpen, setListOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => { if (open) setListOpen(true); }, [open]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageTitle, setImageTitle] = useState('');
  const [schedTeamGroup, setSchedTeamGroup] = useState<TournamentGroup | null>(null);
  const [schedTournGroup, setSchedTournGroup] = useState<TournamentGroup | null>(null);
  const [squadTemplateOpen, setSquadTemplateOpen] = useState(false);
  const [squadCtx, setSquadCtx] = useState<SquadCtx | null>(null);
  const [teamPickerTeams, setTeamPickerTeams] = useState<TournamentTeam[]>([]);
  const [teamPickerAction, setTeamPickerAction] = useState<SquadAction | null>(null);
  const [teamPickerLoading, setTeamPickerLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const err = (msg: string) => setSnackbar(msg);

  const fetchTeamMatches = async (): Promise<Match[]> => {
    if (!tournament.tournamentId) return [];
    const all = await matchApi.findByTournament(tournament.tournamentId);
    return teamId ? all.filter(m => m.homeTeamId === teamId || m.oppositionTeamId === teamId) : all;
  };

  const buildGroup = (matches: Match[]): TournamentGroup => ({
    tournamentId: tournament.tournamentId ?? null,
    tournamentName: tournament.name,
    matches,
  });

  // Opens team picker by fetching tournament teams from pools
  const openTeamPicker = async (action: SquadAction) => {
    setTeamPickerAction(action);
    setTeamPickerLoading(true);
    setTeamPickerTeams([]);
    try {
      const full = tournament.tournamentId
        ? await tournamentApi.findById(tournament.tournamentId)
        : tournament;
      const teams = (full.pools ?? []).flatMap(p => p.teams ?? [])
        .filter((t, i, arr) => t.teamId && arr.findIndex(x => x.teamId === t.teamId) === i);
      setTeamPickerTeams(teams);
    } catch { err('Could not load tournament teams.'); setTeamPickerAction(null); }
    finally { setTeamPickerLoading(false); }
  };

  const handleTeamPicked = async (picked: TournamentTeam) => {
    const action = teamPickerAction; // capture before clearing
    setTeamPickerAction(null);
    if (!picked.teamId || !action) return;
    setLoading(true);
    try {
      const [team, squad, t] = await Promise.all([
        teamApi.findById(picked.teamId),
        teamApi.getSquad(picked.teamId),
        tournament.tournamentId
          ? tournamentApi.findById(tournament.tournamentId).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (action === 'pdf') {
        const url = await generateSquadPdf(team, squad, t);
        setPdfUrl(url);
      } else {
        setSquadCtx({ team, squad, tournament: t });
        setSquadTemplateOpen(true);
      }
    } catch { err('Could not load squad data.'); }
    finally { setLoading(false); }
  };

  const handleTeamSchedulePdf = async () => {
    setLoading(true);
    try {
      const matches = await fetchTeamMatches();
      const logoUrl = tournament.tournamentId
        ? await tournamentApi.findById(tournament.tournamentId).then(t => t.logoUrl).catch(() => undefined)
        : undefined;
      const url = await generateTournamentSchedulePdf(tournament.name, matches, teamName, logoUrl);
      setListOpen(false); setPdfUrl(url);
    } catch { err('Could not generate schedule PDF.'); }
    finally { setLoading(false); }
  };

  const handleTournamentSchedulePdf = async () => {
    setLoading(true);
    try {
      const [allMatches, results] = await Promise.all([
        tournament.tournamentId
          ? matchApi.findByTournament(tournament.tournamentId)
          : Promise.resolve([]),
        tournament.tournamentId
          ? matchApi.findResultsByTournament(tournament.tournamentId).catch(() => [])
          : Promise.resolve([]),
      ]);
      const url = await generateTournamentTablePdf(tournament, allMatches, results);
      setListOpen(false); setPdfUrl(url);
    } catch { err('Could not generate tournament schedule PDF.'); }
    finally { setLoading(false); }
  };

  const handleTeamScheduleImage = async () => {
    setLoading(true);
    try {
      const matches = await fetchTeamMatches();
      setListOpen(false); setSchedTeamGroup(buildGroup(matches));
    } catch { err('Could not load matches.'); }
    finally { setLoading(false); }
  };

  const handleTournamentScheduleImage = async () => {
    setListOpen(false); setSchedTournGroup(buildGroup([]));
  };

  const handleCountdownImage = async () => {
    setLoading(true);
    try {
      const [matches, logoUrl] = await Promise.all([
        fetchTeamMatches(),
        tournament.tournamentId
          ? tournamentApi.findById(tournament.tournamentId).then(t => t.logoUrl).catch(() => undefined)
          : Promise.resolve(undefined),
      ]);
      const first = matches[0];
      if (!first) { err('No upcoming matches found.'); return; }
      const url = await generateTournamentCountdownImage(tournament.name, logoUrl, first);
      setListOpen(false); setImageTitle('Tournament Countdown'); setImageUrl(url);
    } catch { err('Could not generate countdown image.'); }
    finally { setLoading(false); }
  };

  const handleSquadPhotoGrid = async () => {
    if (!squadCtx) return;
    setLoading(true);
    try {
      const url = await generateSquadImage(squadCtx.team, squadCtx.squad, squadCtx.tournament);
      setSquadTemplateOpen(false); setSquadCtx(null); setImageTitle('Squad'); setImageUrl(url);
    } catch { err('Could not generate squad image.'); }
    finally { setLoading(false); }
  };

  const handleSquadNames = async () => {
    if (!squadCtx) return;
    setLoading(true);
    try {
      const url = await generateSquadNamesImage(squadCtx.team, squadCtx.squad, squadCtx.tournament);
      setSquadTemplateOpen(false); setSquadCtx(null); setImageTitle('Squad'); setImageUrl(url);
    } catch { err('Could not generate squad names image.'); }
    finally { setLoading(false); }
  };

  const imageFilename = imageTitle === 'Tournament Countdown' ? 'tournament-countdown.png' : 'squad.png';

  return (
    <>
      <Dialog open={listOpen} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>{tournament.name}</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <List disablePadding>
            <ListItemButton onClick={handleTeamSchedulePdf} disabled={loading}>
              <ListItemIcon>{loading ? <CircularProgress size={22} color="error" /> : <PictureAsPdf color="error" />}</ListItemIcon>
              <ListItemText primary="Team Schedule PDF" secondary="Visual fixture cards per match" />
            </ListItemButton>
            <ListItemButton onClick={handleTournamentSchedulePdf} disabled={loading}>
              <ListItemIcon>{loading ? <CircularProgress size={22} color="error" /> : <PictureAsPdf color="error" />}</ListItemIcon>
              <ListItemText primary="Tournament Schedule PDF" secondary="Landscape table with all fixtures and results" />
            </ListItemButton>
            <ListItemButton onClick={() => { setListOpen(false); openTeamPicker('pdf'); }} disabled={loading}>
              <ListItemIcon>{loading ? <CircularProgress size={22} color="error" /> : <PictureAsPdf color="error" />}</ListItemIcon>
              <ListItemText primary="Squad PDF" secondary="Tournament & squad details document" />
            </ListItemButton>
            <ListItemButton onClick={handleTeamScheduleImage} disabled={loading}>
              <ListItemIcon><ImageIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Team Match Schedule Image" secondary="Shareable graphic — pick days to include" />
            </ListItemButton>
            <ListItemButton onClick={handleTournamentScheduleImage} disabled={loading}>
              <ListItemIcon><ImageIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Tournament Match Schedule Image" secondary="All teams — pick days to include" />
            </ListItemButton>
            <ListItemButton onClick={() => { setListOpen(false); openTeamPicker('image'); }} disabled={loading}>
              <ListItemIcon><ImageIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Squad Image" secondary="Shareable graphic with player photos" />
            </ListItemButton>
            <ListItemButton onClick={handleCountdownImage} disabled={loading}>
              <ListItemIcon>{loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}</ListItemIcon>
              <ListItemText primary="Tournament Countdown Image" secondary="Countdown to next match with both teams" />
            </ListItemButton>
          </List>
        </DialogContent>
        <DialogActions><Button onClick={onClose}>Cancel</Button></DialogActions>
      </Dialog>

      <ScheduleImageDialog
        group={schedTeamGroup}
        teamName={teamName}
        onClose={() => { setSchedTeamGroup(null); onClose(); }}
        onGenerated={url => { setImageTitle('Team Match Schedule'); setImageUrl(url); }}
      />

      <ScheduleImageDialog
        group={schedTournGroup}
        onClose={() => { setSchedTournGroup(null); onClose(); }}
        onGenerated={url => { setImageTitle('Tournament Match Schedule'); setImageUrl(url); }}
      />

      <TeamPickerDialog
        open={!!teamPickerAction || teamPickerLoading}
        teams={teamPickerTeams}
        loading={teamPickerLoading}
        onSelect={handleTeamPicked}
        onClose={() => { setTeamPickerAction(null); onClose(); }}
      />

      <SquadTemplateDialog
        open={squadTemplateOpen}
        loading={loading}
        onClose={() => { setSquadTemplateOpen(false); setSquadCtx(null); onClose(); }}
        onPhotoGrid={handleSquadPhotoGrid}
        onNames={handleSquadNames}
      />

      <PdfPreviewDialog pdfUrl={pdfUrl} onClose={() => { setPdfUrl(null); onClose(); }} />

      <ImagePreviewDialog imageUrl={imageUrl} title={imageTitle} filename={imageFilename} onClose={() => { setImageUrl(null); onClose(); }} />

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')}
        message={snackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </>
  );
};
