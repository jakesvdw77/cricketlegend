import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Avatar, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, CircularProgress, Stack, Tooltip,
  useTheme, useMediaQuery,
} from '@mui/material';
import { Groups, ChevronRight, Download, ArrowBack, Fullscreen, FullscreenExit, ZoomIn, ZoomOut, ZoomOutMap, ViewStream, ViewColumn, CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
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
  preSelectTeamId?: number | null;
  preSelectTeamName?: string;
}

const fmtDate = (d: string): string => {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return d; }
};

export const SchedulePickerDialog: React.FC<SchedulePickerDialogProps> = ({
  tournament, onClose, preSelectTeamId, preSelectTeamName,
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLabel, setImageLabel] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [twoColumns, setTwoColumns] = useState(false);

  // Step state
  const [step, setStep] = useState<'team' | 'dates'>('team');
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [currentTeamId, setCurrentTeamId] = useState<number | null | undefined>(undefined);
  const [currentTeamName, setCurrentTeamName] = useState<string | undefined>(undefined);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (!tournament?.tournamentId) {
      setStep('team');
      setFilteredMatches([]);
      setSelectedDates(new Set());
      setImageUrl(null);
      return;
    }
    setMatches([]);
    setTeams([]);
    setImageUrl(null);
    setStep('team');
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

        if (preSelectTeamId !== undefined) {
          goToDates(
            preSelectTeamId !== null
              ? ms.filter(m => m.homeTeamId === preSelectTeamId || m.oppositionTeamId === preSelectTeamId)
              : ms,
            preSelectTeamId,
            preSelectTeamName,
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournament?.tournamentId, preSelectTeamId, preSelectTeamName]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToDates = (filtered: Match[], teamId: number | null | undefined, teamName?: string) => {
    setCurrentTeamId(teamId);
    setCurrentTeamName(teamName);
    setFilteredMatches(filtered);
    const allDates = new Set(filtered.map(m => m.matchDate).filter(Boolean) as string[]);
    setSelectedDates(allDates);
    setStep('dates');
  };

  const handleTeamSelect = (teamId: number | null, teamName?: string) => {
    const filtered = teamId
      ? matches.filter(m => m.homeTeamId === teamId || m.oppositionTeamId === teamId)
      : matches;
    goToDates(filtered, teamId, teamName);
  };

  const handleGenerate = async (cols?: boolean) => {
    if (!tournament) return;
    const matchesToUse = filteredMatches.filter(m => !m.matchDate || selectedDates.has(m.matchDate));
    setGenerating(true);
    try {
      const useCols = cols ?? twoColumns;
      const url = await generateMatchScheduleImage(
        tournament.name, tournament.logoUrl, matchesToUse, true, currentTeamName, useCols,
      );
      setImageLabel(currentTeamName ?? 'All Teams');
      setImageUrl(url);
      setZoom(100);
    } catch {
      // silently ignore
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleColumns = () => {
    const next = !twoColumns;
    setTwoColumns(next);
    handleGenerate(next);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${imageLabel.replace(/\s+/g, '-').toLowerCase()}-schedule.png`;
    a.click();
  };

  const toggleDate = (date: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  // ── Image preview ────────────────────────────────────────────────────────────
  if (imageUrl) {
    const isFs = fullscreen || isMobile;
    const closePreview = () => { setImageUrl(null); setFullscreen(false); setZoom(100); };
    return (
      <Dialog open fullScreen={isFs} maxWidth="lg" fullWidth PaperProps={{ sx: { bgcolor: '#0d3b1e' } }}>
        <DialogTitle sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 1, minHeight: 0 }}>
          <IconButton size="small" onClick={closePreview} sx={{ color: 'rgba(255,255,255,0.7)', mr: 0.5 }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, color: 'white', fontSize: { xs: '0.8rem', sm: '0.95rem' } }}>
            {tournament?.name} — {imageLabel}
          </Typography>
          <Tooltip title={twoColumns ? 'Single column' : '2-column layout'}>
            <span>
              <IconButton size="small" onClick={handleToggleColumns} disabled={generating}
                sx={{ color: twoColumns ? '#86efac' : 'rgba(255,255,255,0.7)' }}>
                {twoColumns ? <ViewColumn fontSize="small" /> : <ViewStream fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          {!isMobile && (
            <>
              <IconButton size="small" onClick={() => setZoom(z => Math.max(25, z - 25))} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                <ZoomOut fontSize="small" />
              </IconButton>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 30, textAlign: 'center' }}>
                {zoom}%
              </Typography>
              <IconButton size="small" onClick={() => setZoom(z => Math.min(300, z + 25))} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                <ZoomIn fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setZoom(100)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                <ZoomOutMap fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setFullscreen(f => !f)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {fullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
              </IconButton>
            </>
          )}
          <IconButton size="small" onClick={handleDownload} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <Download fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0.5, overflow: 'auto' }}>
          <Box component="img" src={imageUrl} alt="Schedule"
            sx={{ width: isMobile ? '100%' : `${zoom}%`, height: 'auto', borderRadius: 1, display: 'block', minWidth: isMobile ? '100%' : `${zoom}%` }} />
        </DialogContent>
      </Dialog>
    );
  }

  // ── Date picker step ─────────────────────────────────────────────────────────
  if (step === 'dates') {
    const matchesByDate = filteredMatches.reduce((acc, m) => {
      const key = m.matchDate ?? '__tbd__';
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    }, {} as Record<string, Match[]>);

    const sortedDates = Object.keys(matchesByDate)
      .filter(k => k !== '__tbd__')
      .sort();
    const hasTbd = !!matchesByDate['__tbd__'];

    const allSelected = sortedDates.every(d => selectedDates.has(d));
    const canGoBack = preSelectTeamId === undefined; // came through team picker

    const getOpponentLabel = (m: Match) => {
      if (currentTeamId != null) {
        return m.homeTeamId === currentTeamId
          ? `vs ${m.oppositionTeamName ?? '?'}`
          : `@ ${m.homeTeamName ?? '?'}`;
      }
      return `${m.homeTeamName} vs ${m.oppositionTeamName}`;
    };

    return (
      <Dialog open={!!tournament} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pb: 1 }}>
          {canGoBack && (
            <IconButton size="small" onClick={() => setStep('team')} sx={{ mr: 0.5 }}>
              <ArrowBack fontSize="small" />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {currentTeamName ?? 'All Teams'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Select match dates to include
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 1.5, pb: 1 }}>
          {sortedDates.length === 0 && !hasTbd ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
              No matches found.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {/* Select All / Deselect All row */}
              {sortedDates.length > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                  <Button size="small" variant="text" color="inherit" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
                    onClick={() => setSelectedDates(allSelected ? new Set() : new Set(sortedDates))}>
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </Button>
                </Box>
              )}

              {sortedDates.map(date => {
                const isSelected = selectedDates.has(date);
                const matchesOnDate = matchesByDate[date];
                return (
                  <Card
                    key={date}
                    variant="outlined"
                    onClick={() => toggleDate(date)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      borderColor: isSelected ? 'success.main' : 'divider',
                      borderWidth: isSelected ? 2 : 1,
                      bgcolor: isSelected ? 'rgba(78,160,100,0.08)' : 'transparent',
                      '&:hover': { borderColor: isSelected ? 'success.main' : 'primary.main' },
                    }}
                  >
                    <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Box sx={{ color: isSelected ? 'success.main' : 'text.disabled', mt: 0.1, flexShrink: 0 }}>
                          {isSelected
                            ? <CheckCircle sx={{ fontSize: 18 }} />
                            : <RadioButtonUnchecked sx={{ fontSize: 18 }} />}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600}>{fmtDate(date)}</Typography>
                          {matchesOnDate.map((m, i) => (
                            <Typography key={i} variant="caption" color="text.secondary" display="block">
                              {getOpponentLabel(m)}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}

              {hasTbd && (
                <Card variant="outlined" sx={{ borderColor: 'divider', opacity: 0.7 }}>
                  <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                    <Typography variant="body2" fontWeight={600} color="text.secondary">Date TBD</Typography>
                    {matchesByDate['__tbd__'].map((m, i) => (
                      <Typography key={i} variant="caption" color="text.secondary" display="block">
                        {getOpponentLabel(m)} — always included
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            disabled={selectedDates.size === 0 || generating}
            onClick={() => handleGenerate()}
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {generating ? 'Generating…' : 'Generate Image'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── Team picker step ─────────────────────────────────────────────────────────
  return (
    <Dialog open={!!tournament} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
      <DialogTitle>Full Schedule — {tournament?.name}</DialogTitle>
      <DialogContent sx={{ px: 2, pb: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            <TeamPickerCard
              avatar={<Groups />}
              name="All Teams"
              avatarBg="primary.main"
              highlighted
              onClick={() => handleTeamSelect(null)}
            />

            {teams.map(team => (
              <TeamPickerCard
                key={team.id}
                avatarSrc={team.logoUrl}
                name={team.name}
                onClick={() => handleTeamSelect(team.id, team.name)}
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
  onClick: () => void;
}

const TeamPickerCard: React.FC<TeamPickerCardProps> = ({
  avatarSrc, avatar, avatarBg, name, highlighted, onClick,
}) => (
  <Card
    variant="outlined"
    onClick={onClick}
    sx={{
      cursor: 'pointer',
      transition: 'all 0.15s',
      ...(highlighted ? {
        bgcolor: 'rgba(232,240,224,0.12)',
        borderColor: 'primary.main',
        borderWidth: 2,
        '&:hover': { opacity: 0.88 },
      } : {
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
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
      <Typography fontWeight={highlighted ? 'bold' : 500} sx={{ color: 'text.primary', flex: 1 }}>
        {name}
      </Typography>
      <ChevronRight sx={{ color: highlighted ? 'rgba(255,255,255,0.7)' : 'text.secondary' }} />
    </CardContent>
  </Card>
);
