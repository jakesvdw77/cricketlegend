import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert, Paper,
  FormControl, InputLabel, Select, MenuItem, Chip,
} from '@mui/material';
import { Send, People, Groups, Visibility, ArrowBack, Shield } from '@mui/icons-material';
import { pollApi } from '../../api/pollApi';
import { clubApi } from '../../api/clubApi';
import { teamApi } from '../../api/teamApi';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { RichContentDialog } from '../../components/RichContentDialog';
import { Club, Team, ManagerTeamDTO } from '../../types';
import RichEditor from './templates/RichEditor';

type AdminAudience = 'all' | 'club' | 'team';
type ManagerAudience = 'club' | 'team';

export const SendNotification: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as any;
  const preselectedTeamId: number | undefined = locationState?.preselectedTeamId;
  const preselectedTeamName: string | undefined = locationState?.preselectedTeamName;
  const preselectedClubId: number | undefined = locationState?.preselectedClubId;
  const preselectedClubName: string | undefined = locationState?.preselectedClubName;
  const returnTo: string | undefined = locationState?.returnTo;

  const { homeClubId } = useManagerTeams();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  // Admin targeting
  const [adminAudience, setAdminAudience] = useState<AdminAudience>('all');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | ''>('');
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');

  // Manager targeting
  const [managedTeams, setManagedTeams] = useState<ManagerTeamDTO[]>([]);
  const [managerAudience, setManagerAudience] = useState<ManagerAudience>('team');
  const [managerTeamId, setManagerTeamId] = useState<number | ''>('');

  useEffect(() => {
    if (isAdmin) {
      clubApi.findAll().then(setClubs).catch(() => {});
      teamApi.findAll().then(setAllTeams).catch(() => {});
    } else {
      pollApi.getManagedTeams().then(setManagedTeams).catch(() => {});
      clubApi.findAll().then(setClubs).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!preselectedTeamId) return;
    if (isAdmin) {
      setAdminAudience('team');
      if (preselectedClubId) setSelectedClubId(preselectedClubId);
      setSelectedTeamId(preselectedTeamId);
    } else {
      setManagerAudience('team');
      setManagerTeamId(preselectedTeamId);
    }
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const clubTeams = selectedClubId
    ? allTeams.filter(t => t.associatedClubId === selectedClubId)
    : [];

  const managerClub = homeClubId ? clubs.find(c => c.clubId === homeClubId) : undefined;

  const handleClubChange = (clubId: number | '') => {
    setSelectedClubId(clubId);
    setSelectedTeamId('');
  };

  const handleSend = async () => {
    if (subject.trim().length < 5) { setError('Subject must be at least 5 characters.'); return; }
    if (!message || message === '<p></p>') { setError('Message is required.'); return; }

    if (isAdmin) {
      if (adminAudience === 'club' && !selectedClubId) { setError('Please select a club.'); return; }
      if (adminAudience === 'team' && !selectedTeamId) { setError('Please select a team.'); return; }
    } else {
      if (managerAudience === 'club' && !homeClubId) { setError('No club found for your account.'); return; }
      if (managerAudience === 'team' && managedTeams.length > 1 && !managerTeamId) { setError('Please select a team.'); return; }
    }

    setSending(true);
    setError('');
    setSuccess(false);
    try {
      if (isAdmin) {
        const teamId = adminAudience === 'team' && selectedTeamId ? selectedTeamId as number : undefined;
        const clubId = adminAudience === 'club' && selectedClubId ? selectedClubId as number : undefined;
        await pollApi.sendNotification(subject.trim(), message, teamId, clubId);
      } else if (preselectedTeamId) {
        await pollApi.sendNotification(subject.trim(), message, preselectedTeamId, undefined);
      } else if (managerAudience === 'club') {
        await pollApi.sendNotification(subject.trim(), message, undefined, homeClubId ?? undefined);
      } else {
        const teamId = managerTeamId ? managerTeamId as number : managedTeams.length === 1 ? managedTeams[0].teamId : undefined;
        await pollApi.sendNotification(subject.trim(), message, teamId, undefined);
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
        ? (clubs.find(c => c.clubId === selectedClubId)?.name ?? 'Selected club') + ' members'
        : 'All players'
    : preselectedTeamId
      ? preselectedTeamName ?? 'Selected team'
      : managerAudience === 'club'
        ? (managerClub?.name ?? 'Club members')
        : managerTeamId
          ? managedTeams.find(t => t.teamId === managerTeamId)?.teamName ?? 'Selected team'
          : managedTeams.length === 1
            ? managedTeams[0].teamName
            : 'All my managed teams';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {returnTo && (
          <Button startIcon={<ArrowBack />} onClick={() => navigate(returnTo)} sx={{ mr: 1 }}>Back</Button>
        )}
        <Typography variant="h5" sx={{ mr: 'auto' }}>Send Notification</Typography>
        <Button
          variant="outlined"
          startIcon={<Visibility />}
          onClick={() => setPreviewOpen(true)}
          disabled={!message || message === '<p></p>'}
        >
          Preview
        </Button>
        <Button
          variant="contained"
          startIcon={<Send />}
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </Box>

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

        {/* Preselected team badges (from team card) */}
        {preselectedTeamId ? (
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">Sending to:</Typography>
            {preselectedClubName && (
              <Chip icon={<Shield />} label={preselectedClubName} size="small" variant="outlined" />
            )}
            <Chip icon={<Groups />} label={preselectedTeamName} color="primary" size="small" />
          </Box>
        ) : (
          <>
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
            {!isAdmin && (
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 180 }}>
                  <InputLabel>Send To</InputLabel>
                  <Select
                    value={managerAudience}
                    label="Send To"
                    onChange={e => { setManagerAudience(e.target.value as ManagerAudience); setManagerTeamId(''); }}
                  >
                    <MenuItem value="club">Club members</MenuItem>
                    <MenuItem value="team">Team</MenuItem>
                  </Select>
                </FormControl>

                {managerAudience === 'club' && managerClub && (
                  <Chip icon={<Shield />} label={managerClub.name} variant="outlined" sx={{ alignSelf: 'center' }} />
                )}

                {managerAudience === 'team' && managedTeams.length > 1 && (
                  <FormControl sx={{ minWidth: 220 }}>
                    <InputLabel>Team</InputLabel>
                    <Select
                      value={managerTeamId}
                      label="Team"
                      onChange={e => setManagerTeamId(e.target.value as number | '')}
                    >
                      <MenuItem value="">— Select team —</MenuItem>
                      {managedTeams.map(t => (
                        <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {managerAudience === 'team' && managedTeams.length === 1 && (
                  <Chip icon={<Groups />} label={managedTeams[0].teamName} color="primary" variant="outlined" sx={{ alignSelf: 'center' }} />
                )}
              </Box>
            )}
          </>
        )}

        <Chip
          icon={isAdmin && adminAudience === 'all' ? <People /> : <Groups />}
          label={`Recipients: ${audienceLabel}`}
          color={isAdmin && adminAudience === 'all' ? 'error' : 'primary'}
          variant="outlined"
          size="small"
          sx={{ mb: 3 }}
        />

        <TextField
          label="Subject"
          fullWidth
          value={subject}
          onChange={e => setSubject(e.target.value)}
          sx={{ mb: 3 }}
          inputProps={{ maxLength: 255 }}
          error={subject.length > 0 && subject.trim().length < 5}
          helperText={subject.length > 0 && subject.trim().length < 5 ? 'Subject must be at least 5 characters.' : ''}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Message
        </Typography>
        <RichEditor initialHtml={message} onChange={setMessage} />
      </Paper>

      <RichContentDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={subject || '(No subject)'}
        html={message}
      />
    </Box>
  );
};
