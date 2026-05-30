import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Match, MatchResultSummary, MatchSide, Player, Team, Tournament, Sponsor } from '../types';

const DARK:   [number,number,number] = [10,  60, 25];
const MID:    [number,number,number] = [26,  90, 50];
const ACCENT: [number,number,number] = [6,   40, 15];
const LIGHT:  [number,number,number] = [230, 247, 233];
const WHITE:  [number,number,number] = [255, 255, 255];
const GRAY:   [number,number,number] = [90,  90, 90];
const LGRAY:  [number,number,number] = [160, 160, 160];

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool Match', PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

async function loadImageBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function fmtDateLong(d?: string) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtTime(t?: string) {
  if (!t) return null;
  return t.substring(0, 5);
}

export async function generateMatchPdf(match: Match): Promise<string> {
  const [homeLogo, awayLogo] = await Promise.all([
    match.homeTeamLogoUrl  ? loadImageBase64(match.homeTeamLogoUrl)  : Promise.resolve(null),
    match.oppositionTeamLogoUrl ? loadImageBase64(match.oppositionTeamLogoUrl) : Promise.resolve(null),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 26, 'F');

  const tournamentLine = match.tournamentName ?? 'Match Fixture';
  const stageLine = match.matchStage ? (STAGE_LABELS[match.matchStage] ?? match.matchStage) : null;

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(tournamentLine, margin, stageLine ? 13 : 16);

  if (stageLine) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 230, 190);
    doc.text(stageLine, margin, 20);
  }

  // Thin green accent line below header
  doc.setFillColor(...MID);
  doc.rect(0, 26, pageW, 1.5, 'F');

  // ── "MATCH FIXTURE" label ────────────────────────────────────────────────────
  let y = 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...LGRAY);
  doc.text('MATCH FIXTURE', pageW / 2, y, { align: 'center' });
  y += 5;

  // ── Hero matchup section ─────────────────────────────────────────────────────
  const heroH = 64;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, contentW, heroH, 3, 3, 'F');
  doc.setDrawColor(...MID);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, heroH, 3, 3, 'S');

  const logoSize = 24;
  const centerX = pageW / 2;
  // Column centers (VS badge occupies centerX ± 12)
  const leftColCx  = margin + (centerX - margin - 14) / 2;
  const rightColCx = centerX + 14 + (pageW - margin - centerX - 14) / 2;
  const logoY = y + 7;
  const vsBadgeCy = logoY + logoSize / 2;

  const drawTeamCol = (logo: string | null, name: string, cx: number) => {
    const lx = cx - logoSize / 2;
    if (logo) {
      try { doc.addImage(logo, 'PNG', lx, logoY, logoSize, logoSize); } catch {}
    } else {
      doc.setFillColor(...MID);
      doc.roundedRect(lx, logoY, logoSize, logoSize, 2, 2, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text(name.charAt(0).toUpperCase(), cx, logoY + logoSize * 0.65, { align: 'center' });
    }
    // Name below logo — centered, wrapped within column width
    const colW = (centerX - 14 - margin) - 4;
    const nameLines: string[] = doc.splitTextToSize(name.toUpperCase(), colW);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const nameY = logoY + logoSize + 5;
    doc.text(nameLines.slice(0, 2), cx, nameY, { align: 'center' });
  };

  drawTeamCol(homeLogo, match.homeTeamName ?? '?', leftColCx);
  drawTeamCol(awayLogo, match.oppositionTeamName ?? '?', rightColCx);

  // VS badge — vertically centred on the logos
  doc.setFillColor(...ACCENT);
  doc.circle(centerX, vsBadgeCy, 8, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('VS', centerX, vsBadgeCy + 3, { align: 'center' });

  // HOME / AWAY labels at very bottom of hero
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...LGRAY);
  doc.text('HOME', leftColCx,  y + heroH - 5, { align: 'center' });
  doc.text('AWAY', rightColCx, y + heroH - 5, { align: 'center' });

  y += heroH + 10;

  // ── Details section ──────────────────────────────────────────────────────────
  const drawRow = (icon: string, label: string, value: string, sub?: string) => {
    const rowH = sub ? 16 : 11;
    doc.setFillColor(248, 252, 249);
    doc.roundedRect(margin, y, contentW, rowH, 2, 2, 'F');
    doc.setDrawColor(210, 235, 215);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, rowH, 2, 2, 'S');

    // Icon pill
    doc.setFillColor(...MID);
    doc.roundedRect(margin + 3, y + (rowH - 6) / 2, 6, 6, 1, 1, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(icon, margin + 6, y + (rowH - 6) / 2 + 4.2, { align: 'center' });

    // Label
    doc.setTextColor(...GRAY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 12, y + (sub ? 6 : rowH / 2 + 2.5));

    // Value
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(value, margin + 52, y + (sub ? 6 : rowH / 2 + 2.5));

    // Sub text
    if (sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(sub, margin + 52, y + 12);
    }

    y += rowH + 2;
  };

  // Date
  drawRow('D', 'Date', fmtDateLong(match.matchDate));

  // Time + arrival
  if (match.scheduledStartTime) {
    const timeVal = `${fmtTime(match.scheduledStartTime)}`;
    const arrivalSub = match.arrivalTime ? `Arrive by ${fmtTime(match.arrivalTime)}` : undefined;
    drawRow('T', 'Start Time', timeVal, arrivalSub);
  }

  // Venue
  if (match.fieldName) {
    const venueSub = match.fieldAddress ?? undefined;
    drawRow('V', 'Venue', match.fieldName, venueSub);
  }

  // Tournament + stage
  if (match.tournamentName) {
    const stageVal = match.matchStage ? ` — ${STAGE_LABELS[match.matchStage] ?? match.matchStage}` : '';
    drawRow('T', 'Tournament', match.tournamentName + stageVal);
  }

  // Umpire
  if (match.umpire) {
    drawRow('U', 'Umpire', match.umpire);
  }

  // Google Maps note
  if (match.fieldGoogleMapsUrl) {
    y += 2;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...LGRAY);
    doc.text('See venue on Google Maps via the Cricket Legend app.', margin, y);
    y += 6;
  }

  // ── Motivational footer strip ────────────────────────────────────────────────
  const footerY = pageH - 22;
  doc.setFillColor(...DARK);
  doc.rect(0, footerY, pageW, 22, 'F');
  doc.setFillColor(...MID);
  doc.rect(0, footerY, pageW, 1.5, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Good luck! Play hard, play fair.', pageW / 2, footerY + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 230, 190);
  doc.text('Cricket Legend  ·  Generated ' + new Date().toLocaleDateString('en-ZA'), pageW / 2, footerY + 16, { align: 'center' });

  return URL.createObjectURL(doc.output('blob'));
}

