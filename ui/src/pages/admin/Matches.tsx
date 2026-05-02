import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, ListSubheader,
  TableSortLabel, TablePagination,
  Popover, FormGroup, Checkbox, FormControlLabel, Tooltip, useMediaQuery, useTheme, InputAdornment, Chip, Avatar, Link,
} from '@mui/material';
import { Add, ArrowBack, Edit, Delete, Assignment, Groups, ViewColumn, Print, HowToVote, YouTube, FilterList } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { fieldApi } from '../../api/fieldApi';
import { tournamentApi } from '../../api/tournamentApi';
import { Match, Team, Field, Tournament, MatchStage } from '../../types';
import { DetailSection, DetailGrid, DetailField } from '../../components/admin/DetailView';

const empty: Match = {};

type ColKey = 'date' | 'startTime' | 'tournament' | 'homeTeam' | 'opposition' | 'ground' | 'umpire' | 'stage' | 'result';
const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'date',        label: 'Match Day' },
  { key: 'startTime',   label: 'Start Time' },
  { key: 'tournament',  label: 'Tournament' },
  { key: 'stage',       label: 'Stage' },
  { key: 'homeTeam',    label: 'Home Team' },
  { key: 'opposition',  label: 'Opposition' },
  { key: 'result',      label: 'Result' },
  { key: 'ground',      label: 'Ground' },
  { key: 'umpire',      label: 'Umpire' },
];
const DEFAULT_VISIBLE = new Set<ColKey>(['date', 'startTime', 'tournament', 'homeTeam', 'opposition', 'result', 'ground', 'stage']);
const MOBILE_VISIBLE = new Set<ColKey>(['date', 'startTime', 'tournament', 'homeTeam', 'opposition', 'result']);

