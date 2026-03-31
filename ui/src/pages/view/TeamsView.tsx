import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Avatar, Divider, Grid, TextField, MenuItem,
  Accordion, AccordionSummary, AccordionDetails, Tooltip, IconButton,
} from '@mui/material';
import { ExpandMore, SportsCricket, Person, Phone, Shield, Print } from '@mui/icons-material';
import { teamApi } from '../../api/teamApi';
import { playerDescription } from '../../utils/playerDescription';
import { printSquad } from '../../utils/printSquad';
import { tournamentApi } from '../../api/tournamentApi';
import { clubApi } from '../../api/clubApi';
import { Team, Player, Tournament, Club } from '../../types';

// ── Role icons ─────────────────────────────────────────────────────────────

const BAT_POSITIONS = ['OPENER', 'TOP_ORDER', 'MIDDLE_ORDER'];

function RoleIcons({ p }: { p: Player }) {
  const showBat = BAT_POSITIONS.includes(p.battingPosition ?? '');
  const isBowler = p.bowlingType && p.bowlingType !== 'NONE' && !p.partTimeBowler;

  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, ml: 0.5 }}>
      {p.wicketKeeper && (
        <Tooltip title="Wicket Keeper">
          <Typography component="span" sx={{ fontSize: '0.8rem', lineHeight: 1 }}>🧤</Typography>
        </Tooltip>
      )}
      {showBat && (
        <Tooltip title="Batsman">
          <SportsCricket sx={{ fontSize: 13, color: 'text.secondary' }} />
        </Tooltip>
      )}
      {isBowler && (
        <Tooltip title="Bowler">
          <Box component="span" sx={{
            display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
            bgcolor: '#c0392b', border: '1px solid #922b21',
          }} />
        </Tooltip>
      )}
    </Box>
  );
}

// ── Player card ─────────────────────────────────────────────────────────────

function PlayerCard({ p }: { p: Player }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
      <Avatar
        src={p.profilePictureUrl}
        sx={{ width: 44, height: 44, flexShrink: 0 }}
      >
        {p.name.charAt(0)}
      </Avatar>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" fontWeight="medium">
            {p.surname}, {p.name}
            {p.shirtNumber != null && (
              <Typography component="span" variant="caption" color="text.secondary"> #{p.shirtNumber}</Typography>
            )}
          </Typography>
          <RoleIcons p={p} />
        </Box>
        {playerDescription(p) && (
          <Typography variant="caption" color="text.secondary">
            {playerDescription(p)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ── Management info ──────────────────────────────────────────────────────────

function ManagementRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
      {icon}
      <Typography variant="caption" color="text.secondary">{label}:</Typography>
      <Typography variant="caption">{value}</Typography>
    </Box>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export const TeamsView: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [squads, setSquads] = useState<Record<number, Player[]>>({});
  const [search, setSearch] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [tournamentTeamIds, setTournamentTeamIds] = useState<Set<number> | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | ''>('');

  useEffect(() => {
    teamApi.findAll().then(setTeams);
    tournamentApi.findAll().then(setTournaments);
    clubApi.findAll().then(setClubs);
  }, []);

  const handleTournamentChange = async (id: number | '') => {
    setSelectedTournamentId(id);
    if (!id) { setTournamentTeamIds(null); return; }
    const t = await tournamentApi.findById(id);
    const ids = new Set<number>(
      (t.pools ?? []).flatMap(pool => (pool.teams ?? []).map(tt => tt.teamId!))
    );
    setTournamentTeamIds(ids);
  };

  const handleExpand = async (teamId: number) => {
    if (squads[teamId]) return;
    const players = await teamApi.getSquad(teamId);
    setSquads(prev => ({ ...prev, [teamId]: players }));
  };

  const filtered = teams.filter(t => {
    const matchesSearch = t.teamName.toLowerCase().includes(search.toLowerCase());
    const matchesTournament = !tournamentTeamIds || tournamentTeamIds.has(t.teamId!);
    const matchesClub = !selectedClubId || t.associatedClubId === selectedClubId;
    return matchesSearch && matchesTournament && matchesClub;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5">Teams</Typography>
        <TextField
          select
          size="small"
          label="Tournament"
          value={selectedTournamentId}
          onChange={e => handleTournamentChange(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ width: 220 }}
        >
          <MenuItem value="">All tournaments</MenuItem>
          {tournaments.map(t => (
            <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Club"
          value={selectedClubId}
          onChange={e => setSelectedClubId(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ width: 220 }}
        >
          <MenuItem value="">All clubs</MenuItem>
          {clubs.map(c => (
            <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          placeholder="Search teams…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 220 }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filtered.map(team => {
          const squad = squads[team.teamId!] ?? [];
          const sorted = [...squad].sort((a, b) => a.surname.localeCompare(b.surname));

          return (
            <Accordion
              key={team.teamId}
              onChange={(_, expanded) => { if (expanded) handleExpand(team.teamId!); }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Avatar src={team.logoUrl} variant="rounded" sx={{ width: 48, height: 48 }}>
                    {team.teamName.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight="bold">
                      {team.teamName}{team.abbreviation && ` (${team.abbreviation})`}
                    </Typography>
                  </Box>
                  <Tooltip title="Print / Export PDF">
                    <IconButton
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        if (!squads[team.teamId!]) {
                          alert('Squad not loaded yet — please expand the team first.');
                          return;
                        }
                        const s = squads[team.teamId!];
                        printSquad(team, [...s].sort((a, b) => a.surname.localeCompare(b.surname)));
                      }}
                    >
                      <Print fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ pt: 0 }}>
                {/* Management info */}
                <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Management
                  </Typography>
                  <Box sx={{ mt: 0.75 }}>
                    <ManagementRow icon={<Person sx={{ fontSize: 14, color: 'text.secondary' }} />} label="Captain" value={team.captainName} />
                    <ManagementRow icon={<Person sx={{ fontSize: 14, color: 'text.secondary' }} />} label="Manager" value={team.manager} />
                    <ManagementRow icon={<Person sx={{ fontSize: 14, color: 'text.secondary' }} />} label="Administrator" value={team.administrator} />
                    <ManagementRow icon={<Phone sx={{ fontSize: 14, color: 'text.secondary' }} />} label="Contact" value={team.contactNumber} />
                    <ManagementRow icon={<Shield sx={{ fontSize: 14, color: 'text.secondary' }} />} label="Club" value={team.associatedClubName} />
                  </Box>
                </Paper>

                {/* Squad */}
                <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Squad — {squad.length} player{squad.length !== 1 ? 's' : ''}
                </Typography>
                <Divider sx={{ my: 1 }} />
                {sorted.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No players in squad.
                  </Typography>
                ) : (
                  <Grid container spacing={0}>
                    {sorted.map((p, idx) => (
                      <React.Fragment key={p.playerId}>
                        <Grid item xs={12} sm={6}>
                          <PlayerCard p={p} />
                        </Grid>
                        {idx < sorted.length - 1 && idx % 2 === 1 && (
                          <Grid item xs={12}><Divider /></Grid>
                        )}
                      </React.Fragment>
                    ))}
                  </Grid>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
};
