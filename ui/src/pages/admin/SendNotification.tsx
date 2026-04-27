import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert, Paper,
  FormControl, InputLabel, Select, MenuItem, Chip,
} from '@mui/material';
import { Send, People, Groups } from '@mui/icons-material';
import { pollApi } from '../../api/pollApi';
import { clubApi } from '../../api/clubApi';
import { teamApi } from '../../api/teamApi';
import { useAuth } from '../../hooks/useAuth';
import { Club, Team, ManagerTeamDTO } from '../../types';
import RichEditor from './templates/RichEditor';

type AdminAudience = 'all' | 'club' | 'team';

export const SendNotification: React.FC = () => {
  const { isAdmin } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Admin targeting
  const [adminAudience, setAdminAudience] = useState<AdminAudience>('all');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | ''>('');
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');

  // Manager targeting
  const [managedTeams, setManagedTeams] = useState<ManagerTeamDTO[]>([]);
  const [managerTeamId, setManagerTeamId] = useState<number | ''>('');

  useEffect(() => {
    if (isAdmin) {
      clubApi.findAll().then(setClubs).catch(() => {});
      teamApi.findAll().then(setAllTeams).catch(() => {});
    } else {
      pollApi.getManagedTeams().then(setManagedTeams).catch(() => {});
    }
  }, [isAdmin]);

  const clubTeams = selectedClubId
    ? allTeams.filter(t => t.associatedClubId === selectedClubId)
    : [];

  const handleClubChange = (clubId: number | '') => {
    setSelectedClubId(clubId);
    setSelectedTeamId('');
  };

  const handleSend = async () => {
    if (!subject.trim()) { setError('Subject is required.'); return; }
    if (!message || message === '<p></p>') { setError('Message is required.'); return; }

    if (isAdmin) {
      if (adminAudience === 'club' && !selectedClubId) { setError('Please select a club.'); return; }
      if (adminAudience === 'team' && !selectedTeamId) { setError('Please select a team.'); return; }
    } else {
      if (managedTeams.length > 1 && !managerTeamId) { setError('Please select a team to send to.'); return; }
    }

    setSending(true);
    setError('');
    setSuccess(false);
    try {
      if (isAdmin) {
        const teamId = adminAudience === 'team' && selectedTeamId ? selectedTeamId as number : undefined;
        const clubId = adminAudience === 'club' && selectedClubId ? selectedClubId as number : undefined;
        await pollApi.sendNotification(subject.trim(), message, teamId, clubId);
      } else {
        const teamId = managerTeamId ? managerTeamId as number : undefined;
        await pollApi.sendNotification(subject.trim(), message, teamId);
      }
      setSuccess(true);
      setSubject('');
      setMessage('');
      setSelectedClubId('');
      setSelectedTeamId('');
      setManagerTeamId('');
      setAdminAudience('all');
    } catch {
      setError('Failed to send notification. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const audienceLabel = isAdmin
    ? adminAudience === 'team' && selectedTeamId
      ? allTeams.find(t => t.teamId === selectedTeamId)?.teamName ?? 'Selected team'
      : adminAudience === 'club' && selectedClubId
        ? clubs.find(c => c.clubId === selectedClubId)?.name + ' members' ?? 'Selected club'
        : 'All players'
    : managerTeamId
      ? managedTeams.find(t => t.teamId === managerTeamId)?.teamName ?? 'Selected team'
      : managedTeams.length === 1
        ? managedTeams[0].teamName
        : 'All my managed teams';

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Send Notification</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isAdmin
          ? 'Send a message to all players, a specific club, or a specific team.'
          : 'Send a message to players in your squad. Select a specific team or send to all your managed teams.'}
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          Notification sent successfully.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>

        {/* Admin audience selector */}
        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel>Send To</InputLabel>
              <Select
                value={adminAudience}
                label="Send To"
                onChange={e => { setAdminAudience(e.target.value as AdminAudience); setSelectedClubId(''); setSelectedTeamId(''); }}
              >
                <MenuItem value="all">All players</MenuItem>
                <MenuItem value="club">Club members</MenuItem>
                <MenuItem value="team">Team</MenuItem>
              </Select>
            </FormControl>

            {(adminAudience === 'club' || adminAudience === 'team') && (
              <FormControl sx={{ minWidth: 220 }}>
                <InputLabel>Club</InputLabel>
                <Select
                  value={selectedClubId}
                  label="Club"
                  onChange={e => handleClubChange(e.target.value as number | '')}
                >
                  <MenuItem value="">— Select club —</MenuItem>
                  {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {adminAudience === 'team' && selectedClubId && (
              <FormControl sx={{ minWidth: 220 }}>
                <InputLabel>Team</InputLabel>
                <Select
                  value={selectedTeamId}
                  label="Team"
                  onChange={e => setSelectedTeamId(e.target.value as number | '')}
                >
                  <MenuItem value="">— Select team —</MenuItem>
                  {clubTeams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </Box>
        )}

        {/* Manager audience selector */}
        {!isAdmin && managedTeams.length > 1 && (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Send To</InputLabel>
            <Select
              value={managerTeamId}
              label="Send To"
              onChange={e => setManagerTeamId(e.target.value as number | '')}
            >
              <MenuItem value="">All my managed teams</MenuItem>
              {managedTeams.map(t => (
                <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Audience badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Chip
            icon={isAdmin && adminAudience === 'all' ? <People /> : <Groups />}
            label={`Recipients: ${audienceLabel}`}
            color={isAdmin && adminAudience === 'all' ? 'error' : 'primary'}
            variant="outlined"
            size="small"
          />
        </Box>

        <TextField
          label="Subject"
          fullWidth
          value={subject}
          onChange={e => setSubject(e.target.value)}
          sx={{ mb: 3 }}
          inputProps={{ maxLength: 255 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Message
        </Typography>
        <RichEditor initialHtml={message} onChange={setMessage} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? 'Sending…' : `Send to ${audienceLabel}`}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