export const Matches: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = useState<Match[]>([]);
  const [sortField, setSortField] = useState<'matchDate' | 'tournamentName' | 'homeTeamName'>('matchDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };
  const [filterTournament, setFilterTournament] = useState<number | ''>('');
  const [filterStage, setFilterStage] = useState<MatchStage | ''>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Match>(empty);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(isMobile ? MOBILE_VISIBLE : DEFAULT_VISIBLE));
  const [colAnchor, setColAnchor] = useState<HTMLButtonElement | null>(null);
  const [errors, setErrors] = useState<{ matchDate?: string; homeTeam?: string; oppTeam?: string; startTime?: string }>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewing, setViewing] = useState(false);
  const [viewItem, setViewItem] = useState<Match | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);

  const load = () => matchApi.findAll().then(setRows);
  useEffect(() => {
    load();
    teamApi.findAll().then(setTeams);
    fieldApi.findAll().then(setFields);
    tournamentApi.findAll().then(setTournaments);
  }, []);

  const openCreate = () => {
    setEditing(empty);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (match: Match) => {
    setEditing(match);
    setErrors({});
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    load();
  };

  const saveMatchDetails = async () => {
    const newErrors: typeof errors = {};
    if (!editing.matchDate) newErrors.matchDate = 'Match date is required';
    if (!editing.homeTeamId) newErrors.homeTeam = 'Home team is required';
    if (!editing.oppositionTeamId) newErrors.oppTeam = 'Opposition team is required';
    else if (editing.homeTeamId && editing.homeTeamId === editing.oppositionTeamId)
      newErrors.oppTeam = 'Opposition team must be different from home team';
    if (!editing.scheduledStartTime) newErrors.startTime = 'Start time is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    if (editing.matchId) {
      await matchApi.update(editing.matchId, editing);
    } else {
      await matchApi.create(editing);
    }
    handleClose();
  };

  const remove = async () => {
    if (deleteId == null) return;
    await matchApi.delete(deleteId);
    setDeleteId(null);
    load();
  };

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filtered = [...rows].filter(r => {
    const matchesTournament = !filterTournament || r.tournamentId === filterTournament;
    const matchesStage = !filterStage || r.matchStage === filterStage;
    return matchesTournament && matchesStage;
  }).sort((a, b) => {
    const val = (r: typeof a) =>
      sortField === 'matchDate' ? (r.matchDate ?? '') :
      sortField === 'tournamentName' ? (r.tournamentName ?? '') :
      (r.homeTeamName ?? '');
    const cmp = val(a).localeCompare(val(b));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const col = (key: ColKey) => isMobile ? (['date', 'startTime', 'homeTeam', 'opposition'] as ColKey[]).includes(key) : visibleCols.has(key);

  const selectedTournament = tournaments.find(t => t.tournamentId === editing.tournamentId);
  const tournamentPools = selectedTournament?.pools ?? [];
  const usePoolGroups = tournamentPools.length > 1;

  const renderTeamItems = (excludeId?: number) => {
    if (!editing.tournamentId || tournamentPools.length === 0) {
      return teams
        .filter(t => t.teamId !== excludeId)
        .map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>);
    }
    if (usePoolGroups) {
      return tournamentPools.flatMap(pool => [
        <ListSubheader key={`h-${pool.poolId}`}>{pool.poolName}</ListSubheader>,
        ...(pool.teams ?? [])
          .filter(t => t.teamId !== excludeId)
          .map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>),
      ]);
    }
    return (tournamentPools[0].teams ?? [])
      .filter(t => t.teamId !== excludeId)
      .map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>);
  };

  if (open) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={handleClose}>Back</Button>
          <Typography variant="h6" sx={{ flex: 1 }}>{editing.matchId ? 'Edit' : 'New'} Match</Typography>
          <Button variant="contained" onClick={saveMatchDetails}>Save</Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 700 }}>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Match Date" type="date" value={editing.matchDate ?? ''} fullWidth required
              InputLabelProps={{ shrink: true }} error={!!errors.matchDate} helperText={errors.matchDate}
              onChange={e => setEditing({ ...editing, matchDate: e.target.value })} />
            <TextField label="Arrival Time" type="time" value={editing.arrivalTime ?? ''} fullWidth
              InputLabelProps={{ shrink: true }} onChange={e => setEditing({ ...editing, arrivalTime: e.target.value })} />
            <TextField label="Toss Time" type="time" value={editing.tossTime ?? ''} fullWidth
              InputLabelProps={{ shrink: true }} onChange={e => setEditing({ ...editing, tossTime: e.target.value })} />
            <TextField label="Start Time" type="time" value={editing.scheduledStartTime ?? ''} fullWidth required
              InputLabelProps={{ shrink: true }} error={!!errors.startTime} helperText={errors.startTime}
              onChange={e => {
                const startTime = e.target.value;
                const patch: Partial<Match> = { scheduledStartTime: startTime };
                if (startTime) {
                  const [h, m] = startTime.split(':').map(Number);
                  const minsFromMidnight = h * 60 + m;
                  const offset = (mins: number) => {
                    const t = ((minsFromMidnight - mins) % 1440 + 1440) % 1440;
                    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
                  };
                  if (!editing.arrivalTime) patch.arrivalTime = offset(45);
                  if (!editing.tossTime) patch.tossTime = offset(15);
                }
                setEditing({ ...editing, ...patch });
              }} />
          </Box>
          <TextField select label="Tournament" value={editing.tournamentId ?? ''}
            onChange={e => {
              const tId = +e.target.value;
              const newT = tournaments.find(t => t.tournamentId === tId);
              const validIds = new Set((newT?.pools ?? []).flatMap(p => (p.teams ?? []).map(t => t.teamId)));
              setEditing(prev => ({
                ...prev, tournamentId: tId,
                homeTeamId: prev.homeTeamId && validIds.has(prev.homeTeamId) ? prev.homeTeamId : undefined,
                oppositionTeamId: prev.oppositionTeamId && validIds.has(prev.oppositionTeamId) ? prev.oppositionTeamId : undefined,
              }));
            }}>
            {tournaments.map(t => <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>)}
          </TextField>
          <TextField select label="Stage" value={editing.matchStage ?? ''}
            onChange={e => setEditing({ ...editing, matchStage: e.target.value as MatchStage })}>
            <MenuItem value="FRIENDLY">Friendly</MenuItem>
            <MenuItem value="POOL">Pool</MenuItem>
            <MenuItem value="QUARTER_FINAL">Quarter-Final</MenuItem>
            <MenuItem value="SEMI_FINAL">Semi-Final</MenuItem>
            <MenuItem value="FINAL">Final</MenuItem>
          </TextField>
          <TextField select label="Home Team" value={editing.homeTeamId ?? ''} required
            error={!!errors.homeTeam} helperText={errors.homeTeam}
            onChange={e => setEditing({ ...editing, homeTeamId: +e.target.value })}>
            {renderTeamItems(editing.oppositionTeamId)}
          </TextField>
          <TextField select label="Opposition Team" value={editing.oppositionTeamId ?? ''} required
            error={!!errors.oppTeam} helperText={errors.oppTeam}
            onChange={e => setEditing({ ...editing, oppositionTeamId: +e.target.value })}>
            {renderTeamItems(editing.homeTeamId)}
          </TextField>
          <TextField select label="Ground" value={editing.fieldId ?? ''}
            onChange={e => setEditing({ ...editing, fieldId: +e.target.value })}>
            {fields.map(f => <MenuItem key={f.fieldId} value={f.fieldId}>{f.name}</MenuItem>)}
          </TextField>
          <TextField label="Umpire" value={editing.umpire ?? ''}
            onChange={e => setEditing({ ...editing, umpire: e.target.value })} />
          <TextField label="Live Scoring URL" value={editing.scoringUrl ?? ''}
            onChange={e => setEditing({ ...editing, scoringUrl: e.target.value })} />
          <TextField label="YouTube Stream URL" value={editing.youtubeUrl ?? ''}
            onChange={e => setEditing({ ...editing, youtubeUrl: e.target.value })}
            InputProps={{ startAdornment: <InputAdornment position="start"><YouTube sx={{ color: '#FF0000', fontSize: 20 }} /></InputAdornment> }} />
        </Box>
      </Box>
    );
  }

  const STAGE_LABELS: Record<string, string> = {
    FRIENDLY: 'Friendly', POOL: 'Pool', QUARTER_FINAL: 'Quarter-Final',
    SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
  };

  if (viewing && viewItem) {
    const hasToss = viewItem.tossWonBy || viewItem.tossDecision;
    const hasLinks = viewItem.scoringUrl || viewItem.youtubeUrl;
    const tossTeamName = viewItem.tossWonBy === 'HOME' ? viewItem.homeTeamName
      : viewItem.tossWonBy === 'OPPOSITION' ? viewItem.oppositionTeamName
      : undefined;
    const tossDecisionLabel = viewItem.tossDecision === 'BAT' ? 'Elected to bat'
      : viewItem.tossDecision === 'BOWL' ? 'Elected to bowl'
      : undefined;
    const getInitials = (name?: string) => (name ?? '').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    return (
      <Box sx={{ maxWidth: 800 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => setViewing(false)}>Back</Button>
          <Typography variant="h6" sx={{ flex: 1 }}>Match</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Header card */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Avatar src={viewItem.homeTeamLogoUrl ?? ''} sx={{ width: 48, height: 48 }}>
                {getInitials(viewItem.homeTeamName)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" noWrap>{viewItem.homeTeamName}</Typography>
              </Box>
              <Typography variant="h6" color="text.secondary">vs</Typography>
              <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <Typography variant="h6" noWrap>{viewItem.oppositionTeamName}</Typography>
              </Box>
              <Avatar src={viewItem.oppositionTeamLogoUrl ?? ''} sx={{ width: 48, height: 48 }}>
                {getInitials(viewItem.oppositionTeamName)}
              </Avatar>
            </Box>
            {viewItem.tournamentName && (
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>{viewItem.tournamentName}</Typography>
            )}
            {viewItem.matchCompleted && viewItem.matchOutcomeDescription && (
              <Box sx={{ mt: 1 }}>
                <Chip label={viewItem.matchOutcomeDescription} color="success" size="small" />
              </Box>
            )}
          </Paper>

          {/* Match Details */}
          <DetailSection title="Match Details">
            <DetailGrid>
              <DetailField label="Date" value={viewItem.matchDate} />
              <DetailField label="Start Time" value={viewItem.scheduledStartTime ? viewItem.scheduledStartTime.slice(0, 5) : undefined} />
              <DetailField label="Arrival Time" value={viewItem.arrivalTime} />
              <DetailField label="Toss Time" value={viewItem.tossTime} />
              <DetailField label="Tournament" value={viewItem.tournamentName} />
              <DetailField label="Stage" value={viewItem.matchStage ? STAGE_LABELS[viewItem.matchStage] : undefined} />
              <DetailField label="Ground" value={viewItem.fieldName} />
              <DetailField label="Address" value={viewItem.fieldAddress} />
              <DetailField label="Umpire" value={viewItem.umpire} />
            </DetailGrid>
          </DetailSection>

          {/* Toss */}
          {hasToss && (
            <DetailSection title="Toss">
              <DetailGrid>
                <DetailField label="Won By" value={tossTeamName} />
                <DetailField label="Decision" value={tossDecisionLabel} />
              </DetailGrid>
            </DetailSection>
          )}

          {/* Result */}
          {viewItem.matchCompleted && (
            <DetailSection title="Result">
              <DetailGrid>
                <DetailField label="Status" value={
                  viewItem.matchDrawn ? 'Draw'
                    : viewItem.noResult ? 'No Result'
                    : viewItem.forfeited ? 'Forfeited'
                    : viewItem.matchOutcomeDescription
                } />
                {viewItem.scoreBattingFirst != null && (
                  <DetailField label="1st Innings" value={`${viewItem.scoreBattingFirst}/${viewItem.wicketsLostBattingFirst ?? '?'} (${viewItem.oversBattingFirst ?? '?'} ov)`} />
                )}
                {viewItem.scoreBattingSecond != null && (
                  <DetailField label="2nd Innings" value={`${viewItem.scoreBattingSecond}/${viewItem.wicketsLostBattingSecond ?? '?'} (${viewItem.oversBattingSecond ?? '?'} ov)`} />
                )}
              </DetailGrid>
            </DetailSection>
          )}

          {/* Links */}
          {hasLinks && (
            <DetailSection title="Links">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {viewItem.scoringUrl && <Link href={viewItem.scoringUrl} target="_blank" rel="noopener" underline="hover">Scoring URL</Link>}
                {viewItem.youtubeUrl && <Link href={viewItem.youtubeUrl} target="_blank" rel="noopener" underline="hover">YouTube</Link>}
              </Box>
            </DetailSection>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Matches</Typography>
        {!isMobile && (
          <Tooltip title="Toggle columns">
            <IconButton onClick={e => setColAnchor(e.currentTarget)}><ViewColumn /></IconButton>
          </Tooltip>
        )}
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Match
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: filtersOpen ? 2 : 0 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mr: 'auto' }}>Filters</Typography>
          <Tooltip title={filtersOpen ? 'Collapse' : 'Expand'}>
            <IconButton size="small" onClick={() => setFiltersOpen(o => !o)}>
              <FilterList fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {filtersOpen && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField select size="small" label="Tournament" value={filterTournament}
              onChange={e => { setFilterTournament(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }}
              sx={{ width: { xs: '100%', sm: 220 } }}>
              <MenuItem value="">All tournaments</MenuItem>
              {tournaments.map(t => <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Stage" value={filterStage}
              onChange={e => { setFilterStage(e.target.value as MatchStage | ''); setPage(0); }}
              sx={{ width: { xs: '100%', sm: 140 } }}>
              <MenuItem value="">All stages</MenuItem>
              <MenuItem value="FRIENDLY">Friendly</MenuItem>
              <MenuItem value="POOL">Pool</MenuItem>
              <MenuItem value="QUARTER_FINAL">Quarter-Final</MenuItem>
              <MenuItem value="SEMI_FINAL">Semi-Final</MenuItem>
              <MenuItem value="FINAL">Final</MenuItem>
            </TextField>
          </Box>
        )}
      </Paper>

      <Popover
        open={!!colAnchor}
        anchorEl={colAnchor}
        onClose={() => setColAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Visible Columns</Typography>
          <FormGroup>
            {ALL_COLUMNS.map(c => (
              <FormControlLabel
                key={c.key}
                label={c.label}
                control={
                  <Checkbox
                    size="small"
                    checked={visibleCols.has(c.key)}
                    onChange={() => toggleCol(c.key)}
                  />
                }
              />
            ))}
          </FormGroup>
        </Box>
      </Popover>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' }, '& .MuiTableHead-root .MuiTableSortLabel-root': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root:hover': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root.Mui-active': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-icon': { color: 'inherit !important' } }}>
          <TableHead>
            <TableRow>
              {col('date') && (
                <TableCell sortDirection={sortField === 'matchDate' ? sortDir : false}>
                  <TableSortLabel active={sortField === 'matchDate'} direction={sortDir} onClick={() => handleSort('matchDate')}>Match Day</TableSortLabel>
                </TableCell>
              )}
              {col('startTime')  && <TableCell>Start Time</TableCell>}
              {col('tournament') && (
                <TableCell sortDirection={sortField === 'tournamentName' ? sortDir : false}>
                  <TableSortLabel active={sortField === 'tournamentName'} direction={sortDir} onClick={() => handleSort('tournamentName')}>Tournament</TableSortLabel>
                </TableCell>
              )}
              {col('stage')      && <TableCell>Stage</TableCell>}
              {col('homeTeam') && (
                <TableCell sortDirection={sortField === 'homeTeamName' ? sortDir : false}>
                  <TableSortLabel active={sortField === 'homeTeamName'} direction={sortDir} onClick={() => handleSort('homeTeamName')}>Home Team</TableSortLabel>
                </TableCell>
              )}
              {col('opposition') && <TableCell>Opposition</TableCell>}
              {col('result')     && <TableCell>Result</TableCell>}
              {col('ground')     && <TableCell>Ground</TableCell>}
              {col('umpire')     && <TableCell>Umpire</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(r => (
              <TableRow key={r.matchId}>
                {col('date')       && <TableCell><Link component="button" underline="hover" onClick={() => { setViewItem(r); setViewing(true); }} sx={{ textAlign: 'left' }}>{r.matchDate}</Link></TableCell>}
                {col('startTime')  && <TableCell>{r.scheduledStartTime ? r.scheduledStartTime.slice(0, 5) : ''}</TableCell>}
                {col('tournament') && <TableCell>{r.tournamentName}</TableCell>}
                {col('stage')      && <TableCell>{r.matchStage ? { FRIENDLY: 'Friendly', POOL: 'Pool', QUARTER_FINAL: 'Quarter-Final', SEMI_FINAL: 'Semi-Final', FINAL: 'Final' }[r.matchStage] : ''}</TableCell>}
                {col('homeTeam')   && <TableCell>{r.homeTeamName}</TableCell>}
                {col('opposition') && <TableCell>{r.oppositionTeamName}</TableCell>}
                {col('result') && (
                  <TableCell>
                    {r.forfeited || r.noResult ? (
                      <Chip label={r.forfeited ? 'Forfeited' : 'No Result'} size="small" color="warning" variant="outlined" />
                    ) : r.matchCompleted ? (
                      <Box>
                        {r.scoreBattingFirst != null && (
                          <Typography variant="caption" display="block" noWrap>
                            {r.scoreBattingFirst}/{r.wicketsLostBattingFirst ?? '?'} ({r.oversBattingFirst ?? '?'} ov)
                          </Typography>
                        )}
                        {r.scoreBattingSecond != null && (
                          <Typography variant="caption" display="block" noWrap>
                            {r.scoreBattingSecond}/{r.wicketsLostBattingSecond ?? '?'} ({r.oversBattingSecond ?? '?'} ov)
                          </Typography>
                        )}
                        {r.matchDrawn ? (
                          <Chip label="Draw" size="small" variant="outlined" sx={{ mt: 0.25 }} />
                        ) : r.matchOutcomeDescription ? (
                          <Typography variant="caption" display="block" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                            {r.matchOutcomeDescription}
                          </Typography>
                        ) : null}
                      </Box>
                    ) : null}
                  </TableCell>
                )}
                {col('ground')     && <TableCell>{r.fieldName}</TableCell>}
                {col('umpire')     && <TableCell>{r.umpire}</TableCell>}
                <TableCell sx={{ whiteSpace: { xs: 'normal', md: 'nowrap' } }}>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(r)}><Edit /></IconButton>
                  </Tooltip>
                  <Tooltip title="Team Sheet">
                    <IconButton size="small" onClick={() => navigate(`/admin/matches/${r.matchId}/teamsheet`)}>
                      <Groups />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Availability Poll">
                    <IconButton size="small" onClick={() => navigate(`/admin/matches/${r.matchId}/availability`)}>
                      <HowToVote />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Capture Result">
                    <IconButton size="small" onClick={() => navigate(`/admin/matches/${r.matchId}/result`)}>
                      <Assignment />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Print Team Sheet">
                    <IconButton size="small" onClick={() => navigate(`/matches/${r.matchId}/teamsheet`)}>
                      <Print />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => setDeleteId(r.matchId!)}><Delete /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </TableContainer>

      <Dialog open={deleteId != null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Match</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this match? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={remove}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
