import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar, Box, Button, Chip, CircularProgress, Container, Divider,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography,
} from '@mui/material';
import {
  ArrowBack, CalendarMonth, CheckCircle, EmojiEvents, FiberManualRecord,
  LocationOn, PictureAsPdf,
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { matchApi } from '../../api/matchApi';
import { tournamentApi } from '../../api/tournamentApi';
import { Match, MatchResultSummary, Tournament } from '../../types';

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendlies', POOL: 'Pool Matches', QUARTER_FINAL: 'Quarter-Finals', SEMI_FINAL: 'Semi-Finals', FINAL: 'Final',
};
const STAGE_ORDER = ['FRIENDLY', 'POOL', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'];

const fmtDate = (d?: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtTime = (t?: string) => (t ? t.slice(0, 5) : '—');

export const TournamentSchedule: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const id = Number(tournamentId);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<MatchResultSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      tournamentApi.findById(id),
      matchApi.findByTournament(id),
      matchApi.findResultsByTournament(id),
    ])
      .then(([t, ms, rs]) => {
        setTournament(t);
        setMatches(
          [...ms].sort((a, b) => {
            const dc = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
            return dc !== 0 ? dc : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
          }),
        );
        setResults(rs);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const resultMap = useMemo(() => new Map(results.map(r => [r.matchId, r])), [results]);

  const groups = useMemo(() => {
    const hasStages = matches.some(m => m.matchStage != null);
    if (!hasStages) return [{ label: 'Fixture List', matches }];
    return STAGE_ORDER
      .map(s => ({ label: STAGE_LABELS[s] ?? s, matches: matches.filter(m => m.matchStage === s) }))
      .filter(g => g.matches.length > 0);
  }, [matches]);

  const generatePdf = () => {
    if (!tournament) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const stampFooters = () => {
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${i} of ${n}`, pageW - 14, pageH - 6, { align: 'right' });
        doc.text('Cricket Legend — Confidential', 14, pageH - 6);
      }
    };

    // Header
    doc.setFillColor(26, 82, 118);
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(tournament.name, 14, 10);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Tournament Schedule', 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-ZA')}`, pageW - 14, 18, { align: 'right' });

    const info = [
      tournament.cricketFormat,
      [tournament.startDate, tournament.endDate].filter(Boolean).join(' – '),
      `${matches.length} match${matches.length !== 1 ? 'es' : ''}`,
    ].filter(Boolean).join('   |   ');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text(info, 14, 30);

    let y = 36;
    for (const group of groups) {
      if (y > pageH - 60) { doc.addPage(); y = 14; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 82, 118);
      doc.text(group.label, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Time', 'Home Team', 'vs', 'Away Team', 'Venue', 'Result']],
        body: group.matches.map(m => {
          const r = m.matchId != null ? resultMap.get(m.matchId) : undefined;
          const result = r
            ? r.matchDrawn ? 'Draw' : r.winningTeamName ? `${r.winningTeamName} won` : 'Completed'
            : 'Upcoming';
          return [fmtDate(m.matchDate), fmtTime(m.scheduledStartTime), m.homeTeamName ?? '—', 'vs', m.oppositionTeamName ?? '—', m.fieldName ?? '—', result];
        }),
        headStyles: { fillColor: [26, 82, 118], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 3: { halign: 'center', fontStyle: 'bold' }, 6: { halign: 'center' } },
        styles: { overflow: 'linebreak', cellPadding: 2 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
    }

    stampFooters();
    doc.save(`schedule-${tournament.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }
  if (!tournament) {
    return <Typography textAlign="center" mt={6} color="text.secondary">Tournament not found.</Typography>;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const isLive = !!tournament.startDate && tournament.startDate <= todayStr
    && (!tournament.endDate || tournament.endDate >= todayStr);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} variant="outlined" size="small">
            Back
          </Button>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Avatar src={tournament.logoUrl} variant="rounded" sx={{ width: 52, height: 52 }}>
                {tournament.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{tournament.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                  {tournament.cricketFormat && <Chip label={tournament.cricketFormat} size="small" />}
                  {isLive && (
                    <Chip
                      icon={<FiberManualRecord sx={{ fontSize: '10px !important' }} />}
                      label="LIVE"
                      size="small"
                      sx={{ bgcolor: '#e53935', color: 'white', '& .MuiChip-icon': { color: 'white' } }}
                    />
                  )}
                  {tournament.startDate && (
                    <Chip
                      icon={<CalendarMonth sx={{ fontSize: '14px !important' }} />}
                      label={tournament.endDate ? `${tournament.startDate} – ${tournament.endDate}` : tournament.startDate}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  <Chip label={`${matches.length} match${matches.length !== 1 ? 'es' : ''}`} size="small" variant="outlined" />
                </Box>
              </Box>
            </Box>
            {tournament.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{tournament.description}</Typography>
            )}
          </Box>

          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={generatePdf}
            disabled={matches.length === 0}
          >
            Export PDF
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Schedule */}
        {matches.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <EmojiEvents sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No matches have been scheduled yet.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {groups.map(group => (
              <Box key={group.label}>
                <Typography variant="h6" fontWeight="bold" color="primary" sx={{ mb: 1.5 }}>
                  {group.label}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small" sx={{
                    '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
                    '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
                    '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Home Team</TableCell>
                        <TableCell align="center">vs</TableCell>
                        <TableCell>Away Team</TableCell>
                        <TableCell>Venue</TableCell>
                        <TableCell align="center">Result</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.matches.map(m => {
                        const r = m.matchId != null ? resultMap.get(m.matchId) : undefined;
                        const homeWon = r && !r.matchDrawn && r.winningTeamName === m.homeTeamName;
                        const awayWon = r && !r.matchDrawn && r.winningTeamName === m.oppositionTeamName;
                        return (
                          <TableRow key={m.matchId}>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <Typography variant="body2">{fmtDate(m.matchDate)}</Typography>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <Typography variant="body2">{fmtTime(m.scheduledStartTime)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar src={m.homeTeamLogoUrl} sx={{ width: 24, height: 24, fontSize: 11 }}>
                                  {m.homeTeamName?.charAt(0)}
                                </Avatar>
                                <Typography variant="body2" fontWeight={homeWon ? 'bold' : 'normal'}>
                                  {m.homeTeamName}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" color="text.secondary" fontWeight="bold">vs</Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar src={m.oppositionTeamLogoUrl} sx={{ width: 24, height: 24, fontSize: 11 }}>
                                  {m.oppositionTeamName?.charAt(0)}
                                </Avatar>
                                <Typography variant="body2" fontWeight={awayWon ? 'bold' : 'normal'}>
                                  {m.oppositionTeamName}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {m.fieldName ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <LocationOn sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                                  <Typography
                                    variant="body2"
                                    component={m.fieldGoogleMapsUrl ? 'a' : 'span'}
                                    href={m.fieldGoogleMapsUrl ?? undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={m.fieldGoogleMapsUrl
                                      ? { color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }
                                      : {}}
                                  >
                                    {m.fieldName}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">—</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {r ? (
                                r.matchDrawn
                                  ? <Chip label="Draw" size="small" variant="outlined" />
                                  : <Chip
                                      icon={<CheckCircle sx={{ fontSize: '14px !important' }} />}
                                      label={r.winningTeamName ?? 'Completed'}
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                    />
                              ) : (
                                <Chip label="Upcoming" size="small" color="primary" variant="outlined" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
};
