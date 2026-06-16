import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItemButton, ListItemIcon, ListItemText,
  Button, CircularProgress, IconButton, Box, Snackbar,
} from '@mui/material';
import {
  PictureAsPdf, WhatsApp, Print, Image as ImageIcon,
  Fullscreen, FullscreenExit, Download, Close,
} from '@mui/icons-material';
import { Match, MatchSide, MatchPoll, Player } from '../../types';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { pollApi } from '../../api/pollApi';
import PollWhatsAppDialog from '../../pages/admin/PollWhatsAppDialog';
import { generateMatchPdf, generateTeamsheetPdf } from '../../utils/matchPdf';
import { generatePlayingXiImage, generatePlayingXiBattingOrderImage, generatePlayingXiBattingOrderPlainImage, generateMatchCountdownImage } from '../../utils/teamsheetImage';
import { PdfPreviewDialog } from '../PdfPreviewDialog';
import TeamsheetTemplatesDialog from './TeamsheetTemplatesDialog';
import PlayingXiPlayerTemplate from '../../pages/admin/templates/PlayingXiPlayerTemplate';

// ── Sub-dialogs ───────────────────────────────────────────────────────────────

const XiTemplateDialog: React.FC<{
  open: boolean; loading: boolean;
  onClose: () => void; onPhotoGrid: () => void; onBattingOrder: () => void;
  onBattingOrderPlain: () => void; onPlayerPhoto: () => void;
}> = ({ open, loading, onClose, onPhotoGrid, onBattingOrder, onBattingOrderPlain, onPlayerPhoto }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Match Day Squad — Choose Template</DialogTitle>
    <DialogContent sx={{ p: 0 }}>
      <List disablePadding>
        <ListItemButton onClick={onPhotoGrid} disabled={loading}>
          <ListItemIcon>{loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}</ListItemIcon>
          <ListItemText primary="Photo Grid" secondary="Player photos in a 4-column grid" />
        </ListItemButton>
        <ListItemButton onClick={onBattingOrder} disabled={loading}>
          <ListItemIcon>{loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}</ListItemIcon>
          <ListItemText primary="Batting Order" secondary="Numbered list with bat / ball / gloves role icons" />
        </ListItemButton>
        <ListItemButton onClick={onBattingOrderPlain} disabled={loading}>
          <ListItemIcon>{loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}</ListItemIcon>
          <ListItemText primary="Batting Order — Plain" secondary="Numbered list, names only, no role icons" />
        </ListItemButton>
        <ListItemButton onClick={onPlayerPhoto} disabled={loading}>
          <ListItemIcon>{loading ? <CircularProgress size={22} /> : <ImageIcon color="secondary" />}</ListItemIcon>
          <ListItemText primary="Match Day Squad" secondary="Featured player photo alongside the full squad list" />
        </ListItemButton>
      </List>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Cancel</Button></DialogActions>
  </Dialog>
);

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

// ── Main share dialog ─────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  match: Match;
  teamId?: number;
  poll?: MatchPoll;
  onClose: () => void;
}

type SidesAndPlayers = { sides: MatchSide[]; players: Player[] };

