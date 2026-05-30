import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, Chip, Avatar, Divider, Stack,
  Card, CardContent, useTheme, useMediaQuery, IconButton, Tooltip,
} from '@mui/material';
import {
  EmojiEvents, CalendarMonth, AccessTime, LocationOn, SportsCricket,
  PictureAsPdf,
} from '@mui/icons-material';
import { matchApi } from '../api/matchApi';
import { tournamentApi } from '../api/tournamentApi';
import { Match } from '../types';
import { generateMatchPdf, generateTournamentSchedulePdf } from '../utils/matchPdf';
import { PdfPreviewDialog } from '../components/PdfPreviewDialog';

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtTime = (t?: string) => {
  if (!t) return null;
  return t.substring(0, 5);
};

const sortKey = (m: Match) =>
  `${m.matchDate ?? '9999-12-31'}T${m.scheduledStartTime ?? '99:99:99'}`;

interface TournamentGroup {
  tournamentId: number | null;
  tournamentName: string;
  matches: Match[];
  earliestDate: string;
}

const groupByTournament = (matches: Match[]): TournamentGroup[] => {
  const map = new Map<string, TournamentGroup>();

  for (const m of matches) {
    const key = m.tournamentId != null ? String(m.tournamentId) : '__none__';
    if (!map.has(key)) {
      map.set(key, {
        tournamentId: m.tournamentId ?? null,
        tournamentName: m.tournamentName ?? 'Friendlies / No Tournament',
        matches: [],
        earliestDate: sortKey(m),
      });
    }
    const group = map.get(key)!;
    group.matches.push(m);
    if (sortKey(m) < group.earliestDate) group.earliestDate = sortKey(m);
  }

  for (const group of map.values()) {
    group.matches.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }

  const isMatchFinal = (m: Match) =>
    !!(m.matchCompleted || m.forfeited || m.noResult || m.matchDrawn);

  return [...map.values()]
    .filter(g => g.matches.some(m => !isMatchFinal(m)))
    .sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));
};

const MatchRow: React.FC<{ match: Match; onPrint: (m: Match) => void; printing: boolean }> = ({ match: m, onPrint, printing }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>

          {/* Teams */}
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar src={m.homeTeamLogoUrl} sx={{ width: 28, height: 28, fontSize: 13 }}>
                {m.homeTeamName?.charAt(0)}
              </Avatar>
              <Typography variant="body2" fontWeight="bold" noWrap>
                {m.homeTeamAbbreviation ?? m.homeTeamName ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">vs</Typography>
              <Avatar src={m.oppositionTeamLogoUrl} sx={{ width: 28, height: 28, fontSize: 13 }}>
                {m.oppositionTeamName?.charAt(0)}
              </Avatar>
              <Typography variant="body2" fontWeight="bold" noWrap>
                {m.oppositionTeamAbbreviation ?? m.oppositionTeamName ?? '—'}
              </Typography>
            </Stack>
          </Box>

          {/* Meta */}
          <Stack direction={isMobile ? 'column' : 'row'} spacing={1} alignItems={{ sm: 'center' }} flexShrink={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarMonth sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption">{fmtDate(m.matchDate)}</Typography>
            </Box>

            {fmtTime(m.scheduledStartTime) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption">{fmtTime(m.scheduledStartTime)}</Typography>
              </Box>
            )}

            {m.fieldName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {m.fieldIconUrl
                  ? <Avatar src={m.fieldIconUrl} variant="rounded" sx={{ width: 14, height: 14 }} />
                  : <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />}
                <Typography variant="caption" noWrap sx={{ maxWidth: 160 }}>{m.fieldName}</Typography>
              </Box>
            )}

            {m.matchStage && (
              <Chip label={STAGE_LABELS[m.matchStage] ?? m.matchStage} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            )}

            <Tooltip title="Print match card">
              <span>
                <IconButton
                  size="small"
                  onClick={() => onPrint(m)}
                  disabled={printing}
                  sx={{ color: 'text.secondary' }}
                >
                  {printing ? <CircularProgress size={16} /> : <PictureAsPdf fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const GameSchedule: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [printingTournament, setPrintingTournament] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    matchApi.getMySchedule()
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = async (m: Match) => {
    if (!m.matchId) return;
    setPrintingId(m.matchId);
    try { setPdfUrl(await generateMatchPdf(m)); }
    finally { setPrintingId(null); }
  };

  const handlePrintTournament = async (group: TournamentGroup) => {
    setPrintingTournament(group.tournamentName);
    try {
      const logoUrl = group.tournamentId
        ? await tournamentApi.findById(group.tournamentId).then(t => t.logoUrl).catch(() => undefined)
        : undefined;
      setPdfUrl(await generateTournamentSchedulePdf(group.tournamentName, group.matches, undefined, logoUrl));
    } finally {
      setPrintingTournament(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (matches.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 8 }}>
        <SportsCricket sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography color="text.secondary">You have not been added to any match squads yet.</Typography>
      </Box>
    );
  }

  const groups = groupByTournament(matches);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <SportsCricket color="primary" />
        <Typography variant="h5">Game Schedule</Typography>
        <Chip label={`${matches.length} match${matches.length !== 1 ? 'es' : ''}`} size="small" variant="outlined" sx={{ ml: 1 }} />
      </Box>

      {groups.map((group, i) => (
        <Box key={group.tournamentId ?? '__none__'} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <EmojiEvents color="action" fontSize="small" />
            <Typography variant="subtitle1" fontWeight="bold">
              {group.tournamentName}
            </Typography>
            <Chip label={group.matches.length} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            <Tooltip title="Print schedule for this tournament">
              <span>
                <IconButton
                  size="small"
                  onClick={() => handlePrintTournament(group)}
                  disabled={printingTournament === group.tournamentName}
                  sx={{ color: 'text.secondary', ml: 0.5 }}
                >
                  {printingTournament === group.tournamentName
                    ? <CircularProgress size={15} />
                    : <PictureAsPdf fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          {group.matches.map(m => (
            <MatchRow
              key={m.matchId}
              match={m}
              onPrint={handlePrint}
              printing={printingId === m.matchId}
            />
          ))}

          {i < groups.length - 1 && <Divider sx={{ mt: 2 }} />}
        </Box>
      ))}

      <PdfPreviewDialog pdfUrl={pdfUrl} onClose={() => setPdfUrl(null)} />
    </Box>
  );
};
