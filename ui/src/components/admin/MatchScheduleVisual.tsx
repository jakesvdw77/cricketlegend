import React, { useMemo, useState } from 'react';
import {
  Avatar, Box, Button, Chip, CircularProgress, Typography, useTheme,
} from '@mui/material';
import { AccessTime, CalendarMonth, LocationOn, EmojiEvents, CheckCircle, PictureAsPdf } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import { Match, MatchResultSummary, Tournament } from '../../types';
import { PdfPreviewDialog } from '../PdfPreviewDialog';

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendlies',
  POOL: 'Pool Matches',
  PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16',
  QUARTER_FINAL: 'Quarter-Finals',
  SEMI_FINAL: 'Semi-Finals',
  FINAL: 'Final',
};
const STAGE_ORDER = ['FRIENDLY', 'POOL', 'PLAYOFFS', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'];

const fmtDate = (d?: string) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString('en-ZA', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';

const fmtTime = (t?: string) => (t ? t.slice(0, 5) : null);

interface Props {
  matches: Match[];
  resultMap: Map<number, MatchResultSummary>;
  tournament?: Tournament;
  showExport?: boolean;
}

const loadImageBase64 = async (url: string): Promise<string | null> => {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const FALLBACK_DARK: [number, number, number]  = [13,  71,  31];
const FALLBACK_MID:  [number, number, number]  = [27,  94,  51];

const safeRgb = (color: string, fallback: [number, number, number]): [number, number, number] => {
  try {
    // Handle rgb(...) / rgba(...) from MUI
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];
    // Handle hex
    const hex = color.replace('#', '').trim();
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    if (full.length !== 6) return fallback;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return fallback;
    return [r, g, b];
  } catch {
    return fallback;
  }
};

export const MatchScheduleVisual: React.FC<Props> = ({ matches, resultMap, tournament, showExport = false }) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const primaryDark = theme.palette.primary.dark;
  const primaryContrast = theme.palette.primary.contrastText;
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const groups = useMemo(() => {
    const hasStages = matches.some(m => m.matchStage != null);
    if (!hasStages) return [{ label: 'Fixture List', matches }];
    return STAGE_ORDER
      .map(s => ({ label: STAGE_LABELS[s] ?? s, matches: matches.filter(m => m.matchStage === s) }))
      .filter(g => g.matches.length > 0);
  }, [matches]);

  const generatePdf = async () => {
    setGeneratingPdf(true);
    const logoBase64 = tournament?.logoUrl ? await loadImageBase64(tournament.logoUrl) : null;
    try {
      // Hardcoded dark cricket-green palette — independent of the MUI theme
      // so the PDF is always high-contrast and printer-friendly.
      const DARK:   [number,number,number] = [10,  60, 25];   // very dark green
      const MID:    [number,number,number] = [26,  90, 50];   // rich green (pill bg)
      const ACCENT: [number,number,number] = [6,   40, 15];   // darkest (VS badge)
      const WHITE:  [number,number,number] = [255,255,255];
      const GRAY:   [number,number,number] = [70,  70, 70];   // caption text

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentW = pageW - margin * 2;
      const name = tournament?.name ?? 'Tournament';

      const stampFooters = () => {
        const n = doc.getNumberOfPages();
        for (let i = 1; i <= n; i++) {
          doc.setPage(i);
          doc.setFontSize(7); doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal');
          doc.text(`Page ${i} of ${n}`, pageW - margin, pageH - 6, { align: 'right' });
          doc.text('Cricket Legend', margin, pageH - 6);
        }
      };

      // ── Header bar ──────────────────────────────────────────────────────
      doc.setFillColor(...DARK);
      doc.rect(0, 0, pageW, 22, 'F');

      const logoSize = 14;
      if (logoBase64) {
        try { doc.addImage(logoBase64, 'PNG', margin, 4, logoSize, logoSize); } catch {}
      }
      const textX = logoBase64 ? margin + logoSize + 3 : margin;

      doc.setTextColor(...WHITE);
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text(name, textX, 13);

      let y = 28;

      const checkPage = (needed: number) => {
        if (y + needed > pageH - 14) { doc.addPage(); y = 14; }
      };

      for (const group of groups) {
        checkPage(12);
        // Stage label
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(group.label, margin, y);
        doc.setDrawColor(...MID);
        doc.setLineWidth(0.8);
        doc.line(margin, y + 1.5, margin + 40, y + 1.5);
        y += 7;

        // Sort + group by date+time within stage
        const sorted = [...group.matches].sort((a, b) => {
          const dc = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
          return dc !== 0 ? dc : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
        });
        const byDateTime = new Map<string, Match[]>();
        for (const m of sorted) {
          const key = `${m.matchDate ?? ''}__${m.scheduledStartTime ?? ''}`;
          if (!byDateTime.has(key)) byDateTime.set(key, []);
          byDateTime.get(key)!.push(m);
        }

        for (const slotMatches of byDateTime.values()) {
          const first = slotMatches[0];
          const dateStr = first.matchDate
            ? new Date(`${first.matchDate}T00:00:00`).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
            : '';
          const timeStr = first.scheduledStartTime ? first.scheduledStartTime.slice(0, 5) : '';
          const venueStr = first.fieldName ?? '';

          // Match cards
          for (const m of slotMatches) {
            checkPage(14);
            const r = m.matchId != null ? resultMap.get(m.matchId) : undefined;
            const homeWon = r && !r.matchDrawn && r.winningTeamName === m.homeTeamName;
            const awayWon = r && !r.matchDrawn && r.winningTeamName === m.oppositionTeamName;

            // Pill background — darker when completed
            doc.setFillColor(...(r ? DARK : MID));
            doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');

            // Home team
            const homeName = m.homeTeamName ?? m.homeTeamPlaceholder ?? 'TBD';
            doc.setFontSize(8.5); doc.setFont('helvetica', homeWon ? 'bold' : 'normal');
            doc.setTextColor(...WHITE);
            doc.text(homeName.toUpperCase(), margin + 4, y + 6.5, { maxWidth: contentW * 0.4 - 4 });

            // VS badge circle
            const cx = pageW / 2; const cy = y + 5;
            doc.setFillColor(...ACCENT);
            doc.circle(cx, cy, 4.5, 'F');
            doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
            doc.setTextColor(...WHITE);
            doc.text(r?.matchDrawn ? 'DRW' : 'VS', cx, cy + 2, { align: 'center' });

            // Away team
            const awayName = m.oppositionTeamName ?? m.awayTeamPlaceholder ?? 'TBD';
            doc.setFontSize(8.5); doc.setFont('helvetica', awayWon ? 'bold' : 'normal');
            doc.setTextColor(...WHITE);
            doc.text(awayName.toUpperCase(), pageW - margin - 4, y + 6.5, { align: 'right', maxWidth: contentW * 0.4 - 4 });

            y += 12;
          }

          // Slot caption: date · time · venue — centred below cards
          checkPage(6);
          const caption = [dateStr, timeStr, venueStr].filter(Boolean).join('  ·  ');
          doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
          doc.text(caption, pageW / 2, y, { align: 'center' });
          y += 7;
        }

        y += 4; // gap between stages
      }

      stampFooters();
      const blob = doc.output('blob');
      setPdfUrl(URL.createObjectURL(blob));
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (matches.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', mt: 6 }}>
        <EmojiEvents sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary">No matches have been scheduled yet.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {showExport && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined" size="small"
            startIcon={generatingPdf ? <CircularProgress size={14} /> : <PictureAsPdf />}
            onClick={generatePdf}
            disabled={generatingPdf || matches.length === 0}
          >
            {generatingPdf ? 'Generating…' : 'Export PDF'}
          </Button>
        </Box>
      )}

      <PdfPreviewDialog pdfUrl={pdfUrl} onClose={() => setPdfUrl(null)} />
      {groups.map(group => {
        // Sort then group by date + start time
        const sorted = [...group.matches].sort((a, b) => {
          const dc = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
          return dc !== 0 ? dc : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
        });
        const byDateTime = new Map<string, Match[]>();
        for (const m of sorted) {
          const key = `${m.matchDate ?? '__none__'}__${m.scheduledStartTime ?? ''}`;
          if (!byDateTime.has(key)) byDateTime.set(key, []);
          byDateTime.get(key)!.push(m);
        }
        const slotGroups = [...byDateTime.values()];

        return (
          <Box key={group.label}>
            {/* Stage heading */}
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              mb: 3, pb: 0.5,
              borderBottom: `3px solid ${primary}`,
            }}>
              <EmojiEvents sx={{ color: primary, fontSize: 20 }} />
              <Typography variant="h6" fontWeight="bold" color="primary">
                {group.label}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {slotGroups.map((slotMatches, si) => {
                const first = slotMatches[0];
                const date = first.matchDate;
                const time = fmtTime(first.scheduledStartTime);
                const venue = first.fieldName;
                return (
                <Box key={si}>
                  {/* Match cards */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {slotMatches.map(m => {
                      const r = m.matchId != null ? resultMap.get(m.matchId) : undefined;
                      const homeWon = r && !r.matchDrawn && r.winningTeamName === m.homeTeamName;
                      const awayWon = r && !r.matchDrawn && r.winningTeamName === m.oppositionTeamName;
                      const isCompleted = !!r;
                      const isDraw = r?.matchDrawn;

                      return (
                        <Box
                          key={m.matchId}
                          sx={{
                            bgcolor: isCompleted ? primaryDark : primary,
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: 2,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          {/* Team matchup — centred */}
                          <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 1fr',
                            alignItems: 'center',
                            px: 3, py: 2,
                          }}>
                            {/* Home team — right-aligned toward VS */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-end' }}>
                              <Typography
                                variant="subtitle2"
                                fontWeight={homeWon ? 800 : 600}
                                sx={{
                                  color: primaryContrast,
                                  textTransform: m.homeTeamName ? 'uppercase' : 'none',
                                  fontStyle: m.homeTeamName ? 'normal' : 'italic',
                                  letterSpacing: 0.5,
                                  lineHeight: 1.2,
                                  opacity: m.homeTeamName ? 1 : 0.75,
                                  textAlign: 'right',
                                }}
                              >
                                {m.homeTeamName ?? m.homeTeamPlaceholder ?? 'TBD'}
                              </Typography>
                              {m.homeTeamName && (
                                <Avatar src={m.homeTeamLogoUrl} sx={{ width: 36, height: 36, fontSize: 14, flexShrink: 0, bgcolor: 'rgba(255,255,255,0.2)', border: homeWon ? '2px solid #FFD700' : 'none' }}>
                                  {m.homeTeamName.charAt(0)}
                                </Avatar>
                              )}
                            </Box>

                            {/* VS badge */}
                            <Box sx={{ px: 2, display: 'flex', justifyContent: 'center' }}>
                              <Box sx={{
                                width: 44, height: 44,
                                borderRadius: '50%',
                                bgcolor: isCompleted ? 'warning.main' : primaryDark,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid rgba(255,255,255,0.3)',
                                boxShadow: 3,
                                flexShrink: 0,
                              }}>
                                <Typography variant="caption" fontWeight={800} sx={{ color: primaryContrast, fontSize: '0.72rem', letterSpacing: 0.5 }}>
                                  {isDraw ? 'DRW' : 'VS'}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Away team — left-aligned toward VS */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-start' }}>
                              {m.oppositionTeamName && (
                                <Avatar src={m.oppositionTeamLogoUrl} sx={{ width: 36, height: 36, fontSize: 14, flexShrink: 0, bgcolor: 'rgba(255,255,255,0.2)', border: awayWon ? '2px solid #FFD700' : 'none' }}>
                                  {m.oppositionTeamName.charAt(0)}
                                </Avatar>
                              )}
                              <Typography
                                variant="subtitle2"
                                fontWeight={awayWon ? 800 : 600}
                                sx={{
                                  color: primaryContrast,
                                  textTransform: m.oppositionTeamName ? 'uppercase' : 'none',
                                  fontStyle: m.oppositionTeamName ? 'normal' : 'italic',
                                  letterSpacing: 0.5,
                                  lineHeight: 1.2,
                                  opacity: m.oppositionTeamName ? 1 : 0.75,
                                }}
                              >
                                {m.oppositionTeamName ?? m.awayTeamPlaceholder ?? 'TBD'}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Bottom info bar */}
                          <Box sx={{
                            bgcolor: 'rgba(0,0,0,0.18)',
                            px: 2, py: 0.75,
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5,
                          }}>
                            {r ? (
                              isDraw
                                ? <Chip label="Draw" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: primaryContrast, fontSize: '0.68rem' }} />
                                : <Chip icon={<CheckCircle sx={{ fontSize: '13px !important', color: '#4caf50 !important' }} />} label={r.winningTeamName ?? 'Completed'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: primaryContrast, fontSize: '0.68rem' }} />
                            ) : (
                              <Chip label="Upcoming" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: primaryContrast, fontSize: '0.68rem' }} />
                            )}
                            {m.fieldName && m.fieldName !== venue && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                <LocationOn sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
                                <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>
                                  {m.fieldName}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>

                  {/* Date · time · venue — centred below the cards */}
                  <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 1.5, mt: 1, flexWrap: 'wrap',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <CalendarMonth sx={{ fontSize: 13, color: 'text.secondary' }} />
                      <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 2, fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1 }}>
                        {fmtDate(date !== '__none__' ? date : undefined)}
                      </Typography>
                    </Box>
                    {time && (
                      <>
                        <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                          <AccessTime sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.5, fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1 }}>
                            {time}
                          </Typography>
                        </Box>
                      </>
                    )}
                    {venue && (
                      <>
                        <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.65rem' }}>
                            {venue}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
