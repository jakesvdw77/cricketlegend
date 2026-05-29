import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog,
  DialogContent, DialogActions, DialogTitle, TextField, MenuItem, Chip, Autocomplete,
  Avatar, CircularProgress, Divider, InputAdornment, TableSortLabel,
  TablePagination, Popover, FormGroup, Checkbox, FormControlLabel,
  Tabs, Tab, Tooltip, useMediaQuery, useTheme, Link, ListSubheader,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { Add, ArrowBack, Edit, Delete, CloudUpload, PictureAsPdf, Language, Facebook, Instagram, YouTube, AppRegistration, EmojiEvents, ViewColumn, ContentCopy, ReceiptLong, FilterList } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { tournamentApi } from '../../api/tournamentApi';
import { sponsorApi } from '../../api/sponsorApi';
import { teamApi } from '../../api/teamApi';
import { paymentApi } from '../../api/paymentApi';
import { matchApi } from '../../api/matchApi';
import { fieldApi } from '../../api/fieldApi';
import { Tournament, CricketFormat, Sponsor, Team, TournamentPool, AgeGroup, TournamentGender, Payment, Match, MatchResultSummary, Field } from '../../types';
import { DetailSection, DetailGrid, DetailField } from '../../components/admin/DetailView';
import { TournamentScheduleTab } from '../../components/admin/TournamentScheduleTab';
import { MatchScheduleVisual } from '../../components/admin/MatchScheduleVisual';
import { TournamentGeneralInfoForm } from '../../components/admin/TournamentGeneralInfoForm';
import { TournamentPoolsForm, LocalPool, LocalPoolTeam } from '../../components/admin/TournamentPoolsForm';
import { TournamentSocialLinksForm } from '../../components/admin/TournamentSocialLinksForm';
import { MatchEditDialog } from '../../components/admin/MatchEditDialog';
import { PdfPreviewDialog } from '../../components/PdfPreviewDialog';
import { TeamsView } from '../view/TeamsView';

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

const VAT_RATE = 0.15;

const FORMATS: CricketFormat[] = ['T20', 'T30', 'T45', 'T50'];

const empty: Tournament = { name: '', pointsForWin: 2, pointsForDraw: 1, pointsForNoResult: 1, pointsForBonus: 1, showOnFrontPage: true, sponsors: [] };

const AGE_GROUP_LABEL: Record<string, string> = {
  UNDER_9: 'Under 9', UNDER_10: 'Under 10', UNDER_11: 'Under 11', UNDER_12: 'Under 12',
  UNDER_13: 'Under 13', UNDER_14: 'Under 14', UNDER_15: 'Under 15', UNDER_16: 'Under 16',
  UNDER_18: 'Under 18', UNDER_19: 'Under 19', OPEN: 'Open', VETERANS: 'Veterans',
  OVER_50: 'Over 50', OVER_60: 'Over 60',
};
const GENDER_LABEL: Record<string, string> = {
  MEN: 'Men', WOMEN: 'Women', BOYS: 'Boys', GIRLS: 'Girls',
};
const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', PLAYOFFS: 'Playoffs', ROUND_OF_16: 'Round of 16',
  QUARTER_FINAL: 'Quarter-Final', SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};
const formatCategory = (ageGroup?: string, gender?: string): string => {
  const g = gender ? GENDER_LABEL[gender] : '';
  const a = ageGroup ? AGE_GROUP_LABEL[ageGroup] : '';
  if (!g && !a) return '';
  if (a === 'Open') return `${g} Open`;
  if (a === 'Veterans') return `${g} Veterans`;
  if (a) return `${a} ${g}`;
  return g;
};

type ColKey = 'name' | 'category' | 'format' | 'startDate' | 'endDate' | 'pools' | 'winner' | 'sponsors' | 'links';
const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'name',      label: 'Name' },
  { key: 'category',  label: 'Category' },
  { key: 'format',    label: 'Format' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate',   label: 'End Date' },
  { key: 'winner',    label: 'Winner' },
  { key: 'pools',     label: 'Pools' },
  { key: 'sponsors',  label: 'Sponsors' },
  { key: 'links',     label: 'Links' },
];
const DEFAULT_VISIBLE = new Set<ColKey>(['name', 'category', 'format', 'startDate', 'endDate', 'pools', 'winner', 'sponsors', 'links']);
const MOBILE_VISIBLE = new Set<ColKey>(['name', 'category', 'format', 'pools', 'winner', 'links']);

