import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, CircularProgress, Chip, Divider,
  TextField, MenuItem, Accordion, AccordionSummary, AccordionDetails, Button,
} from '@mui/material';
import { ExpandMore, PictureAsPdf } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { paymentApi } from '../../api/paymentApi';
import { playerApi } from '../../api/playerApi';
import { matchApi } from '../../api/matchApi';
import { tournamentApi } from '../../api/tournamentApi';
import { Payment, PlayerResult, Match, Tournament } from '../../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);

const CATEGORY_LABELS: Record<string, string> = {
  TOURNAMENT_FEE: 'Tournament Fee',
  TOURNAMENT_REGISTRATION: 'Tournament Registration',
  ANNUAL_SUBSCRIPTION: 'Annual Subscription',
  SPONSORSHIP: 'Sponsorship',
  AD_HOC: 'Ad Hoc',
  OTHER: 'Other',
};

const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

// ─── types ────────────────────────────────────────────────────────────────────

interface TournamentGroup {
  tournamentId: number | null;
  tournamentName: string;
  payments: Payment[];
  matchCount: number;
}

interface CategoryGroup {
  category: string;
  payments: Payment[];
}

interface PlayerRow {
  playerId: number;
  playerName: string;
  tournaments: TournamentGroup[];
  otherCategories: CategoryGroup[];
  total: number;
}

interface SponsorRow {
  sponsorId: number;
  sponsorName: string;
  categories: CategoryGroup[];
  total: number;
}

// ─── component ────────────────────────────────────────────────────────────────

