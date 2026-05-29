import React, { useEffect, useMemo, useState } from 'react';
import {
  Drawer, Box, Typography, IconButton, Tabs, Tab, Divider,
  useTheme, useMediaQuery, Avatar, Chip, Button, CircularProgress,
  Grid, Tooltip, Autocomplete, TextField,
} from '@mui/material';
import {
  Close, Settings, Groups, CalendarMonth, SportsCricket,
  PermMedia, Share, FiberManualRecord, Save, TableRows, GridView, EmojiEvents, Handshake,
} from '@mui/icons-material';
import { Tournament, TournamentPool, Team, Match, MatchResultSummary, Field, Sponsor } from '../../types';
import { tournamentApi } from '../../api/tournamentApi';
import { teamApi } from '../../api/teamApi';
import { fieldApi } from '../../api/fieldApi';
import { matchApi } from '../../api/matchApi';
import { sponsorApi } from '../../api/sponsorApi';
import { TournamentGeneralInfoForm } from './TournamentGeneralInfoForm';
import { TournamentPoolsForm, LocalPool } from './TournamentPoolsForm';
import { TournamentScheduleTab } from './TournamentScheduleTab';
import { MatchScheduleVisual } from './MatchScheduleVisual';
import { MatchEditDialog } from './MatchEditDialog';
import { MatchCard, ResultCard, SkeletonGrid, STAGE_LABEL, STAGE_ORDER } from '../cricket/shared';
import { MatchResultCaptureContent } from '../../pages/admin/MatchResultCapture';
import { TournamentSocialLinksForm } from './TournamentSocialLinksForm';
import { MediaLibrary } from '../../pages/admin/MediaLibrary';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}
  >
    {value === index && children}
  </Box>
);

interface PlaceholderTabProps {
  icon: React.ReactElement;
  label: string;
  desc: string;
}

const PlaceholderTab: React.FC<PlaceholderTabProps> = ({ icon, label, desc }) => (
  <Box sx={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: 320, gap: 2,
  }}>
    <Box sx={{ display: 'flex', color: 'action.disabled' }}>
      {React.cloneElement(icon, { sx: { fontSize: 64 } })}
    </Box>
    <Typography variant="h6" color="text.secondary" fontWeight={600}>{label}</Typography>
    <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 340, textAlign: 'center' }}>{desc}</Typography>
    <Divider sx={{ width: 48, borderColor: 'divider', mt: 1 }} />
    <Typography variant="caption" color="text.disabled">Coming soon</Typography>
  </Box>
);

interface TournamentManageDrawerProps {
  tournament: Tournament | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (t: Tournament) => void;
}

const empty: Tournament = { name: '', pointsForWin: 2, pointsForDraw: 1, pointsForNoResult: 1, pointsForBonus: 1, showOnFrontPage: true, sponsors: [] };

