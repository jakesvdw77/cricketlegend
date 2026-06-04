import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, Grid, Card, CardContent,
  Avatar, Chip, Button,
} from '@mui/material';
import { Grass, LocationOn, OpenInNew } from '@mui/icons-material';
import { fieldApi } from '../../api/fieldApi';
import { Field } from '../../types';

export const FieldDirectory: React.FC = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fieldApi.findAll()
      .then(data => setFields([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Grass color="primary" />
        <Typography variant="h5">Field Directory</Typography>
        <Chip label={`${fields.length} field${fields.length !== 1 ? 's' : ''}`} size="small" variant="outlined" sx={{ ml: 1 }} />
      </Box>

      {fields.length === 0 ? (
        <Typography color="text.secondary">No fields available.</Typography>
      ) : (
        <Grid container spacing={2}>
          {fields.map(f => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={f.fieldId}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar
                      src={f.iconUrl}
                      variant="rounded"
                      sx={{ width: 44, height: 44, bgcolor: 'success.light', flexShrink: 0 }}
                    >
                      <Grass />
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
                        {f.name}
                      </Typography>
                      {f.homeClubName && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {f.homeClubName}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {f.address && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 1.5 }}>
                      <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mt: '2px', flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary">
                        {f.address}
                      </Typography>
                    </Box>
                  )}

                  {f.googleMapsUrl && (
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<OpenInNew fontSize="small" />}
                      component="a"
                      href={f.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="success"
                    >
                      Open in Maps
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
