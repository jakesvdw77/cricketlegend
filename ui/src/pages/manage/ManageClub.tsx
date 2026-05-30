import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Avatar, Button, Chip, Skeleton, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Tooltip, IconButton, Snackbar,
  Link,
} from '@mui/material';
import {
  Shield, Email, Phone, Language, Place, Edit, CloudUpload, HighlightOff, Person,
} from '@mui/icons-material';
import { clubApi } from '../../api/clubApi';
import { paymentApi } from '../../api/paymentApi';
import { Club } from '../../types';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { useAuth } from '../../hooks/useAuth';

export const ManageClub: React.FC = () => {
  const { isAdmin } = useAuth();
  const { homeClubId, loaded } = useManagerTeams();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Club | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (isAdmin) {
      const all = await clubApi.findAll();
      setClubs(all);
    } else if (homeClubId) {
      const club = await clubApi.findById(homeClubId);
      setClubs([club]);
    } else {
      setClubs([]);
    }
  };

  useEffect(() => {
    if (!loaded) return;
    load().finally(() => setLoading(false));
  }, [loaded, isAdmin, homeClubId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      setEditing(prev => prev ? { ...prev, logoUrl: url } : prev);
    } catch {
      setError('Logo upload failed.');
    } finally {
      setUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!editing?.clubId) return;
    setSaving(true);
    try {
      await clubApi.update(editing.clubId, editing);
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.response?.data?.message ?? 'Could not save club.');
    } finally {
      setSaving(false);
    }
  };

  const patch = (p: Partial<Club>) => setEditing(prev => prev ? { ...prev, ...p } : prev);

  if (loading || !loaded) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 3 }}>Manage Club</Typography>
        <Grid container spacing={2}>
          {[1, 2].map(i => (
            <Grid item xs={12} sm={6} key={i}>
              <Skeleton variant="rounded" height={260} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Manage Club</Typography>
        <Chip label={`${clubs.length} club${clubs.length !== 1 ? 's' : ''}`} size="small" />
      </Box>

      {clubs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Shield sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6">No club assigned</Typography>
          <Typography variant="body2">Contact your administrator to be linked to a club.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {clubs.map(club => (
            <Grid item xs={12} sm={6} key={club.clubId}>
              <ClubCard club={club} onEdit={setEditing} />
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Club</DialogTitle>
        <DialogContent dividers>
          {editing && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <input
                type="file"
                ref={logoInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleLogoUpload}
              />
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Avatar
                  src={editing.logoUrl ?? ''}
                  sx={{ width: 64, height: 64, flexShrink: 0, bgcolor: 'primary.main', fontSize: 24 }}
                >
                  {editing.name.charAt(0)}
                </Avatar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploading ? <CircularProgress size={14} /> : <CloudUpload />}
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Upload Logo'}
                  </Button>
                  {editing.logoUrl && (
                    <Tooltip title="Remove logo">
                      <IconButton size="small" color="error" onClick={() => patch({ logoUrl: undefined })}>
                        <HighlightOff fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <TextField
                label="Club Name"
                value={editing.name}
                required
                onChange={e => patch({ name: e.target.value })}
              />
              <TextField
                label="Contact Person"
                value={editing.contactPerson ?? ''}
                onChange={e => patch({ contactPerson: e.target.value })}
              />
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  label="Email"
                  type="email"
                  value={editing.email ?? ''}
                  fullWidth
                  onChange={e => patch({ email: e.target.value })}
                />
                <TextField
                  label="Contact Number"
                  value={editing.contactNumber ?? ''}
                  fullWidth
                  onChange={e => patch({ contactNumber: e.target.value })}
                />
              </Box>
              <TextField
                label="Website URL"
                value={editing.websiteUrl ?? ''}
                placeholder="https://…"
                onChange={e => patch({ websiteUrl: e.target.value })}
              />
              <TextField
                label="Google Maps URL"
                value={editing.googleMapsUrl ?? ''}
                placeholder="https://maps.google.com/…"
                onChange={e => patch({ googleMapsUrl: e.target.value })}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !editing?.name}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError('')} message={error} />
    </Box>
  );
};

interface ClubCardProps {
  club: Club;
  onEdit: (club: Club) => void;
}

const ClubCard: React.FC<ClubCardProps> = ({ club, onEdit }) => (
  <Card
    variant="outlined"
    onClick={() => onEdit(club)}
    sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      cursor: 'pointer',
      transition: 'box-shadow 0.15s',
      '&:hover': { boxShadow: 3 },
    }}
  >
    <CardContent sx={{ flex: 1 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Avatar
          src={club.logoUrl}
          sx={{ width: 64, height: 64, flexShrink: 0, bgcolor: 'primary.main', fontSize: 24 }}
        >
          {club.name.charAt(0)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {club.name}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {club.contactPerson && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>{club.contactPerson}</Typography>
          </Box>
        )}
        {club.email && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Email sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>{club.email}</Typography>
          </Box>
        )}
        {club.contactNumber && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Phone sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>{club.contactNumber}</Typography>
          </Box>
        )}
        {club.websiteUrl && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Language sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Link
              href={club.websiteUrl}
              target="_blank"
              rel="noopener"
              underline="hover"
              variant="body2"
              noWrap
              sx={{ minWidth: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {club.websiteUrl.replace(/^https?:\/\//, '')}
            </Link>
          </Box>
        )}
        {club.googleMapsUrl && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Place sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Link
              href={club.googleMapsUrl}
              target="_blank"
              rel="noopener"
              underline="hover"
              variant="body2"
              noWrap
              sx={{ minWidth: 0 }}
              onClick={e => e.stopPropagation()}
            >
              View on Maps
            </Link>
          </Box>
        )}
      </Box>
    </CardContent>

    <Divider />

    <CardActions sx={{ px: 1.5, py: 1 }}>
      <Button size="small" startIcon={<Edit />} onClick={() => onEdit(club)}>
        Edit
      </Button>
    </CardActions>
  </Card>
);