// ── Tournament / group schedule PDF ─────────────────────────────────────────

export async function generateTournamentSchedulePdf(
  tournamentName: string,
  matches: Match[],
  teamName?: string,
  tournamentLogoUrl?: string,
): Promise<string> {
  // Pre-load tournament logo + all unique team logos in parallel
  const teamLogoUrls = [...new Set(
    matches.flatMap(m => [m.homeTeamLogoUrl, m.oppositionTeamLogoUrl]).filter(Boolean) as string[]
  )];
  const [tournamentLogo, ...teamLogoResults] = await Promise.all([
    tournamentLogoUrl ? loadImageBase64(tournamentLogoUrl) : Promise.resolve(null),
    ...teamLogoUrls.map(url => loadImageBase64(url).then(b64 => [url, b64] as const)),
  ]);
  const logos = new Map<string, string | null>(teamLogoResults as [string, string | null][]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const footerH = 14;
  const safeBottom = pageH - footerH - 4;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  let y = 0;
  let pageNum = 1;

  const stampFooter = () => {
    doc.setFillColor(...DARK);
    doc.rect(0, pageH - footerH, pageW, footerH, 'F');
    doc.setFillColor(...MID);
    doc.rect(0, pageH - footerH, pageW, 0.8, 'F');
    doc.setTextColor(180, 230, 190);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(tournamentName, margin, pageH - 5);
    doc.setTextColor(...LGRAY);
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 5, { align: 'right' });
  };

  const addPage = () => {
    stampFooter();
    doc.addPage();
    pageNum++;
    y = 14;
  };

  const checkPage = (needed: number) => {
    if (y + needed > safeBottom) addPage();
  };

  // ── Cover header ─────────────────────────────────────────────────────────────
  const headerH = teamName ? 36 : 30;
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setFillColor(...MID);
  doc.rect(0, headerH, pageW, 1.5, 'F');

  // Tournament logo — top-right of header
  const tLogoSize = headerH - 8;
  const tLogoX = pageW - margin - tLogoSize;
  const tLogoY = (headerH - tLogoSize) / 2;
  if (tournamentLogo) {
    try { doc.addImage(tournamentLogo, 'PNG', tLogoX, tLogoY, tLogoSize, tLogoSize); } catch {}
  }

  // Reserve right space so text doesn't run under the logo
  const textMaxW = tournamentLogo ? pageW - margin * 2 - tLogoSize - 6 : pageW - margin * 2;

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const wrappedTournament: string[] = doc.splitTextToSize(tournamentName, textMaxW);
  doc.text(wrappedTournament[0], margin, teamName ? 14 : 17);

  if (teamName) {
    doc.setFillColor(...MID);
    doc.roundedRect(margin, 18, doc.getTextWidth(teamName) + 8, 7, 1.5, 1.5, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(teamName, margin + 4, 23.2);
  }

  y = headerH + 8;

  // "FIXTURE SCHEDULE" label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...LGRAY);
  doc.text('FIXTURE SCHEDULE', pageW / 2, y, { align: 'center' });
  y += 2;

  // Thin divider
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 2, pageW - margin, y + 2);
  y += 7;

  // ── Group matches by date ─────────────────────────────────────────────────────
  const sorted = [...matches].sort((a, b) => {
    const d = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
    return d !== 0 ? d : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
  });

  const byDate = new Map<string, Match[]>();
  for (const m of sorted) {
    const key = m.matchDate ?? '__none__';
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(m);
  }

  const CARD_H = 26;
  const DATE_H = 10;
  const GAP    = 3;

  for (const [dateKey, dayMatches] of byDate) {
    // Date separator — needs DATE_H + at least one card
    checkPage(DATE_H + CARD_H + GAP);

    // Date header bar
    const dateLabel = dateKey !== '__none__'
      ? new Date(dateKey + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'Date TBC';

    doc.setFillColor(...MID);
    doc.roundedRect(margin, y, contentW, DATE_H - 2, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(dateLabel.toUpperCase(), margin + 5, y + (DATE_H - 2) / 2 + 2.8);
    y += DATE_H + 1;

    for (const m of dayMatches) {
      checkPage(CARD_H + GAP);

      // Card background
      doc.setFillColor(...LIGHT);
      doc.roundedRect(margin, y, contentW, CARD_H, 2, 2, 'F');
      doc.setDrawColor(200, 230, 208);
      doc.setLineWidth(0.35);
      doc.roundedRect(margin, y, contentW, CARD_H, 2, 2, 'S');

      const cardMidY = y + CARD_H * 0.46;
      const logoSz = 11;
      const cx = pageW / 2;

      // Home logo
      const homeLogoB64 = m.homeTeamLogoUrl ? logos.get(m.homeTeamLogoUrl) ?? null : null;
      if (homeLogoB64) {
        try { doc.addImage(homeLogoB64, 'PNG', margin + 5, cardMidY - logoSz / 2, logoSz, logoSz); } catch {}
      } else {
        doc.setFillColor(...MID);
        doc.roundedRect(margin + 5, cardMidY - logoSz / 2, logoSz, logoSz, 1.5, 1.5, 'F');
        doc.setTextColor(...WHITE);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text((m.homeTeamName ?? '?').charAt(0).toUpperCase(), margin + 5 + logoSz / 2, cardMidY + 3, { align: 'center' });
      }

      // Away logo
      const awayLogoB64 = m.oppositionTeamLogoUrl ? logos.get(m.oppositionTeamLogoUrl) ?? null : null;
      if (awayLogoB64) {
        try { doc.addImage(awayLogoB64, 'PNG', pageW - margin - 5 - logoSz, cardMidY - logoSz / 2, logoSz, logoSz); } catch {}
      } else {
        doc.setFillColor(...MID);
        doc.roundedRect(pageW - margin - 5 - logoSz, cardMidY - logoSz / 2, logoSz, logoSz, 1.5, 1.5, 'F');
        doc.setTextColor(...WHITE);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text((m.oppositionTeamName ?? '?').charAt(0).toUpperCase(), pageW - margin - 5 - logoSz / 2, cardMidY + 3, { align: 'center' });
      }

      // VS badge
      doc.setFillColor(...ACCENT);
      doc.circle(cx, cardMidY, 5.5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(6); doc.setFont('helvetica', 'bold');
      doc.text('VS', cx, cardMidY + 2.2, { align: 'center' });

      // Team names
      const nameW = (contentW / 2) - logoSz - 18;
      doc.setTextColor(...DARK);
      doc.setFontSize(8); doc.setFont('helvetica', 'bold');

      const homeName = (m.homeTeamAbbreviation ?? m.homeTeamName ?? 'TBD').toUpperCase();
      const awayName = (m.oppositionTeamAbbreviation ?? m.oppositionTeamName ?? 'TBD').toUpperCase();
      const homeWrapped = doc.splitTextToSize(homeName, nameW);
      const awayWrapped = doc.splitTextToSize(awayName, nameW);

      doc.text(homeWrapped, margin + 5 + logoSz + 3, cardMidY + 2.5);
      doc.text(awayWrapped, pageW - margin - 5 - logoSz - 3, cardMidY + 2.5, { align: 'right' });

      // Bottom info strip
      const infoY = y + CARD_H - 8;
      doc.setFillColor(0, 0, 0, 0); // transparent — no fill, use text only
      const parts: string[] = [];
      if (m.scheduledStartTime) parts.push(m.scheduledStartTime.substring(0, 5));
      if (m.arrivalTime) parts.push(`Arrive ${m.arrivalTime.substring(0, 5)}`);
      if (m.fieldName) parts.push(m.fieldName);
      if (m.matchStage) parts.push(STAGE_LABELS[m.matchStage] ?? m.matchStage);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text(parts.join('  ·  '), cx, infoY + 3, { align: 'center', maxWidth: contentW - 10 });

      y += CARD_H + GAP;
    }

    y += 3; // extra gap after each date group
  }

  // Stamp last page footer
  stampFooter();

  // Back-fill page numbers into each footer (already embedded during addPage)
  // No need — pageNum was correct when each footer was drawn.

  return URL.createObjectURL(doc.output('blob'));
}

// ── Playing XI / Teamsheet PDF ────────────────────────────────────────────────

export async function generateTeamsheetPdf(
  match: Match,
  sides: MatchSide[],
  players: Player[],
  filterTeamId?: number,
): Promise<string> {
  const sidesToShow = filterTeamId
    ? sides.filter(s => s.teamId === filterTeamId)
    : sides;

  const logoUrls = [match.homeTeamLogoUrl, match.oppositionTeamLogoUrl].filter(Boolean) as string[];
  const logoResults = await Promise.all(logoUrls.map(url => loadImageBase64(url).then(b64 => [url, b64] as const)));
  const logos = new Map<string, string | null>(logoResults);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  const footerH = 18;
  const safeBottom = pageH - footerH - 4;

  let currentPage = 1;

  const drawFooter = () => {
    doc.setFillColor(...DARK);
    doc.rect(0, pageH - footerH, pageW, footerH, 'F');
    doc.setFillColor(...MID);
    doc.rect(0, pageH - footerH, pageW, 1.5, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Good luck! Play hard, play fair.', pageW / 2, pageH - footerH + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(180, 230, 190);
    doc.text('Cricket Legend  ·  Generated ' + new Date().toLocaleDateString('en-ZA'), pageW / 2, pageH - footerH + 14, { align: 'center' });
  };

  // Header
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setFillColor(...MID);
  doc.rect(0, 30, pageW, 1.5, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`${match.homeTeamName ?? '?'} vs ${match.oppositionTeamName ?? '?'}`, margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 230, 190);
  const subParts = [
    match.matchDate ? fmtDateLong(match.matchDate) : null,
    match.fieldName ?? null,
    match.tournamentName ?? null,
  ].filter(Boolean) as string[];
  doc.text(subParts.join('  ·  '), margin, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...LGRAY);
  doc.text('TEAM SHEET', pageW - margin, 13, { align: 'right' });

  let y = 40;

  const checkPage = (needed: number) => {
    if (y + needed > safeBottom) {
      drawFooter();
      doc.addPage();
      currentPage++;
      y = 14;
    }
  };

  for (const side of sidesToShow) {
    const xi = (side.playingXi ?? [])
      .map(pid => players.find(p => p.playerId === pid))
      .filter(Boolean) as Player[];
    const twelfth = side.twelfthManPlayerId
      ? players.find(p => p.playerId === side.twelfthManPlayerId)
      : undefined;

    const teamName = side.teamId === match.homeTeamId
      ? (match.homeTeamName ?? 'Home')
      : (match.oppositionTeamName ?? 'Away');
    const teamLogoUrl = side.teamId === match.homeTeamId
      ? match.homeTeamLogoUrl
      : match.oppositionTeamLogoUrl;
    const logoB64 = teamLogoUrl ? logos.get(teamLogoUrl) ?? null : null;

    // Section needs header + at least a few rows
    checkPage(15 + Math.min(xi.length, 3) * 9);

    // Team section header
    const thH = 12;
    doc.setFillColor(...MID);
    doc.roundedRect(margin, y, contentW, thH, 2, 2, 'F');

    if (logoB64) {
      try { doc.addImage(logoB64, 'PNG', margin + 2, y + 1, 10, 10); } catch {}
    }
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(teamName.toUpperCase(), margin + (logoB64 ? 15 : 5), y + thH / 2 + 2.5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 230, 190);
    doc.text(`Playing XI (${xi.length})`, pageW - margin - 5, y + thH / 2 + 2.5, { align: 'right' });

    y += thH + 2;

    if (xi.length === 0) {
      checkPage(10);
      doc.setTextColor(...LGRAY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('Team not yet announced', margin + 4, y + 6);
      y += 12;
    } else {
      const rowH = 9;
      for (let i = 0; i < xi.length; i++) {
        checkPage(rowH);
        const p = xi[i];

        if (i % 2 === 0) {
          doc.setFillColor(244, 250, 245);
          doc.rect(margin, y, contentW, rowH, 'F');
        }

        // Batting position number
        doc.setTextColor(...LGRAY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(String(i + 1), margin + 5, y + rowH / 2 + 2.2, { align: 'right' });

        // Name
        doc.setTextColor(...DARK);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`${p.name} ${p.surname}`, margin + 9, y + rowH / 2 + 2.5);

        // Shirt number (right-aligned)
        if (p.shirtNumber != null) {
          doc.setTextColor(...LGRAY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.text(`#${p.shirtNumber}`, margin + contentW - 2, y + rowH / 2 + 2.2, { align: 'right' });
        }

        y += rowH;
      }
    }

    // 12th man
    if (twelfth) {
      checkPage(13);
      y += 2;
      doc.setFillColor(245, 245, 210);
      doc.roundedRect(margin, y, contentW, 9, 1.5, 1.5, 'F');
      doc.setDrawColor(200, 200, 150);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, 9, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text('12th Man:', margin + 4, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(`${twelfth.name} ${twelfth.surname}`, margin + 24, y + 6);
      y += 12;
    }

    y += 8;
  }

  drawFooter();
  return URL.createObjectURL(doc.output('blob'));
}

// ── Squad PDF ──────────────────────────────────────────────────────────────────

function squadPlayerRole(p: Player): string {
  const parts: string[] = [];
  if (p.wicketKeeper) parts.push('WK');
  const isBowler = p.bowlingType && p.bowlingType !== 'NONE' && !p.partTimeBowler;
  if (['OPENER','TOP_ORDER','MIDDLE_ORDER'].includes(p.battingPosition ?? '')) parts.push('Bat');
  if (isBowler) parts.push('Bowl');
  return parts.join(' / ') || 'Player';
}

export async function generateSquadPdf(
  team: Team,
  squad: Player[],
  tournament: Tournament | null,
): Promise<string> {
  const sorted = [...squad].sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  const captain = squad.find(p => p.playerId === team.captainId);
  const sponsors = (team.sponsors ?? []).filter((s: Sponsor) => s.printLogoUrl || s.brandLogoUrl);

  const [teamLogoB64, tournamentLogoB64, ...sponsorLogos] = await Promise.all([
    team.logoUrl ? loadImageBase64(team.logoUrl) : Promise.resolve(null),
    tournament?.logoUrl ? loadImageBase64(tournament.logoUrl) : Promise.resolve(null),
    ...sponsors.map((s: Sponsor) => loadImageBase64(s.printLogoUrl ?? s.brandLogoUrl!)),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  const footerH = 14;
  const safeBottom = pageH - footerH - 4;

  let pageNum = 1;

  const stampFooter = () => {
    doc.setFillColor(...DARK);
    doc.rect(0, pageH - footerH, pageW, footerH, 'F');
    doc.setFillColor(...MID);
    doc.rect(0, pageH - footerH, pageW, 0.8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(180, 230, 190);
    doc.text(team.teamName, margin, pageH - 5);
    doc.setTextColor(...LGRAY);
    doc.text(`Page ${pageNum}  ·  Generated ${new Date().toLocaleDateString('en-ZA')}`, pageW - margin, pageH - 5, { align: 'right' });
  };

  let y = 0;

  const checkPage = (needed: number) => {
    if (y + needed > safeBottom) {
      stampFooter();
      doc.addPage();
      pageNum++;
      y = 14;
    }
  };

  // ── Header ──────────────────────────────────────────────────────────────────
  const hdrH = 32;
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, hdrH, 'F');
  doc.setFillColor(...MID);
  doc.rect(0, hdrH, pageW, 1.5, 'F');

  const logoSz = hdrH - 6;
  if (teamLogoB64) {
    try { doc.addImage(teamLogoB64, 'PNG', margin, 3, logoSz, logoSz); } catch {}
  } else {
    doc.setFillColor(...MID);
    doc.roundedRect(margin, 3, logoSz, logoSz, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(team.teamName.charAt(0), margin + logoSz / 2, 3 + logoSz * 0.68, { align: 'center' });
  }

  const textX = margin + logoSz + 6;
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(team.teamName, textX, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 230, 190);
  const subMeta = [team.associatedClubName, team.homeFieldName].filter(Boolean).join('  ·  ');
  if (subMeta) doc.text(subMeta, textX, 22);

  doc.setTextColor(...LGRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SQUAD', pageW - margin, 14, { align: 'right' });

  y = hdrH + 8;

  // ── Team meta section ────────────────────────────────────────────────────────
  const metaItems = [
    captain && ['Captain', `${captain.name} ${captain.surname}`],
    team.coach && ['Coach', team.coach],
    team.manager && ['Manager', team.manager],
  ].filter(Boolean) as [string, string][];

  if (metaItems.length > 0) {
    checkPage(12 + metaItems.length * 8);
    doc.setFillColor(244, 250, 245);
    const boxH = 6 + metaItems.length * 8;
    doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'F');
    doc.setDrawColor(200, 230, 210);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'S');

    let ry = y + 7;
    for (const [label, value] of metaItems) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(label + ':', margin + 4, ry);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      doc.text(value, margin + 30, ry);
      ry += 8;
    }
    y += boxH + 6;
  }

  // ── Tournament section ───────────────────────────────────────────────────────
  if (tournament) {
    checkPage(40);

    doc.setFillColor(...MID);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TOURNAMENT', margin + 4, y + 7);
    y += 12;

    const tLogoSz = 28;
    if (tournamentLogoB64) {
      try { doc.addImage(tournamentLogoB64, 'PNG', margin + 2, y, tLogoSz, tLogoSz); } catch {}
    }
    const tTextX = tournamentLogoB64 ? margin + tLogoSz + 6 : margin + 4;

    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(tournament.name, tTextX, y + 8);

    const tDetails = [
      tournament.startDate && tournament.endDate
        ? `${tournament.startDate} – ${tournament.endDate}`
        : (tournament.startDate ?? tournament.endDate ?? null),
      tournament.cricketFormat?.replace(/_/g, ' '),
      tournament.ageGroup?.replace(/_/g, ' '),
    ].filter(Boolean);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    let tdy = y + 16;
    for (const d of tDetails) {
      doc.text(d!, tTextX, tdy);
      tdy += 6;
    }

    y += Math.max(tLogoSz, tdy - y) + 8;
  }

  // ── Squad section ────────────────────────────────────────────────────────────
  checkPage(16);
  doc.setFillColor(...MID);
  doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`SQUAD  (${sorted.length} players)`, margin + 4, y + 7);
  y += 12;

  const rowH = 8;
  for (let i = 0; i < sorted.length; i++) {
    checkPage(rowH);
    const p = sorted[i];

    if (i % 2 === 0) {
      doc.setFillColor(244, 250, 245);
      doc.rect(margin, y, contentW, rowH, 'F');
    }

    // Row number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...LGRAY);
    doc.text(String(i + 1), margin + 4, y + rowH / 2 + 2.2, { align: 'right' });

    // Shirt number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(p.shirtNumber != null ? `#${p.shirtNumber}` : '—', margin + 14, y + rowH / 2 + 2.2, { align: 'center' });

    // Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const nameLabel = `${p.name} ${p.surname}${p.playerId === team.captainId ? '  (C)' : ''}`;
    doc.text(nameLabel, margin + 22, y + rowH / 2 + 2.5);

    // Role
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(squadPlayerRole(p), margin + contentW - 2, y + rowH / 2 + 2.5, { align: 'right' });

    y += rowH;
  }

  y += 4;

  // ── Sponsors ─────────────────────────────────────────────────────────────────
  if (sponsors.length > 0) {
    checkPage(20);
    doc.setDrawColor(...MID);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...LGRAY);
    doc.text('SPONSORS', margin, y + 3);
    y += 8;

    const sLogoH = 14;
    let sx = margin;
    for (let i = 0; i < sponsors.length; i++) {
      const b64 = sponsorLogos[i];
      if (!b64) continue;
      checkPage(sLogoH + 4);
      try {
        const sLogoW = sLogoH * 2.5;
        if (sx + sLogoW > pageW - margin) { sx = margin; y += sLogoH + 4; }
        doc.addImage(b64, 'PNG', sx, y, sLogoW, sLogoH);
        sx += sLogoW + 8;
      } catch {}
    }
    y += sLogoH + 4;
  }

  stampFooter();
  return URL.createObjectURL(doc.output('blob'));
}

// ── Tournament landscape table PDF (matches + results) ────────────────────────

const TABLE_STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendlies', POOL: 'Pool Matches', PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16', QUARTER_FINAL: 'Quarter-Finals',
  SEMI_FINAL: 'Semi-Finals', FINAL: 'Final',
};
const TABLE_STAGE_ORDER = ['FRIENDLY','POOL','PLAYOFFS','ROUND_OF_16','QUARTER_FINAL','SEMI_FINAL','FINAL'];

export async function generateTournamentTablePdf(
  tournament: Tournament,
  matches: Match[],
  results: MatchResultSummary[],
): Promise<string> {
  const sorted = [...matches].sort((a, b) => {
    const dc = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
    return dc !== 0 ? dc : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
  });

  const resultMap = new Map(results.map(r => [r.matchId, r]));

  const hasStages = sorted.some(m => m.matchStage != null);
  const groups = hasStages
    ? TABLE_STAGE_ORDER
        .map(s => ({ label: TABLE_STAGE_LABELS[s] ?? s, matches: sorted.filter(m => m.matchStage === s) }))
        .filter(g => g.matches.length > 0)
    : [{ label: 'Fixture List', matches: sorted }];

  const logoBase64 = tournament.logoUrl ? await loadImageBase64(tournament.logoUrl) : null;

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
      doc.text('Cricket Legend', 14, pageH - 6);
    }
  };

  // Header bar
  doc.setFillColor(26, 82, 118);
  doc.rect(0, 0, pageW, 24, 'F');

  const logoSize = 16;
  const logoX = 14;
  const logoY = 4;
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize); } catch {}
  }
  const textX = logoBase64 ? logoX + logoSize + 3 : 14;

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(tournament.name, textX, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Tournament Schedule', textX, 20);

  const info = [
    tournament.cricketFormat,
    [tournament.startDate, tournament.endDate].filter(Boolean).join(' – '),
    `${sorted.length} match${sorted.length !== 1 ? 'es' : ''}`,
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
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Time', 'Home Team', 'vs', 'Away Team', 'Venue', 'Result']],
      body: group.matches.map(m => {
        const r = m.matchId != null ? resultMap.get(m.matchId) : undefined;
        const result = r
          ? r.matchDrawn ? 'Draw' : r.winningTeamName ? `${r.winningTeamName} won` : 'Completed'
          : 'Upcoming';
        return [
          fmtDateLong(m.matchDate),
          m.scheduledStartTime ? m.scheduledStartTime.slice(0, 5) : '—',
          m.homeTeamName ?? m.homeTeamPlaceholder ?? 'TBD',
          'vs',
          m.oppositionTeamName ?? m.awayTeamPlaceholder ?? 'TBD',
          m.fieldName ?? '—',
          result,
        ];
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
  return URL.createObjectURL(doc.output('blob'));
}
