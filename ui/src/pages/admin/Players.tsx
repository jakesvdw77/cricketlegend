import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Avatar,
  Tooltip, TableSortLabel, TablePagination,
  Popover, FormGroup, Checkbox, FormControlLabel, useMediaQuery, useTheme, Link, Chip,
} from '@mui/material';
import { Add, ArrowBack, Edit, Delete, OpenInNew, ViewColumn, FilterList } from '@mui/icons-material';
import { playerApi } from '../../api/playerApi';
import { clubApi } from '../../api/clubApi';
import { teamApi } from '../../api/teamApi';
import { Player, Club, Team } from '../../types';
import { formatEnum } from '../../utils/formatEnum';
import { PlayerEditForm } from '../../components/player/PlayerEditForm';
import { useAuth } from '../../hooks/useAuth';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { DetailSection, DetailGrid, DetailField } from '../../components/admin/DetailView';

const empty: Player = { name: '', surname: '' };

type ColKey = 'name' | 'surname' | 'shirtNumber' | 'club' | 'battingStance' | 'battingPosition' | 'bowlingArm' | 'bowlingType' | 'wicketKeeper' | 'shirtSize' | 'pantSize';

const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'name',           label: 'Name' },
  { key: 'surname',        label: 'Surname' },
  { key: 'shirtNumber',    label: '#' },
  { key: 'club',           label: 'Club' },
  { key: 'battingStance',  label: 'Batting' },
  { key: 'battingPosition',label: 'Position' },
  { key: 'bowlingArm',     label: 'Bowling Arm' },
  { key: 'bowlingType',    label: 'Bowling' },
  { key: 'wicketKeeper',   label: 'WK' },
  { key: 'shirtSize',      label: 'Shirt Size' },
  { key: 'pantSize',       label: 'Pant Size' },
];

const DEFAULT_VISIBLE = new Set<ColKey>(['name', 'surname', 'shirtNumber', 'club', 'battingStance', 'battingPosition', 'bowlingArm', 'bowlingType', 'wicketKeeper']);
const MOBILE_VISIBLE = new Set<ColKey>(['name', 'surname', 'shirtNumber', 'club', 'bowlingType']);