export const MatchSharePanel: React.FC<Props> = ({ open, match, teamId, poll: preloadedPoll, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageTitle, setImageTitle] = useState('');
  const [whatsAppData, setWhatsAppData] = useState<SidesAndPlayers & { match: Match } | null>(null);
  const [xiTemplateOpen, setXiTemplateOpen] = useState(false);
  const [xiTemplateData, setXiTemplateData] = useState<SidesAndPlayers & { match: Match } | null>(null);
  const [xiPlayerTemplateOpen, setXiPlayerTemplateOpen] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [pollWhatsApp, setPollWhatsApp] = useState<{ match: Match; poll: MatchPoll; variant: 'open' | 'closed' } | null>(null);

  const effectiveTeamId = teamId ?? match.homeTeamId;

  const fetchSidesAndPlayers = async (): Promise<SidesAndPlayers> => {
    const [sides, players] = await Promise.all([matchApi.getTeamSheet(match.matchId!), playerApi.findAll()]);
    return { sides, players };
  };

  const handlePdf = async () => {
    setLoading(true);
    try { const url = await generateMatchPdf(match); onClose(); setPdfUrl(url); }
    catch { setSnackbar('Could not generate PDF.'); }
    finally { setLoading(false); }
  };

  const handleWhatsApp = async () => {
    setLoading(true);
    try { const sp = await fetchSidesAndPlayers(); onClose(); setWhatsAppData({ match, ...sp }); }
    catch { setSnackbar('Could not load team sheet data.'); }
    finally { setLoading(false); }
  };

  const handlePrint = async () => {
    setLoading(true);
    try { const sp = await fetchSidesAndPlayers(); const url = await generateTeamsheetPdf(match, sp.sides, sp.players, effectiveTeamId); onClose(); setPdfUrl(url); }
    catch { setSnackbar('Could not generate team sheet PDF.'); }
    finally { setLoading(false); }
  };

  const handleImage = async () => {
    setLoading(true);
    try { const sp = await fetchSidesAndPlayers(); onClose(); setXiTemplateData({ match, ...sp }); setXiTemplateOpen(true); }
    catch { setSnackbar('Could not load team sheet data.'); }
    finally { setLoading(false); }
  };

  const handleCountdown = async () => {
    setLoading(true);
    try { const url = await generateMatchCountdownImage(match); onClose(); setImageTitle('Match Countdown'); setImageUrl(url); }
    catch { setSnackbar('Could not generate countdown image.'); }
    finally { setLoading(false); }
  };

  const handlePollWhatsApp = async (variant: 'open' | 'closed') => {
    if (preloadedPoll) {
      onClose();
      setPollWhatsApp({ match, poll: preloadedPoll, variant });
      return;
    }
    setLoading(true);
    try {
      const teamIds = [...new Set([effectiveTeamId, match.homeTeamId, match.oppositionTeamId].filter(Boolean) as number[])];
      let found: MatchPoll | null = null;
      for (const tid of teamIds) {
        const p = await pollApi.getPoll(match.matchId!, tid).catch(() => null);
        if (p) { found = p; break; }
      }
      if (!found) { setSnackbar('No poll found for this match.'); return; }
      onClose();
      setPollWhatsApp({ match, poll: found, variant });
    } catch {
      setSnackbar('Could not load poll data.');
    } finally {
      setLoading(false);
    }
  };

  const handleXiPhotoGrid = async () => {
    if (!xiTemplateData) return;
    setLoading(true);
    try { const url = await generatePlayingXiImage(xiTemplateData.match, xiTemplateData.sides, xiTemplateData.players, effectiveTeamId); setXiTemplateOpen(false); setImageTitle('Match Day Squad'); setImageUrl(url); }
    catch { setSnackbar('Could not generate Match Day Squad image.'); }
    finally { setLoading(false); }
  };

  const handleXiBattingOrder = async () => {
    if (!xiTemplateData) return;
    setLoading(true);
    try { const url = await generatePlayingXiBattingOrderImage(xiTemplateData.match, xiTemplateData.sides, xiTemplateData.players, effectiveTeamId); setXiTemplateOpen(false); setImageTitle('Match Day Squad — Batting Order'); setImageUrl(url); }
    catch { setSnackbar('Could not generate batting order image.'); }
    finally { setLoading(false); }
  };

  const handleXiBattingOrderPlain = async () => {
    if (!xiTemplateData) return;
    setLoading(true);
    try { const url = await generatePlayingXiBattingOrderPlainImage(xiTemplateData.match, xiTemplateData.sides, xiTemplateData.players, effectiveTeamId); setXiTemplateOpen(false); setImageTitle('Match Day Squad — Batting Order Plain'); setImageUrl(url); }
    catch { setSnackbar('Could not generate batting order plain image.'); }
    finally { setLoading(false); }
  };

  const handleXiPlayerPhoto = () => {
    setXiTemplateOpen(false);
    setXiPlayerTemplateOpen(true);
  };

  const imageFilename =
    imageTitle === 'Match Countdown' ? 'match-countdown.png' :
    imageTitle === 'Match Day Squad — Batting Order' ? 'match-day-squad-batting.png' :
    imageTitle === 'Match Day Squad — Batting Order Plain' ? 'match-day-squad-batting-plain.png' :
    'match-day-squad.png';

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Share — {match.homeTeamName} vs {match.oppositionTeamName}</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <List disablePadding>
            <ListItemButton onClick={handlePdf} disabled={loading}>
              <ListItemIcon>{loading ? <CircularProgress size={22} color="error" /> : <PictureAsPdf color="error" />}</ListItemIcon>
              <ListItemText primary="Match Detail PDF" secondary="Open match fixture card" />
            </ListItemButton>
            <ListItemButton onClick={handleWhatsApp} disabled={loading}>
              <ListItemIcon><WhatsApp sx={{ color: '#25D366' }} /></ListItemIcon>
              <ListItemText primary="WhatsApp" secondary="Edit and copy team announcement" />
            </ListItemButton>
            <ListItemButton onClick={handlePrint} disabled={loading}>
              <ListItemIcon>{loading ? <CircularProgress size={22} /> : <Print />}</ListItemIcon>
              <ListItemText primary="Print Team Sheet" secondary="PDF with playing XI and 12th man" />
            </ListItemButton>
            <ListItemButton onClick={handleImage} disabled={loading}>
              <ListItemIcon>{loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}</ListItemIcon>
              <ListItemText primary="Match Day Squad" secondary="Shareable graphic with player photos" />
            </ListItemButton>
            <ListItemButton onClick={handleCountdown} disabled={loading}>
              <ListItemIcon>{loading ? <CircularProgress size={22} /> : <ImageIcon color="primary" />}</ListItemIcon>
              <ListItemText primary="Match Countdown Image" secondary="Countdown graphic with both team logos" />
            </ListItemButton>
            <ListItemButton
              onClick={() => handlePollWhatsApp('open')}
              disabled={loading || (preloadedPoll != null && !preloadedPoll.open)}
            >
              <ListItemIcon><WhatsApp sx={{ color: (preloadedPoll == null || preloadedPoll.open) ? '#25D366' : undefined }} /></ListItemIcon>
              <ListItemText primary="WhatsApp – Poll Open" secondary="Share poll link to collect availability" />
            </ListItemButton>
            <ListItemButton
              onClick={() => handlePollWhatsApp('closed')}
              disabled={loading || (preloadedPoll != null && preloadedPoll.open)}
            >
              <ListItemIcon><WhatsApp sx={{ color: (preloadedPoll == null || !preloadedPoll.open) ? '#25D366' : undefined }} /></ListItemIcon>
              <ListItemText primary="WhatsApp – Poll Closed" secondary="Notify players that the poll has closed" />
            </ListItemButton>
          </List>
        </DialogContent>
        <DialogActions><Button onClick={onClose}>Cancel</Button></DialogActions>
      </Dialog>

      <XiTemplateDialog
        open={xiTemplateOpen} loading={loading}
        onClose={() => { setXiTemplateOpen(false); setXiTemplateData(null); }}
        onPhotoGrid={handleXiPhotoGrid} onBattingOrder={handleXiBattingOrder}
        onBattingOrderPlain={handleXiBattingOrderPlain} onPlayerPhoto={handleXiPlayerPhoto}
      />

      {xiTemplateData && (
        <Dialog
          open={xiPlayerTemplateOpen}
          onClose={() => { setXiPlayerTemplateOpen(false); setXiTemplateData(null); }}
          fullScreen
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
            Match Day Squad
            <IconButton size="small" onClick={() => { setXiPlayerTemplateOpen(false); setXiTemplateData(null); }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <PlayingXiPlayerTemplate
              match={xiTemplateData.match}
              sides={xiTemplateData.sides}
              players={xiTemplateData.players}
              effectiveTeamId={effectiveTeamId ?? 0}
            />
          </DialogContent>
        </Dialog>
      )}

      {whatsAppData && (
        <TeamsheetTemplatesDialog
          open={!!whatsAppData} onClose={() => setWhatsAppData(null)}
          match={whatsAppData.match} sides={whatsAppData.sides} players={whatsAppData.players}
        />
      )}

      <PdfPreviewDialog pdfUrl={pdfUrl} onClose={() => setPdfUrl(null)} />

      <ImagePreviewDialog imageUrl={imageUrl} title={imageTitle} filename={imageFilename} onClose={() => setImageUrl(null)} />

      {pollWhatsApp && (
        <PollWhatsAppDialog
          open={!!pollWhatsApp}
          onClose={() => setPollWhatsApp(null)}
          match={pollWhatsApp.match}
          poll={pollWhatsApp.poll}
          variant={pollWhatsApp.variant}
        />
      )}

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')}
        message={snackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </>
  );
};
