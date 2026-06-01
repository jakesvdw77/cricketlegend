import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Snackbar, Alert, CircularProgress,
  Tabs, Tab, Menu, MenuItem, IconButton, Tooltip, useTheme, useMediaQuery,
  Dialog, DialogTitle, DialogContent, Chip,
} from '@mui/material';
import { ArrowBack, AutoAwesome, Close, Psychology, Share, Sync, MoreVert, Visibility, Campaign, Edit, CheckCircle } from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { playerApi } from '../../api/playerApi';
import { Match, MatchSide, Player } from '../../types';
import { TeamSidePanel } from '../../components/match/TeamSidePanel';
import TeamsheetTemplatesDialog from '../../components/match/TeamsheetTemplatesDialog';
import { XiAnalysisView } from '../../components/match/XiAnalysisView';
import { AiTeamPickView } from '../../components/match/AiTeamPickView';

interface TeamsheetProps { embedded?: boolean; restrictToTeamIdProp?: number; onAnnouncedChange?: (announced: boolean) => void; }

export const Teamsheet: React.FC<TeamsheetProps> = ({ embedded = false, restrictToTeamIdProp, onAnnouncedChange }) => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const returnTo: string = (location.state as any)?.returnTo ?? '/admin/matches';
  const restrictToTeamId: number | undefined = restrictToTeamIdProp ?? (location.state as any)?.teamId;
  const id = Number(matchId);
  const [match, setMatch] = useState<Match | null>(null);
  const [squadsByTeam, setSquadsByTeam] = useState<Record<number, Player[]>>({});
  const [sides, setSides] = useState<MatchSide[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [analysisTeamId, setAnalysisTeamId] = useState<number | null>(null);
  const [pickTeamId, setPickTeamId] = useState<number | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [announceTeamId, setAnnounceTeamId] = useState<number | null>(null);
  const [editAnnounceTeamId, setEditAnnounceTeamId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' }>({ open: false, message: '' });

  useEffect(() => {
    Promise.all([
      matchApi.findById(id),
      matchApi.getTeamSheet(id),
      playerApi.findAll(),
    ]).then(([m, s, p]) => {
      setMatch(m);
      setSides(s);
      setAllPlayers(p);
      const teamIds = [m.homeTeamId, m.oppositionTeamId].filter(Boolean) as number[];
      Promise.all(teamIds.map(tid => teamApi.getSquad(tid).then(squad => ({ tid, squad }))))
        .then(results => {
          const map: Record<number, Player[]> = {};
          results.forEach(({ tid, squad }) => { map[tid] = squad; });
          setSquadsByTeam(map);
        });
    });
  }, [id]);

  const allTeamIds = match
    ? [match.homeTeamId, match.oppositionTeamId].filter(Boolean) as number[]
    : [];
  const teamIds = restrictToTeamId
    ? allTeamIds.filter(id => id === restrictToTeamId)
    : allTeamIds;

  const getSquad = (teamId: number) => squadsByTeam[teamId] ?? [];

  const getTeamName = (teamId: number) =>
    teamId === match?.homeTeamId ? match?.homeTeamName ?? '' : match?.oppositionTeamName ?? '';

  const refreshCalendar = async () => {
    setSyncing(true);
    try {
      const refreshed = await matchApi.getTeamSheet(id);
      setSides(refreshed);
      const totalPlayers = refreshed.reduce((sum, s) => sum + (s.playingXi?.length ?? 0), 0);
      setSnackbar({
        open: true,
        message: totalPlayers > 0
          ? `Calendar entries refreshed for ${totalPlayers} player${totalPlayers !== 1 ? 's' : ''}.`
          : 'No players in the squad yet. Add players to update their calendars.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const eitherAnnounced = sides.some(s => s.teamAnnounced);

  const activeTeamId = teamIds[activeTab] ?? teamIds[0];
  const activeSide = sides.find(s => s.teamId === activeTeamId);
  const hasFullXi = (activeSide?.playingXi?.length ?? 0) >= 11;
  const activeIsAnnounced = activeSide?.teamAnnounced ?? false;

  const closeMenu = () => setMenuAnchor(null);

  const announceControl = activeIsAnnounced ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip icon={<CheckCircle />} label="Announced" color="success" variant="outlined" size="small" />
      <Button size="small" variant="outlined" color="warning" startIcon={<Edit />}
        onClick={() => setEditAnnounceTeamId(activeTeamId)}>
        Edit
      </Button>
    </Box>
  ) : (
    <Button variant="outlined" startIcon={<Campaign />}
      disabled={!hasFullXi || teamIds.length === 0}
      disabled={!hasFullXi || teamIds.length === 0 || !!match?.matchCompleted}
      onClick={() => setAnnounceTeamId(activeTeamId)}>
      Announce Team
    </Button>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1 }}>
        {/* Back button + title — only when standalone */}
        {!embedded && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate(returnTo)} sx={{ flexShrink: 0 }}>
              {!isMobile && 'Back'}
            </Button>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant={isMobile ? 'subtitle1' : 'h5'} noWrap>
                {isMobile
                  ? `${match?.homeTeamName} vs ${match?.oppositionTeamName}`
                  : `Team Sheet — ${match?.homeTeamName} vs ${match?.oppositionTeamName}`}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {match?.matchDate}{match?.fieldName ? ` | ${match.fieldName}` : ''}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Action buttons — always visible */}
        {isMobile ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, ml: embedded ? 'auto' : 0 }}>
            {announceControl}
            <IconButton onClick={e => setMenuAnchor(e.currentTarget)}>
              <MoreVert />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
              <Tooltip title={!eitherAnnounced ? 'Announce the team first to refresh calendars' : ''} placement="left">
                <span>
                  <MenuItem onClick={() => { closeMenu(); refreshCalendar(); }} disabled={syncing || !eitherAnnounced} sx={{ width: '100%' }}>
                    {syncing ? <CircularProgress size={16} sx={{ mr: 1 }} /> : <Sync fontSize="small" sx={{ mr: 1 }} />}
                    Calendar
                  </MenuItem>
                </span>
              </Tooltip>
              {!embedded && (
                <Tooltip title={!eitherAnnounced ? 'Announce the team first to share' : ''} placement="left">
                  <span>
                    <MenuItem onClick={() => { closeMenu(); setTemplatesOpen(true); }} disabled={!eitherAnnounced} sx={{ width: '100%' }}>
                      <Share fontSize="small" sx={{ mr: 1 }} /> Share / Templates
                    </MenuItem>
                  </span>
                </Tooltip>
              )}
              {!embedded && (
                <MenuItem onClick={() => { closeMenu(); navigate(`/matches/${id}/teamsheet`); }}>
                  <Visibility fontSize="small" sx={{ mr: 1 }} /> Team Sheet
                </MenuItem>
              )}
              <MenuItem
                onClick={() => { closeMenu(); setAnalysisTeamId(teamIds[activeTab] ?? teamIds[0] ?? null); }}
                disabled={!hasFullXi}
              >
                <Psychology fontSize="small" sx={{ mr: 1 }} /> Analyse XI
              </MenuItem>
              <MenuItem
                onClick={() => { closeMenu(); setPickTeamId(teamIds[activeTab] ?? teamIds[0] ?? null); }}
                disabled={teamIds.length === 0}
              >
                <AutoAwesome fontSize="small" sx={{ mr: 1 }} /> Pick XI with AI
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, ml: embedded ? 0 : 2 }}>
            {/* Announce — left side */}
            {announceControl}

            <Box sx={{ flex: 1 }} />

            {/* Right side: Calendar, Share, Analyse, Pick */}
            <Tooltip title={!eitherAnnounced ? 'Announce the team first to refresh calendars' : ''}>
              <span>
                <Button
                  variant="outlined"
                  startIcon={syncing ? <CircularProgress size={16} /> : <Sync />}
                  onClick={refreshCalendar}
                  disabled={syncing || !eitherAnnounced || !!match?.matchCompleted}
                >
                  Calendar
                </Button>
              </span>
            </Tooltip>
            {!embedded && (
              <Tooltip title={!eitherAnnounced ? 'Announce the team first to share' : ''}>
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<Share />}
                    onClick={() => setTemplatesOpen(true)}
                    disabled={!eitherAnnounced || !!match?.matchCompleted}
                  >
                    Share / Templates
                  </Button>
                </span>
              </Tooltip>
            )}
            {!embedded && (
              <Button
                variant="outlined"
                startIcon={<Visibility />}
                onClick={() => navigate(`/matches/${id}/teamsheet`)}
                disabled={!!match?.matchCompleted}
              >
                Team Sheet
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Psychology />}
              onClick={() => setAnalysisTeamId(teamIds[activeTab] ?? teamIds[0] ?? null)}
              disabled={!hasFullXi}
            >
              Analyse XI
            </Button>
            <Button
              variant="outlined"
              startIcon={<AutoAwesome />}
              onClick={() => setPickTeamId(teamIds[activeTab] ?? teamIds[0] ?? null)}
              disabled={teamIds.length === 0 || !!match?.matchCompleted}
            >
              Pick XI
            </Button>
          </Box>
        )}
      </Box>

      {teamIds.length > 1 && (
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mt: 2, mb: 2 }}>
          {teamIds.map(teamId => (
            <Tab key={teamId} label={getTeamName(teamId)} />
          ))}
        </Tabs>
      )}

      {teamIds.map((teamId, idx) => (
        <Box key={teamId} hidden={activeTab !== idx} sx={{ mt: teamIds.length === 1 ? 2 : 0 }}>
          <TeamSidePanel
            matchId={id}
            teamId={teamId}
            teamName={getTeamName(teamId)}
            players={getSquad(teamId)}
            matchCompleted={!!match?.matchCompleted}
            externalAnnounceOpen={announceTeamId === teamId}
            externalEditAnnounceOpen={editAnnounceTeamId === teamId}
            onExternalDialogClose={() => { setAnnounceTeamId(null); setEditAnnounceTeamId(null); }}
            onSideChange={updated => {
              setSides(prev => prev.map(s => s.teamId === updated.teamId ? updated : s));
              if (updated.teamId === activeTeamId) onAnnouncedChange?.(updated.teamAnnounced ?? false);
            }}
          />
        </Box>
      ))}

      {match && (
        <TeamsheetTemplatesDialog
          open={templatesOpen}
          onClose={() => setTemplatesOpen(false)}
          match={match}
          sides={sides}
          players={allPlayers}
        />
      )}

      {/* Pick XI dialog */}
      <Dialog open={!!pickTeamId} onClose={() => setPickTeamId(null)} maxWidth="lg" fullWidth fullScreen>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
          <AutoAwesome color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="span">Pick XI with AI</Typography>
            {pickTeamId && (
              <Typography variant="body2" color="text.secondary">
                {getTeamName(pickTeamId)} — {match?.homeTeamName} vs {match?.oppositionTeamName}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={() => setPickTeamId(null)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          {pickTeamId && match && (
            <AiTeamPickView
              matchId={id}
              teamId={pickTeamId}
              teamName={getTeamName(pickTeamId)}
              matchTitle={`${match.homeTeamName} vs ${match.oppositionTeamName}`}
              onApply={(xiIds, twelfthId) => {
                const capturedTeamId = pickTeamId!;
                const capturedTeamName = getTeamName(capturedTeamId);
                const side = sides.find(s => s.teamId === capturedTeamId);
                const updated = {
                  ...(side ?? {}),
                  matchId: id,
                  teamId: capturedTeamId,
                  playingXi: xiIds,
                  twelfthManPlayerId: twelfthId ?? undefined,
                };
                matchApi.saveTeamSheet(id, updated as any)
                  .then(saved => {
                    setSides(prev => {
                      const idx = prev.findIndex(s => s.teamId === capturedTeamId);
                      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
                      return [...prev, saved];
                    });
                    setPickTeamId(null);
                    setSnackbar({ open: true, message: `AI XI applied for ${capturedTeamName}!`, severity: 'success' });
                  })
                  .catch(err => {
                    const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to save team sheet';
                    setSnackbar({ open: true, message: `Error: ${msg}`, severity: 'error' });
                  });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Analyse XI dialog */}
      <Dialog open={!!analysisTeamId} onClose={() => setAnalysisTeamId(null)} maxWidth="lg" fullWidth fullScreen>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
          <Psychology color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="span">XI Analysis</Typography>
            {analysisTeamId && (
              <Typography variant="body2" color="text.secondary">
                {getTeamName(analysisTeamId)} — {match?.homeTeamName} vs {match?.oppositionTeamName}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={() => setAnalysisTeamId(null)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          {analysisTeamId && match && (
            <XiAnalysisView
              matchId={id}
              teamId={analysisTeamId}
              teamName={getTeamName(analysisTeamId)}
              matchTitle={`${match.homeTeamName} vs ${match.oppositionTeamName}`}
            />
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity ?? 'success'} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
