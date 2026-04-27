import React, { useRef, useState } from 'react';
import {
  Box, TextField, MenuItem, Checkbox, FormControlLabel, Avatar,
  Button, CircularProgress, Tooltip, ToggleButtonGroup, ToggleButton, IconButton,
  Tabs, Tab, Typography,
} from '@mui/material';
import { CloudUpload, Male, Female, HighlightOff } from '@mui/icons-material';
import { paymentApi } from '../../api/paymentApi';
import { Player, Club, BattingPosition, BattingStance, BowlingArm, BowlingType, ClothingSize, Gender } from '../../types';

const VALID_BOWLING_TYPES: BowlingType[] = [
  'VERY_FAST', 'FAST', 'FAST_MEDIUM', 'MEDIUM_FAST', 'MEDIUM', 'MEDIUM_SLOW',
  'OFF_SPIN', 'LEG_SPIN', 'SLOW_LEFT_ARM_ORTHODOX', 'CHINAMAN', 'NONE',
];
const validBowlingType = (v?: string): BowlingType | '' =>
  VALID_BOWLING_TYPES.includes(v as BowlingType) ? (v as BowlingType) : '';

interface Props {
  editing: Player;
  onChange: (patch: Partial<Player>) => void;
  clubs: Club[];
  readOnlyEmail?: boolean;
  readOnlyConsent?: boolean;
}

