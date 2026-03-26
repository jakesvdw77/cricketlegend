import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem,
  Stepper, Step, StepLabel, TableSortLabel,
} from '@mui/material';
import { Add, Edit, Delete, Assignment, Groups } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { fieldApi } from '../../api/fieldApi';
import { tournamentApi } from '../../api/tournamentApi';
import { Match, Team, Field, Tournament, Player, MatchStage } from '../../types';
import { TeamSidePanel } from '../../components/match/TeamSidePanel';

const STEPS = ['Match Details', 'Playing Teams'];
const empty: Match = {};

export const Matches: React.FC = () => {
  const navigate = useNavigate();
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
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<Match>(empty);
  const [savedMatchId, setSavedMatchId] = useState<number | null>(null);
  const [homeSquad, setHomeSquad] = useState<Player[]>([]);
  const [oppSquad, setOppSquad] = useState<Player[]>([]);

  const load = () => matchApi.findAll().then(setRows);
  useEffect(() => {
    load();
    teamApi.findAll().then(setTeams);
    fieldApi.findAll().then(setFields);
    tournamentApi.findAll().then(setTournaments);
  }, []);

  const openCreate = () => {
    setEditing(empty);
    setSavedMatchId(null);
    setStep(0);
    setOpen(true);
  };

  const openEdit = (match: Match) => {
    setEditing(match);
    setSavedMatchId(match.matchId ?? null);
    setStep(0);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    load();
  };

  const saveMatchDetails = async () => {
    let matchId: number;
    if (editing.matchId) {
      await matchApi.update(editing.matchId, editing);
      matchId = editing.matchId;
      setSavedMatchId(matchId);
    } else {
      const created = await matchApi.create(editing);
      matchId = created.matchId!;
      setSavedMatchId(matchId);
      setEditing(created);
    }
    const [hs, os] = await Promise.all([
      editing.homeTeamId ? teamApi.getSquad(editing.homeTeamId) : Promise.resolve([]),
      editing.oppositionTeamId ? teamApi.getSquad(editing.oppositionTeamId) : Promise.resolve([]),
    ]);
    setHomeSquad(hs);
    setOppSquad(os);
    setStep(1);
  };

  const remove = async (id: number) => {
    if (confirm('Delete match?')) { await matchApi.delete(id); load(); }
  };

  const homeTeam = teams.find(t => t.teamId === editing.homeTeamId);
  const oppTeam = teams.find(t => t.teamId === editing.oppositionTeamId);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Matches</Typography>
        <TextField
          select
          size="small"
          label="Tournament"
          value={filterTournament}
          onChange={e => setFilterTournament(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ width: { xs: '100%', sm: 220 } }}
        >
          <MenuItem value="">All tournaments</MenuItem>
          {tournaments.map(t => <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Stage"
          value={filterStage}
          onChange={e => setFilterStage(e.target.value as MatchStage | '')}
          sx={{ width: { xs: '100%', sm: 140 } }}
        >
          <MenuItem value="">All stages</MenuItem>
          <MenuItem value="POOL">Pool</MenuItem>
          <MenuItem value="SEMI_FINAL">Semi-Final</MenuItem>
          <MenuItem value="FINAL">Final</MenuItem>
        </TextField>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Match
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' }, '& .MuiTableHead-root .MuiTableSortLabel-root': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root:hover': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root.Mui-active': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-icon': { color: 'inherit !important' } }}>
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sortField === 'matchDate' ? sortDir : false}>
                <TableSortLabel active={sortField === 'matchDate'} direction={sortDir} onClick={() => handleSort('matchDate')}>Date</TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortField === 'tournamentName' ? sortDir : false}>
                <TableSortLabel active={sortField === 'tournamentName'} direction={sortDir} onClick={() => handleSort('tournamentName')}>Tournament</TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortField === 'homeTeamName' ? sortDir : false}>
                <TableSortLabel active={sortField === 'homeTeamName'} direction={sortDir} onClick={() => handleSort('homeTeamName')}>Home Team</TableSortLabel>
              </TableCell>
              <TableCell>Opposition</TableCell>
              <TableCell>Ground</TableCell>
              <TableCell>Umpire</TableCell>
              <TableCell>Stage</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {[...rows].filter(r => {
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
            }).map(r => (
              <TableRow key={r.matchId}>
                <TableCell>{r.matchDate}</TableCell>
                <TableCell>{r.tournamentName}</TableCell>
                <TableCell>{r.homeTeamName}</TableCell>
                <TableCell>{r.oppositionTeamName}</TableCell>
                <TableCell>{r.fieldName}</TableCell>
                <TableCell>{r.umpire}</TableCell>
                <TableCell>{r.matchStage ? { POOL: 'Pool', SEMI_FINAL: 'Semi-Final', FINAL: 'Final' }[r.matchStage] : ''}</TableCell>
                <TableCell>
                  <IconButton size="small" title="Team Sheet" onClick={() => navigate(`/admin/matches/${r.matchId}/teamsheet`)}>
                    <Groups />
                  </IconButton>
                  <IconButton size="small" title="Capture Result" onClick={() => navigate(`/admin/matches/${r.matchId}/result`)}>
                    <Assignment />
                  </IconButton>
                  <IconButton size="small" onClick={() => openEdit(r)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.matchId!)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editing.matchId ? 'Edit' : 'New'} Match</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stepper activeStep={step} sx={{ mb: 3 }}>
            {STEPS.map(label => (
              <Step key={label}><StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {step === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField label="Match Date" type="date" value={editing.matchDate ?? ''} fullWidth
                  InputLabelProps={{ shrink: true }} onChange={e => setEditing({ ...editing, matchDate: e.target.value })} />
                <TextField label="Start Time" type="time" value={editing.scheduledStartTime ?? ''} fullWidth
                  InputLabelProps={{ shrink: true }} onChange={e => setEditing({ ...editing, scheduledStartTime: e.target.value })} />
              </Box>
              <TextField select label="Tournament" value={editing.tournamentId ?? ''}
                onChange={e => setEditing({ ...editing, tournamentId: +e.target.value })}>
                {tournaments.map(t => <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>)}
              </TextField>
              <TextField select label="Home Team" value={editing.homeTeamId ?? ''}
                onChange={e => setEditing({ ...editing, homeTeamId: +e.target.value })}>
                {teams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
              </TextField>
              <TextField select label="Opposition Team" value={editing.oppositionTeamId ?? ''}
                onChange={e => setEditing({ ...editing, oppositionTeamId: +e.target.value })}>
                {teams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
              </TextField>
              <TextField select label="Ground" value={editing.fieldId ?? ''}
                onChange={e => setEditing({ ...editing, fieldId: +e.target.value })}>
                {fields.map(f => <MenuItem key={f.fieldId} value={f.fieldId}>{f.name}</MenuItem>)}
              </TextField>
              <TextField label="Umpire" value={editing.umpire ?? ''}
                onChange={e => setEditing({ ...editing, umpire: e.target.value })} />
              <TextField label="Live Scoring URL" value={editing.scoringUrl ?? ''}
                onChange={e => setEditing({ ...editing, scoringUrl: e.target.value })} />
              <TextField select label="Stage" value={editing.matchStage ?? ''}
                onChange={e => setEditing({ ...editing, matchStage: e.target.value as MatchStage })}>
                <MenuItem value="POOL">Pool</MenuItem>
                <MenuItem value="SEMI_FINAL">Semi-Final</MenuItem>
                <MenuItem value="FINAL">Final</MenuItem>
              </TextField>
            </Box>
          )}

          {step === 1 && savedMatchId != null && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select up to 11 players per side and optionally a 12th man.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {editing.homeTeamId && homeTeam && (
                  <TeamSidePanel
                    matchId={savedMatchId}
                    teamId={editing.homeTeamId}
                    teamName={homeTeam.teamName}
                    players={homeSquad}
                  />
                )}
                {editing.oppositionTeamId && oppTeam && (
                  <TeamSidePanel
                    matchId={savedMatchId}
                    teamId={editing.oppositionTeamId}
                    teamName={oppTeam.teamName}
                    players={oppSquad}
                  />
                )}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>
            {step === 1 ? 'Done' : 'Cancel'}
          </Button>
          {step === 0 && (
            <Button variant="contained" onClick={saveMatchDetails}>
              Save & Continue
            </Button>
          )}
          {step === 1 && (
            <Button onClick={() => setStep(0)}>Back</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};