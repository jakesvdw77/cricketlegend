import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Chip, CircularProgress, FormControl, InputLabel, Menu,
  MenuItem, Select, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { ArrowDropDown, Equalizer, Leaderboard, Person } from '@mui/icons-material';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { tournamentApi } from '../../api/tournamentApi';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { Tournament } from '../../types';
import { PlayerStatsContent } from './PlayerStatsOverview';
import { TeamStatsPanel } from './TeamRotationOverview';

type View = 'players' | 'teams';

export const TeamStatsHub: React.FC = () => {
  const [view, setView] = useState<View>('players');
  const { teamIds: managerTeamIds, restrictByTeam, homeClubId, loaded: teamsLoaded } = useManagerTeams();

  // ── Tournaments ─────────────────────────────────────────────────────────────
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [tournamentMenuAnchor, setTournamentMenuAnchor] = useState<HTMLElement | null>(null);

  // ── Teams ───────────────────────────────────────────────────────────────────
  const [availableTeams, setAvailableTeams] = useState<{ teamId: number; teamName: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [teamMenuAnchor, setTeamMenuAnchor] = useState<HTMLElement | null>(null);

  // ── Load tournaments ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!teamsLoaded) return;
    Promise.all([tournamentApi.findAll(), matchApi.findAll()])
      .then(([allTournaments, allMatches]) => {
        if (!restrictByTeam) { setTournaments(allTournaments); return; }
        const ids = new Set<number>();
        for (const m of allMatches) {
          if (m.tournamentId != null) {
            if (m.homeTeamId != null && managerTeamIds.has(m.homeTeamId)) ids.add(m.tournamentId);
            if (m.oppositionTeamId != null && managerTeamIds.has(m.oppositionTeamId)) ids.add(m.tournamentId);
          }
        }
        setTournaments(allTournaments.filter(t => t.tournamentId != null && ids.has(t.tournamentId)));
      })
      .catch(() => {})
      .finally(() => setTournamentsLoading(false));
  }, [teamsLoaded, restrictByTeam, managerTeamIds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tournaments.length === 1 && !selectedTournamentId)
      setSelectedTournamentId(tournaments[0].tournamentId!);
  }, [tournaments, selectedTournamentId]);

  // ── Load teams when tournament selected ─────────────────────────────────────
  useEffect(() => {
    if (!selectedTournamentId || !teamsLoaded) return;
    setAvailableTeams([]);
    setSelectedTeamId('');

    const load = async () => {
      const [allTeams, allMatches] = await Promise.all([
        teamApi.findAll(),
        matchApi.findByTournament(selectedTournamentId as number),
      ]);
      const tournamentTeamIds = new Set<number>();
      for (const m of allMatches) {
        if (m.homeTeamId) tournamentTeamIds.add(m.homeTeamId);
        if (m.oppositionTeamId) tournamentTeamIds.add(m.oppositionTeamId);
      }
      const teams = allTeams
        .filter(t => t.teamId != null
          && tournamentTeamIds.has(t.teamId)
          && (restrictByTeam
            ? managerTeamIds.has(t.teamId)
            : homeClubId == null || t.associatedClubId === homeClubId))
        .map(t => ({ teamId: t.teamId!, teamName: t.teamName }))
        .sort((a, b) => a.teamName.localeCompare(b.teamName));
      setAvailableTeams(teams);
      if (teams.length === 1) setSelectedTeamId(teams[0].teamId);
    };

    load().catch(() => {});
  }, [selectedTournamentId, teamsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTournamentName = useMemo(
    () => tournaments.find(t => t.tournamentId === selectedTournamentId)?.name ?? 'Tournament',
    [tournaments, selectedTournamentId],
  );

  const selectedTeamName = useMemo(
    () => availableTeams.find(t => t.teamId === selectedTeamId)?.teamName ?? 'Team',
    [availableTeams, selectedTeamId],
  );

  if (!teamsLoaded || tournamentsLoading)
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  const handleTournamentChange = (id: number) => {
    setTournamentMenuAnchor(null);
    if (id === selectedTournamentId) return;
    setSelectedTournamentId(id);
    setAvailableTeams([]);
    setSelectedTeamId('');
  };

  return (
    <Box>
      {/* ── Header: toggle + selectors ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <ToggleButtonGroup
          value={view}
          exclusive
          size="small"
          onChange={(_, v) => v && setView(v)}
        >
          <ToggleButton value="players" sx={{ px: 1.5, gap: 0.75, textTransform: 'none', fontWeight: 600 }}>
            <Person fontSize="small" /> Players
          </ToggleButton>
          <ToggleButton value="teams" sx={{ px: 1.5, gap: 0.75, textTransform: 'none', fontWeight: 600 }}>
            <Equalizer fontSize="small" /> Teams
          </ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* Tournament selector */}
          {!selectedTournamentId ? (
            <FormControl sx={{ minWidth: 220 }} size="small">
              <InputLabel>Tournament</InputLabel>
              <Select
                value={selectedTournamentId}
                label="Tournament"
                onChange={e => handleTournamentChange(e.target.value as number)}
              >
                {tournaments.map(t => <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
          ) : (
            <>
              <Chip
                icon={<Leaderboard sx={{ fontSize: '14px !important' }} />}
                label={selectedTournamentName}
                onClick={e => setTournamentMenuAnchor(e.currentTarget)}
                onDelete={e => setTournamentMenuAnchor(e.currentTarget as HTMLElement)}
                deleteIcon={<ArrowDropDown />}
                variant="outlined"
                color="primary"
                size="small"
                sx={{ fontWeight: 500 }}
              />
              <Menu anchorEl={tournamentMenuAnchor} open={Boolean(tournamentMenuAnchor)} onClose={() => setTournamentMenuAnchor(null)}>
                {tournaments.map(t => (
                  <MenuItem key={t.tournamentId} selected={t.tournamentId === selectedTournamentId} onClick={() => handleTournamentChange(t.tournamentId!)}>
                    {t.name}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          {/* Team selector — shown once tournament is chosen */}
          {selectedTournamentId && availableTeams.length > 1 && (
            !selectedTeamId ? (
              <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel>Team</InputLabel>
                <Select
                  value={selectedTeamId}
                  label="Team"
                  onChange={e => setSelectedTeamId(e.target.value as number)}
                >
                  {availableTeams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <>
                <Chip
                  label={selectedTeamName}
                  onClick={e => setTeamMenuAnchor(e.currentTarget)}
                  onDelete={e => setTeamMenuAnchor(e.currentTarget as HTMLElement)}
                  deleteIcon={<ArrowDropDown />}
                  variant="outlined"
                  color="default"
                  size="small"
                  sx={{ fontWeight: 500 }}
                />
                <Menu anchorEl={teamMenuAnchor} open={Boolean(teamMenuAnchor)} onClose={() => setTeamMenuAnchor(null)}>
                  {availableTeams.map(t => (
                    <MenuItem key={t.teamId} selected={t.teamId === selectedTeamId} onClick={() => { setTeamMenuAnchor(null); setSelectedTeamId(t.teamId); }}>
                      {t.teamName}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )
          )}
        </Box>
      </Box>

      {/* ── No tournament selected ── */}
      {!selectedTournamentId && (
        <Alert severity="info">Select a tournament to view stats.</Alert>
      )}

      {/* ── Players view ── */}
      {view === 'players' && selectedTournamentId && !selectedTeamId && availableTeams.length > 1 && (
        <Alert severity="info">Select a team to view player stats.</Alert>
      )}
      {view === 'players' && selectedTournamentId && selectedTeamId && (
        <PlayerStatsContent
          key={`${selectedTournamentId}-${selectedTeamId}`}
          tournamentId={selectedTournamentId as number}
          teamId={selectedTeamId as number}
          tournamentName={selectedTournamentName}
          teamName={selectedTeamName}
        />
      )}

      {/* ── Teams view ── */}
      {view === 'teams' && selectedTournamentId && (
        <TeamStatsPanel
          key={`${selectedTournamentId}-${selectedTeamId}`}
          embedded
          initialTournamentId={selectedTournamentId as number}
          lockedTeamId={selectedTeamId ? (selectedTeamId as number) : undefined}
        />
      )}
    </Box>
  );
};