export const Tournaments: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = useState<Tournament[]>([]);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterFormat, setFilterFormat] = useState<CricketFormat | ''>('');
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tournament>(empty);
  const [viewLogoUrl, setViewLogoUrl] = useState<string | null>(null);

  const [nameError, setNameError] = useState('');
  const [dateError, setDateError] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Pool management state
  const [localPools, setLocalPools] = useState<LocalPool[]>([]);
  const [originalPools, setOriginalPools] = useState<LocalPool[]>([]);
  const [newPoolName, setNewPoolName] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Column visibility state
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(isMobile ? MOBILE_VISIBLE : DEFAULT_VISIBLE));
  const [colAnchor, setColAnchor] = useState<HTMLButtonElement | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
  const [financialPdfUrl, setFinancialPdfUrl] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [viewItem, setViewItem] = useState<Tournament | null>(null);
  const [viewTab, setViewTab] = useState(0);
  const [viewScheduleKey, setViewScheduleKey] = useState(0);
  const [viewScheduleMode, setViewScheduleMode] = useState<'table' | 'visual'>('table');
  const [viewMatches, setViewMatches] = useState<Match[]>([]);
  const [viewResults, setViewResults] = useState<MatchResultSummary[]>([]);
  const [viewMatchesLoading, setViewMatchesLoading] = useState(false);
  const viewResultMap = useMemo(() => new Map(viewResults.map(r => [r.matchId, r])), [viewResults]);
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);

  // Schedule tab state
  const [tournamentMatches, setTournamentMatches] = useState<Match[]>([]);
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [matchFields, setMatchFields] = useState<Field[]>([]);

  const col = (key: ColKey) => isMobile ? key === 'name' : visibleCols.has(key);

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const load = () => tournamentApi.findAll().then(setRows);

  const loadViewMatches = (tournamentId: number) => {
    setViewMatchesLoading(true);
    Promise.all([
      matchApi.findByTournament(tournamentId),
      matchApi.findResultsByTournament(tournamentId),
    ]).then(([ms, rs]) => {
      setViewMatches([...ms].sort((a, b) => {
        const dc = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
        return dc !== 0 ? dc : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
      }));
      setViewResults(rs);
    }).finally(() => setViewMatchesLoading(false));
  };
  useEffect(() => {
    load();
    sponsorApi.findAll().then(setSponsors);
    teamApi.findAll().then(setAllTeams);
    fieldApi.findAll().then(setMatchFields);
  }, []);

  useEffect(() => {
    const viewTournamentId = (location.state as any)?.viewTournamentId;
    if (!viewTournamentId || rows.length === 0) return;
    const tournament = rows.find(r => r.tournamentId === viewTournamentId);
    if (tournament) { setViewItem(tournament); setViewing(true); setViewTab(2); setViewScheduleMode('table'); setViewMatches([]); setViewResults([]); }
  }, [rows, location.state]);

  const loadTournamentMatches = (tournamentId: number) =>
    matchApi.findByTournament(tournamentId).then(setTournamentMatches);

  const openDialog = (tournament: Tournament) => {
    setEditing(tournament);
    const pools: LocalPool[] = (tournament.pools ?? []).map(p => ({
      poolId: p.poolId,
      poolName: p.poolName,
      teams: (p.teams ?? []).map(t => ({
        teamId: t.teamId!,
        teamName: t.teamName!,
        tournamentTeamId: t.tournamentTeamId,
      })),
    }));
    setLocalPools(pools);
    setOriginalPools(JSON.parse(JSON.stringify(pools)));
    setNewPoolName('');
    setNameError('');
    setDateError('');
    setActiveTab(0);
    setTournamentMatches([]);
    if (tournament.tournamentId) {
      loadTournamentMatches(tournament.tournamentId);
    }
    setOpen(true);
  };

  const save = async () => {
    const duplicate = rows.find(r =>
      r.name.trim().toLowerCase() === editing.name.trim().toLowerCase() &&
      r.tournamentId !== editing.tournamentId
    );
    if (duplicate) {
      setNameError('A tournament with this name already exists.');
      setActiveTab(0);
      return;
    }
    setNameError('');

    if (editing.startDate && editing.endDate && editing.startDate > editing.endDate) {
      setDateError('Start date cannot be after end date.');
      setActiveTab(0);
      return;
    }
    setDateError('');

    try {
      let saved: Tournament;
      if (editing.tournamentId) {
        saved = await tournamentApi.update(editing.tournamentId, editing);
      } else {
        saved = await tournamentApi.create(editing);
      }
      const tournamentId = saved.tournamentId!;

      // Delete removed pools
      for (const orig of originalPools) {
        if (orig.poolId && !localPools.find(p => p.poolId === orig.poolId)) {
          await tournamentApi.deletePool(orig.poolId);
        }
      }

      // Sync each pool
      for (const pool of localPools) {
        let poolId = pool.poolId;

        if (!poolId) {
          const created = await tournamentApi.addPool(tournamentId, { poolName: pool.poolName } as TournamentPool);
          poolId = created.poolId!;
        }

        const origPool = originalPools.find(p => p.poolId === poolId);
        const origTeamIds = new Set(origPool?.teams.map(t => t.teamId) ?? []);
        const currTeamIds = new Set(pool.teams.map(t => t.teamId));

        for (const orig of origPool?.teams ?? []) {
          if (!currTeamIds.has(orig.teamId)) {
            await tournamentApi.removeTeamFromPool(poolId, orig.teamId);
          }
        }
        for (const team of pool.teams) {
          if (!origTeamIds.has(team.teamId)) {
            await tournamentApi.addTeamToPool(poolId, team.teamId);
          }
        }
      }
    } finally {
      setOpen(false);
      load();
    }
  };

  const remove = async (id: number) => {
    if (confirm('Delete this tournament?')) { await tournamentApi.delete(id); load(); }
  };

  const duplicate = (t: Tournament) => {
    const { tournamentId, pools, winningTeamId, winningTeamName, ...rest } = t;
    openDialog({ ...rest, name: `${t.name} (Copy)`, sponsors: [] });
  };

  const set = (patch: Partial<Tournament>) => setEditing(e => ({ ...e, ...patch }));

  const generateTournamentPdf = async (tournament: Tournament) => {
    if (!tournament.tournamentId) return;
    setGeneratingPdfId(tournament.tournamentId);
    try {
      const res = await paymentApi.findAll({ tournamentId: tournament.tournamentId, status: 'APPROVED', page: 0, size: 100000 });

      const sortByDateDesc = (a: Payment, b: Payment) => b.paymentDate.localeCompare(a.paymentDate);
      const playerPayments = res.content.filter(p => p.paymentType === 'PLAYER').sort(sortByDateDesc);
      const sponsorPayments = res.content.filter(p => p.paymentType === 'SPONSOR').sort(sortByDateDesc);

      const computeSectionTotals = (payments: Payment[]) => {
        let subtotal = 0, vatTotal = 0, grandTotal = 0;
        payments.forEach(p => {
          const amt = Number(p.amount);
          const base = p.vatInclusive ? amt * (1 - VAT_RATE) : amt;
          const vat = p.taxable ? amt * VAT_RATE : 0;
          subtotal += base;
          vatTotal += vat;
          grandTotal += p.vatInclusive ? amt : amt + vat;
        });
        return { subtotal, vatTotal, grandTotal };
      };

      const playerTotals = computeSectionTotals(playerPayments);
      const sponsorTotals = computeSectionTotals(sponsorPayments);
      const overallGrandTotal = playerTotals.grandTotal + sponsorTotals.grandTotal;

      const fmtBase = (p: Payment) => fmt(p.vatInclusive ? Number(p.amount) * (1 - VAT_RATE) : Number(p.amount));
      const fmtVat = (p: Payment) => p.taxable ? fmt(Number(p.amount) * VAT_RATE) : '—';
      const fmtTotal = (p: Payment) => {
        const amt = Number(p.amount);
        return fmt(p.vatInclusive ? amt : amt + (p.taxable ? amt * VAT_RATE : 0));
      };

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const now = new Date().toLocaleString('en-ZA');

      const stampFooters = () => {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.setFont('helvetica', 'normal');
          doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 6, { align: 'right' });
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
      doc.text('Tournament Financial Statement', 14, 18);
      doc.setFontSize(9);
      doc.text(`Generated: ${now}`, pageW - 14, 18, { align: 'right' });

      // Filter line
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Tournament: ${tournament.name}   |   Status: Approved`, 14, 30);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      // Summary boxes
      const summaryY = 34;
      const margin = 14;
      const totalVat = playerTotals.vatTotal + sponsorTotals.vatTotal;
      const numBoxes = 6;
      const gap = 4;
      const boxW = (pageW - margin * 2 - gap * (numBoxes - 1)) / numBoxes;
      const uniquePlayers = new Set(playerPayments.map(p => p.playerId)).size;
      const uniqueSponsors = new Set(sponsorPayments.map(p => p.sponsorId)).size;
      const boxes = [
        { label: 'Players', value: String(uniquePlayers), highlight: false },
        { label: 'Sponsors', value: String(uniqueSponsors), highlight: false },
        { label: 'Player Contributions', value: fmt(playerTotals.grandTotal), highlight: false },
        { label: 'Sponsor Contributions', value: fmt(sponsorTotals.grandTotal), highlight: false },
        { label: 'VAT (15%)', value: fmt(totalVat), highlight: false },
        { label: 'Grand Total', value: fmt(overallGrandTotal), highlight: true },
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
        doc.setFontSize(b.highlight ? 13 : 11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(b.highlight ? 26 : 30, b.highlight ? 82 : 80, b.highlight ? 118 : 80);
        doc.text(b.value, x + 4, summaryY + 14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
      });

      let startY = summaryY + 26;

      // Player Contributions
      if (playerPayments.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 82, 118);
        doc.text('Player Contributions', 14, startY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        startY += 4;

        autoTable(doc, {
          startY,
          head: [['Date', 'Player', 'Category', 'Description', 'Amount', 'VAT (15%)', 'Total']],
          body: playerPayments.map(p => [
            p.paymentDate,
            p.playerName ?? `Player ${p.playerId}`,
            CATEGORY_LABELS[p.paymentCategory ?? ''] ?? (p.paymentCategory ?? ''),
            p.description ?? '',
            fmtBase(p),
            fmtVat(p),
            fmtTotal(p),
          ]),
          foot: [
            ['', '', '', 'Subtotal', '', '', fmt(playerTotals.subtotal)],
            ['', '', '', 'VAT (15%)', '', '', fmt(playerTotals.vatTotal)],
            ['', '', '', 'Player Grand Total', '', '', fmt(playerTotals.grandTotal)],
          ],
          headStyles: { fillColor: [26, 82, 118], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          footStyles: { fillColor: [220, 230, 242], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right', fontStyle: 'bold' },
          },
          styles: { overflow: 'linebreak', cellPadding: 2 },
        });
        startY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Sponsor Contributions
      if (sponsorPayments.length > 0) {
        if (startY > pageH - 60) { doc.addPage(); startY = 14; }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 82, 118);
        doc.text('Sponsor Contributions', 14, startY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        startY += 4;

        autoTable(doc, {
          startY,
          head: [['Date', 'Sponsor', 'Category', 'Description', 'Amount', 'VAT (15%)', 'Total']],
          body: sponsorPayments.map(p => [
            p.paymentDate,
            p.sponsorName ?? `Sponsor ${p.sponsorId}`,
            CATEGORY_LABELS[p.paymentCategory ?? ''] ?? (p.paymentCategory ?? ''),
            p.description ?? '',
            fmtBase(p),
            fmtVat(p),
            fmtTotal(p),
          ]),
          foot: [
            ['', '', '', 'Subtotal', '', '', fmt(sponsorTotals.subtotal)],
            ['', '', '', 'VAT (15%)', '', '', fmt(sponsorTotals.vatTotal)],
            ['', '', '', 'Sponsor Grand Total', '', '', fmt(sponsorTotals.grandTotal)],
          ],
          headStyles: { fillColor: [26, 82, 118], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          footStyles: { fillColor: [220, 230, 242], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right', fontStyle: 'bold' },
          },
          styles: { overflow: 'linebreak', cellPadding: 2 },
        });
        startY = (doc as any).lastAutoTable.finalY + 6;
      }

      // Grand total bar
      if (startY > pageH - 20) { doc.addPage(); startY = 14; }
      doc.setFillColor(26, 82, 118);
      doc.roundedRect(14, startY, pageW - 28, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Grand Total', 20, startY + 8);
      doc.text(fmt(overallGrandTotal), pageW - 20, startY + 8, { align: 'right' });

      stampFooters();
      setFinancialPdfUrl(URL.createObjectURL(doc.output('blob')));
    } finally {
      setGeneratingPdfId(null);
    }
  };

  // Filtered + sorted rows
  const filtered = [...rows].filter(r => {
    const q = search.toLowerCase();
    const matchesName = !q || r.name.toLowerCase().includes(q);
    const matchesFormat = !filterFormat || r.cricketFormat === filterFormat;
    const matchesYear = !filterYear || r.startDate?.startsWith(String(filterYear));
    return matchesName && matchesFormat && matchesYear;
  }).sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const matchEditDialog = (
    <MatchEditDialog
      match={editingMatch}
      onClose={() => setEditingMatch(null)}
      onSaved={() => {
        setViewScheduleKey(k => k + 1);
        if (editing.tournamentId) loadTournamentMatches(editing.tournamentId);
      }}
      pools={localPools}
      allTeams={allTeams}
      fields={matchFields}
    />
  );

  if (open) {
    const mediaTab  = editing.tournamentId ? 3 : 2;
    const sponsorsTab = editing.tournamentId ? 4 : 3;
    const costTab   = editing.tournamentId ? 5 : 4;
    const resultTab = 6;
    return (
      <>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Button startIcon={<ArrowBack />} onClick={() => setOpen(false)}>Back</Button>
            <Typography variant="h6" sx={{ flex: 1 }}>{editing.tournamentId ? 'Edit' : 'New'} Tournament</Typography>
            <Button variant="contained" onClick={save}>Save</Button>
          </Box>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="General Info" />
            <Tab label="Pools" />
            {editing.tournamentId && <Tab label="Schedule" />}
            <Tab label="Media & Links" />
            <Tab label="Sponsors" />
            <Tab label="Cost" />
            {editing.tournamentId && <Tab label="Result" />}
          </Tabs>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 700 }}>

          {activeTab === 0 && (
            <TournamentGeneralInfoForm
              value={editing}
              onChange={set}
              nameError={nameError}
              onNameErrorClear={() => setNameError('')}
              dateError={dateError}
              onDateErrorClear={() => setDateError('')}
            />
          )}

          {activeTab === 1 && (
            <TournamentPoolsForm
              localPools={localPools}
              onPoolsChange={setLocalPools}
              allTeams={allTeams}
              newPoolName={newPoolName}
              onNewPoolNameChange={setNewPoolName}
            />
          )}

          {activeTab === mediaTab && (
            <TournamentSocialLinksForm value={editing} onChange={set} />
          )}

          {activeTab === sponsorsTab && (
            <Autocomplete multiple options={sponsors} getOptionLabel={s => s.name}
              value={editing.sponsors ?? []} onChange={(_, value) => set({ sponsors: value })}
              isOptionEqualToValue={(o, v) => o.sponsorId === v.sponsorId}
              renderTags={(value, getTagProps) =>
                value.map((s, idx) => <Chip label={s.name} size="small" {...getTagProps({ index: idx })} key={s.sponsorId} />)
              }
              renderInput={params => <TextField {...params} label="Sponsors" />}
            />
          )}

          {activeTab === costTab && (
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField label="Entry Fee" type="number" value={editing.entryFee ?? ''} fullWidth
                onChange={e => set({ entryFee: e.target.value ? +e.target.value : undefined })}
                InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }} />
              <TextField label="Registration Fee" type="number" value={editing.registrationFee ?? ''} fullWidth
                onChange={e => set({ registrationFee: e.target.value ? +e.target.value : undefined })}
                InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }} />
              <TextField label="Match Fee" type="number" value={editing.matchFee ?? ''} fullWidth
                onChange={e => set({ matchFee: e.target.value ? +e.target.value : undefined })}
                InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }} />
            </Box>
          )}

          {activeTab === resultTab && editing.tournamentId && (
            <Autocomplete options={allTeams} getOptionLabel={t => t.teamName}
              value={allTeams.find(t => t.teamId === editing.winningTeamId) ?? null}
              onChange={(_, team) => set({ winningTeamId: team?.teamId ?? undefined, winningTeamName: team?.teamName ?? undefined })}
              isOptionEqualToValue={(o, v) => o.teamId === v.teamId}
              renderInput={params => (
                <TextField {...params} label="Winning Team"
                  InputProps={{ ...params.InputProps, startAdornment: <><EmojiEvents sx={{ color: 'warning.main', mr: 0.5, fontSize: 20 }} />{params.InputProps.startAdornment}</> }} />
              )}
            />
          )}


          </Box>

          {activeTab === 2 && editing.tournamentId && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button variant="outlined" size="small" startIcon={<Add />}
                  onClick={() => setEditingMatch({ tournamentId: editing.tournamentId, tournamentName: editing.name, matchStage: 'POOL' })}>
                  Add Match
                </Button>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'primary.main', color: 'common.white' } }}>
                      <TableCell>Date</TableCell>
                      <TableCell>Start</TableCell>
                      <TableCell>Stage</TableCell>
                      <TableCell>Home Team</TableCell>
                      <TableCell>Opposition</TableCell>
                      <TableCell>Ground</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tournamentMatches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                          No matches scheduled yet
                        </TableCell>
                      </TableRow>
                    )}
                    {[...tournamentMatches]
                      .sort((a, b) => (a.matchDate ?? '').localeCompare(b.matchDate ?? '') || (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? ''))
                      .map(m => (
                        <TableRow key={m.matchId} sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}>
                          <TableCell>{m.matchDate}</TableCell>
                          <TableCell>{m.scheduledStartTime?.slice(0, 5)}</TableCell>
                          <TableCell>{m.matchStage ? STAGE_LABELS[m.matchStage] ?? m.matchStage : ''}</TableCell>
                          <TableCell>
                            {m.homeTeamName ?? (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                {m.homeTeamPlaceholder ?? 'TBD'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {m.oppositionTeamName ?? (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                {m.awayTeamPlaceholder ?? 'TBD'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{m.fieldName}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => setEditingMatch(m)}>
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={async () => {
                              if (m.matchId && confirm('Delete this match?')) {
                                await matchApi.delete(m.matchId);
                                if (editing.tournamentId) loadTournamentMatches(editing.tournamentId);
                              }
                            }}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>

        {matchEditDialog}
      </>
    );
  }

  if (viewing && viewItem) {
    const fmtZAR = (v?: number) => v != null ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v) : undefined;
    const hasLinks = viewItem.websiteLink || viewItem.facebookLink || viewItem.instagramLink || viewItem.youtubeLink || viewItem.registrationPageUrl || viewItem.playingConditionsUrl;
    const hasFees = viewItem.entryFee != null || viewItem.registrationFee != null || viewItem.matchFee != null;
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, maxWidth: 900 }}>
          <Button startIcon={<ArrowBack />} onClick={() => { setViewing(false); setViewTab(0); }}>Back</Button>
          <Typography variant="h6" sx={{ flex: 1 }}>Tournament</Typography>
        </Box>

        {/* Header card */}
        <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, mb: 2, maxWidth: 900 }}>
          <Avatar src={viewItem.logoUrl ?? ''} variant="rounded" sx={{ width: 64, height: 64, flexShrink: 0 }}>
            {viewItem.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h5">{viewItem.name}</Typography>
            {viewItem.description && <Typography variant="subtitle2" color="text.secondary">{viewItem.description}</Typography>}
          </Box>
        </Paper>

        <Tabs value={viewTab} onChange={(_, v) => setViewTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Overview" />
          <Tab label="Schedule" />
          <Tab label="Teams" />
        </Tabs>

        {viewTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 900 }}>
            <DetailSection title="Overview">
              <DetailGrid>
                <DetailField label="Category" value={formatCategory(viewItem.ageGroup, viewItem.tournamentGender) || undefined} />
                <DetailField label="Format" value={viewItem.cricketFormat} />
                <DetailField label="Start Date" value={viewItem.startDate} />
                <DetailField label="End Date" value={viewItem.endDate} />
                <DetailField label="Winner" value={viewItem.winningTeamName} />
              </DetailGrid>
            </DetailSection>

            <DetailSection title="Points System">
              <DetailGrid>
                <DetailField label="Points for Win" value={viewItem.pointsForWin} />
                <DetailField label="Points for Draw" value={viewItem.pointsForDraw} />
                <DetailField label="Points for No Result" value={viewItem.pointsForNoResult} />
                <DetailField label="Bonus Points" value={viewItem.pointsForBonus} />
              </DetailGrid>
            </DetailSection>

            {hasFees && (
              <DetailSection title="Fees">
                <DetailGrid>
                  <DetailField label="Entry Fee" value={fmtZAR(viewItem.entryFee)} />
                  <DetailField label="Registration Fee" value={fmtZAR(viewItem.registrationFee)} />
                  <DetailField label="Match Fee" value={fmtZAR(viewItem.matchFee)} />
                </DetailGrid>
              </DetailSection>
            )}

            {(viewItem.pools?.length ?? 0) > 0 && (
              <DetailSection title="Pools">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {viewItem.pools!.map(pool => (
                    <Box key={pool.poolId}>
                      <Typography variant="subtitle2">{pool.poolName}</Typography>
                      {(pool.teams ?? []).map(t => (
                        <Typography key={t.teamId} variant="body2">{t.teamName}</Typography>
                      ))}
                    </Box>
                  ))}
                </Box>
              </DetailSection>
            )}

            {hasLinks && (
              <DetailSection title="Links">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {viewItem.websiteLink && <Link href={viewItem.websiteLink} target="_blank" rel="noopener" underline="hover">Website</Link>}
                  {viewItem.facebookLink && <Link href={viewItem.facebookLink} target="_blank" rel="noopener" underline="hover">Facebook</Link>}
                  {viewItem.instagramLink && <Link href={viewItem.instagramLink} target="_blank" rel="noopener" underline="hover">Instagram</Link>}
                  {viewItem.youtubeLink && <Link href={viewItem.youtubeLink} target="_blank" rel="noopener" underline="hover">YouTube</Link>}
                  {viewItem.registrationPageUrl && <Link href={viewItem.registrationPageUrl} target="_blank" rel="noopener" underline="hover">Registration Page</Link>}
                  {viewItem.playingConditionsUrl && <Link href={viewItem.playingConditionsUrl} target="_blank" rel="noopener" underline="hover">Playing Conditions</Link>}
                </Box>
              </DetailSection>
            )}
          </Box>
        )}

        {viewTab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <ToggleButtonGroup
                size="small" exclusive
                value={viewScheduleMode}
                onChange={(_, v) => {
                  if (!v) return;
                  setViewScheduleMode(v);
                  if (v === 'visual' && viewMatches.length === 0 && viewItem.tournamentId) {
                    loadViewMatches(viewItem.tournamentId);
                  }
                }}
              >
                <ToggleButton value="table" sx={{ textTransform: 'none', fontSize: '0.8rem', px: 2 }}>
                  Table
                </ToggleButton>
                <ToggleButton value="visual" sx={{ textTransform: 'none', fontSize: '0.8rem', px: 2 }}>
                  Visual
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {viewScheduleMode === 'table' && (
              <TournamentScheduleTab key={viewScheduleKey} tournament={viewItem}
                onResultClick={(id) => navigate(`/admin/matches/${id}/result`)}
                onAddMatch={() => {
                const pools = (viewItem.pools ?? []).map(p => ({
                  poolId: p.poolId, poolName: p.poolName,
                  teams: (p.teams ?? []).map(t => ({ teamId: t.teamId!, teamName: t.teamName! })),
                }));
                setLocalPools(pools);
                setEditingMatch({ tournamentId: viewItem.tournamentId, tournamentName: viewItem.name, matchStage: 'POOL' });
              }} />
            )}

            {viewScheduleMode === 'visual' && (
              viewMatchesLoading
                ? <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
                : <MatchScheduleVisual matches={viewMatches} resultMap={viewResultMap} tournament={viewItem} showExport />
            )}
          </Box>
        )}
        {viewTab === 2 && (() => {
          const tournamentTeamIds = new Set(
            (viewItem.pools ?? []).flatMap(p => (p.teams ?? []).map(t => t.teamId))
          );
          const tournamentTeams = allTeams.filter(t => tournamentTeamIds.has(t.teamId));
          return <TeamsView teams={tournamentTeams} hideTitle showAdminActions returnTournamentId={viewItem.tournamentId} />;
        })()}

        {matchEditDialog}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Tournaments</Typography>
        {!isMobile && (
          <IconButton size="small" title="Toggle columns" onClick={e => setColAnchor(e.currentTarget)}>
            <ViewColumn />
          </IconButton>
        )}
        <Button variant="contained" startIcon={<Add />} onClick={() => openDialog(empty)}>
          Add Tournament
        </Button>
      </Box>

      <Popover
        open={Boolean(colAnchor)}
        anchorEl={colAnchor}
        onClose={() => setColAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, minWidth: 160 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Columns</Typography>
          <FormGroup>
            {ALL_COLUMNS.map(c => (
              <FormControlLabel key={c.key}
                control={<Checkbox size="small" checked={visibleCols.has(c.key)} onChange={() => toggleCol(c.key)} />}
                label={c.label}
              />
            ))}
          </FormGroup>
        </Box>
      </Popover>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: filtersOpen ? 2 : 0 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mr: 'auto' }}>Filters</Typography>
          <Tooltip title={filtersOpen ? 'Collapse' : 'Expand'}>
            <IconButton size="small" onClick={() => setFiltersOpen(o => !o)}>
              <FilterList fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {filtersOpen && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField select size="small" label="Format" value={filterFormat}
              onChange={e => { setFilterFormat(e.target.value as CricketFormat | ''); setPage(0); }}
              sx={{ width: { xs: '100%', sm: 110 } }}>
              <MenuItem value="">All</MenuItem>
              {FORMATS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Year" value={filterYear}
              onChange={e => { setFilterYear(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }}
              sx={{ width: { xs: '100%', sm: 100 } }}>
              <MenuItem value="">All</MenuItem>
              {Array.from(new Set(rows.map(r => r.startDate?.slice(0, 4)).filter(Boolean)))
                .sort((a, b) => Number(b) - Number(a))
                .map(y => <MenuItem key={y} value={Number(y)}>{y}</MenuItem>)}
            </TextField>
            <TextField size="small" placeholder="Search name…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              sx={{ width: { xs: '100%', sm: 220 } }} />
          </Box>
        )}
      </Paper>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' }, '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' }, '& .MuiTableHead-root .MuiTableSortLabel-root': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root:hover': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-root.Mui-active': { color: 'inherit' }, '& .MuiTableHead-root .MuiTableSortLabel-icon': { color: 'inherit !important' } }}>
          <TableHead>
            <TableRow>
              <TableCell width={48} />
              {col('name') && (
                <TableCell sortDirection={sortDir}>
                  <TableSortLabel active direction={sortDir} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>Name</TableSortLabel>
                </TableCell>
              )}
              {col('category') && <TableCell>Category</TableCell>}
              {col('format') && <TableCell>Format</TableCell>}
              {col('startDate') && <TableCell>Start Date</TableCell>}
              {col('endDate') && <TableCell>End Date</TableCell>}
              {col('winner') && <TableCell>Winner</TableCell>}
              {col('pools') && <TableCell>Pools</TableCell>}
              {col('sponsors') && <TableCell>Sponsors</TableCell>}
              {col('links') && <TableCell>Links</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(r => (
              <TableRow key={r.tournamentId}>
                <TableCell>
                  <Avatar
                    src={r.logoUrl}
                    variant="rounded"
                    sx={{
                      width: 32, height: 32,
                      cursor: r.logoUrl ? 'pointer' : 'default',
                      '&:hover': r.logoUrl ? { opacity: 0.8 } : {},
                    }}
                    onClick={() => r.logoUrl && setViewLogoUrl(r.logoUrl)}
                  >
                    {r.name.charAt(0)}
                  </Avatar>
                </TableCell>
                {col('name') && <TableCell><Link component="button" underline="hover" onClick={() => { setViewItem(r); setViewing(true); setViewTab(0); setViewScheduleMode('table'); setViewMatches([]); setViewResults([]); }} sx={{ textAlign: 'left' }}>{r.name}</Link></TableCell>}
                {col('category') && (
                  <TableCell>
                    {formatCategory(r.ageGroup, r.tournamentGender) && (
                      <Chip label={formatCategory(r.ageGroup, r.tournamentGender)} size="small" variant="outlined" />
                    )}
                  </TableCell>
                )}
                {col('format') && <TableCell><Chip label={r.cricketFormat} size="small" /></TableCell>}
                {col('startDate') && <TableCell>{r.startDate}</TableCell>}
                {col('endDate') && <TableCell>{r.endDate}</TableCell>}
                {col('winner') && (
                  <TableCell>
                    {r.winningTeamName && (
                      <Chip icon={<EmojiEvents />} label={r.winningTeamName} size="small" color="warning" variant="outlined" />
                    )}
                  </TableCell>
                )}
                {col('pools') && (
                  <TableCell>
                    <Chip
                      label={r.pools?.length ?? 0}
                      size="small"
                      clickable
                      onClick={() => navigate(`/admin/tournaments/${r.tournamentId}/pools`)}
                      title="View pools"
                    />
                  </TableCell>
                )}
                {col('sponsors') && (
                  <TableCell>
                    <Chip
                      label={r.sponsors?.length ?? 0}
                      size="small"
                      clickable
                      onClick={() => navigate('/admin/sponsors')}
                      title="View sponsors"
                    />
                  </TableCell>
                )}
                {col('links') && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {r.websiteLink && (
                        <IconButton size="small" component="a" href={r.websiteLink} target="_blank" rel="noopener noreferrer" title="Website">
                          <Language fontSize="small" />
                        </IconButton>
                      )}
                      {r.facebookLink && (
                        <IconButton size="small" component="a" href={r.facebookLink} target="_blank" rel="noopener noreferrer" title="Facebook" sx={{ color: '#1877F2' }}>
                          <Facebook fontSize="small" />
                        </IconButton>
                      )}
                      {r.instagramLink && (
                        <IconButton size="small" component="a" href={r.instagramLink} target="_blank" rel="noopener noreferrer" title="Instagram" sx={{ color: '#E1306C' }}>
                          <Instagram fontSize="small" />
                        </IconButton>
                      )}
                      {r.youtubeLink && (
                        <IconButton size="small" component="a" href={r.youtubeLink} target="_blank" rel="noopener noreferrer" title="YouTube" sx={{ color: '#FF0000' }}>
                          <YouTube fontSize="small" />
                        </IconButton>
                      )}
                      {r.playingConditionsUrl && (
                        <IconButton size="small" component="a" href={r.playingConditionsUrl} target="_blank" rel="noopener noreferrer" title="Playing Conditions" color="error">
                          <PictureAsPdf fontSize="small" />
                        </IconButton>
                      )}
                      {r.registrationPageUrl && (
                        <IconButton size="small" component="a" href={r.registrationPageUrl} target="_blank" rel="noopener noreferrer" title="Registration">
                          <AppRegistration fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                )}
                <TableCell>
                  <Tooltip title="Generate Financial Statement">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => generateTournamentPdf(r)}
                        disabled={generatingPdfId === r.tournamentId}
                        color="primary"
                      >
                        {generatingPdfId === r.tournamentId
                          ? <CircularProgress size={16} />
                          : <ReceiptLong fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <IconButton size="small" title="Duplicate" onClick={() => duplicate(r)}><ContentCopy fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => openDialog(r)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.tournamentId!)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </TableContainer>

      {/* Logo viewer */}
      <Dialog open={!!viewLogoUrl} onClose={() => setViewLogoUrl(null)} maxWidth="sm">
        <DialogContent sx={{ p: 0, lineHeight: 0 }}>
          <img src={viewLogoUrl ?? ''} alt="Tournament logo"
            style={{ display: 'block', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewLogoUrl(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <PdfPreviewDialog pdfUrl={financialPdfUrl} onClose={() => setFinancialPdfUrl(null)} />
    </Box>
  );
};
