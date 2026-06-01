import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent,
  Avatar, Chip, Skeleton, Tooltip, IconButton,
  Dialog, DialogContent,
} from '@mui/material';
import {
  Groups, SportsScore, Event, Edit,
  Shield, Person, Place, Campaign, Share,
  ManageAccounts, School, HowToVote, Phone, Email,
  Facebook, Instagram, YouTube, Language, PhotoCamera, Close,
} from '@mui/icons-material';
import { teamApi } from '../../api/teamApi';
import { matchApi } from '../../api/matchApi';
import { Team } from '../../types';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import TeamShareDialog from './TeamShareDialog';

export const ManageClubTeams: React.FC = () => {
  const navigate = useNavigate();
  const { teamIds, restrictByTeam, loaded } = useManagerTeams();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareTeam, setShareTeam] = useState<Team | null>(null);
  const [squadCounts, setSquadCounts] = useState<Record<number, number>>({});
  const [matchCounts, setMatchCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!loaded) return;
    teamApi.findAll().then(all => {
      const filtered = restrictByTeam ? all.filter(t => teamIds.has(t.teamId!)) : all;
      setTeams(filtered);

      // Squad counts — parallel per team
      Promise.all(
        filtered.map(t => teamApi.getSquad(t.teamId!).then(squad => ({ id: t.teamId!, count: squad.length })).catch(() => ({ id: t.teamId!, count: 0 })))
      ).then(results => {
        const map: Record<number, number> = {};
        results.forEach(r => { map[r.id] = r.count; });
        setSquadCounts(map);
      });

      // Match counts — fetch all once, group by team
      matchApi.findAll().then(matches => {
        const map: Record<number, number> = {};
        matches.forEach(m => {
          if (m.homeTeamId)        map[m.homeTeamId]        = (map[m.homeTeamId] ?? 0) + 1;
          if (m.oppositionTeamId)  map[m.oppositionTeamId]  = (map[m.oppositionTeamId] ?? 0) + 1;
        });
        setMatchCounts(map);
      }).catch(() => {});
    }).finally(() => setLoading(false));
  }, [loaded, restrictByTeam, teamIds]);

  if (loading || !loaded) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 3 }}>Manage Teams</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3].map(i => (
            <Grid item xs={12} sm={6} key={i}>
              <Skeleton variant="rounded" height={200} />
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
              <TeamCard
                team={team}
                onNavigate={navigate}
                onShare={setShareTeam}
                squadCount={squadCounts[team.teamId!]}
                matchCount={matchCounts[team.teamId!]}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <TeamShareDialog team={shareTeam} onClose={() => setShareTeam(null)} />
    </Box>
  );
};

interface TeamCardProps {
  team: Team;
  onNavigate: ReturnType<typeof useNavigate>;
  onShare: (team: Team) => void;
  squadCount?: number;
  matchCount?: number;
}

const editState = (team: Team) => ({ state: { editTeamId: team.teamId, returnTo: '/manage-club/teams' } });