export const TournamentManageDrawer: React.FC<TournamentManageDrawerProps> = ({
  tournament,
  open,
  onClose,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  // Setup tab state
  const [editing, setEditing] = useState<Tournament>(empty);
  const [nameError, setNameError] = useState('');
  const [dateError, setDateError] = useState('');
  const [saving, setSaving] = useState(false);

  // Teams tab state
  const [localPools, setLocalPools] = useState<LocalPool[]>([]);
  const [originalPools, setOriginalPools] = useState<LocalPool[]>([]);
  const [newPoolName, setNewPoolName] = useState('');
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [savingPools, setSavingPools] = useState(false);

  // Schedule tab state
  const [scheduleView, setScheduleView] = useState<'cards' | 'table' | 'visual'>('cards');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [scheduleKey, setScheduleKey] = useState(0);
  const [scheduleMatches, setScheduleMatches] = useState<Match[]>([]);
  const [scheduleResults, setScheduleResults] = useState<MatchResultSummary[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [matchFields, setMatchFields] = useState<Field[]>([]);
  const scheduleResultMap = useMemo(() => new Map(scheduleResults.map(r => [r.matchId, r])), [scheduleResults]);
  const [capturingMatchId, setCapturingMatchId] = useState<number | null>(null);
  const [savingWinner, setSavingWinner] = useState(false);
  const [allSponsors, setAllSponsors] = useState<Sponsor[]>([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    teamApi.findAll().then(setAllTeams).catch(() => {});
    fieldApi.findAll().then(setMatchFields).catch(() => {});
    sponsorApi.findAll().then(setAllSponsors).catch(() => {});
  }, []);

  useEffect(() => {
    if (tournament) {
      setEditing(tournament);
      setNameError('');
      setDateError('');
      const pools: LocalPool[] = (tournament.pools ?? []).map(p => ({
        poolId: p.poolId,
        poolName: p.poolName,
        teams: (p.teams ?? []).map(t => ({ teamId: t.teamId!, teamName: t.teamName!, tournamentTeamId: t.tournamentTeamId })),
      }));
      setLocalPools(pools);
      setOriginalPools(JSON.parse(JSON.stringify(pools)));
      setNewPoolName('');
      setScheduleView('cards');
      setScheduleFilter('all');
      setScheduleKey(k => k + 1);
      setScheduleMatches([]);
      setScheduleResults([]);
      setCapturingMatchId(null);
    }
  }, [tournament]);

  useEffect(() => {
    if ((activeTab === 2 || activeTab === 3) && editing.tournamentId && scheduleMatches.length === 0 && !scheduleLoading) {
      loadScheduleMatches(editing.tournamentId);
    }
  }, [activeTab, editing.tournamentId]);

  const loadScheduleMatches = (tournamentId: number) => {
    setScheduleLoading(true);
    Promise.all([
      matchApi.findByTournament(tournamentId),
      matchApi.findResultsByTournament(tournamentId),
    ]).then(([ms, rs]) => {
      setScheduleMatches([...ms].sort((a, b) => {
        const dc = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
        return dc !== 0 ? dc : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
      }));
      setScheduleResults(rs);
    }).finally(() => setScheduleLoading(false));
  };

  const isLive = (() => {
    if (!editing.startDate) return false;
    const today = new Date().toISOString().slice(0, 10);
    const nd = (d: string) => d.replace(/\//g, '-');
    return nd(editing.startDate) <= today && (!editing.endDate || nd(editing.endDate) >= today);
  })();

  const patch = (p: Partial<Tournament>) => setEditing(e => ({ ...e, ...p }));

  const save = async () => {
    if (!editing.name.trim()) {
      setNameError('Name is required.');
      setActiveTab(0);
      return;
    }
    if (editing.startDate && editing.endDate && editing.startDate > editing.endDate) {
      setDateError('Start date cannot be after end date.');
      setActiveTab(0);
      return;
    }
    setSaving(true);
    try {
      const saved = await tournamentApi.update(editing.tournamentId!, editing);
      onSaved?.(saved);
    } finally {
      setSaving(false);
    }
  };

  const savePools = async () => {
    const tournamentId = editing.tournamentId!;
    setSavingPools(true);
    try {
      for (const orig of originalPools) {
        if (orig.poolId && !localPools.find(p => p.poolId === orig.poolId)) {
          await tournamentApi.deletePool(orig.poolId);
        }
      }
      for (const pool of localPools) {
        let poolId = pool.poolId;
        if (!poolId) {
          const created = await tournamentApi.addPool(tournamentId, { poolName: pool.poolName } as TournamentPool);
          poolId = created.poolId!;
        }
        const origPool = originalPools.find(p => p.poolId === poolId);
        const origTeamIds = new Set(origPool?.teams.map(t => t.teamId) ?? []);
        const currTeamIds = new Set(pool.teams.map(t => t.teamId));
        for (const orig of origPool?.teams ?? []) {
          if (!currTeamIds.has(orig.teamId)) await tournamentApi.removeTeamFromPool(poolId!, orig.teamId);
        }
        for (const team of pool.teams) {
          if (!origTeamIds.has(team.teamId)) await tournamentApi.addTeamToPool(poolId!, team.teamId);
        }
      }
      // Reload the full tournament so the caller cache and drawer state stay in sync
      const updated = await tournamentApi.findById(tournamentId);
      onSaved?.(updated);
    } finally {
      setSavingPools(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: '95vw', md: '88vw', lg: '82vw' },
          maxWidth: 1400,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {tournament && (
        <>
          {/* ── Header ── */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 2.5, py: 1.75, bgcolor: 'background.paper',
            borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
          }}>
            <Avatar src={editing.logoUrl} variant="rounded" sx={{ width: 40, height: 40, flexShrink: 0 }}>
              {editing.name.charAt(0)}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" fontWeight={700}
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {editing.name || 'Tournament'}
                </Typography>
                {isLive && (
                  <Chip
                    icon={<FiberManualRecord sx={{ fontSize: '8px !important' }} />}
                    label="LIVE" size="small"
                    sx={{ bgcolor: '#e53935', color: 'white', fontWeight: 700, height: 20, '& .MuiChip-icon': { color: 'white' } }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">Tournament Management</Typography>
            </Box>

            <IconButton onClick={onClose} size="small" sx={{ flexShrink: 0 }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>

          {/* ── Tabs ── */}
          <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0, bgcolor: 'background.paper' }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant={isMobile ? 'scrollable' : 'standard'}
              scrollButtons={isMobile ? 'auto' : false}
              allowScrollButtonsMobile
              sx={{
                px: 1,
                '& .MuiTab-root': { minHeight: 52, textTransform: 'none', fontWeight: 500, fontSize: '0.85rem', gap: 0.75 },
              }}
            >
              <Tab label="Setup"    icon={<Settings fontSize="small" />}    iconPosition="start" />
              <Tab label="Teams"    icon={<Groups fontSize="small" />}       iconPosition="start" />
              <Tab label="Schedule" icon={<CalendarMonth fontSize="small" />} iconPosition="start" />
              <Tab label="Results"  icon={<SportsCricket fontSize="small" />} iconPosition="start" />
              <Tab label="Media"    icon={<PermMedia fontSize="small" />}    iconPosition="start" />
              <Tab label="Social"   icon={<Share fontSize="small" />}        iconPosition="start" />
              <Tab label="Sponsors" icon={<Handshake fontSize="small" />}   iconPosition="start" />
            </Tabs>
          </Box>

          {/* ── Setup tab ── */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save fontSize="small" />}
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </Box>
              <TournamentGeneralInfoForm
                value={editing}
                onChange={patch}
                nameError={nameError}
                onNameErrorClear={() => setNameError('')}
                dateError={dateError}
                onDateErrorClear={() => setDateError('')}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save fontSize="small" />}
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </TabPanel>

          {/* ── Teams tab ── */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TournamentPoolsForm
                localPools={localPools}
                onPoolsChange={setLocalPools}
                allTeams={allTeams}
                newPoolName={newPoolName}
                onNewPoolNameChange={setNewPoolName}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={savingPools ? <CircularProgress size={14} color="inherit" /> : <Save fontSize="small" />}
                  onClick={savePools}
                  disabled={savingPools}
                >
                  {savingPools ? 'Saving…' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </TabPanel>
          {/* ── Schedule tab ── */}
          <TabPanel value={activeTab} index={2}>
            {/* Inline result capture */}
            {capturingMatchId && (
              <MatchResultCaptureContent
                matchId={capturingMatchId}
                sticky={false}
                onBack={() => {
                  setCapturingMatchId(null);
                  setScheduleKey(k => k + 1);
                  if (editing.tournamentId) loadScheduleMatches(editing.tournamentId);
                }}
              />
            )}

            {/* Inline match edit */}
            {!capturingMatchId && editingMatch && (
              <MatchEditDialog
                match={editingMatch}
                inline
                onClose={() => setEditingMatch(null)}
                onSaved={() => {
                  setScheduleKey(k => k + 1);
                  if (editing.tournamentId) loadScheduleMatches(editing.tournamentId);
                }}
                pools={localPools}
                allTeams={allTeams}
                fields={matchFields}
              />
            )}

            {/* Schedule content */}
            {!capturingMatchId && !editingMatch && (
            <>
            {/* Toolbar: filter chips left, view toggles + add match right */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 1, flexWrap: 'wrap' }}>
              {/* Left: filter chips + add match */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  variant="outlined" size="small"
                  onClick={() => setEditingMatch({ tournamentId: editing.tournamentId, tournamentName: editing.name, matchStage: 'POOL' })}
                >
                  + Add Match
                </Button>
                {(['all', 'upcoming', 'completed'] as const).map(f => (
                  <Chip
                    key={f}
                    label={f.charAt(0).toUpperCase() + f.slice(1)}
                    onClick={() => {
                      setScheduleFilter(f);
                      setScheduleView('cards');
                      if (scheduleMatches.length === 0 && editing.tournamentId) loadScheduleMatches(editing.tournamentId);
                    }}
                    color={scheduleView === 'cards' && scheduleFilter === f ? 'primary' : 'default'}
                    variant={scheduleView === 'cards' && scheduleFilter === f ? 'filled' : 'outlined'}
                    sx={{ textTransform: 'capitalize' }}
                  />
                ))}
              </Box>

              {/* Right: view toggles */}
              <Box sx={{ display: 'flex', border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                {([
                  { key: 'cards',  label: 'Cards',  icon: <GridView sx={{ fontSize: 18 }} /> },
                  { key: 'table',  label: 'Table',  icon: <TableRows sx={{ fontSize: 18 }} /> },
                  { key: 'visual', label: 'Visual', icon: <EmojiEvents sx={{ fontSize: 18 }} /> },
                ] as const).map((v, i, arr) => (
                  <Tooltip key={v.key} title={v.label}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setScheduleView(v.key);
                        if (v.key !== 'table' && scheduleMatches.length === 0 && editing.tournamentId) {
                          loadScheduleMatches(editing.tournamentId);
                        }
                      }}
                      sx={{
                        borderRadius: 0,
                        borderRight: i < arr.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        bgcolor: scheduleView === v.key ? 'primary.main' : 'transparent',
                        color: scheduleView === v.key ? 'primary.contrastText' : 'text.secondary',
                        px: 1.25, py: 0.75,
                        '&:hover': { bgcolor: scheduleView === v.key ? 'primary.dark' : 'action.hover' },
                      }}
                    >
                      {v.icon}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
            </Box>

            {/* Cards view */}
            {scheduleView === 'cards' && (
              scheduleLoading ? <SkeletonGrid count={3} /> : (() => {
                const filtered = scheduleMatches.filter(m => {
                  const hasResult = scheduleResultMap.has(m.matchId!) || m.matchCompleted;
                  if (scheduleFilter === 'upcoming') return !hasResult;
                  if (scheduleFilter === 'completed') return hasResult;
                  return true;
                });
                if (filtered.length === 0) {
                  return (
                    <Box sx={{ textAlign: 'center', mt: 6 }}>
                      <EmojiEvents sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">No matches in this filter.</Typography>
                    </Box>
                  );
                }
                const byStage = new Map<string, Match[]>();
                for (const m of filtered) {
                  const key = m.matchStage ?? 'OTHER';
                  if (!byStage.has(key)) byStage.set(key, []);
                  byStage.get(key)!.push(m);
                }
                const stageGroups = [...byStage.entries()].sort(([a], [b]) => {
                  const ai = STAGE_ORDER.indexOf(a), bi = STAGE_ORDER.indexOf(b);
                  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                });
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {stageGroups.map(([stage, stageMatches]) => (
                      <Box key={stage}>
                        <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 2, color: 'text.secondary', display: 'block', mb: 2 }}>
                          {STAGE_LABEL[stage] ?? stage}
                        </Typography>
                        <Grid container spacing={2}>
                          {stageMatches.map(m => {
                            const result = scheduleResultMap.get(m.matchId!);
                            return (
                              <Grid item xs={12} sm={6} key={m.matchId}>
                                {result
                                  ? <ResultCard r={result} onEdit={() => setEditingMatch(m)} onScorecard={() => m.matchId && setCapturingMatchId(m.matchId)} />
                                  : <MatchCard m={m} hideTournament onEdit={() => setEditingMatch(m)} />
                                }
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    ))}
                  </Box>
                );
              })()
            )}

            {/* Table view */}
            {scheduleView === 'table' && (
              <TournamentScheduleTab
                key={scheduleKey}
                tournament={editing}
                onResultClick={id => setCapturingMatchId(id)}
                onEditMatch={m => setEditingMatch(m)}
              />
            )}

            {/* Visual view */}
            {scheduleView === 'visual' && (
              scheduleLoading
                ? <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
                : <MatchScheduleVisual matches={scheduleMatches} resultMap={scheduleResultMap} tournament={editing} showExport onEditMatch={m => setEditingMatch(m)} />
            )}

            </>
            )}
          </TabPanel>
          {/* ── Results tab ── */}
          <TabPanel value={activeTab} index={3}>
            {/* ── Tournament winner ── */}
            {!capturingMatchId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={localPools.flatMap(p => p.teams)}
                  getOptionLabel={t => t.teamName}
                  value={localPools.flatMap(p => p.teams).find(t => t.teamId === editing.winningTeamId) ?? null}
                  onChange={(_, team) => patch({ winningTeamId: team?.teamId ?? undefined, winningTeamName: team?.teamName ?? undefined })}
                  isOptionEqualToValue={(o, v) => o.teamId === v.teamId}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Tournament Winner"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <><EmojiEvents sx={{ color: 'warning.main', mr: 0.5, fontSize: 20 }} />{params.InputProps.startAdornment}</>
                        ),
                      }}
                    />
                  )}
                />
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={savingWinner ? <CircularProgress size={14} color="inherit" /> : <Save fontSize="small" />}
                  disabled={savingWinner}
                  onClick={async () => {
                    if (!editing.tournamentId) return;
                    setSavingWinner(true);
                    try {
                      const saved = await tournamentApi.update(editing.tournamentId, editing);
                      onSaved?.(saved);
                    } finally {
                      setSavingWinner(false);
                    }
                  }}
                >
                  {savingWinner ? 'Saving…' : 'Save'}
                </Button>
              </Box>
            )}

            {capturingMatchId ? (
              <MatchResultCaptureContent
                matchId={capturingMatchId}
                sticky={false}
                onBack={() => {
                  setCapturingMatchId(null);
                  if (editing.tournamentId) loadScheduleMatches(editing.tournamentId);
                }}
              />
            ) : (() => {
              const today = new Date().toISOString().slice(0, 10);
              const resultMatches = scheduleMatches.filter(m => {
                const d = (m.matchDate ?? '').replace(/\//g, '-');
                return d <= today;
              });
              if (scheduleLoading) return <SkeletonGrid count={3} />;
              if (resultMatches.length === 0) {
                return (
                  <Box sx={{ textAlign: 'center', mt: 6 }}>
                    <SportsCricket sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No past or live matches yet.</Typography>
                  </Box>
                );
              }
              const byStage = new Map<string, Match[]>();
              for (const m of resultMatches) {
                const key = m.matchStage ?? 'OTHER';
                if (!byStage.has(key)) byStage.set(key, []);
                byStage.get(key)!.push(m);
              }
              const stageGroups = [...byStage.entries()].sort(([a], [b]) => {
                const ai = STAGE_ORDER.indexOf(a), bi = STAGE_ORDER.indexOf(b);
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
              });
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {stageGroups.map(([stage, stageMatches]) => (
                    <Box key={stage}>
                      <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 2, color: 'text.secondary', display: 'block', mb: 2 }}>
                        {STAGE_LABEL[stage] ?? stage}
                      </Typography>
                      <Grid container spacing={2}>
                        {stageMatches.map(m => {
                          const result = scheduleResultMap.get(m.matchId!);
                          const openCapture = () => m.matchId && setCapturingMatchId(m.matchId);
                          return (
                            <Grid item xs={12} sm={6} key={m.matchId}>
                              {result
                                ? <ResultCard r={result} onEdit={openCapture} onScorecard={openCapture} />
                                : <MatchCard m={m} hideTournament onEdit={openCapture} />
                              }
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  ))}
                </Box>
              );
            })()}
          </TabPanel>
          <TabPanel value={activeTab} index={4}>
            <MediaLibrary tournamentId={editing.tournamentId} />
          </TabPanel>
          {/* ── Sponsors tab ── */}
          <TabPanel value={activeTab} index={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Autocomplete
                multiple
                options={allSponsors}
                getOptionLabel={s => s.name}
                value={editing.sponsors ?? []}
                onChange={(_, value) => patch({ sponsors: value })}
                isOptionEqualToValue={(o, v) => o.sponsorId === v.sponsorId}
                renderTags={(value, getTagProps) =>
                  value.map((s, idx) => (
                    <Chip label={s.name} size="small" {...getTagProps({ index: idx })} key={s.sponsorId} />
                  ))
                }
                renderInput={params => <TextField {...params} label="Sponsors" />}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save fontSize="small" />}
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </TabPanel>

          {/* ── Social tab ── */}
          <TabPanel value={activeTab} index={5}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TournamentSocialLinksForm value={editing} onChange={patch} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save fontSize="small" />}
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </TabPanel>
        </>
      )}
    </Drawer>
  );
};
