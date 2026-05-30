import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Avatar, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, CircularProgress, Stack,
} from '@mui/material';
import { Groups, ChevronRight, Image as ImageIcon, Download, ArrowBack, Fullscreen, FullscreenExit } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { matchApi } from '../api/matchApi';
import { Match, Tournament } from '../types';
import { generateMatchScheduleImage } from '../utils/teamsheetImage';

interface Team {
  id: number;
  name: string;
  logoUrl?: string;
}

interface SchedulePickerDialogProps {
  tournament: Tournament | null;
  onClose: () => void;
}

export const SchedulePickerDialog: React.FC<SchedulePickerDialogProps> = ({ tournament, onClose }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLabel, setImageLabel] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!tournament?.tournamentId) return;
    setMatches([]);
    setTeams([]);
    setImageUrl(null);
    setLoading(true);
    matchApi.findByTournament(tournament.tournamentId)
      .then(ms => {
        setMatches(ms);
        const map = new Map<number, Team>();
        for (const m of ms) {
          if (m.homeTeamId && m.homeTeamName && !map.has(m.homeTeamId))
            map.set(m.homeTeamId, { id: m.homeTeamId, name: m.homeTeamName, logoUrl: m.homeTeamLogoUrl });
          if (m.oppositionTeamId && m.oppositionTeamName && !map.has(m.oppositionTeamId))
            map.set(m.oppositionTeamId, { id: m.oppositionTeamId, name: m.oppositionTeamName, logoUrl: m.oppositionTeamLogoUrl });
        }
        setTeams([...map.values()].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournament?.tournamentId]);

  const handleSelect = async (teamId: number | null, teamName?: string) => {
    if (!tournament) return;
    setGenerating(true);
    try {
      const filtered = teamId
        ? matches.filter(m => m.homeTeamId === teamId || m.oppositionTeamId === teamId)
        : matches;
      const url = await generateMatchScheduleImage(tournament.name, tournament.logoUrl, filtered, true, teamName);
      setImageLabel(teamName ?? 'All Teams');
      setImageUrl(url);
    } catch {
      // silently ignore
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${imageLabel.replace(/\s+/g, '-').toLowerCase()}-schedule.png`;
    a.click();
  };

  // ── Image preview ────────────────────────────────────────────────────────────
  if (imageUrl) {
    return (
      <Dialog open fullScreen={fullscreen} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#0d3b1e' } }}>
        <DialogTitle sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ImageIcon fontSize="small" />
          <Box sx={{ flex: 1 }}>{tournament?.name} — {imageLabel}</Box>
          <IconButton size="small" onClick={() => setFullscreen(f => !f)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {fullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <Box component="img" src={imageUrl} alt="Schedule"
            sx={{ maxWidth: '100%', maxHeight: '72vh', borderRadius: 2, display: 'block' }} />
        </DialogContent>
        <DialogActions>
          <Button startIcon={<ArrowBack />} onClick={() => { setImageUrl(null); setFullscreen(false); }}
            sx={{ color: 'rgba(255,255,255,0.6)', mr: 'auto' }}>
            Back
          </Button>
          <Button onClick={() => { setImageUrl(null); setFullscreen(false); onClose(); }} sx={{ color: 'rgba(255,255,255,0.6)' }}>Close</Button>
          <Button variant="contained" startIcon={<Download />} onClick={handleDownload}>
            Download PNG
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── Team picker ──────────────────────────────────────────────────────────────
  return (
    <Dialog open={!!tournament} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Full Schedule — {tournament?.name}</DialogTitle>
      <DialogContent sx={{ px: 2, pb: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {/* All Teams */}
            <TeamPickerCard
              avatar={<Groups />}
              name="All Teams"
              avatarBg="primary.main"
              highlighted
              loading={generating}
              onClick={() => handleSelect(null)}
            />

            {teams.map(team => (
              <TeamPickerCard
                key={team.id}
                avatarSrc={team.logoUrl}
                name={team.name}
                loading={generating}
                onClick={() => handleSelect(team.id, team.name)}
              />
            ))}

            {!loading && teams.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No teams found for this tournament.
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Reusable row card ─────────────────────────────────────────────────────────

interface TeamPickerCardProps {
  avatarSrc?: string;
  avatar?: React.ReactNode;
  avatarBg?: string;
  name: string;
  highlighted?: boolean;
  loading?: boolean;
  onClick: () => void;
}

const TeamPickerCard: React.FC<TeamPickerCardProps> = ({
  avatarSrc, avatar, avatarBg, name, highlighted, loading, onClick,
}) => (
  <Card
    variant="outlined"
    onClick={loading ? undefined : onClick}
    sx={{
      cursor: loading ? 'default' : 'pointer',
      transition: 'all 0.15s',
      ...(highlighted ? {
        bgcolor: 'primary.main',
        borderColor: 'primary.main',
        '&:hover': { opacity: loading ? 1 : 0.88 },
      } : {
        '&:hover': { borderColor: loading ? undefined : 'primary.main', bgcolor: loading ? undefined : 'action.hover' },
      }),
    }}
  >
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Avatar
        src={avatarSrc}
        sx={{
          width: 44, height: 44, flexShrink: 0,
          bgcolor: avatarBg ?? 'grey.300',
          ...(highlighted ? { bgcolor: 'rgba(255,255,255,0.2)', color: 'white' } : {}),
        }}
      >
        {avatar ?? name.charAt(0)}
      </Avatar>
      <Typography fontWeight={highlighted ? 'bold' : 500}
        sx={{ color: highlighted ? 'white' : 'text.primary', flex: 1 }}>
        {name}
      </Typography>
      {loading
        ? <CircularProgress size={16} sx={{ color: highlighted ? 'white' : undefined }} />
        : <ChevronRight sx={{ color: highlighted ? 'rgba(255,255,255,0.7)' : 'text.secondary' }} />
      }
    </CardContent>
  </Card>
);