export const Reports: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [matchMap, setMatchMap] = useState<Map<number, number>>(new Map());
  const [playerStats, setPlayerStats] = useState<Map<number, PlayerResult[]>>(new Map());
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<string>(String(currentYear));
  const [statusFilter, setStatusFilter] = useState('APPROVED');
  const [tournamentFilter, setTournamentFilter] = useState<string>('');

  useEffect(() => {
    tournamentApi.findAll().then(setTournaments);
  }, []);

  useEffect(() => {
    setLoading(true);
    const filters: Parameters<typeof paymentApi.findAll>[0] = {};
    if (year) filters.year = parseInt(year, 10);
    if (statusFilter) filters.status = statusFilter;
    if (tournamentFilter) filters.tournamentId = parseInt(tournamentFilter, 10);

    Promise.all([
      paymentApi.findAll(filters),
      matchApi.findAll(),
    ]).then(([pmts, matches]) => {
      setPayments(pmts);

      const mm = new Map<number, number>();
      matches.forEach((m: Match) => {
        if (m.matchId && m.tournamentId) mm.set(m.matchId, m.tournamentId);
      });
      setMatchMap(mm);

      const playerIds = [
        ...new Set(
          pmts
            .filter(p => p.paymentType === 'PLAYER' && p.playerId != null)
            .map(p => p.playerId!),
        ),
      ];

      Promise.all(
        playerIds.map(id =>
          playerApi
            .getStatistics(id)
            .then(stats => [id, stats] as [number, PlayerResult[]])
            .catch(() => [id, []] as [number, PlayerResult[]]),
        ),
      ).then(results => {
        const sm = new Map<number, PlayerResult[]>();
        results.forEach(([id, stats]) => sm.set(id, stats));
        setPlayerStats(sm);
        setLoading(false);
      });
    }).catch(() => setLoading(false));
  }, [year, statusFilter, tournamentFilter]);

  // ── derived data ────────────────────────────────────────────────────────────

  const playerRows = useMemo<PlayerRow[]>(() => {
    const playerPayments = payments.filter(p => p.paymentType === 'PLAYER' && p.playerId != null);

    const byPlayer = new Map<number, { playerName: string; payments: Payment[] }>();
    playerPayments.forEach(p => {
      if (!byPlayer.has(p.playerId!)) {
        byPlayer.set(p.playerId!, { playerName: p.playerName ?? `Player ${p.playerId}`, payments: [] });
      }
      byPlayer.get(p.playerId!)!.payments.push(p);
    });

    return [...byPlayer.entries()]
      .sort((a, b) => a[1].playerName.localeCompare(b[1].playerName))
      .map(([playerId, { playerName, payments: pp }]) => {
        const stats = playerStats.get(playerId) ?? [];

        // Separate tournament-related payments from other categories
        const tournamentPayments = pp.filter(
          p => p.paymentCategory === 'TOURNAMENT_FEE' || p.paymentCategory === 'TOURNAMENT_REGISTRATION',
        );
        const otherPayments = pp.filter(
          p => p.paymentCategory !== 'TOURNAMENT_FEE' && p.paymentCategory !== 'TOURNAMENT_REGISTRATION',
        );

        // Group tournament payments by tournament
        const byTournament = new Map<number | null, { tournamentName: string; payments: Payment[] }>();
        tournamentPayments.forEach(p => {
          const tid = p.tournamentId ?? null;
          if (!byTournament.has(tid)) {
            byTournament.set(tid, {
              tournamentName: p.tournamentName ?? (tid != null ? `Tournament ${tid}` : 'Unknown Tournament'),
              payments: [],
            });
          }
          byTournament.get(tid)!.payments.push(p);
        });

        const tournaments: TournamentGroup[] = [...byTournament.entries()].map(([tid, { tournamentName, payments: tp }]) => {
          const matchCount = tid != null
            ? stats.filter(r => r.matchId != null && matchMap.get(r.matchId!) === tid).length
            : 0;
          return { tournamentId: tid, tournamentName, payments: tp, matchCount };
        });

        // Group other payments by category
        const byCat = new Map<string, Payment[]>();
        otherPayments.forEach(p => {
          const cat = p.paymentCategory ?? 'OTHER';
          if (!byCat.has(cat)) byCat.set(cat, []);
          byCat.get(cat)!.push(p);
        });
        const otherCategories: CategoryGroup[] = [...byCat.entries()].map(([category, catPayments]) => ({
          category,
          payments: catPayments,
        }));

        const total = pp.reduce((s, p) => s + Number(p.amount), 0);
        return { playerId, playerName, tournaments, otherCategories, total };
      });
  }, [payments, playerStats, matchMap]);

  const sponsorRows = useMemo<SponsorRow[]>(() => {
    const sponsorPayments = payments.filter(p => p.paymentType === 'SPONSOR' && p.sponsorId != null);

    const bySponsor = new Map<number, { sponsorName: string; payments: Payment[] }>();
    sponsorPayments.forEach(p => {
      if (!bySponsor.has(p.sponsorId!)) {
        bySponsor.set(p.sponsorId!, { sponsorName: p.sponsorName ?? `Sponsor ${p.sponsorId}`, payments: [] });
      }
      bySponsor.get(p.sponsorId!)!.payments.push(p);
    });

    return [...bySponsor.entries()]
      .sort((a, b) => a[1].sponsorName.localeCompare(b[1].sponsorName))
      .map(([sponsorId, { sponsorName, payments: sp }]) => {
        const byCat = new Map<string, Payment[]>();
        sp.forEach(p => {
          const cat = p.paymentCategory ?? 'SPONSORSHIP';
          if (!byCat.has(cat)) byCat.set(cat, []);
          byCat.get(cat)!.push(p);
        });
        const categories: CategoryGroup[] = [...byCat.entries()].map(([category, catPayments]) => ({
          category,
          payments: catPayments,
        }));
        const total = sp.reduce((s, p) => s + Number(p.amount), 0);
        return { sponsorId, sponsorName, categories, total };
      });
  }, [payments]);

  const grandTotal = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments]);

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // ── PDF export ──────────────────────────────────────────────────────────────

  const generatePdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const now = new Date().toLocaleString('en-ZA');

    const selectedTournament = tournaments.find(t => String(t.tournamentId) === tournamentFilter);
    const filterLine = [
      year ? `Year: ${year}` : 'All Years',
      selectedTournament ? `Tournament: ${selectedTournament.name}` : 'All Tournaments',
      statusFilter ? `Status: ${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}` : 'All Statuses',
    ].join('   |   ');

    const addPageNumbers = () => {
      const pg = doc.getCurrentPageInfo().pageNumber;
      const total = (doc.internal as any).pages?.length - 1 || pg;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${pg} of ${total}`, pageW - 14, pageH - 6, { align: 'right' });
      doc.text('Cricket Legend — Confidential', 14, pageH - 6);
    };

    // ── Header ──────────────────────────────────────────────────────────────
    doc.setFillColor(26, 82, 118);
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Cricket Legend', 14, 10);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Financial Report', 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated: ${now}`, pageW - 14, 18, { align: 'right' });

    // ── Filter line ──────────────────────────────────────────────────────────
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text(filterLine, 14, 30);

    // ── Summary boxes ────────────────────────────────────────────────────────
    doc.setTextColor(0, 0, 0);
    const summaryY = 34;
    const margin = 14;
    const numBoxes = 5;
    const gap = 5;
    const boxW = (pageW - margin * 2 - gap * (numBoxes - 1)) / numBoxes;
    const playerTotal = playerRows.reduce((s, r) => s + r.total, 0);
    const sponsorTotal = sponsorRows.reduce((s, r) => s + r.total, 0);
    const boxes = [
      { label: 'Players', value: String(playerRows.length) },
      { label: 'Sponsors', value: String(sponsorRows.length) },
      { label: 'Player Contributions', value: fmt(playerTotal) },
      { label: 'Sponsor Contributions', value: fmt(sponsorTotal) },
      { label: 'Grand Total', value: fmt(grandTotal) },
    ];
    boxes.forEach((b, i) => {
      const x = margin + i * (boxW + gap);
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 248, 250);
      doc.roundedRect(x, summaryY, boxW, 18, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(b.label, x + 4, summaryY + 6);
      doc.setFontSize(i === 4 ? 13 : 11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(i === 4 ? 26 : 30, i === 4 ? 82 : 80, i === 4 ? 118 : 80);
      doc.text(b.value, x + 4, summaryY + 14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
    });

    let startY = summaryY + 26;

    // ── Player Contributions ─────────────────────────────────────────────────
    if (playerRows.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 82, 118);
      doc.text('Player Contributions', 14, startY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      startY += 4;

      const playerTableRows: (string | { content: string; styles: object })[][] = [];
      playerRows.forEach(row => {
        row.tournaments.forEach(tg => {
          const cats = tg.payments
            .map(p => CATEGORY_LABELS[p.paymentCategory ?? ''] ?? p.paymentCategory ?? '')
            .join(', ');
          playerTableRows.push([
            row.playerName,
            `${tg.tournamentName}\n${cats}`,
            String(tg.payments.length),
            tg.matchCount > 0 ? String(tg.matchCount) : '—',
            fmt(tg.payments.reduce((s, p) => s + Number(p.amount), 0)),
          ]);
        });
        row.otherCategories.forEach(cg => {
          playerTableRows.push([
            row.playerName,
            CATEGORY_LABELS[cg.category] ?? cg.category,
            String(cg.payments.length),
            '—',
            fmt(cg.payments.reduce((s, p) => s + Number(p.amount), 0)),
          ]);
        });
        // Subtotal row per player
        playerTableRows.push([
          { content: `${row.playerName} — Total`, styles: { fontStyle: 'bold', fillColor: [232, 240, 248] } },
          { content: '', styles: { fillColor: [232, 240, 248] } },
          { content: '', styles: { fillColor: [232, 240, 248] } },
          { content: '', styles: { fillColor: [232, 240, 248] } },
          { content: fmt(row.total), styles: { fontStyle: 'bold', halign: 'right', fillColor: [232, 240, 248] } },
        ]);
      });

      autoTable(doc, {
        startY,
        head: [['Player', 'Category / Tournament', 'Payments', 'Matches', 'Total']],
        body: playerTableRows,
        foot: [['', '', '', 'Player Total', fmt(playerTotal)]],
        headStyles: { fillColor: [26, 82, 118], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        footStyles: { fillColor: [220, 230, 242], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'right', fontStyle: 'bold' },
        },
        styles: { overflow: 'linebreak', cellPadding: 2 },
        didDrawPage: addPageNumbers,
      });

      startY = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Sponsor Contributions ────────────────────────────────────────────────
    if (sponsorRows.length > 0) {
      // Start a new page if less than 60mm remaining
      if (startY > pageH - 60) {
        doc.addPage();
        startY = 14;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 82, 118);
      doc.text('Sponsor Contributions', 14, startY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      startY += 4;

      const sponsorTableRows: (string | { content: string; styles: object })[][] = [];
      sponsorRows.forEach(row => {
        row.categories.forEach(cg => {
          sponsorTableRows.push([
            row.sponsorName,
            CATEGORY_LABELS[cg.category] ?? cg.category,
            String(cg.payments.length),
            fmt(cg.payments.reduce((s, p) => s + Number(p.amount), 0)),
          ]);
        });
        sponsorTableRows.push([
          { content: `${row.sponsorName} — Total`, styles: { fontStyle: 'bold', fillColor: [232, 240, 248] } },
          { content: '', styles: { fillColor: [232, 240, 248] } },
          { content: '', styles: { fillColor: [232, 240, 248] } },
          { content: fmt(row.total), styles: { fontStyle: 'bold', halign: 'right', fillColor: [232, 240, 248] } },
        ]);
      });

      autoTable(doc, {
        startY,
        head: [['Sponsor', 'Category', 'Payments', 'Total']],
        body: sponsorTableRows,
        foot: [['', '', 'Sponsor Total', fmt(sponsorTotal)]],
        headStyles: { fillColor: [26, 82, 118], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        footStyles: { fillColor: [220, 230, 242], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          2: { halign: 'center' },
          3: { halign: 'right', fontStyle: 'bold' },
        },
        styles: { overflow: 'linebreak', cellPadding: 2 },
        didDrawPage: addPageNumbers,
      });

      startY = (doc as any).lastAutoTable.finalY + 6;
    }

    // ── Grand total bar ──────────────────────────────────────────────────────
    if (startY > pageH - 20) {
      doc.addPage();
      startY = 14;
    }
    doc.setFillColor(26, 82, 118);
    doc.roundedRect(14, startY, pageW - 28, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Grand Total', 20, startY + 8);
    doc.text(fmt(grandTotal), pageW - 20, startY + 8, { align: 'right' });

    addPageNumbers();
    doc.save(`financial-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Financial Reports</Typography>
        <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={generatePdf} disabled={payments.length === 0}>
          Download PDF
        </Button>
        <TextField
          select
          size="small"
          label="Year"
          value={year}
          onChange={e => setYear(e.target.value)}
          sx={{ minWidth: 100 }}
        >
          <MenuItem value="">All Years</MenuItem>
          {yearOptions.map(y => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Tournament"
          value={tournamentFilter}
          onChange={e => setTournamentFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All Tournaments</MenuItem>
          {tournaments
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(t => <MenuItem key={t.tournamentId} value={String(t.tournamentId)}>{t.name}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          {STATUS_OPTS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Box>

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Chip label={`Players: ${playerRows.length}`} variant="outlined" />
        <Chip label={`Sponsors: ${sponsorRows.length}`} variant="outlined" />
        <Chip label={`Total Payments: ${payments.length}`} variant="outlined" />
        <Chip label={`Grand Total: ${fmt(grandTotal)}`} color="primary" />
      </Box>

      {/* ── Player Contributions ───────────────────────────────────────────── */}
      <Typography variant="h6" sx={{ mb: 1 }}>Player Contributions</Typography>
      {playerRows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>No player payments found.</Typography>
      ) : (
        <Box sx={{ mb: 4 }}>
          {playerRows.map(row => (
            <Accordion key={row.playerId} disableGutters variant="outlined" sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2, gap: 2 }}>
                  <Typography fontWeight="bold" sx={{ flexGrow: 1 }}>{row.playerName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {row.tournaments.length + row.otherCategories.length} line{row.tournaments.length + row.otherCategories.length !== 1 ? 's' : ''}
                  </Typography>
                  <Typography fontWeight="bold">{fmt(row.total)}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer>
                  <Table size="small" sx={{
                    '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Category / Tournament</TableCell>
                        <TableCell align="center">Payments</TableCell>
                        <TableCell align="center">Matches Played</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {row.tournaments.map((tg, i) => (
                        <TableRow key={`t-${i}`} sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">{tg.tournamentName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {tg.payments.map(p => CATEGORY_LABELS[p.paymentCategory ?? ''] ?? p.paymentCategory).join(', ')}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">{tg.payments.length}</TableCell>
                          <TableCell align="center">
                            {tg.matchCount > 0
                              ? <Chip label={tg.matchCount} size="small" color="info" />
                              : <Typography variant="body2" color="text.secondary">—</Typography>}
                          </TableCell>
                          <TableCell align="right">
                            {fmt(tg.payments.reduce((s, p) => s + Number(p.amount), 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                      {row.otherCategories.map((cg, i) => (
                        <TableRow key={`c-${i}`} sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}>
                          <TableCell>{CATEGORY_LABELS[cg.category] ?? cg.category}</TableCell>
                          <TableCell align="center">{cg.payments.length}</TableCell>
                          <TableCell align="center">—</TableCell>
                          <TableCell align="right">
                            {fmt(cg.payments.reduce((s, p) => s + Number(p.amount), 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell colSpan={3}><strong>Total</strong></TableCell>
                        <TableCell align="right"><strong>{fmt(row.total)}</strong></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}

          {/* Player totals summary */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Total Player Contributions</Typography>
              <Typography fontWeight="bold">
                {fmt(playerRows.reduce((s, r) => s + r.total, 0))}
              </Typography>
            </Box>
          </Paper>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* ── Sponsor Contributions ──────────────────────────────────────────── */}
      <Typography variant="h6" sx={{ mb: 1 }}>Sponsor Contributions</Typography>
      {sponsorRows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>No sponsor payments found.</Typography>
      ) : (
        <Box sx={{ mb: 4 }}>
          {sponsorRows.map(row => (
            <Accordion key={row.sponsorId} disableGutters variant="outlined" sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2, gap: 2 }}>
                  <Typography fontWeight="bold" sx={{ flexGrow: 1 }}>{row.sponsorName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {row.categories.length} categor{row.categories.length !== 1 ? 'ies' : 'y'}
                  </Typography>
                  <Typography fontWeight="bold">{fmt(row.total)}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer>
                  <Table size="small" sx={{
                    '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Category</TableCell>
                        <TableCell align="center">Payments</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {row.categories.map((cg, i) => (
                        <TableRow key={i} sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}>
                          <TableCell>{CATEGORY_LABELS[cg.category] ?? cg.category}</TableCell>
                          <TableCell align="center">{cg.payments.length}</TableCell>
                          <TableCell align="right">
                            {fmt(cg.payments.reduce((s, p) => s + Number(p.amount), 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell colSpan={2}><strong>Total</strong></TableCell>
                        <TableCell align="right"><strong>{fmt(row.total)}</strong></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}

          {/* Sponsor totals summary */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Total Sponsor Contributions</Typography>
              <Typography fontWeight="bold">
                {fmt(sponsorRows.reduce((s, r) => s + r.total, 0))}
              </Typography>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Grand total */}
      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography fontWeight="bold">Grand Total</Typography>
          <Typography fontWeight="bold">{fmt(grandTotal)}</Typography>
        </Box>
      </Paper>
    </Box>
  );
};
