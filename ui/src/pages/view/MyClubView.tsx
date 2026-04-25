import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Avatar, Paper, Divider, Link, CircularProgress,
} from '@mui/material';
import { Language, Email, Phone, Map } from '@mui/icons-material';
import { playerApi } from '../../api/playerApi';
import { clubApi } from '../../api/clubApi';
import { Club } from '../../types';

function InfoRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value?: string; href?: string }) {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
      {icon}
      <Typography variant="caption" color="text.secondary">{label}:</Typography>
      {href ? (
        <Link href={href} target="_blank" rel="noopener" variant="body2">{value}</Link>
      ) : (
        <Typography variant="body2">{value}</Typography>
      )}
    </Box>
  );
}

export const MyClubView: React.FC = () => {
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [noClub, setNoClub] = useState(false);

  useEffect(() => {
    playerApi.findMe()
      .then(player => {
        if (!player.homeClubId) {
          setNoClub(true);
          setLoading(false);
          return;
        }
        clubApi.findById(player.homeClubId).then(c => {
          setClub(c);
          setLoading(false);
        }).catch(() => {
          setNoClub(true);
          setLoading(false);
        });
      })
      .catch(() => {
        setNoClub(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (noClub || !club) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 2 }}>My Club</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No home club is linked to your profile yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>My Club</Typography>

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 520 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            src={club.logoUrl}
            variant="rounded"
            sx={{ width: 72, height: 72, flexShrink: 0 }}
          >
            {club.name.charAt(0)}
          </Avatar>
          <Typography variant="h6" fontWeight="bold">{club.name}</Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <InfoRow
          icon={<Phone sx={{ fontSize: 16, color: 'text.secondary' }} />}
          label="Contact"
          value={club.contactPerson}
        />
        <InfoRow
          icon={<Phone sx={{ fontSize: 16, color: 'text.secondary' }} />}
          label="Phone"
          value={club.contactNumber}
          href={club.contactNumber ? `tel:${club.contactNumber}` : undefined}
        />
        <InfoRow
          icon={<Email sx={{ fontSize: 16, color: 'text.secondary' }} />}
          label="Email"
          value={club.email}
          href={club.email ? `mailto:${club.email}` : undefined}
        />
        <InfoRow
          icon={<Language sx={{ fontSize: 16, color: 'text.secondary' }} />}
          label="Website"
          value={club.websiteUrl}
          href={club.websiteUrl}
        />
        <InfoRow
          icon={<Map sx={{ fontSize: 16, color: 'text.secondary' }} />}
          label="Location"
          value={club.googleMapsUrl ? 'View on Google Maps' : undefined}
          href={club.googleMapsUrl}
        />
      </Paper>
    </Box>
  );
};
