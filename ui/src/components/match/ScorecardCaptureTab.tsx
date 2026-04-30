import React from 'react';
import {
  Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Chip, IconButton, Button, Paper, Divider,
  Autocomplete, TableContainer,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { BattingEntry, BowlingEntry, Player, TeamScorecard } from '../../types';

// ── Dismissal options ─────────────────────────────────────────────────────────

const DISMISSAL_OPTS = [
  { value: 'NOT_OUT',    label: 'Not Out',    hasBowler: false, hasFielder: false },
  { value: 'BOWLED',     label: 'Bowled',     hasBowler: true,  hasFielder: false },
  { value: 'CAUGHT',     label: 'Caught',     hasBowler: true,  hasFielder: true  },
  { value: 'LBW',        label: 'LBW',        hasBowler: true,  hasFielder: false },
  { value: 'RUN_OUT',    label: 'Run Out',    hasBowler: false, hasFielder: true  },
  { value: 'STUMPED',    label: 'Stumped',    hasBowler: true,  hasFielder: true  },
  { value: 'HIT_WICKET', label: 'Hit Wicket', hasBowler: true,  hasFielder: false },
  { value: 'RETIRED',    label: 'Retired',    hasBowler: false, hasFielder: false },
];

function dismissalMeta(type?: string) {
  return DISMISSAL_OPTS.find(o => o.value === type) ?? { hasBowler: false, hasFielder: false };
}

function buildDesc(type: string | undefined, bowler: string, fielder: string): string {
  const b = bowler.trim();
  const f = fielder.trim();
  switch (type) {
    case 'NOT_OUT':    return 'not out';
    case 'BOWLED':     return b ? `b ${b}` : 'bowled';
    case 'CAUGHT':
      if (!f || f.toLowerCase() === b.toLowerCase()) return b ? `c & b ${b}` : 'caught';
      return `c ${f} b ${b}`;
    case 'LBW':        return b ? `lbw b ${b}` : 'lbw';
    case 'STUMPED':    return `st ${f} b ${b}`.trim();
    case 'RUN_OUT':    return f ? `run out (${f})` : 'run out';
    case 'HIT_WICKET': return b ? `hit wkt b ${b}` : 'hit wicket';
    case 'RETIRED':    return 'retired';
    default:           return '';
  }
}

function parseFielder(desc: string | undefined, type: string | undefined): string {
  if (!desc) return '';
  switch (type) {
    case 'CAUGHT': {
      if (/c\s*&\s*b/i.test(desc)) return '';
      const m = desc.match(/^c\s+(.+?)\s+b\s/i);
      return m?.[1]?.trim() ?? '';
    }
    case 'RUN_OUT': {
      const m = desc.match(/run out\s*\((.+?)\)/i);
      return m?.[1]?.trim() ?? '';
    }
    case 'STUMPED': {
      const m = desc.match(/^st\s+(.+?)\s+b\s/i);
      return m?.[1]?.trim() ?? '';
    }
    default: return '';
  }
}

// ── Stat helpers ──────────────────────────────────────────────────────────────

function calcSR(score?: number, balls?: number): string | null {
  if (score == null || balls == null || balls === 0) return null;
  return (score / balls * 100).toFixed(1);
}

function parseOversDec(overs?: string): number | null {
  if (!overs) return null;
  const [w = '0', b = '0'] = overs.split('.');
  const wn = parseInt(w, 10);
  const bn = parseInt(b, 10);
  if (isNaN(wn) || isNaN(bn) || bn > 5) return null;
  return wn + bn / 6;
}

function calcEcon(runs?: number, overs?: string): string | null {
  const o = parseOversDec(overs);
  if (o == null || o === 0 || runs == null) return null;
  return (runs / o).toFixed(2);
}

// ── Table cell sx ─────────────────────────────────────────────────────────────

const hdrCell = {
  py: 1, px: 0.75,
  fontSize: '0.68rem', fontWeight: 700,
  color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5,
  whiteSpace: 'nowrap',
} as const;

const dataCell = { py: 0.5, px: 0.5 } as const;

// ── Player autocomplete ───────────────────────────────────────────────────────

interface PlayerAcProps {
  playerList: Player[];
  value: string;
  disabled: boolean;
  onSelect: (name: string, id?: number) => void;
  placeholder?: string;
}

const PlayerAc: React.FC<PlayerAcProps> = ({ playerList, value, disabled, onSelect, placeholder }) => {
  const opts = playerList.map(p => `${p.name} ${p.surname}`);
  return (
    <Autocomplete
      freeSolo
      options={opts}
      inputValue={value}
      disabled={disabled}
      sx={{ width: '100%' }}
      size="small"
      onInputChange={(_, val, reason) => {
        if (reason === 'reset') return;
        const p = playerList.find(pl => `${pl.name} ${pl.surname}` === val);
        onSelect(val, p?.playerId);
      }}
      onChange={(_, val) => {
        const name = typeof val === 'string' ? val : '';
        const p = playerList.find(pl => `${pl.name} ${pl.surname}` === name);
        onSelect(name, p?.playerId);
      }}
      renderInput={params => (
        <TextField {...params} size="small" variant="outlined" placeholder={placeholder} />
      )}
    />
  );
};

// ── Numeric field ─────────────────────────────────────────────────────────────

interface NfProps {
  value?: number;
  disabled: boolean;
  onChange: (v?: number) => void;
  width?: number;
}

const Nf: React.FC<NfProps> = ({ value, disabled, onChange, width }) => (
  <TextField
    size="small" type="number" variant="outlined"
    value={value ?? ''}
    disabled={disabled}
    sx={{ width: width ?? '100%' }}
    inputProps={{ min: 0, style: { textAlign: 'center', padding: '4px 6px' } }}
    onChange={e => onChange(e.target.value !== '' ? +e.target.value : undefined)}
  />
);

// ── BattingTable ──────────────────────────────────────────────────────────────

interface BattingTableProps {
  entries: BattingEntry[];
  batterOptions: Player[];
  fieldingTeamPlayers: Player[];
  disabled: boolean;
  onChange: (entries: BattingEntry[]) => void;
}

const BattingTable: React.FC<BattingTableProps> = ({
  entries, batterOptions, fieldingTeamPlayers, disabled, onChange,
}) => {
  const update = (i: number, patch: Partial<BattingEntry>) => {
    const next = [...entries];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  return (
    <Box>
      <TableContainer>
        <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={hdrCell} width={34}>#</TableCell>
              <TableCell sx={hdrCell}>{/* Batter — flex */}Batter</TableCell>
              <TableCell sx={hdrCell} width={120}>How Out</TableCell>
              <TableCell sx={hdrCell}>{/* Bowler — flex */}Bowler</TableCell>
              <TableCell sx={hdrCell}>{/* Fielder — flex */}Fielder</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={64}>R</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={64}>B</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={54}>4s</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={54}>6s</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={66}>SR</TableCell>
              <TableCell sx={hdrCell} width={38} />
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry, i) => {
              const m       = dismissalMeta(entry.dismissalType);
              const fielder = parseFielder(entry.dismissedDescription, entry.dismissalType);
              const bowler  = entry.dismissedBowler ?? '';
              const strike  = calcSR(entry.score, entry.ballsFaced);

              const onTypeChange = (type: string) => {
                update(i, {
                  dismissalType: type,
                  dismissed: type === 'NOT_OUT' || type === 'RETIRED' ? false : true,
                  batted: true,
                  dismissedDescription: buildDesc(type, bowler, fielder),
                });
              };

              const onBowlerChange = (name: string, id?: number) => {
                update(i, {
                  dismissedBowler: name,
                  dismissedDescription: buildDesc(entry.dismissalType, name, fielder),
                  ...(id != null ? {} : {}),
                });
              };

              const onFielderChange = (name: string) => {
                update(i, {
                  dismissedDescription: buildDesc(entry.dismissalType, bowler, name),
                });
              };

              return (
                <TableRow key={i} hover>
                  {/* # */}
                  <TableCell sx={dataCell}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', fontWeight: 600 }}>
                      {i + 1}
                    </Typography>
                  </TableCell>

                  {/* Batter */}
                  <TableCell sx={dataCell}>
                    <PlayerAc
                      playerList={batterOptions}
                      value={entry.playerName ?? ''}
                      disabled={disabled}
                      onSelect={(name, id) => update(i, { playerName: name, playerId: id, battingPosition: i + 1, batted: true })}
                      placeholder="Player name"
                    />
                  </TableCell>

                  {/* How Out */}
                  <TableCell sx={dataCell}>
                    <TextField
                      select size="small" variant="outlined"
                      value={entry.dismissalType ?? ''}
                      disabled={disabled}
                      sx={{ width: '100%' }}
                      onChange={e => onTypeChange(e.target.value)}
                    >
                      <MenuItem value=""><em>—</em></MenuItem>
                      {DISMISSAL_OPTS.map(o => (
                        <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.85rem' }}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>

                  {/* Bowler */}
                  <TableCell sx={dataCell}>
                    <PlayerAc
                      playerList={fieldingTeamPlayers}
                      value={bowler}
                      disabled={disabled || !m.hasBowler}
                      onSelect={onBowlerChange}
                      placeholder="Bowler"
                    />
                  </TableCell>

                  {/* Fielder */}
                  <TableCell sx={dataCell}>
                    <Autocomplete
                      freeSolo
                      options={fieldingTeamPlayers.map(p => `${p.name} ${p.surname}`)}
                      inputValue={fielder}
                      disabled={disabled || !m.hasFielder}
                      sx={{ width: '100%' }}
                      size="small"
                      onInputChange={(_, val, reason) => { if (reason !== 'reset') onFielderChange(val); }}
                      onChange={(_, val) => { if (typeof val === 'string') onFielderChange(val); }}
                      renderInput={params => (
                        <TextField {...params} size="small" variant="outlined" placeholder="Fielder" />
                      )}
                    />
                  </TableCell>

                  {/* Runs */}
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    <Nf value={entry.score} disabled={disabled} onChange={v => update(i, { score: v })} />
                  </TableCell>

                  {/* Balls */}
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    <Nf value={entry.ballsFaced} disabled={disabled} onChange={v => update(i, { ballsFaced: v })} />
                  </TableCell>

                  {/* 4s */}
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    <Nf value={entry.fours} disabled={disabled} onChange={v => update(i, { fours: v })} />
                  </TableCell>

                  {/* 6s */}
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    <Nf value={entry.sixes} disabled={disabled} onChange={v => update(i, { sixes: v })} />
                  </TableCell>

                  {/* SR */}
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    {strike != null
                      ? <Chip label={strike} size="small" variant="outlined" color="info" sx={{ fontSize: '0.68rem', height: 22 }} />
                      : <Typography variant="caption" color="text.disabled">—</Typography>
                    }
                  </TableCell>

                  {/* Delete */}
                  <TableCell sx={dataCell}>
                    <IconButton size="small" color="error" disabled={disabled} onClick={() => onChange(entries.filter((_, idx) => idx !== i))}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}

            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} sx={{ textAlign: 'center', py: 2, color: 'text.disabled', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  No batters added yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        size="small" startIcon={<Add />} disabled={disabled}
        onClick={() => onChange([...entries, { battingPosition: entries.length + 1, batted: true }])}
        sx={{ mt: 1 }}
      >
        Add Batter
      </Button>
    </Box>
  );
};

// ── BowlingTable ──────────────────────────────────────────────────────────────

interface BowlingTableProps {
  entries: BowlingEntry[];
  bowlerOptions: Player[];
  disabled: boolean;
  onChange: (entries: BowlingEntry[]) => void;
}

const BowlingTable: React.FC<BowlingTableProps> = ({ entries, bowlerOptions, disabled, onChange }) => {
  const update = (i: number, patch: Partial<BowlingEntry>) => {
    const next = [...entries];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  return (
    <Box>
      <TableContainer>
        <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={hdrCell}>{/* Bowler — flex */}Bowler</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={72}>O</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={64}>M</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={64}>R</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={64}>W</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={64}>Wd</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={64}>NB</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={64}>Dots</TableCell>
              <TableCell sx={{ ...hdrCell, textAlign: 'center' }} width={70}>Econ</TableCell>
              <TableCell sx={hdrCell} width={38} />
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry, i) => {
              const econVal = calcEcon(entry.runs, entry.overs);
              return (
                <TableRow key={i} hover>
                  <TableCell sx={dataCell}>
                    <PlayerAc
                      playerList={bowlerOptions}
                      value={entry.playerName ?? ''}
                      disabled={disabled}
                      onSelect={(name, id) => update(i, { playerName: name, playerId: id })}
                      placeholder="Player name"
                    />
                  </TableCell>
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    <TextField
                      size="small" variant="outlined"
                      value={entry.overs ?? ''}
                      disabled={disabled}
                      sx={{ width: '100%' }}
                      inputProps={{ style: { textAlign: 'center', padding: '4px 6px' } }}
                      placeholder="0.0"
                      onChange={e => update(i, { overs: e.target.value })}
                    />
                  </TableCell>
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    <Nf value={entry.maidens} disabled={disabled} onChange={v => update(i, { maidens: v })} />
                  </TableCell>
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    <Nf value={entry.runs} disabled={disabled} onChange={v => update(i, { runs: v })} />
                  </TableCell>
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    <Nf value={entry.wickets} disabled={disabled} onChange={v => update(i, { wickets: v })} />
                  </TableCell>
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    <Nf value={entry.wides} disabled={disabled} onChange={v => update(i, { wides: v })} />
                  </TableCell>
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    <Nf value={entry.noBalls} disabled={disabled} onChange={v => update(i, { noBalls: v })} />
                  </TableCell>
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    <Nf value={entry.dots} disabled={disabled} onChange={v => update(i, { dots: v })} />
                  </TableCell>
                  <TableCell sx={{ ...dataCell, textAlign: 'center' }}>
                    {econVal != null
                      ? <Chip label={econVal} size="small" variant="outlined" color="secondary" sx={{ fontSize: '0.68rem', height: 22 }} />
                      : <Typography variant="caption" color="text.disabled">—</Typography>
                    }
                  </TableCell>
                  <TableCell sx={dataCell}>
                    <IconButton size="small" color="error" disabled={disabled} onClick={() => onChange(entries.filter((_, idx) => idx !== i))}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}

            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} sx={{ textAlign: 'center', py: 2, color: 'text.disabled', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  No bowlers added yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        size="small" startIcon={<Add />} disabled={disabled}
        onClick={() => onChange([...entries, {}])}
        sx={{ mt: 1 }}
      >
        Add Bowler
      </Button>
    </Box>
  );
};

// ── InningsScorecardSection ───────────────────────────────────────────────────

interface InningsSectionProps {
  label: string;
  card: TeamScorecard;
  batterOptions: Player[];
  bowlerOptions: Player[];
  disabled: boolean;
  onChange: (card: TeamScorecard) => void;
  accentColor: 'success' | 'primary';
}

const InningsScorecardSection: React.FC<InningsSectionProps> = ({
  label, card, batterOptions, bowlerOptions, disabled, onChange, accentColor,
}) => {
  const batting  = card.batting  ?? [];
  const bowling  = card.bowling  ?? [];

  const dismissedCount = batting.filter(b =>
    b.dismissalType && b.dismissalType !== 'NOT_OUT' && b.dismissalType !== 'RETIRED',
  ).length;
  const totalRuns    = batting.reduce((s, b) => s + (b.score ?? 0), 0);
  const totalFours   = batting.reduce((s, b) => s + (b.fours ?? 0), 0);
  const totalSixes   = batting.reduce((s, b) => s + (b.sixes ?? 0), 0);

  // Wides & no balls from bowling entries (charged to bowler)
  const bowlerWides  = bowling.reduce((s, b) => s + (b.wides   ?? 0), 0);
  const bowlerNoBalls= bowling.reduce((s, b) => s + (b.noBalls ?? 0), 0);

  // Team-level extras entered manually
  const byes        = card.byes        ?? 0;
  const legByes     = card.legByes     ?? 0;
  const wides       = card.wides       ?? bowlerWides;   // default to bowler sum
  const noBalls     = card.noBalls     ?? bowlerNoBalls;
  const penaltyRuns = card.penaltyRuns ?? 0;

  const totalExtras = byes + legByes + wides + noBalls + penaltyRuns;
  const totalScore  = totalRuns + totalExtras;

  const totalBallsBowled = bowling.reduce((s, b) => {
    const dec = parseOversDec(b.overs);
    if (dec == null) return s;
    return s + Math.floor(dec) * 6 + Math.round((dec % 1) * 6);
  }, 0);
  const oversDisplay = totalBallsBowled > 0
    ? `${Math.floor(totalBallsBowled / 6)}.${totalBallsBowled % 6} ov`
    : undefined;

  // Recompute score and sync into card
  const updateCard = (patch: Partial<TeamScorecard>) => {
    const merged = { ...card, ...patch };
    const batRuns = (merged.batting ?? []).reduce((s, b) => s + (b.score ?? 0), 0);
    const b2      = (merged.byes        ?? 0);
    const lb      = (merged.legByes     ?? 0);
    const wd      = (merged.wides       ?? bowlerWides);
    const nb      = (merged.noBalls     ?? bowlerNoBalls);
    const pen     = (merged.penaltyRuns ?? 0);
    const newWkts = (merged.batting ?? []).filter(b =>
      b.dismissalType && b.dismissalType !== 'NOT_OUT' && b.dismissalType !== 'RETIRED',
    ).length;
    onChange({ ...merged, score: batRuns + b2 + lb + wd + nb + pen, wickets: newWkts });
  };

  const setExtra = (field: keyof TeamScorecard, val: number | undefined) =>
    updateCard({ [field]: val ?? 0 });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
        <Typography variant="h6" fontWeight={700} color={`${accentColor}.main`}>
          {label}
        </Typography>
        {(batting.length > 0 || totalExtras > 0) && (
          <Typography variant="body2" color="text.secondary">
            {totalScore}/{dismissedCount}
            {oversDisplay && ` (${oversDisplay})`}
          </Typography>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />

      {/* ── Batting ── */}
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
        Batting
      </Typography>
      <Box sx={{ mt: 0.5 }}>
        <BattingTable
          entries={batting}
          batterOptions={batterOptions}
          fieldingTeamPlayers={bowlerOptions}
          disabled={disabled}
          onChange={entries => updateCard({ batting: entries })}
        />
      </Box>

      {/* ── Extras ── */}
      <Typography variant="overline" color="text.secondary" sx={{ mt: 3, display: 'block', fontWeight: 700, letterSpacing: 1 }}>
        Extras
      </Typography>
      <Box sx={{ mt: 0.75, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {([
          { label: 'Byes',      field: 'byes'        as const, value: card.byes        },
          { label: 'Leg Byes',  field: 'legByes'     as const, value: card.legByes     },
          { label: 'Wides',     field: 'wides'       as const, value: card.wides       },
          { label: 'No Balls',  field: 'noBalls'     as const, value: card.noBalls     },
          { label: 'Penalty',   field: 'penaltyRuns' as const, value: card.penaltyRuns },
        ] as const).map(({ label: lbl, field, value }) => (
          <TextField
            key={field}
            label={lbl}
            type="number"
            size="small"
            value={value ?? ''}
            disabled={disabled}
            sx={{ width: 90 }}
            inputProps={{ min: 0, style: { textAlign: 'center' } }}
            onChange={e => setExtra(field, e.target.value !== '' ? +e.target.value : undefined)}
          />
        ))}
        <Box sx={{ ml: 1, pl: 1.5, borderLeft: '2px solid', borderColor: 'divider' }}>
          <Typography variant="body2" fontWeight={700}>
            Total extras: {totalExtras}
          </Typography>
          {bowlerWides > 0 && (card.wides == null) && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Wides auto-filled from bowling ({bowlerWides})
            </Typography>
          )}
          {bowlerNoBalls > 0 && (card.noBalls == null) && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              No Balls auto-filled from bowling ({bowlerNoBalls})
            </Typography>
          )}
        </Box>
      </Box>

      {/* Totals strip */}
      {(batting.length > 0 || totalExtras > 0) && (
        <Box sx={{ mt: 1.5, pl: 0.5, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Total: {totalScore}</strong>
            {` (bat ${totalRuns} + extras ${totalExtras})`}
          </Typography>
          {totalFours > 0 && (
            <Typography variant="caption" color="text.secondary">4s: {totalFours}</Typography>
          )}
          {totalSixes > 0 && (
            <Typography variant="caption" color="text.secondary">6s: {totalSixes}</Typography>
          )}
        </Box>
      )}

      {/* ── Bowling ── */}
      <Typography variant="overline" color="text.secondary" sx={{ mt: 3, display: 'block', fontWeight: 700, letterSpacing: 1 }}>
        Bowling
      </Typography>
      <Box sx={{ mt: 0.5 }}>
        <BowlingTable
          entries={bowling}
          bowlerOptions={bowlerOptions}
          disabled={disabled}
          onChange={entries => updateCard({ bowling: entries })}
        />
      </Box>
    </Paper>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────

export interface ScorecardCaptureTabProps {
  firstInningsLabel: string;
  secondInningsLabel: string;
  firstCard: TeamScorecard;
  secondCard: TeamScorecard;
  firstBatterOptions: Player[];
  firstBowlerOptions: Player[];
  secondBatterOptions: Player[];
  secondBowlerOptions: Player[];
  disabled: boolean;
  onFirstCardChange: (card: TeamScorecard) => void;
  onSecondCardChange: (card: TeamScorecard) => void;
}

const ScorecardCaptureTab: React.FC<ScorecardCaptureTabProps> = ({
  firstInningsLabel, secondInningsLabel,
  firstCard, secondCard,
  firstBatterOptions, firstBowlerOptions,
  secondBatterOptions, secondBowlerOptions,
  disabled,
  onFirstCardChange, onSecondCardChange,
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <InningsScorecardSection
      label={firstInningsLabel}
      card={firstCard}
      batterOptions={firstBatterOptions}
      bowlerOptions={firstBowlerOptions}
      disabled={disabled}
      onChange={onFirstCardChange}
      accentColor="success"
    />
    <InningsScorecardSection
      label={secondInningsLabel}
      card={secondCard}
      batterOptions={secondBatterOptions}
      bowlerOptions={secondBowlerOptions}
      disabled={disabled}
      onChange={onSecondCardChange}
      accentColor="primary"
    />
  </Box>
);

export default ScorecardCaptureTab;
