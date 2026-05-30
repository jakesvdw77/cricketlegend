import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Avatar, Button, Chip, Skeleton, Divider,
} from '@mui/material';
import {
  Groups, SportsScore, Event, Settings,
  Shield, Person, Place, Campaign,
} from '@mui/icons-material';
import { teamApi } from '../../api/teamApi';
import { Team } from '../../types';
import { useManagerTeams } from '../../hooks/useManagerTeams';

export const ManageClubTeams: React.FC = () => {
  const navigate = useNavigate();
  const { teamIds, restrictByTeam, loaded } = useManagerTeams();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loaded) return;
    teamApi.findAll().then(all => {
      setTeams(restrictByTeam ? all.filter(t => teamIds.has(t.teamId!)) : all);
    }).finally(() => setLoading(false));
  }, [loaded, restrictByTeam, teamIds]);

  if (loading || !loaded) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 3 }}>Manage Teams</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3].map(i => (
            <Grid item xs={12} sm={6} key={i}>
              <Skeleton variant="rounded" height={280} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Manage Teams</Typography>
        <Chip label={`${teams.length} team${teams.length !== 1 ? 's' : ''}`} size="small" />
      </Box>

      {teams.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Groups sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6">No teams assigned</Typography>
          <Typography variant="body2">Contact your administrator to be linked to a team.</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {teams.map(team => (
            <Grid item xs={12} sm={6} key={team.teamId}>
              <TeamCard team={team} onNavigate={navigate} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

interface TeamCardProps {
  team: Team;
  onNavigate: ReturnType<typeof useNavigate>;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onNavigate }) => (
  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <CardContent sx={{ flex: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', mb: 3 }}>
        <Avatar
          src={team.logoUrl}
          sx={{ width: 72, height: 72, flexShrink: 0, bgcolor: 'primary.main', fontSize: 28 }}
        >
          {team.teamName.charAt(0)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight="bold" noWrap>
            {team.teamName}
          </Typography>
          {team.abbreviation && (
            <Chip label={team.abbreviation} size="small" variant="outlined" sx={{ mt: 0.5 }} />
          )}
        </Box>
      </Box>

      {/* Meta rows */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {team.associatedClubName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Shield sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body1" color="text.secondary" noWrap>{team.associatedClubName}</Typography>
          </Box>
        )}
        {team.homeFieldName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Place sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body1" color="text.secondary" noWrap>{team.homeFieldName}</Typography>
          </Box>
        )}
        {team.captainName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body1" color="text.secondary" noWrap>
              Capt: {team.captainName}
            </Typography>
          </Box>
        )}
      </Box>
    </CardContent>

    <Divider />

    <CardActions sx={{ px: 2, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
      <Button
        startIcon={<Settings />}
        onClick={() => onNavigate('/admin/teams', { state: { editTeamId: team.teamId, returnTo: '/manage-club/teams' } })}
      >
        Setup
      </Button>
      <Button
        startIcon={<Groups />}
        onClick={() => onNavigate(`/admin/teams/${team.teamId}/squad`, { state: { returnTo: '/manage-club/teams' } })}
      >
        Squad
      </Button>
      <Button
        startIcon={<SportsScore />}
        onClick={() => onNavigate(`/manage-club/teams/${team.teamId}/schedule`, { state: { teamName: team.teamName } })}
      >
        Schedule
      </Button>
      <Button
        startIcon={<Event />}
        onClick={() => onNavigate('/admin/events', { state: { filterTeamId: team.teamId, returnTo: '/manage-club/teams' } })}
      >
        Events
      </Button>
      <Button
        startIcon={<Campaign />}
        onClick={() => onNavigate('/admin/send-notification', {
          state: {
            preselectedTeamId: team.teamId,
            preselectedTeamName: team.teamName,
            preselectedClubId: team.associatedClubId,
            preselectedClubName: team.associatedClubName,
            returnTo: '/manage-club/teams',
          },
        })}
      >
        Message
      </Button>
    </CardActions>
  </Card>
);
