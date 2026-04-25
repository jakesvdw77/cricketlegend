import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Chip, Autocomplete,
  Avatar, CircularProgress, Divider, InputAdornment, TableSortLabel,
  TablePagination, Popover, FormGroup, Checkbox, FormControlLabel,
  Tabs, Tab, Tooltip, useMediaQuery, useTheme,
} from '@mui/material';
import { Add, Edit, Delete, CloudUpload, PictureAsPdf, Language, Facebook, Instagram, YouTube, AppRegistration, EmojiEvents, ViewColumn, ContentCopy, HighlightOff, ReceiptLong } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { tournamentApi } from '../../api/tournamentApi';
import { sponsorApi } from '../../api/sponsorApi';
import { teamApi } from '../../api/teamApi';
import { paymentApi } from '../../api/paymentApi';
import { Tournament, CricketFormat, Sponsor, Team, TournamentPool, AgeGroup, TournamentGender, Payment } from '../../types';

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

const empty: Tournament = { name: '', pointsForWin: 2, pointsForDraw: 1, pointsForNoResult: 1, pointsForBonus: 1, sponsors: [] };

interface LocalPoolTeam { teamId: number; teamName: string; tournamentTeamId?: number }
interface LocalPool { poolId?: number; poolName: string; teams: LocalPoolTeam[] }

