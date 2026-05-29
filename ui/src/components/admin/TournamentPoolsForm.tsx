import React from 'react';
import {
  Box, Paper, TextField, IconButton, Chip, Autocomplete, Button,
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { Team } from '../../types';

export interface LocalPoolTeam {
  teamId: number;
  teamName: string;
  tournamentTeamId?: number;
}

export interface LocalPool {
  poolId?: number;
  poolName: string;
  teams: LocalPoolTeam[];
}

interface Props {
  localPools: LocalPool[];
  onPoolsChange: (pools: LocalPool[]) => void;
  allTeams: Team[];
  newPoolName: string;
  onNewPoolNameChange: (name: string) => void;
}

export const TournamentPoolsForm: React.FC<Props> = ({
  localPools, onPoolsChange, allTeams, newPoolName, onNewPoolNameChange,
}) => {
  const addPool = () => {
    const name = newPoolName.trim() || `Pool ${String.fromCharCode(65 + localPools.length)}`;
    onPoolsChange([...localPools, { poolName: name, teams: [] }]);
    onNewPoolNameChange('');
  };

  const removePool = (idx: number) => {
    onPoolsChange(localPools.filter((_, i) => i !== idx));
  };

  const renamePool = (idx: number, name: string) => {
    onPoolsChange(localPools.map((p, i) => i !== idx ? p : { ...p, poolName: name }));
  };

  const addTeam = (idx: number, team: Team) => {
    onPoolsChange(localPools.map((p, i) => {
      if (i !== idx) return p;
      if (p.teams.find(t => t.teamId === team.teamId)) return p;
      return { ...p, teams: [...p.teams, { teamId: team.teamId!, teamName: team.teamName }] };
    }));
  };

  const removeTeam = (idx: number, teamId: number) => {
    onPoolsChange(localPools.map((p, i) =>
      i !== idx ? p : { ...p, teams: p.teams.filter(t => t.teamId !== teamId) }
    ));
  };

  const assignedTeamIds = new Set(localPools.flatMap(p => p.teams.map(t => t.teamId)));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {localPools.map((pool, poolIdx) => (
        <Paper key={poolIdx} variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Pool Name" value={pool.poolName} size="small" sx={{ flex: 1 }}
              onChange={e => renamePool(poolIdx, e.target.value)}
            />
            <IconButton
              size="small"
              color="error"
              onClick={() => removePool(poolIdx)}
              disabled={pool.teams.length > 0}
              title={pool.teams.length > 0 ? 'Remove all teams before deleting this pool' : 'Delete pool'}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', minHeight: 28 }}>
            {pool.teams.map(t => (
              <Chip
                key={t.teamId} label={t.teamName} size="small"
                onDelete={() => removeTeam(poolIdx, t.teamId)}
              />
            ))}
          </Box>
          <Autocomplete
            options={allTeams.filter(t => !assignedTeamIds.has(t.teamId!))}
            getOptionLabel={t => t.teamName}
            onChange={(_, team) => { if (team) addTeam(poolIdx, team); }}
            value={null}
            blurOnSelect
            renderInput={params => <TextField {...params} label="Add team to pool" size="small" />}
          />
        </Paper>
      ))}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          label="New Pool Name" value={newPoolName} size="small" sx={{ flex: 1 }}
          placeholder={`Pool ${String.fromCharCode(65 + localPools.length)}`}
          onChange={e => onNewPoolNameChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPool(); } }}
        />
        <Button variant="outlined" size="small" startIcon={<Add />} onClick={addPool}>
          Add Pool
        </Button>
      </Box>
    </Box>
  );
};