export const PlayerEditForm: React.FC<Props> = ({ editing, onChange, clubs, readOnlyEmail, readOnlyConsent }) => {
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<Player>) => onChange(patch);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      set({ profilePictureUrl: url });
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="General" />
        <Tab label="Cricket" />
        <Tab label="Notifications" />
      </Tabs>

      {/* Both panels share the same grid cell so the container height never changes */}
      <Box sx={{ display: 'grid' }}>

      <Box sx={{ gridArea: '1/1', display: 'flex', flexDirection: 'column', gap: 2, visibility: tab === 0 ? 'visible' : 'hidden' }}>
          {/* Photo + Gender */}
          <Box>
            <input type="file" ref={photoInputRef} style={{ display: 'none' }} accept="image/*" onChange={handlePhotoUpload} />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar src={editing.profilePictureUrl ?? ''} sx={{ width: 64, height: 64, flexShrink: 0 }}>
                {editing.name?.charAt(0)}
              </Avatar>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploading ? <CircularProgress size={14} /> : <CloudUpload />}
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Upload Photo'}
                  </Button>
                  {editing.profilePictureUrl && (
                    <Tooltip title="Remove photo">
                      <IconButton size="small" color="error" onClick={() => set({ profilePictureUrl: undefined })}>
                        <HighlightOff fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                {editing.playerId && (
                  <ToggleButtonGroup
                    exclusive
                    value={editing.gender ?? null}
                    onChange={(_, value: Gender | null) => { if (value !== null) set({ gender: value }); }}
                    size="small"
                  >
                    <ToggleButton value="MALE" sx={{ gap: 0.5 }}>
                      <Male fontSize="small" /> Male
                    </ToggleButton>
                    <ToggleButton value="FEMALE" sx={{ gap: 0.5 }}>
                      <Female fontSize="small" /> Female
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}
              </Box>
            </Box>
          </Box>

          {/* Name */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Name" value={editing.name} fullWidth required onChange={e => set({ name: e.target.value })} />
            <TextField label="Surname" value={editing.surname} fullWidth required onChange={e => set({ surname: e.target.value })} />
          </Box>

          {/* DOB + Club */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Date of Birth" type="date" value={editing.dateOfBirth ?? ''} fullWidth
              InputLabelProps={{ shrink: true }} onChange={e => set({ dateOfBirth: e.target.value })} />
            <TextField select label="Home Club" value={editing.homeClubId ?? ''} fullWidth
              onChange={e => set({ homeClubId: e.target.value ? +e.target.value : undefined })}>
              <MenuItem value="">— None —</MenuItem>
              {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
            </TextField>
          </Box>

          {/* Shirt # + Sizes */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Shirt #" type="number" value={editing.shirtNumber ?? ''} fullWidth
              onChange={e => set({ shirtNumber: +e.target.value })} />
            <TextField select label="Shirt Size" value={editing.shirtSize ?? ''} fullWidth
              onChange={e => set({ shirtSize: e.target.value as ClothingSize || undefined })}>
              <MenuItem value="">— None —</MenuItem>
              {(['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as ClothingSize[]).map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Pant Size" value={editing.pantSize ?? ''} fullWidth
              onChange={e => set({ pantSize: e.target.value as ClothingSize || undefined })}>
              <MenuItem value="">— None —</MenuItem>
              {(['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as ClothingSize[]).map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Contact */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Contact" value={editing.contactNumber ?? ''} fullWidth onChange={e => set({ contactNumber: e.target.value })} />
            <TextField label="Alt Contact" value={editing.alternativeContactNumber ?? ''} fullWidth onChange={e => set({ alternativeContactNumber: e.target.value })} />
          </Box>

          <TextField
            label="Email"
            type="email"
            value={editing.email ?? ''}
            onChange={e => set({ email: e.target.value })}
            disabled={readOnlyEmail}
            helperText={readOnlyEmail ? 'Email is linked to your login account' : undefined}
          />

          <TextField label="Career URL" type="url" value={editing.careerUrl ?? ''}
            onChange={e => set({ careerUrl: e.target.value })}
            helperText="Link to player's career profile (e.g. CricHeroes)" />
        </Box>

        <Box sx={{ gridArea: '1/1', display: 'flex', flexDirection: 'column', gap: 2, visibility: tab === 1 ? 'visible' : 'hidden' }}>
          {/* Batting */}
          <TextField select label="Batting Position" value={editing.battingPosition ?? ''}
            onChange={e => set({ battingPosition: e.target.value as BattingPosition })}>
            <MenuItem value="">— None —</MenuItem>
            <MenuItem value="OPENER">Opener</MenuItem>
            <MenuItem value="TOP_ORDER">Top Order</MenuItem>
            <MenuItem value="MIDDLE_ORDER">Middle Order</MenuItem>
            <MenuItem value="LOWER_MIDDLE_ORDER">Lower Middle Order</MenuItem>
            <MenuItem value="LOWER_ORDER">Lower Order</MenuItem>
          </TextField>

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField select label="Batting Stance" value={editing.battingStance ?? ''} fullWidth
              onChange={e => set({ battingStance: e.target.value as BattingStance })}>
              <MenuItem value="RIGHT_HANDED">Right Handed</MenuItem>
              <MenuItem value="LEFT_HANDED">Left Handed</MenuItem>
            </TextField>
            <TextField select label="Bowling Arm" value={editing.bowlingArm ?? ''} fullWidth
              onChange={e => set({ bowlingArm: e.target.value as BowlingArm })}>
              <MenuItem value="RIGHT">Right</MenuItem>
              <MenuItem value="LEFT">Left</MenuItem>
            </TextField>
          </Box>

          {/* Bowling type */}
          <TextField select label="Bowling Type" value={validBowlingType(editing.bowlingType)}
            onChange={e => set({ bowlingType: e.target.value as BowlingType })}>
            <MenuItem value="VERY_FAST"><Tooltip title="150+ km/h" placement="right"><span style={{ width: '100%' }}>Very Fast</span></Tooltip></MenuItem>
            <MenuItem value="FAST"><Tooltip title="140–150 km/h" placement="right"><span style={{ width: '100%' }}>Fast</span></Tooltip></MenuItem>
            <MenuItem value="FAST_MEDIUM"><Tooltip title="130–140 km/h" placement="right"><span style={{ width: '100%' }}>Fast Medium</span></Tooltip></MenuItem>
            <MenuItem value="MEDIUM_FAST"><Tooltip title="120–130 km/h" placement="right"><span style={{ width: '100%' }}>Medium Fast</span></Tooltip></MenuItem>
            <MenuItem value="MEDIUM"><Tooltip title="100–120 km/h" placement="right"><span style={{ width: '100%' }}>Medium</span></Tooltip></MenuItem>
            <MenuItem value="MEDIUM_SLOW"><Tooltip title="85–100 km/h" placement="right"><span style={{ width: '100%' }}>Medium Slow</span></Tooltip></MenuItem>
            <MenuItem value="OFF_SPIN"><Tooltip title="Finger Spin · 70–90 km/h" placement="right"><span style={{ width: '100%' }}>Off Spin</span></Tooltip></MenuItem>
            <MenuItem value="LEG_SPIN"><Tooltip title="Wrist Spin · 70–90 km/h" placement="right"><span style={{ width: '100%' }}>Leg Spin</span></Tooltip></MenuItem>
            <MenuItem value="SLOW_LEFT_ARM_ORTHODOX"><Tooltip title="Left-arm Finger Spin · 70–90 km/h" placement="right"><span style={{ width: '100%' }}>Slow Left-Arm Orthodox</span></Tooltip></MenuItem>
            <MenuItem value="CHINAMAN"><Tooltip title="Left-arm Wrist Spin · 65–85 km/h" placement="right"><span style={{ width: '100%' }}>Chinaman</span></Tooltip></MenuItem>
            <MenuItem value="NONE">Don't Bowl</MenuItem>
          </TextField>

          {/* Roles */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <FormControlLabel control={<Checkbox checked={editing.wicketKeeper ?? false}
              onChange={e => set({ wicketKeeper: e.target.checked })} />} label="Wicket Keeper" />
            <FormControlLabel control={<Checkbox checked={editing.partTimeBowler ?? false}
              onChange={e => set({ partTimeBowler: e.target.checked })} />} label="Part Time Bowler" />
          </Box>
        </Box>

        <Box sx={{ gridArea: '1/1', display: 'flex', flexDirection: 'column', gap: 2, visibility: tab === 2 ? 'visible' : 'hidden' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={editing.consentEmail ?? false}
                onChange={e => !readOnlyConsent && set({ consentEmail: e.target.checked })}
                disabled={readOnlyConsent}
              />
            }
            label="Player consents to receive notifications via Email"
          />
          {readOnlyConsent && (
            <Typography variant="caption" color="text.secondary">
              Only the player can change their notification consent.
            </Typography>
          )}
        </Box>

      </Box>
    </Box>
  );
};