const AGE_GROUP_LABEL: Record<string, string> = {
  UNDER_9: 'Under 9', UNDER_10: 'Under 10', UNDER_11: 'Under 11', UNDER_12: 'Under 12',
  UNDER_13: 'Under 13', UNDER_14: 'Under 14', UNDER_15: 'Under 15', UNDER_16: 'Under 16',
  UNDER_18: 'Under 18', UNDER_19: 'Under 19', OPEN: 'Open', VETERANS: 'Veterans',
  OVER_50: 'Over 50', OVER_60: 'Over 60',
};
const GENDER_LABEL: Record<string, string> = {
  MEN: 'Men', WOMEN: 'Women', BOYS: 'Boys', GIRLS: 'Girls',
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
  const [uploading, setUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [viewLogoUrl, setViewLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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

  const col = (key: ColKey) => visibleCols.has(key);

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const load = () => tournamentApi.findAll().then(setRows);
  useEffect(() => {
    load();
    sponsorApi.findAll().then(setSponsors);
    teamApi.findAll().then(setAllTeams);
  }, []);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await paymentApi.uploadFile(formData);
      set({ logoUrl: url });
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
      set({ playingConditionsUrl: url });
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  // Pool helpers
  const addPool = () => {
    const name = newPoolName.trim() || `Pool ${String.fromCharCode(65 + localPools.length)}`;
    setLocalPools(p => [...p, { poolName: name, teams: [] }]);
    setNewPoolName('');
  };

  const removePool = (idx: number) => {
    setLocalPools(p => p.filter((_, i) => i !== idx));
  };

  const addTeamToLocalPool = (poolIdx: number, team: Team) => {
    setLocalPools(pools => pools.map((p, i) => {
      if (i !== poolIdx) return p;
      if (p.teams.find(t => t.teamId === team.teamId)) return p;
      return { ...p, teams: [...p.teams, { teamId: team.teamId!, teamName: team.teamName }] };
    }));
  };

  const removeTeamFromLocalPool = (poolIdx: number, teamId: number) => {
    setLocalPools(pools => pools.map((p, i) =>
      i !== poolIdx ? p : { ...p, teams: p.teams.filter(t => t.teamId !== teamId) }
    ));
  };

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
      const safeName = tournament.name.replace(/[^a-zA-Z0-9]/g, '-');
      doc.save(`tournament-financial-statement-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);
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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Tournaments</Typography>
        <TextField
          select
          size="small"
          label="Format"
          value={filterFormat}
          onChange={e => { setFilterFormat(e.target.value as CricketFormat | ''); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 110 } }}
        >
          <MenuItem value="">All</MenuItem>
          {FORMATS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Year"
          value={filterYear}
          onChange={e => { setFilterYear(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 100 } }}
        >
          <MenuItem value="">All</MenuItem>
          {Array.from(new Set(rows.map(r => r.startDate?.slice(0, 4)).filter(Boolean)))
            .sort((a, b) => Number(b) - Number(a))
            .map(y => <MenuItem key={y} value={Number(y)}>{y}</MenuItem>)}
        </TextField>
        <TextField
          size="small"
          placeholder="Search name…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 220 } }}
        />
        <IconButton
          size="small"
          title="Toggle columns"
          onClick={e => setColAnchor(e.currentTarget)}
        >
          <ViewColumn />
        </IconButton>
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
                <FormControlLabel
                  key={c.key}
                  control={
                    <Checkbox
                      size="small"
                      checked={visibleCols.has(c.key)}
                      onChange={() => toggleCol(c.key)}
                    />
                  }
                  label={c.label}
                />
              ))}
            </FormGroup>
          </Box>
        </Popover>
        <Button variant="contained" startIcon={<Add />} onClick={() => openDialog(empty)}>
          Add Tournament
        </Button>
      </Box>

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
                {col('name') && <TableCell>{r.name}</TableCell>}
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

      {/* Add / Edit dialog */}
      <Dialog open={open} onClose={(_, reason) => { if (reason !== 'backdropClick') setOpen(false); }} maxWidth="md" fullWidth>
        <DialogTitle>{editing.tournamentId ? 'Edit' : 'New'} Tournament</DialogTitle>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="General Info" />
          <Tab label="Pools" />
          <Tab label="Media & Links" />
          <Tab label="Sponsors" />
          <Tab label="Cost" />
          {editing.tournamentId && <Tab label="Result" />}
        </Tabs>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, minHeight: 520, overflowY: 'auto' }}>

          {/* Tab 0: General Info */}
          {activeTab === 0 && (
            <>
              {/* Logo upload + preview */}
              <Box>
                <input type="file" ref={logoInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleLogoUpload} />
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Avatar
                    src={editing.logoUrl ?? ''}
                    variant="rounded"
                    sx={{ width: 64, height: 64, flexShrink: 0, cursor: editing.logoUrl ? 'pointer' : 'default' }}
                    onClick={() => editing.logoUrl && setViewLogoUrl(editing.logoUrl)}
                  >
                    {editing.name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={uploading ? <CircularProgress size={14} /> : <CloudUpload />}
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? 'Uploading…' : 'Upload Logo'}
                      </Button>
                      {editing.logoUrl && (
                        <Tooltip title="Remove logo">
                          <IconButton size="small" color="error" onClick={() => set({ logoUrl: undefined })}>
                            <HighlightOff fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>

              <TextField
                label="Name"
                value={editing.name}
                onChange={e => { set({ name: e.target.value }); setNameError(''); }}
                required
                error={!!nameError}
                helperText={nameError}
              />
              <TextField label="Description" value={editing.description ?? ''} multiline rows={2}
                onChange={e => set({ description: e.target.value })} />
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField select label="Format" value={editing.cricketFormat ?? ''} fullWidth onChange={e => set({ cricketFormat: e.target.value as CricketFormat })}>
                  {FORMATS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </TextField>
                <TextField select label="Gender" value={editing.tournamentGender ?? ''} fullWidth onChange={e => set({ tournamentGender: e.target.value as TournamentGender || undefined })}>
                  <MenuItem value="">— None —</MenuItem>
                  <MenuItem value="MEN">Men</MenuItem>
                  <MenuItem value="WOMEN">Women</MenuItem>
                  <MenuItem value="BOYS">Boys</MenuItem>
                  <MenuItem value="GIRLS">Girls</MenuItem>
                </TextField>
              </Box>
              <TextField select label="Age Group" value={editing.ageGroup ?? ''} onChange={e => set({ ageGroup: e.target.value as AgeGroup || undefined })}>
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
                  label="Start Date" type="date" value={editing.startDate ?? ''} fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: editing.endDate || undefined }}
                  error={!!dateError}
                  onChange={e => { set({ startDate: e.target.value }); setDateError(''); }}
                />
                <TextField
                  label="End Date" type="date" value={editing.endDate ?? ''} fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: editing.startDate || undefined }}
                  error={!!dateError}
                  helperText={dateError}
                  onChange={e => { set({ endDate: e.target.value }); setDateError(''); }}
                />
              </Box>

              <Divider />
              <Typography variant="subtitle2" color="text.secondary">Scoring</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField label="Win Pts" type="number" value={editing.pointsForWin ?? 2}
                  onChange={e => set({ pointsForWin: +e.target.value })} />
                <TextField label="Draw Pts" type="number" value={editing.pointsForDraw ?? 1}
                  onChange={e => set({ pointsForDraw: +e.target.value })} />
                <TextField label="No Result Pts" type="number" value={editing.pointsForNoResult ?? 1}
                  onChange={e => set({ pointsForNoResult: +e.target.value })} />
                <TextField label="Bonus Pts" type="number" value={editing.pointsForBonus ?? 1}
                  onChange={e => set({ pointsForBonus: +e.target.value })} />
              </Box>

            </>
          )}

          {/* Tab 1: Pools */}
          {activeTab === 1 && (
            <>
              {localPools.map((pool, poolIdx) => (
                <Paper key={poolIdx} variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      label="Pool Name"
                      value={pool.poolName}
                      size="small"
                      sx={{ flex: 1 }}
                      onChange={e => setLocalPools(pools => pools.map((p, i) =>
                        i === poolIdx ? { ...p, poolName: e.target.value } : p
                      ))}
                    />
                    <IconButton size="small" color="error" onClick={() => removePool(poolIdx)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', minHeight: 28 }}>
                    {pool.teams.map(t => (
                      <Chip
                        key={t.teamId}
                        label={t.teamName}
                        size="small"
                        onDelete={() => removeTeamFromLocalPool(poolIdx, t.teamId)}
                      />
                    ))}
                  </Box>
                  <Autocomplete
                    options={allTeams.filter(t => !localPools.some(p => p.teams.find(pt => pt.teamId === t.teamId)))}
                    getOptionLabel={t => t.teamName}
                    onChange={(_, team) => { if (team) addTeamToLocalPool(poolIdx, team); }}
                    value={null}
                    blurOnSelect
                    renderInput={params => <TextField {...params} label="Add team to pool" size="small" />}
                  />
                </Paper>
              ))}

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="New Pool Name"
                  value={newPoolName}
                  size="small"
                  sx={{ flex: 1 }}
                  onChange={e => setNewPoolName(e.target.value)}
                  placeholder={`Pool ${String.fromCharCode(65 + localPools.length)}`}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPool(); } }}
                />
                <Button variant="outlined" size="small" startIcon={<Add />} onClick={addPool}>
                  Add Pool
                </Button>
              </Box>
            </>
          )}

          {/* Tab 2: Media & Links */}
          {activeTab === 2 && (
            <>
              <input type="file" ref={pdfInputRef} style={{ display: 'none' }} accept="application/pdf" onChange={handlePdfUpload} />
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ width: 64, height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editing.playingConditionsUrl ? (
                    <IconButton
                      component="a"
                      href={editing.playingConditionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="error"
                      size="large"
                    >
                      <PictureAsPdf sx={{ fontSize: 40 }} />
                    </IconButton>
                  ) : (
                    <PictureAsPdf sx={{ fontSize: 40, color: 'text.disabled' }} />
                  )}
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploadingPdf ? <CircularProgress size={14} /> : <CloudUpload />}
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={uploadingPdf}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {uploadingPdf ? 'Uploading…' : 'Upload Playing Conditions'}
                  </Button>
                </Box>
              </Box>

              <TextField label="Website" value={editing.websiteLink ?? ''} onChange={e => set({ websiteLink: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><Language fontSize="small" /></InputAdornment> }} />
              <TextField label="Facebook" value={editing.facebookLink ?? ''} onChange={e => set({ facebookLink: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><Facebook sx={{ color: '#1877F2', fontSize: 20 }} /></InputAdornment> }} />
              <TextField label="Instagram" value={editing.instagramLink ?? ''} onChange={e => set({ instagramLink: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><Instagram sx={{ color: '#E1306C', fontSize: 20 }} /></InputAdornment> }} />
              <TextField label="YouTube" value={editing.youtubeLink ?? ''} onChange={e => set({ youtubeLink: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><YouTube sx={{ color: '#FF0000', fontSize: 20 }} /></InputAdornment> }} />
              <TextField
                label="Registration Page URL"
                value={editing.registrationPageUrl ?? ''}
                onChange={e => set({ registrationPageUrl: e.target.value })}
              />
            </>
          )}

          {/* Tab 3: Sponsors */}
          {activeTab === 3 && (
            <Autocomplete
              multiple
              options={sponsors}
              getOptionLabel={s => s.name}
              value={editing.sponsors ?? []}
              onChange={(_, value) => set({ sponsors: value })}
              isOptionEqualToValue={(o, v) => o.sponsorId === v.sponsorId}
              renderTags={(value, getTagProps) =>
                value.map((s, idx) => (
                  <Chip label={s.name} size="small" {...getTagProps({ index: idx })} key={s.sponsorId} />
                ))
              }
              renderInput={params => <TextField {...params} label="Sponsors" />}
            />
          )}

          {/* Tab 4: Cost */}
          {activeTab === 4 && (
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Entry Fee"
                type="number"
                value={editing.entryFee ?? ''}
                onChange={e => set({ entryFee: e.target.value ? +e.target.value : undefined })}
                InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }}
                fullWidth
              />
              <TextField
                label="Registration Fee"
                type="number"
                value={editing.registrationFee ?? ''}
                onChange={e => set({ registrationFee: e.target.value ? +e.target.value : undefined })}
                InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }}
                fullWidth
              />
              <TextField
                label="Match Fee"
                type="number"
                value={editing.matchFee ?? ''}
                onChange={e => set({ matchFee: e.target.value ? +e.target.value : undefined })}
                InputProps={{ startAdornment: <InputAdornment position="start">R</InputAdornment> }}
                fullWidth
              />
            </Box>
          )}

          {/* Tab 5: Result */}
          {activeTab === 5 && (
            <Autocomplete
              options={allTeams}
              getOptionLabel={t => t.teamName}
              value={allTeams.find(t => t.teamId === editing.winningTeamId) ?? null}
              onChange={(_, team) => set({ winningTeamId: team?.teamId ?? undefined, winningTeamName: team?.teamName ?? undefined })}
              isOptionEqualToValue={(o, v) => o.teamId === v.teamId}
              renderInput={params => (
                <TextField {...params} label="Winning Team" InputProps={{ ...params.InputProps, startAdornment: <><EmojiEvents sx={{ color: 'warning.main', mr: 0.5, fontSize: 20 }} />{params.InputProps.startAdornment}</> }} />
              )}
            />
          )}

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Logo viewer */}
      <Dialog open={!!viewLogoUrl} onClose={() => setViewLogoUrl(null)} maxWidth="sm">
        <DialogContent sx={{ p: 0, lineHeight: 0 }}>
          <img
            src={viewLogoUrl ?? ''}
            alt="Tournament logo"
            style={{ display: 'block', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewLogoUrl(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
