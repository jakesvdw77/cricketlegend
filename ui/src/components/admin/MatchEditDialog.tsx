import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, TextField, MenuItem, InputAdornment, Typography,
  ToggleButton, ToggleButtonGroup, ListSubheader, Divider, CircularProgress,
} from '@mui/material';
import { YouTube, ArrowBack } from '@mui/icons-material';
import { Field, Match, MatchStage, Team } from '../../types';
import { matchApi } from '../../api/matchApi';
import { LocalPool } from './TournamentPoolsForm';

const PLAYOFF_STAGES: MatchStage[] = ['PLAYOFFS', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'];
const isPlayoffStage = (stage?: MatchStage) => PLAYOFF_STAGES.includes(stage as MatchStage);

interface Props {
  match: Partial<Match> | null;
  onClose: () => void;
  onSaved: () => void;
  pools: LocalPool[];
  allTeams: Team[];
  fields: Field[];
  inline?: boolean;
}

export const MatchEditDialog: React.FC<Props> = ({ match, onClose, onSaved, pools, allTeams, fields, inline }) => {
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [errors, setErrors] = useState<{ matchDate?: string; homeTeam?: string; oppTeam?: string; startTime?: string }>({});
  const [homeMode, setHomeMode] = useState<'team' | 'tbd'>('team');
  const [awayMode, setAwayMode] = useState<'team' | 'tbd'>('team');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (match) {
      setEditingMatch(match);
      setErrors({});
      setSaving(false);
      const playoff = isPlayoffStage(match.matchStage as MatchStage);
      setHomeMode((match as Match).homeTeamPlaceholder ? 'tbd' : ((match as Match).homeTeamId ? 'team' : playoff ? 'tbd' : 'team'));
      setAwayMode((match as Match).awayTeamPlaceholder ? 'tbd' : ((match as Match).oppositionTeamId ? 'team' : playoff ? 'tbd' : 'team'));
    }
  }, [match]);

  const placeholderSuggestions = useMemo(() => {
    const sugs: string[] = [];
    pools.forEach((pool, i) => {
      const letter = String.fromCharCode(65 + i);
      const count = Math.max(pool.teams.length, 2);
      for (let pos = 1; pos <= count; pos++) {
        const ord = pos === 1 ? '1st' : pos === 2 ? '2nd' : pos === 3 ? '3rd' : `${pos}th`;
        sugs.push(`${ord} Pool ${letter}`);
      }
    });
    if (sugs.length === 0) {
      ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].forEach(ord => sugs.push(`${ord} Place`));
    }
    ['1', '2', '3', '4'].forEach(n => sugs.push(`Winner QF ${n}`));
    ['1', '2'].forEach(n => sugs.push(`Winner SF ${n}`));
    return sugs;
  }, [pools]);

  const renderTeamItems = (excludeId?: number) => {
    const allPoolTeams = pools.flatMap(p => p.teams);
    if (allPoolTeams.length === 0) {
      return allTeams
        .filter(t => t.teamId !== excludeId)
        .map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>);
    }
    if (pools.length > 1) {
      return pools.flatMap(pool => [
        <ListSubheader key={`h-${pool.poolId ?? pool.poolName}`}>{pool.poolName}</ListSubheader>,
        ...pool.teams
          .filter(t => t.teamId !== excludeId)
          .map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>),
      ]);
    }
    return allPoolTeams
      .filter(t => t.teamId !== excludeId)
      .map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>);
  };

  const switchHomeMode = (mode: 'team' | 'tbd') => {
    setHomeMode(mode);
    if (mode === 'team') setEditingMatch(m => m && ({ ...m, homeTeamPlaceholder: undefined }));
    else setEditingMatch(m => m && ({ ...m, homeTeamId: undefined, homeTeamName: undefined }));
  };

  const switchAwayMode = (mode: 'team' | 'tbd') => {
    setAwayMode(mode);
    if (mode === 'team') setEditingMatch(m => m && ({ ...m, awayTeamPlaceholder: undefined }));
    else setEditingMatch(m => m && ({ ...m, oppositionTeamId: undefined, oppositionTeamName: undefined }));
  };

  const save = async () => {
    if (!editingMatch) return;
    const errs: typeof errors = {};
    if (!editingMatch.matchDate) errs.matchDate = 'Required';
    if (homeMode === 'tbd') {
      if (!editingMatch.homeTeamPlaceholder?.trim()) errs.homeTeam = 'Enter a placeholder (e.g. "1st Pool A")';
    } else {
      if (!editingMatch.homeTeamId) errs.homeTeam = 'Required';
    }
    if (awayMode === 'tbd') {
      if (!editingMatch.awayTeamPlaceholder?.trim()) errs.oppTeam = 'Enter a placeholder (e.g. "2nd Pool B")';
    } else {
      if (!editingMatch.oppositionTeamId) errs.oppTeam = 'Required';
      else if (editingMatch.homeTeamId && editingMatch.homeTeamId === editingMatch.oppositionTeamId) errs.oppTeam = 'Must differ from home team';
    }
    if (!editingMatch.scheduledStartTime) errs.startTime = 'Required';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      if ((editingMatch as Match).matchId) {
        await matchApi.update((editingMatch as Match).matchId!, editingMatch as Match);
      } else {
        await matchApi.create(editingMatch as Match);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Partial<Match>) => setEditingMatch(m => m && ({ ...m, ...patch }));

  const title = (editingMatch as Match)?.matchId ? 'Edit Match' : 'Add Match';

  const formFields = editingMatch ? (
    <>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <TextField label="Match Date" type="date" value={editingMatch.matchDate ?? ''} required
          InputLabelProps={{ shrink: true }} error={!!errors.matchDate} helperText={errors.matchDate}
          sx={{ flex: '1 1 140px' }}
          onChange={e => set({ matchDate: e.target.value })} />
        <TextField label="Arrival Time" type="time" value={editingMatch.arrivalTime ?? ''}
          InputLabelProps={{ shrink: true }} sx={{ flex: '1 1 110px' }}
          onChange={e => set({ arrivalTime: e.target.value })} />
        <TextField label="Toss Time" type="time" value={editingMatch.tossTime ?? ''}
          InputLabelProps={{ shrink: true }} sx={{ flex: '1 1 110px' }}
          onChange={e => set({ tossTime: e.target.value })} />
        <TextField label="Start Time" type="time" value={editingMatch.scheduledStartTime ?? ''} required
          InputLabelProps={{ shrink: true }} error={!!errors.startTime} helperText={errors.startTime}
          sx={{ flex: '1 1 110px' }}
          onChange={e => {
            const startTime = e.target.value;
            const patch: Partial<Match> = { scheduledStartTime: startTime };
            if (startTime) {
              const [h, m] = startTime.split(':').map(Number);
              const mins = h * 60 + m;
              const offset = (n: number) => {
                const t = ((mins - n) % 1440 + 1440) % 1440;
                return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
              };
              patch.arrivalTime = offset(45);
              patch.tossTime = offset(15);
            }
            set(patch);
          }} />
      </Box>

      <TextField select label="Stage" value={editingMatch.matchStage ?? ''}
        onChange={e => {
          const stage = e.target.value as MatchStage;
          set({ matchStage: stage });
          if (isPlayoffStage(stage)) {
            if (!editingMatch.homeTeamId) setHomeMode('tbd');
            if (!editingMatch.oppositionTeamId) setAwayMode('tbd');
          } else {
            setHomeMode('team');
            setAwayMode('team');
          }
        }}>
        <MenuItem value="FRIENDLY">Friendly</MenuItem>
        <MenuItem value="POOL">Pool</MenuItem>
        <MenuItem value="PLAYOFFS">Playoffs</MenuItem>
        <MenuItem value="ROUND_OF_16">Round of 16</MenuItem>
        <MenuItem value="QUARTER_FINAL">Quarter-Final</MenuItem>
        <MenuItem value="SEMI_FINAL">Semi-Final</MenuItem>
        <MenuItem value="FINAL">Final</MenuItem>
      </TextField>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {isPlayoffStage(editingMatch.matchStage as MatchStage) && (
          <ToggleButtonGroup size="small" exclusive value={homeMode} onChange={(_, v) => v && switchHomeMode(v)}>
            <ToggleButton value="team" sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}>Select Team</ToggleButton>
            <ToggleButton value="tbd" sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}>TBD / Placeholder</ToggleButton>
          </ToggleButtonGroup>
        )}
        {homeMode === 'tbd' ? (
          <TextField label="Home Team — Placeholder" required
            value={editingMatch.homeTeamPlaceholder ?? ''}
            onChange={e => set({ homeTeamPlaceholder: e.target.value || undefined })}
            error={!!errors.homeTeam}
            helperText={errors.homeTeam || `e.g. ${placeholderSuggestions.slice(0, 3).join(' · ')}`} />
        ) : (
          <TextField select label="Home Team" value={editingMatch.homeTeamId ?? ''} required
            error={!!errors.homeTeam} helperText={errors.homeTeam}
            onChange={e => set({ homeTeamId: +e.target.value })}>
            {renderTeamItems(editingMatch.oppositionTeamId)}
          </TextField>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {isPlayoffStage(editingMatch.matchStage as MatchStage) && (
          <ToggleButtonGroup size="small" exclusive value={awayMode} onChange={(_, v) => v && switchAwayMode(v)}>
            <ToggleButton value="team" sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}>Select Team</ToggleButton>
            <ToggleButton value="tbd" sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}>TBD / Placeholder</ToggleButton>
          </ToggleButtonGroup>
        )}
        {awayMode === 'tbd' ? (
          <TextField label="Away Team — Placeholder" required
            value={editingMatch.awayTeamPlaceholder ?? ''}
            onChange={e => set({ awayTeamPlaceholder: e.target.value || undefined })}
            error={!!errors.oppTeam}
            helperText={errors.oppTeam || `e.g. ${placeholderSuggestions.slice(1, 4).join(' · ')}`} />
        ) : (
          <TextField select label="Opposition Team" value={editingMatch.oppositionTeamId ?? ''} required
            error={!!errors.oppTeam} helperText={errors.oppTeam}
            onChange={e => set({ oppositionTeamId: +e.target.value })}>
            {renderTeamItems(editingMatch.homeTeamId)}
          </TextField>
        )}
      </Box>

      <TextField select label="Ground" value={editingMatch.fieldId ?? ''}
        onChange={e => set({ fieldId: +e.target.value })}>
        <MenuItem value="">— None —</MenuItem>
        {fields.map(f => <MenuItem key={f.fieldId} value={f.fieldId}>{f.name}</MenuItem>)}
      </TextField>
      <TextField label="Umpire" value={editingMatch.umpire ?? ''}
        onChange={e => set({ umpire: e.target.value })} />
      <TextField label="Live Scoring URL" value={editingMatch.scoringUrl ?? ''}
        onChange={e => set({ scoringUrl: e.target.value })} />
      <TextField label="YouTube Stream URL" value={editingMatch.youtubeUrl ?? ''}
        onChange={e => set({ youtubeUrl: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start"><YouTube sx={{ color: '#FF0000', fontSize: 20 }} /></InputAdornment> }} />
    </>
  ) : null;

  const actions = (
    <>
      <Button onClick={onClose} startIcon={inline ? <ArrowBack fontSize="small" /> : undefined}>
        {inline ? 'Back to Schedule' : 'Cancel'}
      </Button>
      <Button
        variant="contained"
        disableElevation
        onClick={save}
        disabled={saving}
        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
      >
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </>
  );

  if (inline) {
    return (
      <Box>
        {/* Inline header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>{title}</Typography>
          {actions}
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
          {formFields}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
          {actions}
        </Box>
      </Box>
    );
  }

  return (
    <Dialog open={!!match} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3, overflow: 'visible' }}>
        {formFields}
      </DialogContent>
      <DialogActions>{actions}</DialogActions>
    </Dialog>
  );
};