export const Players: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAdmin } = useAuth();
  const { squadPlayerIds, restrictByTeam, homeClubId, loaded: managerLoaded } = useManagerTeams();
  const [rows, setRows] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamFilter, setTeamFilter] = useState<number | ''>('');
  const [teamSquadIds, setTeamSquadIds] = useState<Set<number> | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Player>(empty);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [clubFilter, setClubFilter] = useState<number | ''>('');
  const [clubFilterInitialised, setClubFilterInitialised] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(isMobile ? MOBILE_VISIBLE : DEFAULT_VISIBLE));
  const [colAnchor, setColAnchor] = useState<HTMLButtonElement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);
  const [viewing, setViewing] = useState(false);
  const [viewItem, setViewItem] = useState<Player | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);

  const load = () => playerApi.findAll().then(setRows);
  useEffect(() => {
    load();
    clubApi.findAll().then(setClubs);
    teamApi.findAll().then(setTeams);
  }, []);

  useEffect(() => {
    if (!clubFilterInitialised && managerLoaded && homeClubId != null) {
      setClubFilter(homeClubId);
      setClubFilterInitialised(true);
    } else if (!clubFilterInitialised && managerLoaded) {
      setClubFilterInitialised(true);
    }
  }, [managerLoaded, homeClubId, clubFilterInitialised]);

  const handleTeamFilter = async (teamId: number | '') => {
    setTeamFilter(teamId);
    setPage(0);
    if (!teamId) { setTeamSquadIds(null); return; }
    const squad = await teamApi.getSquad(teamId as number);
    setTeamSquadIds(new Set(squad.map(p => p.playerId!)));
  };

  const save = async () => {
    const payload: Player = {
      ...editing,
      bowlingType: editing.bowlingType || undefined,
      bowlingArm: editing.bowlingArm || undefined,
      battingStance: editing.battingStance || undefined,
      battingPosition: editing.battingPosition || undefined,
    };
    if (payload.playerId) { await playerApi.update(payload.playerId, payload); }
    else { await playerApi.create(payload); }
    setOpen(false); load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.playerId) return;
    await playerApi.delete(deleteTarget.playerId);
    setDeleteTarget(null);
    load();
  };

  const set = (patch: Partial<Player>) => setEditing(e => ({ ...e, ...patch }));

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filtered = [...rows].filter(r => {
    const q = search.toLowerCase();
    const matchesSearch = !q
      || r.name.toLowerCase().includes(q)
      || r.surname.toLowerCase().includes(q)
      || r.homeClubName?.toLowerCase().includes(q)
      || r.shirtNumber?.toString().includes(q);
    const matchesClub = !clubFilter || r.homeClubId === clubFilter;
    const matchesTeam = !teamSquadIds || teamSquadIds.has(r.playerId!);
    return matchesSearch && matchesClub && matchesTeam;
  }).sort((a, b) => {
    const cmp = a.surname.localeCompare(b.surname) || a.name.localeCompare(b.name);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const col = (key: ColKey) => isMobile ? (key === 'name' || key === 'surname') : visibleCols.has(key);

  if (open) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => setOpen(false)}>Back</Button>
          <Typography variant="h6" sx={{ flex: 1 }}>{editing.playerId ? 'Edit' : 'New'} Player</Typography>
          <Button variant="contained" onClick={save}>Save</Button>
        </Box>
        <PlayerEditForm editing={editing} onChange={set} clubs={clubs} readOnlyConsent />
      </Box>
    );
  }

  if (viewing && viewItem) {
    const hasContact = viewItem.email || viewItem.contactNumber || viewItem.alternativeContactNumber;
    const hasApparel = viewItem.shirtSize || viewItem.pantSize;
    return (
      <Box sx={{ maxWidth: 800 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => setViewing(false)}>Back</Button>
          <Typography variant="h6" sx={{ flex: 1 }}>Player</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Header card */}
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={viewItem.profilePictureUrl ?? ''} sx={{ width: 64, height: 64, flexShrink: 0 }}>
              {viewItem.name.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5">{viewItem.name} {viewItem.surname}</Typography>
              {viewItem.homeClubName && <Typography variant="subtitle2" color="text.secondary">{viewItem.homeClubName}</Typography>}
            </Box>
            {viewItem.shirtNumber != null && (
              <Chip label={`#${viewItem.shirtNumber}`} variant="outlined" />
            )}
          </Paper>

          {/* Batting */}
          <DetailSection title="Batting">
            <DetailGrid>
              <DetailField label="Stance" value={formatEnum(viewItem.battingStance)} />
              <DetailField label="Position" value={formatEnum(viewItem.battingPosition)} />
            </DetailGrid>
          </DetailSection>

          {/* Bowling */}
          <DetailSection title="Bowling">
            <DetailGrid>
              <DetailField label="Arm" value={viewItem.bowlingArm ? `${formatEnum(viewItem.bowlingArm)} Arm` : undefined} />
              <DetailField label="Type" value={formatEnum(viewItem.bowlingType)} />
              {viewItem.partTimeBowler && <DetailField label="Part-time Bowler" value="Yes" />}
            </DetailGrid>
          </DetailSection>

          {/* Fielding */}
          {viewItem.wicketKeeper && (
            <DetailSection title="Fielding">
              <DetailField label="Wicket Keeper" value="Yes" />
            </DetailSection>
          )}

          {/* Details */}
          <DetailSection title="Details">
            <DetailGrid>
              <DetailField label="Club" value={viewItem.homeClubName} />
              <DetailField label="Date of Birth" value={viewItem.dateOfBirth} />
              <DetailField label="Gender" value={formatEnum(viewItem.gender)} />
              <DetailField label="Shirt Number" value={viewItem.shirtNumber != null ? String(viewItem.shirtNumber) : undefined} />
            </DetailGrid>
          </DetailSection>

          {/* Contact */}
          {hasContact && (
            <DetailSection title="Contact">
              <DetailGrid>
                <DetailField label="Email" value={viewItem.email} />
                <DetailField label="Contact Number" value={viewItem.contactNumber} />
                <DetailField label="Alternative Contact" value={viewItem.alternativeContactNumber} />
              </DetailGrid>
            </DetailSection>
          )}

          {/* Apparel */}
          {hasApparel && (
            <DetailSection title="Apparel">
              <DetailGrid>
                <DetailField label="Shirt Size" value={viewItem.shirtSize} />
                <DetailField label="Pant Size" value={viewItem.pantSize} />
              </DetailGrid>
            </DetailSection>
          )}

          {/* Links */}
          {viewItem.careerUrl && (
            <DetailSection title="Links">
              <Link href={viewItem.careerUrl} target="_blank" rel="noopener" underline="hover">
                Career Profile
              </Link>
            </DetailSection>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Players</Typography>
        {!isMobile && (
          <Tooltip title="Toggle columns">
            <IconButton onClick={e => setColAnchor(e.currentTarget)}><ViewColumn /></IconButton>
          </Tooltip>
        )}
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(empty); setOpen(true); }}>
            Add Player
          </Button>
        )}
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
            <TextField size="small" placeholder="Search name, surname, club, #…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              sx={{ width: { xs: '100%', sm: 280 } }} />
            <TextField select size="small" label="Club" value={clubFilter}
              onChange={e => {
                const id = e.target.value === '' ? '' : +e.target.value;
                setClubFilter(id); setPage(0);
                const selectedTeam = teams.find(t => t.teamId === teamFilter);
                if (id && selectedTeam?.associatedClubId !== id) handleTeamFilter('');
              }}
              sx={{ width: { xs: '100%', sm: 200 } }}>
              <MenuItem value="">All Clubs</MenuItem>
              {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Team" value={teamFilter}
              onChange={e => handleTeamFilter(e.target.value === '' ? '' : +e.target.value)}
              sx={{ width: { xs: '100%', sm: 200 } }}>
              <MenuItem value="">All Teams</MenuItem>
              {(clubFilter ? teams.filter(t => t.associatedClubId === clubFilter) : teams).map(t => (
                <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>
              ))}
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
              <TableCell />
              {col('name')            && <TableCell>Name</TableCell>}
              {col('surname')         && <TableCell sortDirection={sortDir}><TableSortLabel active direction={sortDir} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>Surname</TableSortLabel></TableCell>}
              {col('shirtNumber')     && <TableCell>#</TableCell>}
              {col('club')            && <TableCell>Club</TableCell>}
              {col('battingStance')   && <TableCell>Batting</TableCell>}
              {col('battingPosition') && <TableCell>Position</TableCell>}
              {col('bowlingArm')      && <TableCell>Bowling Arm</TableCell>}
              {col('bowlingType')     && <TableCell>Bowling</TableCell>}
              {col('wicketKeeper')    && <TableCell>WK</TableCell>}
              {col('shirtSize')       && <TableCell>Shirt Size</TableCell>}
              {col('pantSize')        && <TableCell>Pant Size</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(r => (
              <TableRow key={r.playerId}>
                <TableCell>
                  <Avatar
                    src={r.profilePictureUrl}
                    sx={{
                      width: 32, height: 32,
                      cursor: r.profilePictureUrl ? 'pointer' : 'default',
                      '&:hover': r.profilePictureUrl ? { opacity: 0.8 } : {},
                    }}
                    onClick={() => r.profilePictureUrl && setViewPhotoUrl(r.profilePictureUrl)}
                  >
                    {r.name.charAt(0)}
                  </Avatar>
                </TableCell>
                {col('name')            && <TableCell><Link component="button" underline="hover" onClick={() => { setViewItem(r); setViewing(true); }} sx={{ textAlign: 'left' }}>{r.name}</Link></TableCell>}
                {col('surname')         && <TableCell>{r.surname}</TableCell>}
                {col('shirtNumber')     && <TableCell>{r.shirtNumber}</TableCell>}
                {col('club')            && <TableCell>{r.homeClubName}</TableCell>}
                {col('battingStance')   && <TableCell>{formatEnum(r.battingStance)}</TableCell>}
                {col('battingPosition') && <TableCell>{formatEnum(r.battingPosition)}</TableCell>}
                {col('bowlingArm')      && <TableCell>{r.bowlingArm && r.bowlingType !== 'NONE' ? `${formatEnum(r.bowlingArm)} Arm` : ''}</TableCell>}
                {col('bowlingType')     && <TableCell>{formatEnum(r.bowlingType)}</TableCell>}
                {col('wicketKeeper')    && <TableCell>{r.wicketKeeper ? '✓' : ''}</TableCell>}
                {col('shirtSize')       && <TableCell>{r.shirtSize ?? ''}</TableCell>}
                {col('pantSize')        && <TableCell>{r.pantSize ?? ''}</TableCell>}
                <TableCell>
                  {(!restrictByTeam || squadPlayerIds.has(r.playerId!)) && managerLoaded && (
                    <IconButton size="small" onClick={() => { setEditing(r); setOpen(true); }}><Edit /></IconButton>
                  )}
                  {isAdmin && (
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(r)}><Delete /></IconButton>
                  )}
                  {r.careerUrl && (
                    <Tooltip title="Career profile">
                      <IconButton size="small" component="a" href={r.careerUrl} target="_blank" rel="noopener noreferrer">
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
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

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Player</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <strong>{deleteTarget?.name} {deleteTarget?.surname}</strong>? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Photo viewer */}
      <Dialog open={!!viewPhotoUrl} onClose={() => setViewPhotoUrl(null)} maxWidth="sm">
        <DialogContent sx={{ p: 0, lineHeight: 0 }}>
          <img
            src={viewPhotoUrl ?? ''}
            alt="Player photo"
            style={{ display: 'block', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewPhotoUrl(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
