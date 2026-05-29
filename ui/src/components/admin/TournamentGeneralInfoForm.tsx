import React, { useRef, useState } from 'react';
import {
  Box, Avatar, Button, CircularProgress, IconButton, InputAdornment, Tooltip, TextField,
  MenuItem, Divider, Typography, Switch, Dialog, DialogContent, DialogActions,
} from '@mui/material';
import { CloudUpload, HighlightOff, PictureAsPdf, Visibility, VisibilityOff } from '@mui/icons-material';
import { Tournament, CricketFormat, TournamentGender, AgeGroup } from '../../types';
import { paymentApi } from '../../api/paymentApi';
import { PdfPreviewDialog } from '../PdfPreviewDialog';

const FORMATS: CricketFormat[] = ['T20', 'T30', 'T45', 'T50'];

interface Props {
  value: Tournament;
  onChange: (patch: Partial<Tournament>) => void;
  nameError?: string;
  onNameErrorClear?: () => void;
  dateError?: string;
  onDateErrorClear?: () => void;
}

export const TournamentGeneralInfoForm: React.FC<Props> = ({
  value, onChange, nameError, onNameErrorClear, dateError, onDateErrorClear,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [viewLogoUrl, setViewLogoUrl] = useState<string | null>(null);
  const [viewPdfUrl, setViewPdfUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      onChange({ logoUrl: url });
    } finally {
      setUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      onChange({ playingConditionsUrl: url });
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Logo + Playing Conditions */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Logo */}
        <Box>
          <input type="file" ref={logoInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleLogoUpload} />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Avatar
              src={value.logoUrl ?? ''}
              variant="rounded"
              sx={{ width: 64, height: 64, flexShrink: 0, cursor: value.logoUrl ? 'pointer' : 'default' }}
              onClick={() => value.logoUrl && setViewLogoUrl(value.logoUrl)}
            >
              {value.name.charAt(0)}
            </Avatar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined" size="small"
                startIcon={uploading ? <CircularProgress size={14} /> : <CloudUpload />}
                onClick={() => logoInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : 'Upload Logo'}
              </Button>
              {value.logoUrl && (
                <Tooltip title="Remove logo">
                  <IconButton size="small" color="error" onClick={() => onChange({ logoUrl: undefined })}>
                    <HighlightOff fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>

        {/* Playing Conditions PDF */}
        <Box>
          <input type="file" ref={pdfInputRef} style={{ display: 'none' }} accept="application/pdf" onChange={handlePdfUpload} />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ width: 64, height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {value.playingConditionsUrl ? (
                <Tooltip title="Preview Playing Conditions">
                  <IconButton color="error" size="large" onClick={() => setViewPdfUrl(value.playingConditionsUrl!)}>
                    <PictureAsPdf sx={{ fontSize: 36 }} />
                  </IconButton>
                </Tooltip>
              ) : (
                <PictureAsPdf sx={{ fontSize: 36, color: 'text.disabled' }} />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined" size="small"
                startIcon={uploadingPdf ? <CircularProgress size={14} /> : <CloudUpload />}
                onClick={() => pdfInputRef.current?.click()}
                disabled={uploadingPdf}
              >
                {uploadingPdf ? 'Uploading…' : 'Playing Conditions'}
              </Button>
              {value.playingConditionsUrl && (
                <Tooltip title="Remove PDF">
                  <IconButton size="small" color="error" onClick={() => onChange({ playingConditionsUrl: undefined })}>
                    <HighlightOff fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {(value.showOnFrontPage ?? true)
          ? <Visibility fontSize="small" color="primary" />
          : <VisibilityOff fontSize="small" color="disabled" />}
        <Box>
          <Typography variant="subtitle2">Show on Front Page</Typography>
          <Typography variant="caption" color="text.secondary">
            When off, this tournament (and its standings) will not appear on the public front page.
          </Typography>
        </Box>
        <Switch
          checked={value.showOnFrontPage ?? true}
          onChange={e => onChange({ showOnFrontPage: e.target.checked })}
          sx={{ ml: 'auto' }}
        />
      </Box>

      <TextField
        label="Name" value={value.name} required
        error={!!nameError} helperText={nameError}
        onChange={e => { onChange({ name: e.target.value }); onNameErrorClear?.(); }}
      />
      <TextField
        label="Description" value={value.description ?? ''} multiline rows={2}
        onChange={e => onChange({ description: e.target.value })}
      />

      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <TextField select label="Format" value={value.cricketFormat ?? ''} fullWidth
          onChange={e => onChange({ cricketFormat: e.target.value as CricketFormat })}>
          {FORMATS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
        </TextField>
        <TextField select label="Gender" value={value.tournamentGender ?? ''} fullWidth
          onChange={e => onChange({ tournamentGender: e.target.value as TournamentGender || undefined })}>
          <MenuItem value="">— None —</MenuItem>
          <MenuItem value="MEN">Men</MenuItem>
          <MenuItem value="WOMEN">Women</MenuItem>
          <MenuItem value="BOYS">Boys</MenuItem>
          <MenuItem value="GIRLS">Girls</MenuItem>
        </TextField>
      </Box>

      <TextField select label="Age Group" value={value.ageGroup ?? ''}
        onChange={e => onChange({ ageGroup: e.target.value as AgeGroup || undefined })}>
        <MenuItem value="">— None —</MenuItem>
        <MenuItem value="UNDER_9">Under 9</MenuItem>
        <MenuItem value="UNDER_10">Under 10</MenuItem>
        <MenuItem value="UNDER_11">Under 11</MenuItem>
        <MenuItem value="UNDER_12">Under 12</MenuItem>
        <MenuItem value="UNDER_13">Under 13</MenuItem>
        <MenuItem value="UNDER_14">Under 14</MenuItem>
        <MenuItem value="UNDER_15">Under 15</MenuItem>
        <MenuItem value="UNDER_16">Under 16</MenuItem>
        <MenuItem value="UNDER_18">Under 18</MenuItem>
        <MenuItem value="UNDER_19">Under 19</MenuItem>
        <MenuItem value="OPEN">Open</MenuItem>
        <MenuItem value="VETERANS">Veterans</MenuItem>
        <MenuItem value="OVER_50">Over 50</MenuItem>
        <MenuItem value="OVER_60">Over 60</MenuItem>
      </TextField>

      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <TextField
          label="Start Date" type="date" value={value.startDate ?? ''} fullWidth
          InputLabelProps={{ shrink: true }} inputProps={{ max: value.endDate || undefined }}
          error={!!dateError}
          onChange={e => { onChange({ startDate: e.target.value }); onDateErrorClear?.(); }}
        />
        <TextField
          label="End Date" type="date" value={value.endDate ?? ''} fullWidth
          InputLabelProps={{ shrink: true }} inputProps={{ min: value.startDate || undefined }}
          error={!!dateError} helperText={dateError}
          onChange={e => { onChange({ endDate: e.target.value }); onDateErrorClear?.(); }}
        />
      </Box>

      <Divider />
      <Typography variant="subtitle2" color="text.secondary">Scoring</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField label="Win Pts" type="number" value={value.pointsForWin ?? 2}
          onChange={e => onChange({ pointsForWin: +e.target.value })} />
        <TextField label="Draw Pts" type="number" value={value.pointsForDraw ?? 1}
          onChange={e => onChange({ pointsForDraw: +e.target.value })} />
        <TextField label="No Result Pts" type="number" value={value.pointsForNoResult ?? 1}
          onChange={e => onChange({ pointsForNoResult: +e.target.value })} />
        <TextField label="Bonus Pts" type="number" value={value.pointsForBonus ?? 1}
          onChange={e => onChange({ pointsForBonus: +e.target.value })} />
      </Box>

      <Divider />
      <Typography variant="subtitle2" color="text.secondary">Costs</Typography>
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <TextField label="Entry Fee" type="number" value={value.entryFee ?? ''} fullWidth
          onChange={e => onChange({ entryFee: e.target.value ? +e.target.value : undefined })}
          InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }} />
        <TextField label="Registration Fee" type="number" value={value.registrationFee ?? ''} fullWidth
          onChange={e => onChange({ registrationFee: e.target.value ? +e.target.value : undefined })}
          InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }} />
        <TextField label="Match Fee" type="number" value={value.matchFee ?? ''} fullWidth
          onChange={e => onChange({ matchFee: e.target.value ? +e.target.value : undefined })}
          InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }} />
      </Box>

      <PdfPreviewDialog pdfUrl={viewPdfUrl} onClose={() => setViewPdfUrl(null)} />

      <Dialog open={!!viewLogoUrl} onClose={() => setViewLogoUrl(null)} maxWidth="sm">
        <DialogContent sx={{ p: 0, lineHeight: 0 }}>
          <img src={viewLogoUrl ?? ''} alt="Tournament logo"
            style={{ display: 'block', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewLogoUrl(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