const TeamCard: React.FC<TeamCardProps> = ({ team, onNavigate, onShare, squadCount, matchCount }) => {
  const [photoOpen, setPhotoOpen] = useState(false);
  return (
  <Card
    variant="outlined"
    onClick={() => onNavigate('/admin/teams', editState(team))}
    sx={{ position: 'relative', cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
  >
    {/* Action icons — top right */}
    <Box
      onClick={e => e.stopPropagation()}
      sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.25 }}
    >
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onNavigate('/admin/teams', editState(team))}>
          <Edit fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Squad">
        <IconButton size="small" onClick={() => onNavigate(`/admin/teams/${team.teamId}/squad`, { state: { returnTo: '/manage-club/teams' } })}>
          <Groups fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Schedule">
        <IconButton size="small" onClick={() => onNavigate(`/manage-club/teams/${team.teamId}/schedule`, { state: { teamName: team.teamName } })}>
          <SportsScore fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Events">
        <IconButton size="small" onClick={() => onNavigate('/admin/events', { state: { filterTeamId: team.teamId, returnTo: '/manage-club/teams' } })}>
          <Event fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Message">
        <IconButton size="small" onClick={() => onNavigate('/admin/send-notification', {
          state: {
            preselectedTeamId: team.teamId,
            preselectedTeamName: team.teamName,
            preselectedClubId: team.associatedClubId,
            preselectedClubName: team.associatedClubName,
            returnTo: '/manage-club/teams',
          },
        })}>
          <Campaign fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Share">
        <IconButton size="small" onClick={() => onShare(team)}>
          <Share fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>

    <CardContent sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', mb: 2, pr: 14 }}>
        <Avatar
          src={team.logoUrl}
          sx={{ width: 64, height: 64, flexShrink: 0, bgcolor: 'primary.main', fontSize: 24 }}
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
        {team.associatedClubName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Shield sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>{team.associatedClubName}</Typography>
          </Box>
        )}
        {team.homeFieldName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Place sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>{team.homeFieldName}</Typography>
          </Box>
        )}
        {team.captainName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>Capt: {team.captainName}</Typography>
          </Box>
        )}
        {team.manager && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ManageAccounts sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>Manager: {team.manager}</Typography>
          </Box>
        )}
        {team.coach && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <School sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>Coach: {team.coach}</Typography>
          </Box>
        )}
        {team.selector && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HowToVote sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>Selector: {team.selector}</Typography>
          </Box>
        )}
        {team.email && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Email sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>{team.email}</Typography>
          </Box>
        )}
        {team.contactNumber && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Phone sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>{team.contactNumber}</Typography>
          </Box>
        )}
      </Box>

      {/* Stat badges + social icons row */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        {/* Clickable stat badges */}
        <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {squadCount !== undefined && (
            <Chip
              icon={<Groups />}
              label={`${squadCount} players`}
              clickable
              variant="outlined"
              onClick={() => onNavigate(`/admin/teams/${team.teamId}/squad`, { state: { returnTo: '/manage-club/teams' } })}
            />
          )}
          {matchCount !== undefined && (
            <Chip
              icon={<SportsScore />}
              label={`${matchCount} matches`}
              clickable
              variant="outlined"
              onClick={() => onNavigate(`/manage-club/teams/${team.teamId}/schedule`, { state: { teamName: team.teamName } })}
            />
          )}
        </Box>

        {/* Social media icons — right side */}
        {(team.teamPhotoUrl || team.facebookUrl || team.instagramUrl || team.youtubeUrl || team.websiteUrl) && (
          <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex', gap: 0.25, ml: 'auto' }}>
            {team.teamPhotoUrl && (
              <Tooltip title="Team photo">
                <IconButton size="small" onClick={() => setPhotoOpen(true)}>
                  <PhotoCamera fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {team.facebookUrl && (
              <Tooltip title="Facebook">
                <IconButton size="small" component="a" href={team.facebookUrl} target="_blank" rel="noopener noreferrer" sx={{ color: '#1877F2' }}>
                  <Facebook fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {team.instagramUrl && (
              <Tooltip title="Instagram">
                <IconButton size="small" component="a" href={team.instagramUrl} target="_blank" rel="noopener noreferrer" sx={{ color: '#E1306C' }}>
                  <Instagram fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {team.youtubeUrl && (
              <Tooltip title="YouTube">
                <IconButton size="small" component="a" href={team.youtubeUrl} target="_blank" rel="noopener noreferrer" sx={{ color: '#FF0000' }}>
                  <YouTube fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {team.websiteUrl && (
              <Tooltip title="Website">
                <IconButton size="small" component="a" href={team.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <Language fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </CardContent>

    {/* Team photo overlay */}
    <Dialog open={photoOpen} onClose={() => setPhotoOpen(false)} maxWidth="md" onClick={e => e.stopPropagation()}>
      <DialogContent sx={{ p: 0, position: 'relative', lineHeight: 0 }}>
        <IconButton
          size="small"
          onClick={() => setPhotoOpen(false)}
          sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.45)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' } }}
        >
          <Close fontSize="small" />
        </IconButton>
        <Box
          component="img"
          src={team.teamPhotoUrl}
          alt={team.teamName}
          sx={{ display: 'block', maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }}
        />
      </DialogContent>
    </Dialog>
  </Card>
  );
};
