import { Match, MatchSide, Player, Team, Tournament } from '../types';

const fmtMatchDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

async function loadImg(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,       y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r,   y,         r);
  ctx.closePath();
}

// Draws a player photo (circular) with an initials fallback
function drawPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cx: number,
  cy: number,
  r: number,
  initials: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (img) {
    // Centre-crop the image into the circle
    const aspect = img.naturalWidth / img.naturalHeight;
    let sw = img.naturalWidth, sh = img.naturalHeight;
    let sx = 0, sy = 0;
    if (aspect > 1) { sw = img.naturalHeight; sx = (img.naturalWidth - sw) / 2; }
    else             { sh = img.naturalWidth;  sy = (img.naturalHeight - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, cx - r, cy - r, r * 2, r * 2);
  } else {
    // Gradient avatar
    const grad = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#2d7a4a');
    grad.addColorStop(1, '#0a3c19');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${Math.round(r * 0.72)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials.slice(0, 2).toUpperCase(), cx, cy + r * 0.05);
  }

  ctx.restore();

  // Ring around photo
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

// Draws a single player card and returns nothing
function drawPlayerCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  player: Player,
  img: HTMLImageElement | null,
  isCapt: boolean,
  is12th: boolean,
) {
  const r = 12;

  // Card background
  roundedRect(ctx, x, y, w, h, r);
  const cardGrad = ctx.createLinearGradient(x, y, x, y + h);
  cardGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
  cardGrad.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = cardGrad;
  ctx.fill();
  ctx.strokeStyle = is12th ? 'rgba(134,239,172,0.5)' : 'rgba(255,255,255,0.18)';
  ctx.lineWidth = is12th ? 2 : 1.5;
  ctx.stroke();

  // Photo
  const photoR = w * 0.33;
  const photoCX = x + w / 2;
  const photoCY = y + photoR + 18;
  const initials = `${player.name.charAt(0)}${player.surname.charAt(0)}`;
  drawPhoto(ctx, img, photoCX, photoCY, photoR, initials);

  // Shirt number badge — top-left
  if (player.shirtNumber != null) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + 20, y + 20, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(player.shirtNumber), x + 20, y + 20);
    ctx.restore();
  }

  // Captain badge — top-right
  if (isCapt) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + w - 20, y + 20, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C', x + w - 20, y + 20);
    ctx.restore();
  }

  // Name area — below photo
  const nameY = photoCY + photoR + 14;
  const fullName  = `${player.name} ${player.surname}`;
  const maxNameW  = w - 16;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Auto-shrink font if name is long
  let fontSize = 17;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  while (ctx.measureText(fullName).width > maxNameW && fontSize > 11) {
    fontSize--;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(fullName, x + w / 2, nameY, maxNameW);

  // 12th man label
  if (is12th) {
    ctx.fillStyle = 'rgba(134,239,172,0.85)';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('12th Man', x + w / 2, nameY + fontSize + 4);
  }
}

export async function generatePlayingXiImage(
  match: Match,
  sides: MatchSide[],
  players: Player[],
  filterTeamId?: number,
): Promise<string> {
  const sidesToShow = filterTeamId
    ? sides.filter(s => s.teamId === filterTeamId)
    : sides.slice(0, 1);
  const side = sidesToShow[0];
  if (!side) throw new Error('No team side found');

  const xi = (side.playingXi ?? [])
    .map(pid => players.find(p => p.playerId === pid))
    .filter(Boolean) as Player[];
  const twelfth = side.twelfthManPlayerId
    ? players.find(p => p.playerId === side.twelfthManPlayerId)
    : undefined;

  const allCards = twelfth ? [...xi, twelfth] : xi;

  const teamName = side.teamId === match.homeTeamId
    ? (match.homeTeamName ?? 'Home')
    : (match.oppositionTeamName ?? 'Away');
  const teamLogoUrl = side.teamId === match.homeTeamId
    ? match.homeTeamLogoUrl
    : match.oppositionTeamLogoUrl;

  // Load all images in parallel
  const [teamLogo, ...playerImgs] = await Promise.all([
    teamLogoUrl ? loadImg(teamLogoUrl) : Promise.resolve(null),
    ...allCards.map(p => p.profilePictureUrl ? loadImg(p.profilePictureUrl) : Promise.resolve(null)),
  ]);

  // ── Layout constants ────────────────────────────────────────────────────────
  const W       = 1080;
  const COLS    = 4;
  const HMARGIN = 48;
  const HGAP    = 16;
  const VGAP    = 18;
  const availW  = W - HMARGIN * 2;
  const cardW   = (availW - HGAP * (COLS - 1)) / COLS;
  const cardH   = Math.round(cardW * 1.35);
  const HDR_H   = 360;
  const rows    = Math.ceil(allCards.length / COLS);
  const H       = HDR_H + rows * (cardH + VGAP) - VGAP + 32;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background ──────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   '#051a0e');
  bg.addColorStop(0.4, '#0d3b1e');
  bg.addColorStop(1,   '#051a0e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle dot grid decoration
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let gx = 24; gx < W; gx += 48) {
    for (let gy = 24; gy < H; gy += 48) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Header ──────────────────────────────────────────────────────────────────

  // Team logo
  const logoR = 52;
  const logoCX = W / 2;
  const logoCY = 30 + logoR;
  drawPhoto(ctx, teamLogo, logoCX, logoCY, logoR, teamName.charAt(0));

  // "PLAYING XI"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 68px Arial, sans-serif';
  ctx.fillText('PLAYING XI', W / 2, logoCY + logoR + 18);

  // Team name pill
  const pillText = teamName.toUpperCase();
  ctx.font = 'bold 22px Arial, sans-serif';
  const pillW = ctx.measureText(pillText).width + 40;
  const pillH = 36;
  const pillX = W / 2 - pillW / 2;
  const pillY = logoCY + logoR + 18 + 72 + 8;
  roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = 'rgba(78,160,100,0.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(134,239,172,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#86efac';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, W / 2, pillY + pillH / 2);

  // Match info
  const infoParts = [
    match.matchDate,
    match.fieldName,
    match.tournamentName,
  ].filter(Boolean).join('  ·  ');
  if (infoParts) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '20px Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(infoParts, W / 2, pillY + pillH + 24, W - HMARGIN * 2);
  }

  // Decorative divider — drawn below the info text (text ends ~pillY+pillH+24+24, add 16px gap)
  const divY = pillY + pillH + 72;
  const divGrad = ctx.createLinearGradient(HMARGIN, 0, W - HMARGIN, 0);
  divGrad.addColorStop(0,   'transparent');
  divGrad.addColorStop(0.15, '#4CAF50');
  divGrad.addColorStop(0.85, '#4CAF50');
  divGrad.addColorStop(1,   'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(HMARGIN, divY);
  ctx.lineTo(W - HMARGIN, divY);
  ctx.stroke();

  // ── Player cards ────────────────────────────────────────────────────────────

  for (let i = 0; i < allCards.length; i++) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const cardsInThisRow = Math.min(COLS, allCards.length - row * COLS);

    // Centre-align last (partial) row
    const rowOffsetX = cardsInThisRow < COLS
      ? (availW - cardsInThisRow * cardW - (cardsInThisRow - 1) * HGAP) / 2
      : 0;

    const cx = HMARGIN + rowOffsetX + col * (cardW + HGAP);
    const cy = HDR_H + row * (cardH + VGAP) + 8;

    const p    = allCards[i];
    const img  = playerImgs[i] ?? null;
    const is12 = p.playerId === side.twelfthManPlayerId;
    const isC  = p.playerId === side.captainPlayerId;

    drawPlayerCard(ctx, cx, cy, cardW, cardH, p, img, isC, is12);
  }

  return new Promise<string>(resolve => {
    canvas.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/png');
  });
}

// ── Squad Image ───────────────────────────────────────────────────────────────

export async function generateSquadImage(
  team: Team,
  squad: Player[],
  tournament: Tournament | null,
): Promise<string> {
  const sorted = [...squad].sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));

  const [teamLogo, ...playerImgs] = await Promise.all([
    team.logoUrl ? loadImg(team.logoUrl) : Promise.resolve(null),
    ...sorted.map(p => p.profilePictureUrl ? loadImg(p.profilePictureUrl) : Promise.resolve(null)),
  ]);

  // Use 5 columns for larger squads, 4 for small
  const COLS    = sorted.length > 16 ? 5 : 4;
  const W       = 1080;
  const HMARGIN = 44;
  const HGAP    = 14;
  const VGAP    = 16;
  const availW  = W - HMARGIN * 2;
  const cardW   = (availW - HGAP * (COLS - 1)) / COLS;
  const cardH   = Math.round(cardW * 1.3);
  const HDR_H   = 340;
  const rows    = Math.ceil(sorted.length / COLS);
  const H       = HDR_H + rows * (cardH + VGAP) - VGAP + 32;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   '#051a0e');
  bg.addColorStop(0.4, '#0d3b1e');
  bg.addColorStop(1,   '#051a0e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dot grid
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let gx = 24; gx < W; gx += 48) {
    for (let gy = 24; gy < H; gy += 48) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  const logoR = 52;
  const logoCX = W / 2;
  const logoCY = 30 + logoR;
  drawPhoto(ctx, teamLogo, logoCX, logoCY, logoR, team.teamName.charAt(0));

  // "SQUAD" title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 68px Arial, sans-serif';
  ctx.fillText('SQUAD', W / 2, logoCY + logoR + 18);

  // Team name pill
  const pillText = team.teamName.toUpperCase();
  ctx.font = 'bold 22px Arial, sans-serif';
  const pillW = ctx.measureText(pillText).width + 40;
  const pillH = 36;
  const pillX = W / 2 - pillW / 2;
  const pillY = logoCY + logoR + 18 + 72 + 8;
  roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = 'rgba(78,160,100,0.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(134,239,172,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#86efac';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, W / 2, pillY + pillH / 2);

  // Sub info: tournament name + player count
  const infoParts = [
    tournament?.name,
    `${sorted.length} players`,
  ].filter(Boolean).join('  ·  ');
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '20px Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(infoParts, W / 2, pillY + pillH + 24, W - HMARGIN * 2);

  // Divider
  const divY = HDR_H - 16;
  const divGrad = ctx.createLinearGradient(HMARGIN, 0, W - HMARGIN, 0);
  divGrad.addColorStop(0,   'transparent');
  divGrad.addColorStop(0.15, '#4CAF50');
  divGrad.addColorStop(0.85, '#4CAF50');
  divGrad.addColorStop(1,   'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(HMARGIN, divY);
  ctx.lineTo(W - HMARGIN, divY);
  ctx.stroke();

  // ── Player cards ────────────────────────────────────────────────────────────
  for (let i = 0; i < sorted.length; i++) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const cardsInRow = Math.min(COLS, sorted.length - row * COLS);
    const rowOffsetX = cardsInRow < COLS
      ? (availW - cardsInRow * cardW - (cardsInRow - 1) * HGAP) / 2
      : 0;

    const cx = HMARGIN + rowOffsetX + col * (cardW + HGAP);
    const cy = HDR_H + row * (cardH + VGAP) + 8;

    const p    = sorted[i];
    const img  = playerImgs[i] ?? null;
    const isC  = p.playerId === team.captainId;

    drawPlayerCard(ctx, cx, cy, cardW, cardH, p, img, isC, false);
  }

  return new Promise<string>(resolve => {
    canvas.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/png');
  });
}

// ── Tournament match schedule image ───────────────────────────────────────────

export async function generateMatchScheduleImage(
  tournamentName: string,
  tournamentLogoUrl: string | undefined,
  matches: Match[],
  showVenue = true,
  teamName?: string,
  twoColumns = false,
): Promise<string> {
  const sorted = [...matches].sort((a, b) => {
    const d = (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
    return d !== 0 ? d : (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? '');
  });

  const byDate = new Map<string, Match[]>();
  for (const m of sorted) {
    const key = m.matchDate ?? 'TBD';
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(m);
  }
  const dateGroups = [...byDate.entries()];

  const allLogoUrls = [...new Set(
    sorted.flatMap(m => [m.homeTeamLogoUrl, m.oppositionTeamLogoUrl]).filter(Boolean) as string[],
  )];
  const [tournamentLogo, ...logoResults] = await Promise.all([
    tournamentLogoUrl ? loadImg(tournamentLogoUrl) : Promise.resolve(null),
    ...allLogoUrls.map(url => loadImg(url).then(img => [url, img] as const)),
  ]);
  const logos = new Map<string, HTMLImageElement | null>(
    logoResults as [string, HTMLImageElement | null][],
  );

  // Group date groups into ISO weeks (Monday-anchored)
  const getMondayKey = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    const off = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + off);
    return d.toISOString().slice(0, 10);
  };

  interface WeekGroup { label: string; dateGroups: [string, Match[]][]; }
  const weekMap = new Map<string, WeekGroup>();
  const weekGroups: WeekGroup[] = [];
  for (const entry of dateGroups) {
    const wk = entry[0] === 'TBD' ? 'TBD' : getMondayKey(entry[0]);
    if (!weekMap.has(wk)) {
      const wg: WeekGroup = { label: '', dateGroups: [] };
      weekMap.set(wk, wg);
      weekGroups.push(wg);
    }
    weekMap.get(wk)!.dateGroups.push(entry);
  }
  let wNum = 1;
  for (const wg of weekGroups) {
    wg.label = wg.dateGroups.every(([k]) => k === 'TBD') ? 'Date TBD' : `Week ${wNum++}`;
  }

  const USE_TWO_COLS = twoColumns;
  const W       = USE_TWO_COLS ? 2160 : 1080;
  const HMARG   = USE_TWO_COLS ? 80   : 56;
  const COL_GAP = USE_TWO_COLS ? 60   : 0;
  const COL_W   = USE_TWO_COLS ? (W - HMARG * 2 - COL_GAP) / 2 : W - HMARG * 2;
  const HS      = USE_TWO_COLS ? 1.5  : 1;

  // Row dimensions — same density regardless of layout
  const DATE_H     = 48;
  const MATCH_H    = 106;
  const VENUE_H    = showVenue ? 28 : 0;
  const MATCH_GAP  = 18;
  const DATE_GAP   = 20;
  const WEEK_HDR_H = 44;
  const WEEK_GAP   = 28;
  const VS_R       = 30;
  const PILL_H     = 76;
  const PILL_R     = PILL_H / 2;
  const LOGO_R     = 24;

  // Distribute whole week groups between columns, balancing by match count
  const leftWeeks:  WeekGroup[] = [];
  const rightWeeks: WeekGroup[] = [];
  if (USE_TWO_COLS) {
    let lc = 0, rc = 0;
    for (const wg of weekGroups) {
      const cnt = wg.dateGroups.reduce((s, [, ms]) => s + ms.length, 0);
      if (lc <= rc) { leftWeeks.push(wg); lc += cnt; }
      else          { rightWeeks.push(wg); rc += cnt; }
    }
  }

  const calcDateGroupsH = (groups: [string, Match[]][]) =>
    groups.reduce((h, [, ms], i) =>
      h + DATE_H
        + ms.length * (MATCH_H + VENUE_H)
        + Math.max(ms.length - 1, 0) * MATCH_GAP
        + (i < groups.length - 1 ? DATE_GAP : 0)
    , 0);

  const calcWeekColH = (weeks: WeekGroup[]) =>
    weeks.reduce((h, wg, i) =>
      h + WEEK_HDR_H + calcDateGroupsH(wg.dateGroups) + (i < weeks.length - 1 ? WEEK_GAP : 0)
    , 0);

  const logoR  = Math.round(44 * HS);
  const HDR_H  = teamName ? Math.round(310 * HS) : Math.round(270 * HS);
  const colBodyH = USE_TWO_COLS
    ? Math.max(calcWeekColH(leftWeeks), calcWeekColH(rightWeeks))
    : calcWeekColH(weekGroups);
  const H = HDR_H + colBodyH + 48;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#051a0e'); bg.addColorStop(0.5, '#0d3b1e'); bg.addColorStop(1, '#051a0e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let gx = 24; gx < W; gx += 48)
    for (let gy = 24; gy < H; gy += 48) {
      ctx.beginPath(); ctx.arc(gx, gy, 1.5, 0, Math.PI * 2); ctx.fill();
    }

  // Header (full width, scaled for wider canvas)
  const logoCY = Math.round(28 * HS) + logoR;
  drawPhoto(ctx, tournamentLogo, W / 2, logoCY, logoR, tournamentName.charAt(0));

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `bold ${Math.round(26 * HS)}px Arial, sans-serif`;
  ctx.fillText(tournamentName.toUpperCase(), W / 2, logoCY + logoR + Math.round(14 * HS), W - HMARG * 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(72 * HS)}px Arial, sans-serif`;
  ctx.fillText('MATCH SCHEDULE', W / 2, logoCY + logoR + Math.round(48 * HS));

  if (teamName) {
    const pillText = teamName.toUpperCase();
    ctx.font = `bold ${Math.round(22 * HS)}px Arial, sans-serif`;
    const tpW = ctx.measureText(pillText).width + Math.round(40 * HS);
    const tpH = Math.round(36 * HS);
    const tpX = W / 2 - tpW / 2;
    const tpY = logoCY + logoR + Math.round(124 * HS);
    roundedRect(ctx, tpX, tpY, tpW, tpH, tpH / 2);
    ctx.fillStyle = 'rgba(78,160,100,0.35)'; ctx.fill();
    ctx.strokeStyle = 'rgba(134,239,172,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#86efac'; ctx.textBaseline = 'middle';
    ctx.fillText(pillText, W / 2, tpY + tpH / 2);
  }

  const divY = HDR_H - Math.round(20 * HS);
  const dg = ctx.createLinearGradient(HMARG, 0, W - HMARG, 0);
  dg.addColorStop(0, 'transparent'); dg.addColorStop(0.12, '#4CAF50');
  dg.addColorStop(0.88, '#4CAF50'); dg.addColorStop(1, 'transparent');
  ctx.strokeStyle = dg; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(HMARG, divY); ctx.lineTo(W - HMARG, divY); ctx.stroke();

  // Subtle column separator
  if (USE_TWO_COLS) {
    const dvX = HMARG + COL_W + COL_GAP / 2;
    ctx.strokeStyle = 'rgba(134,239,172,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(dvX, HDR_H); ctx.lineTo(dvX, H - 24); ctx.stroke();
  }

  // Draw a column of week groups. colStartX is the left edge of this column.
  const drawColumn = (weeks: WeekGroup[], colStartX: number, cW: number) => {
    const pillW = cW / 2 - VS_R - 10;
    let y = HDR_H + 8;

    for (let wi = 0; wi < weeks.length; wi++) {
      const wg = weeks[wi];

      // Week header bar
      ctx.fillStyle = 'rgba(15, 50, 28, 0.95)';
      ctx.fillRect(colStartX, y, cW, WEEK_HDR_H);
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(colStartX, y, 4, WEEK_HDR_H);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillText(wg.label.toUpperCase(), colStartX + 16, y + WEEK_HDR_H / 2);
      y += WEEK_HDR_H;

      for (let di = 0; di < wg.dateGroups.length; di++) {
        const [dateKey, dayMatches] = wg.dateGroups[di];
        const dateLabel = dateKey !== 'TBD' ? fmtMatchDate(dateKey) : 'Date TBD';

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText(dateLabel, colStartX + cW / 2, y + DATE_H / 2, cW);
        y += DATE_H;

        for (let mi = 0; mi < dayMatches.length; mi++) {
          const m = dayMatches[mi];
          const matchCY = y + MATCH_H / 2;
          const pillTop = matchCY - PILL_H / 2;
          const vsCX    = colStartX + cW / 2;
          const homePX  = colStartX;
          const awayPX  = vsCX + VS_R + 10;

          const drawPill = (px: number) => {
            ctx.save();
            roundedRect(ctx, px, pillTop, pillW, PILL_H, PILL_R);
            const pg = ctx.createLinearGradient(px, 0, px + pillW, 0);
            pg.addColorStop(0, 'rgba(30,110,60,0.85)');
            pg.addColorStop(1, 'rgba(18,80,40,0.7)');
            ctx.fillStyle = pg; ctx.fill();
            ctx.strokeStyle = 'rgba(134,239,172,0.55)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
          };

          const drawTeamName = (text: string, nameX: number) => {
            const maxW = pillW - PILL_R * 2 - 16;
            let fs = 26;
            ctx.font = `bold ${fs}px Arial, sans-serif`;
            while (ctx.measureText(text).width > maxW && fs > 13) { fs--; ctx.font = `bold ${fs}px Arial, sans-serif`; }
            ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(text, nameX, matchCY, maxW);
          };

          // Home
          drawPill(homePX);
          const hLCX = homePX + PILL_R;
          const homeLabel = m.homeTeamName ?? m.homeTeamPlaceholder ?? 'TBD';
          drawPhoto(ctx, m.homeTeamLogoUrl ? logos.get(m.homeTeamLogoUrl) ?? null : null,
            hLCX, matchCY, LOGO_R, homeLabel.slice(0, 2));
          drawTeamName(homeLabel.toUpperCase(), hLCX + PILL_R + 10);

          // Away
          drawPill(awayPX);
          const aLCX = awayPX + PILL_R;
          const awayLabel = m.oppositionTeamName ?? m.awayTeamPlaceholder ?? 'TBD';
          drawPhoto(ctx, m.oppositionTeamLogoUrl ? logos.get(m.oppositionTeamLogoUrl) ?? null : null,
            aLCX, matchCY, LOGO_R, awayLabel.slice(0, 2));
          drawTeamName(awayLabel.toUpperCase(), aLCX + PILL_R + 10);

          // VS circle
          ctx.beginPath(); ctx.arc(vsCX, matchCY, VS_R, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff'; ctx.fill();
          ctx.fillStyle = '#0a3c19'; ctx.font = 'bold 18px Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('VS', vsCX, matchCY);

          // Time
          if (m.scheduledStartTime) {
            ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '20px Arial, sans-serif';
            ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
            ctx.fillText(m.scheduledStartTime.slice(0, 5), colStartX + cW, pillTop - 4);
          }

          // Venue
          if (showVenue && m.fieldName) {
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.font = '19px Arial, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText(`📍 ${m.fieldName}`, vsCX, y + MATCH_H + 4, cW);
          }

          y += MATCH_H + VENUE_H + (mi < dayMatches.length - 1 ? MATCH_GAP : 0);
        }
        if (di < wg.dateGroups.length - 1) y += DATE_GAP;
      }

      if (wi < weeks.length - 1) y += WEEK_GAP;
    }
  };

  if (USE_TWO_COLS) {
    drawColumn(leftWeeks,  HMARG, COL_W);
    drawColumn(rightWeeks, HMARG + COL_W + COL_GAP, COL_W);
  } else {
    drawColumn(weekGroups, HMARG, COL_W);
  }

  return new Promise<string>(resolve => {
    canvas.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/png');
  });
}

// ── Countdown helpers ─────────────────────────────────────────────────────────

function calcCountdown(dateStr: string, timeStr?: string): { value: number; unit: 'DAYS' | 'HOURS' | 'MINUTES' } {
  const combined = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00:00`;
  const diffMs   = new Date(combined).getTime() - Date.now();
  if (diffMs <= 0) return { value: 0, unit: 'MINUTES' };
  const diffDays  = Math.floor(diffMs / 86_400_000);
  const diffHours = Math.floor(diffMs /  3_600_000);
  const diffMins  = Math.floor(diffMs /     60_000);
  if (diffDays  >= 1) return { value: diffDays,  unit: 'DAYS' };
  if (diffHours >= 1) return { value: diffHours, unit: 'HOURS' };
  return { value: diffMins, unit: 'MINUTES' };
}

function drawCountdownBanner(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  text: string,
) {
  const bW = 620, bH = 80, notch = 22;
  const bx = cx - bW / 2, by = cy - bH / 2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bx + notch, by);
  ctx.lineTo(bx + bW - notch, by);
  ctx.lineTo(bx + bW,         cy);
  ctx.lineTo(bx + bW - notch, by + bH);
  ctx.lineTo(bx + notch,      by + bH);
  ctx.lineTo(bx,              cy);
  ctx.closePath();
  const bannerGrad = ctx.createLinearGradient(bx, 0, bx + bW, 0);
  bannerGrad.addColorStop(0,    '#0e5a2c');
  bannerGrad.addColorStop(0.35, '#1a8040');
  bannerGrad.addColorStop(0.65, '#1a8040');
  bannerGrad.addColorStop(1,    '#0e5a2c');
  ctx.fillStyle = bannerGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(134,239,172,0.85)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font = 'bold 44px Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(text, cx, cy);
  ctx.restore();

  const chSz = 32, chGap = 34;
  for (let i = 0; i < 3; i++) {
    const alpha = 0.8 - i * 0.22;
    const lw    = 4.5 - i * 0.8;
    const lx    = bx - 22 - i * chGap;
    ctx.save();
    ctx.strokeStyle = `rgba(78,160,100,${alpha})`;
    ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lx - chSz * 0.44, cy - chSz * 0.5);
    ctx.lineTo(lx + chSz * 0.44, cy);
    ctx.lineTo(lx - chSz * 0.44, cy + chSz * 0.5);
    ctx.stroke();
    ctx.restore();
    const rx = bx + bW + 22 + i * chGap;
    ctx.save();
    ctx.strokeStyle = `rgba(78,160,100,${alpha})`;
    ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(rx + chSz * 0.44, cy - chSz * 0.5);
    ctx.lineTo(rx - chSz * 0.44, cy);
    ctx.lineTo(rx + chSz * 0.44, cy + chSz * 0.5);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Match countdown image ─────────────────────────────────────────────────────

export async function generateMatchCountdownImage(match: Match): Promise<string> {
  const [homeImg, awayImg] = await Promise.all([
    match.homeTeamLogoUrl       ? loadImg(match.homeTeamLogoUrl)       : Promise.resolve(null),
    match.oppositionTeamLogoUrl ? loadImg(match.oppositionTeamLogoUrl) : Promise.resolve(null),
  ]);

  const W = 1080, H = 1080;
  const canvas  = document.createElement('canvas');
  canvas.width  = W; canvas.height = H;
  const ctx     = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   '#051a0e');
  bg.addColorStop(0.5, '#0d3b1e');
  bg.addColorStop(1,   '#051a0e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let gx = 24; gx < W; gx += 48)
    for (let gy = 24; gy < H; gy += 48) {
      ctx.beginPath(); ctx.arc(gx, gy, 1.5, 0, Math.PI * 2); ctx.fill();
    }

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 54px Arial, sans-serif';
  ctx.fillText('MATCH', W / 2, 52);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 118px Arial, sans-serif';
  ctx.fillText('COUNTDOWN', W / 2, 118);

  const { value, unit } = calcCountdown(match.matchDate ?? '', match.scheduledStartTime);
  drawCountdownBanner(ctx, W / 2, 420, `${value} ${unit} TO GO`);

  const dg = ctx.createLinearGradient(56, 0, W - 56, 0);
  dg.addColorStop(0, 'transparent'); dg.addColorStop(0.12, '#4CAF50');
  dg.addColorStop(0.88, '#4CAF50'); dg.addColorStop(1, 'transparent');
  ctx.strokeStyle = dg; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(56, 510); ctx.lineTo(W - 56, 510); ctx.stroke();

  const logoR  = 118;
  const homeCX = W / 4;
  const awayCX = 3 * W / 4;
  const logoCY = 700;
  drawPhoto(ctx, homeImg, homeCX, logoCY, logoR,
    (match.homeTeamAbbreviation ?? match.homeTeamName ?? '?').slice(0, 2));
  drawPhoto(ctx, awayImg, awayCX, logoCY, logoR,
    (match.oppositionTeamAbbreviation ?? match.oppositionTeamName ?? '?').slice(0, 2));

  ctx.beginPath(); ctx.arc(W / 2, logoCY, 44, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.fillStyle = '#0a3c19';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('VS', W / 2, logoCY);

  const nameY = logoCY + logoR + 18;
  const maxW  = W / 2 - 24;
  for (const [name, cx] of [
    [match.homeTeamName ?? 'HOME',        homeCX],
    [match.oppositionTeamName ?? 'AWAY',  awayCX],
  ] as [string, number][]) {
    const label = name.toUpperCase();
    let fs = 34;
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    while (ctx.measureText(label).width > maxW && fs > 16) { fs--; ctx.font = `bold ${fs}px Arial, sans-serif`; }
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(label, cx, nameY, maxW);
  }

  const footerParts = [
    match.matchDate ? fmtMatchDate(match.matchDate) : null,
    match.scheduledStartTime ? match.scheduledStartTime.slice(0, 5) : null,
    match.fieldName,
  ].filter(Boolean).join('  ·  ');
  if (footerParts) {
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.font = '22px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(footerParts, W / 2, H - 42, W - 80);
  }

  return new Promise<string>(resolve => {
    canvas.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/png');
  });
}

// ── Tournament countdown image ────────────────────────────────────────────────

export async function generateTournamentCountdownImage(
  tournamentName: string,
  tournamentLogoUrl: string | undefined,
  nextMatch: Match,
): Promise<string> {
  const [tournLogo, homeImg, awayImg] = await Promise.all([
    tournamentLogoUrl               ? loadImg(tournamentLogoUrl)               : Promise.resolve(null),
    nextMatch.homeTeamLogoUrl       ? loadImg(nextMatch.homeTeamLogoUrl)       : Promise.resolve(null),
    nextMatch.oppositionTeamLogoUrl ? loadImg(nextMatch.oppositionTeamLogoUrl) : Promise.resolve(null),
  ]);

  const W = 1080, H = 1080;
  const canvas  = document.createElement('canvas');
  canvas.width  = W; canvas.height = H;
  const ctx     = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   '#051a0e');
  bg.addColorStop(0.5, '#0d3b1e');
  bg.addColorStop(1,   '#051a0e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let gx = 24; gx < W; gx += 48)
    for (let gy = 24; gy < H; gy += 48) {
      ctx.beginPath(); ctx.arc(gx, gy, 1.5, 0, Math.PI * 2); ctx.fill();
    }

  const logoR  = 52;
  const logoCY = 44 + logoR;
  drawPhoto(ctx, tournLogo, W / 2, logoCY, logoR, tournamentName.charAt(0));

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.fillText(tournamentName.toUpperCase(), W / 2, logoCY + logoR + 14, W - 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 110px Arial, sans-serif';
  ctx.fillText('COUNTDOWN', W / 2, logoCY + logoR + 58);

  const { value, unit } = calcCountdown(nextMatch.matchDate ?? '', nextMatch.scheduledStartTime);
  drawCountdownBanner(ctx, W / 2, 430, `${value} ${unit} TO GO`);

  // "OPENING MATCH" label
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#86efac';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText('— OPENING MATCH —', W / 2, 510);

  const dg = ctx.createLinearGradient(56, 0, W - 56, 0);
  dg.addColorStop(0, 'transparent'); dg.addColorStop(0.12, '#4CAF50');
  dg.addColorStop(0.88, '#4CAF50'); dg.addColorStop(1, 'transparent');
  ctx.strokeStyle = dg; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(56, 540); ctx.lineTo(W - 56, 540); ctx.stroke();

  const matchLogoR = 108;
  const homeCX     = W / 4;
  const awayCX     = 3 * W / 4;
  const matchLogoCY = 700;
  drawPhoto(ctx, homeImg, homeCX, matchLogoCY, matchLogoR,
    (nextMatch.homeTeamAbbreviation ?? nextMatch.homeTeamName ?? '?').slice(0, 2));
  drawPhoto(ctx, awayImg, awayCX, matchLogoCY, matchLogoR,
    (nextMatch.oppositionTeamAbbreviation ?? nextMatch.oppositionTeamName ?? '?').slice(0, 2));

  ctx.beginPath(); ctx.arc(W / 2, matchLogoCY, 42, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.fillStyle = '#0a3c19';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('VS', W / 2, matchLogoCY);

  const nameY = matchLogoCY + matchLogoR + 16;
  const maxW  = W / 2 - 24;
  for (const [name, cx] of [
    [nextMatch.homeTeamName ?? 'HOME',        homeCX],
    [nextMatch.oppositionTeamName ?? 'AWAY',  awayCX],
  ] as [string, number][]) {
    const label = name.toUpperCase();
    let fs = 30;
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    while (ctx.measureText(label).width > maxW && fs > 15) { fs--; ctx.font = `bold ${fs}px Arial, sans-serif`; }
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(label, cx, nameY, maxW);
  }

  const footerParts = [
    nextMatch.matchDate ? fmtMatchDate(nextMatch.matchDate) : null,
    nextMatch.scheduledStartTime ? nextMatch.scheduledStartTime.slice(0, 5) : null,
  ].filter(Boolean).join('  ·  ');
  if (footerParts) {
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.font = '22px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(footerParts, W / 2, H - 42, W - 80);
  }

  return new Promise<string>(resolve => {
    canvas.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/png');
  });
}

// ── Squad Names template image ────────────────────────────────────────────────

export async function generateSquadNamesImage(
  team: Team,
  squad: Player[],
  tournament: Tournament | null,
): Promise<string> {
  const sorted = [...squad].sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));

  const [teamLogo, tournLogo] = await Promise.all([
    team.logoUrl ? loadImg(team.logoUrl) : Promise.resolve(null),
    tournament?.logoUrl ? loadImg(tournament.logoUrl) : Promise.resolve(null),
  ]);

  const W = 1600;
  const H = 900;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background — dark navy
  ctx.fillStyle = '#081520';
  ctx.fillRect(0, 0, W, H);

  // Paint stroke 1 — upper-left teal splash
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-100, -60);
  ctx.bezierCurveTo(300, -100, 860, 10, 1010, 150);
  ctx.bezierCurveTo(1070, 200, 1030, 295, 930, 325);
  ctx.bezierCurveTo(710, 375, 100, 275, -50, 235);
  ctx.bezierCurveTo(-100, 220, -130, 150, -100, -60);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 90, 130, 0.62)';
  ctx.fill();
  ctx.restore();

  // Paint stroke 2 — lower-left
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-80, H - 215);
  ctx.bezierCurveTo(160, H - 290, 630, H - 195, 810, H - 85);
  ctx.bezierCurveTo(870, H - 48, 840, H + 55, 660, H + 65);
  ctx.bezierCurveTo(360, H + 75, 40, H + 22, -80, H - 215);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 120, 110, 0.50)';
  ctx.fill();
  ctx.restore();

  // Subtle right-half darkening overlay
  const rg = ctx.createLinearGradient(W * 0.60, 0, W, 0);
  rg.addColorStop(0,   'rgba(5,25,50,0)');
  rg.addColorStop(0.4, 'rgba(5,25,60,0.5)');
  rg.addColorStop(1,   'rgba(8,30,70,0.72)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  // ── Tournament logo — top-left corner ────────────────────────────────────────
  if (tournLogo) {
    const tSize = 110;
    const aspect = tournLogo.naturalWidth / tournLogo.naturalHeight;
    const tw = aspect >= 1 ? tSize : tSize * aspect;
    const th = aspect >= 1 ? tSize / aspect : tSize;
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.drawImage(tournLogo, 44, 44, tw, th);
    ctx.restore();
  }

  // ── Team logo — right side ────────────────────────────────────────────────────
  const LOGO_X = W * 0.635;
  const LOGO_W = W - LOGO_X - 50;
  const LOGO_H = H - 140;

  if (teamLogo) {
    const aspect = teamLogo.naturalWidth / teamLogo.naturalHeight;
    let lw = LOGO_W, lh = lw / aspect;
    if (lh > LOGO_H) { lh = LOGO_H; lw = lh * aspect; }
    const lx = LOGO_X + (LOGO_W - lw) / 2;
    const ly = (LOGO_H - lh) / 2 + 30;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(teamLogo, lx, ly, lw, lh);
    ctx.restore();
  } else {
    const logoR = Math.min(LOGO_W, LOGO_H) / 2 - 20;
    drawPhoto(ctx, null, LOGO_X + LOGO_W / 2, LOGO_H / 2 + 30, logoR, team.teamName.charAt(0));
  }

  // Team name — right-aligned at canvas edge, clear of the logo
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.fillText(team.teamName.toUpperCase(), W - 40, H - 22, LOGO_W);

  // ── Left content area ─────────────────────────────────────────────────────────
  const LEFT_X = 60;
  const LEFT_W = W * 0.60 - 80;
  let currentY = 72;

  // Team name — gold
  const teamNameUpper = team.teamName.toUpperCase();
  let titleFs = 88;
  ctx.font = `bold ${titleFs}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  while (ctx.measureText(teamNameUpper).width > LEFT_W && titleFs > 44) {
    titleFs--;
    ctx.font = `bold ${titleFs}px Arial, sans-serif`;
  }
  ctx.fillStyle = '#FFD700';
  ctx.fillText(teamNameUpper, LEFT_X, currentY);
  currentY += titleFs + 6;

  // "SQUAD" — white, slightly larger
  const squadFs = Math.round(titleFs * 1.1);
  ctx.font = `bold ${squadFs}px Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SQUAD', LEFT_X, currentY);
  currentY += squadFs + 14;

  // Subtitle — tournament name
  if (tournament?.name) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillText(`FOR ${tournament.name.toUpperCase()}`, LEFT_X, currentY, LEFT_W);
    currentY += 44;
  }

  // Divider
  currentY += 12;
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(LEFT_X, currentY);
  ctx.lineTo(LEFT_X + LEFT_W, currentY);
  ctx.stroke();
  currentY += 22;

  // ── Player names in columns (fill top-to-bottom per column) ───────────────────
  const NAMES_Y       = currentY;
  const NAMES_AREA_H  = H - NAMES_Y - 48;
  const NUM_COLS      = sorted.length > 15 ? 3 : sorted.length > 9 ? 2 : 1;
  const ROWS_PER_COL  = Math.ceil(sorted.length / NUM_COLS);
  const ROW_H_NAMES   = Math.min(56, Math.max(34, Math.floor(NAMES_AREA_H / ROWS_PER_COL)));
  const COL_W_NAMES   = LEFT_W / NUM_COLS;

  for (let i = 0; i < sorted.length; i++) {
    const col = Math.floor(i / ROWS_PER_COL);
    const row = i % ROWS_PER_COL;
    const x   = LEFT_X + col * COL_W_NAMES;
    const y   = NAMES_Y + row * ROW_H_NAMES + ROW_H_NAMES / 2;

    const p      = sorted[i];
    const isCapt = p.playerId === team.captainId;
    const label  = `${p.name} ${p.surname}${isCapt ? ' (C)' : ''}`.toUpperCase();

    // Square bullet — same style as reference image
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x, y - 5, 9, 9);

    // Player name
    const maxW = COL_W_NAMES - 26;
    let nameFontSize = 24;
    ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;
    while (ctx.measureText(label).width > maxW && nameFontSize > 14) {
      nameFontSize--;
      ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;
    }
    ctx.fillStyle      = isCapt ? '#FFD700' : '#ffffff';
    ctx.textAlign      = 'left';
    ctx.textBaseline   = 'middle';
    ctx.fillText(label, x + 18, y, maxW);
  }

  // Player count — bottom-left
  ctx.fillStyle    = 'rgba(255,255,255,0.40)';
  ctx.font         = '18px Arial, sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${sorted.length} PLAYERS`, LEFT_X, H - 18);

  return new Promise<string>(resolve => {
    canvas.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/png');
  });
}

// ── Role icon helpers ─────────────────────────────────────────────────────────

function drawBatIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = '#86efac';
  ctx.beginPath();
  ctx.roundRect(-sz * 0.14, -sz * 0.3, sz * 0.28, sz * 0.52, sz * 0.07);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.roundRect(-sz * 0.055, -sz * 0.52, sz * 0.11, sz * 0.24, sz * 0.03);
  ctx.fill();
  ctx.restore();
}

function drawBallIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number) {
  const r = sz * 0.33;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#dc2626';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,210,0.9)';
  ctx.lineWidth = sz * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.bezierCurveTo(cx + r * 0.4, cy - r * 0.3, cx + r * 0.4, cy + r * 0.3, cx, cy + r);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.bezierCurveTo(cx - r * 0.4, cy - r * 0.3, cx - r * 0.4, cy + r * 0.3, cx, cy + r);
  ctx.stroke();
}

function drawGlovesIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number) {
  const gw = sz * 0.26; const gh = sz * 0.5; const gap = sz * 0.05;
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath();
  ctx.roundRect(cx - gap / 2 - gw, cy - gh / 2, gw, gh,
    [sz * 0.12, sz * 0.12, sz * 0.06, sz * 0.06]);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + gap / 2, cy - gh / 2, gw, gh,
    [sz * 0.12, sz * 0.12, sz * 0.06, sz * 0.06]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,60,0.2)'; ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    const bx = side === -1 ? cx - gap / 2 - gw : cx + gap / 2;
    for (let f = 1; f <= 3; f++) {
      ctx.beginPath();
      ctx.moveTo(bx + (gw / 4) * f, cy - gh / 2);
      ctx.lineTo(bx + (gw / 4) * f, cy - gh / 2 + gh * 0.42);
      ctx.stroke();
    }
  }
}

function drawRoleIcon(
  ctx: CanvasRenderingContext2D, p: Player, side: MatchSide,
  cx: number, cy: number, sz: number,
) {
  const isWK     = p.playerId === side.wicketKeeperPlayerId;
  const isBowler = !!(p.bowlingType && p.bowlingType !== 'NONE' && !p.partTimeBowler);
  if (isWK)      drawGlovesIcon(ctx, cx, cy, sz);
  else if (isBowler) drawBallIcon(ctx, cx, cy, sz);
  else           drawBatIcon(ctx, cx, cy, sz);
}

// ── Playing XI — Batting Order image ─────────────────────────────────────────

export async function generatePlayingXiBattingOrderImage(
  match: Match,
  sides: MatchSide[],
  players: Player[],
  filterTeamId?: number,
): Promise<string> {
  const sidesToShow = filterTeamId
    ? sides.filter(s => s.teamId === filterTeamId)
    : sides.slice(0, 1);
  const side = sidesToShow[0];
  if (!side) throw new Error('No team side found');

  const xi = (side.playingXi ?? [])
    .map(pid => players.find(p => p.playerId === pid))
    .filter(Boolean) as Player[];
  const twelfth = side.twelfthManPlayerId
    ? players.find(p => p.playerId === side.twelfthManPlayerId)
    : undefined;

  const teamName    = side.teamId === match.homeTeamId
    ? (match.homeTeamName ?? 'Home') : (match.oppositionTeamName ?? 'Away');
  const teamLogoUrl = side.teamId === match.homeTeamId
    ? match.homeTeamLogoUrl : match.oppositionTeamLogoUrl;
  const opponent    = side.teamId === match.homeTeamId
    ? match.oppositionTeamName : match.homeTeamName;

  const teamLogo = teamLogoUrl ? await loadImg(teamLogoUrl) : null;

  const W      = 1080;
  const HDR_H  = 340;
  const ROW_H  = 76;
  const NUM_W  = 90;
  const ICON_W = 100;
  const SUB_H  = twelfth ? 64 : 0;
  const H      = HDR_H + xi.length * ROW_H + SUB_H + 40;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx     = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,    '#051a0e');
  bg.addColorStop(0.45, '#0d3b1e');
  bg.addColorStop(1,    '#051a0e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let gx = 24; gx < W; gx += 48)
    for (let gy = 24; gy < H; gy += 48) {
      ctx.beginPath(); ctx.arc(gx, gy, 1.5, 0, Math.PI * 2); ctx.fill();
    }

  // Header
  const logoR  = 48;
  const logoCY = 28 + logoR;
  drawPhoto(ctx, teamLogo, W / 2, logoCY, logoR, teamName.charAt(0));

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 68px Arial, sans-serif';
  ctx.fillText('PLAYING XI', W / 2, logoCY + logoR + 16);

  // Team name pill
  ctx.font = 'bold 22px Arial, sans-serif';
  const pW = ctx.measureText(teamName.toUpperCase()).width + 40;
  const pH = 36; const pX = W / 2 - pW / 2;
  const pY = logoCY + logoR + 16 + 72 + 8;
  roundedRect(ctx, pX, pY, pW, pH, pH / 2);
  ctx.fillStyle = 'rgba(78,160,100,0.35)'; ctx.fill();
  ctx.strokeStyle = 'rgba(134,239,172,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#86efac'; ctx.textBaseline = 'middle';
  ctx.fillText(teamName.toUpperCase(), W / 2, pY + pH / 2);

  // Sub-info
  const sub = [opponent ? `vs ${opponent}` : null, match.matchDate].filter(Boolean).join('  ·  ');
  if (sub) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '20px Arial, sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText(sub, W / 2, pY + pH + 14, W - 80);
  }

  // Divider
  const dg = ctx.createLinearGradient(40, 0, W - 40, 0);
  dg.addColorStop(0, 'transparent'); dg.addColorStop(0.12, '#4CAF50');
  dg.addColorStop(0.88, '#4CAF50'); dg.addColorStop(1, 'transparent');
  ctx.strokeStyle = dg; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(40, pY + pH + 52); ctx.lineTo(W - 40, pY + pH + 52); ctx.stroke();

  // Player rows
  for (let i = 0; i < xi.length; i++) {
    const p    = xi[i];
    const rowY = HDR_H + i * ROW_H;
    const isCapt = p.playerId === side.captainPlayerId;
    const isWK   = p.playerId === side.wicketKeeperPlayerId;

    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, rowY, W, ROW_H);
    }
    if (i > 0) {
      ctx.fillStyle = 'rgba(134,239,172,0.12)';
      ctx.fillRect(0, rowY, W, 1);
    }

    // Number column
    ctx.fillStyle = 'rgba(20,90,50,0.85)';
    ctx.fillRect(0, rowY, NUM_W, ROW_H);
    ctx.fillStyle = '#86efac';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), NUM_W / 2, rowY + ROW_H / 2);

    // Icon column
    ctx.fillStyle = 'rgba(10,60,30,0.85)';
    ctx.fillRect(W - ICON_W, rowY, ICON_W, ROW_H);
    drawRoleIcon(ctx, p, side, W - ICON_W / 2, rowY + ROW_H / 2, 44);

    // Player name (draw main name first, then gold captain badge if needed)
    const wkSuffix = isWK ? '  (WK)' : '';
    const mainName = `${p.name} ${p.surname}${wkSuffix}`.toUpperCase();
    const nameX       = NUM_W + 20;
    const maxW        = W - NUM_W - ICON_W - 40 - (isCapt ? 72 : 0);
    let fs = 26;
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    while (ctx.measureText(mainName).width > maxW && fs > 14) {
      fs--; ctx.font = `bold ${fs}px Arial, sans-serif`;
    }
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(mainName, nameX, rowY + ROW_H / 2, maxW);

    // Gold captain badge
    if (isCapt) {
      const nameEndX = nameX + Math.min(ctx.measureText(mainName).width, maxW) + 14;
      const badgeW = 52; const badgeH = 28; const badgeR = 8;
      roundedRect(ctx, nameEndX, rowY + ROW_H / 2 - badgeH / 2, badgeW, badgeH, badgeR);
      ctx.fillStyle = '#FFD700'; ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = `bold 16px Arial, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('(C)', nameEndX + badgeW / 2, rowY + ROW_H / 2);
    }
  }

  // Bottom border of last row
  ctx.fillStyle = 'rgba(134,239,172,0.12)';
  ctx.fillRect(0, HDR_H + xi.length * ROW_H, W, 1);

  // 12th man
  if (twelfth) {
    const subY = HDR_H + xi.length * ROW_H + 18;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '20px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(
      `12TH MAN:  ${twelfth.name} ${twelfth.surname}`.toUpperCase(),
      W / 2, subY, W - 80,
    );
  }

  return new Promise<string>(resolve => {
    canvas.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/png');
  });
}

// ── Playing XI — Feature Photo image ─────────────────────────────────────────

export async function generatePlayingXiWithPhotoImage(
  match: Match,
  sides: MatchSide[],
  players: Player[],
  photoUrl: string,
  filterTeamId?: number,
): Promise<string> {
  const sidesToShow = filterTeamId
    ? sides.filter(s => s.teamId === filterTeamId)
    : sides.slice(0, 1);
  const side = sidesToShow[0];
  if (!side) throw new Error('No team side found');

  const xi = (side.playingXi ?? [])
    .map(pid => players.find(p => p.playerId === pid))
    .filter(Boolean) as Player[];
  const twelfth2 = side.twelfthManPlayerId
    ? players.find(p => p.playerId === side.twelfthManPlayerId) : undefined;

  const teamName2    = side.teamId === match.homeTeamId
    ? (match.homeTeamName ?? 'Home') : (match.oppositionTeamName ?? 'Away');
  const opponent2    = side.teamId === match.homeTeamId
    ? match.oppositionTeamName : match.homeTeamName;
  const teamLogoUrl2 = side.teamId === match.homeTeamId
    ? match.homeTeamLogoUrl : match.oppositionTeamLogoUrl;

  const [featurePhoto, teamLogo2] = await Promise.all([
    loadImg(photoUrl),
    teamLogoUrl2 ? loadImg(teamLogoUrl2) : Promise.resolve(null),
  ]);

  const W      = 1600;
  const H      = 1350;
  const HDR_H2 = 210;
  const FOOT_H = 130;
  const ROW_H2 = Math.max(78, Math.min(100, Math.floor((H - HDR_H2 - FOOT_H) / Math.max(xi.length, 1))));
  const ROW_X2 = 900;
  const ROW_W2 = W - ROW_X2 - 32;

  const canvas2 = document.createElement('canvas');
  canvas2.width = W; canvas2.height = H;
  const ctx2 = canvas2.getContext('2d')!;

  // Background
  const bg2 = ctx2.createLinearGradient(0, 0, 0, H);
  bg2.addColorStop(0,   '#051a0e');
  bg2.addColorStop(0.5, '#0d3b1e');
  bg2.addColorStop(1,   '#051a0e');
  ctx2.fillStyle = bg2;
  ctx2.fillRect(0, 0, W, H);

  ctx2.fillStyle = 'rgba(255,255,255,0.025)';
  for (let gx = 24; gx < W; gx += 48)
    for (let gy = 24; gy < H; gy += 48) {
      ctx2.beginPath(); ctx2.arc(gx, gy, 1.5, 0, Math.PI * 2); ctx2.fill();
    }

  // ── Feature photo — diagonal left column ───────────────────────────────────
  const PHOTO_T = 800;
  const PHOTO_B = 690;

  if (featurePhoto) {
    ctx2.save();
    ctx2.beginPath();
    ctx2.moveTo(0,       0);
    ctx2.lineTo(PHOTO_T, 0);
    ctx2.lineTo(PHOTO_B, H);
    ctx2.lineTo(0,       H);
    ctx2.closePath();
    ctx2.clip();
    const aspect = featurePhoto.naturalWidth / featurePhoto.naturalHeight;
    let dw = PHOTO_T, dh = PHOTO_T / aspect;
    if (dh < H) { dh = H; dw = dh * aspect; }
    ctx2.drawImage(featurePhoto, 0, H / 2 - dh / 2, dw, dh);
    ctx2.restore();
  }

  // Right-edge fade: photo → background
  const fade2 = ctx2.createLinearGradient(PHOTO_B - 90, 0, PHOTO_T + 10, 0);
  fade2.addColorStop(0, 'rgba(5,26,14,0)');
  fade2.addColorStop(1, 'rgba(5,26,14,1)');
  ctx2.fillStyle = fade2;
  ctx2.fillRect(PHOTO_B - 90, 0, PHOTO_T - PHOTO_B + 110, H);

  // Bottom vignette on photo
  const vig = ctx2.createLinearGradient(0, H * 0.68, 0, H);
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, 'rgba(0,0,0,0.52)');
  ctx2.fillStyle = vig;
  ctx2.fillRect(0, 0, PHOTO_T, H);

  // ── Header ──────────────────────────────────────────────────────────────────
  drawPhoto(ctx2, teamLogo2, W - 54, 54, 42, teamName2.charAt(0));

  ctx2.textAlign = 'right'; ctx2.textBaseline = 'top';
  ctx2.fillStyle = '#ffffff';
  ctx2.font = 'bold 74px Arial, sans-serif';
  ctx2.fillText('PLAYING XI', W - 30, 108);

  ctx2.fillStyle = '#86efac';
  ctx2.font = 'bold 23px Arial, sans-serif';
  ctx2.fillText(teamName2.toUpperCase(), W - 30, 186, ROW_W2);

  const hDg2 = ctx2.createLinearGradient(ROW_X2, 0, W - 24, 0);
  hDg2.addColorStop(0, 'transparent'); hDg2.addColorStop(0.08, '#4CAF50');
  hDg2.addColorStop(0.92, '#4CAF50'); hDg2.addColorStop(1, 'transparent');
  ctx2.strokeStyle = hDg2; ctx2.lineWidth = 1.5;
  ctx2.beginPath(); ctx2.moveTo(ROW_X2, HDR_H2 - 4); ctx2.lineTo(W - 24, HDR_H2 - 4); ctx2.stroke();

  // ── Player rows ──────────────────────────────────────────────────────────────
  for (let i = 0; i < xi.length; i++) {
    const p      = xi[i];
    const rowY   = HDR_H2 + i * ROW_H2;
    const isCapt = p.playerId === side.captainPlayerId;
    const isWK   = p.playerId === side.wicketKeeperPlayerId;
    const pillY  = rowY + 5;
    const pillH  = ROW_H2 - 10;

    roundedRect(ctx2, ROW_X2, pillY, ROW_W2, pillH, 7);
    if (isCapt) {
      const cg = ctx2.createLinearGradient(ROW_X2, 0, ROW_X2 + ROW_W2, 0);
      cg.addColorStop(0, 'rgba(78,160,100,0.45)');
      cg.addColorStop(1, 'rgba(78,160,100,0.22)');
      ctx2.fillStyle = cg;
    } else {
      ctx2.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
    }
    ctx2.fill();
    if (isCapt) { ctx2.strokeStyle = 'rgba(134,239,172,0.5)'; ctx2.lineWidth = 1.5; ctx2.stroke(); }

    ctx2.fillStyle = isCapt ? '#86efac' : 'rgba(255,255,255,0.36)';
    ctx2.font = 'bold 16px Arial, sans-serif';
    ctx2.textAlign = 'left'; ctx2.textBaseline = 'middle';
    ctx2.fillText(String(i + 1), ROW_X2 + 10, pillY + pillH / 2);

    const captBW = isCapt ? 46 : 0;
    const wkBW   = isWK   ? 44 : 0;
    const maxW2  = ROW_W2 - 44 - captBW - wkBW - 14;

    const label = `${p.name} ${p.surname}`.toUpperCase();
    let fs = 26;
    ctx2.font = `bold ${fs}px Arial, sans-serif`;
    while (ctx2.measureText(label).width > maxW2 && fs > 13) {
      fs--; ctx2.font = `bold ${fs}px Arial, sans-serif`;
    }
    ctx2.fillStyle = '#ffffff'; ctx2.textAlign = 'left'; ctx2.textBaseline = 'middle';
    ctx2.fillText(label, ROW_X2 + 42, pillY + pillH / 2, maxW2);

    if (isCapt) {
      const bx = ROW_X2 + ROW_W2 - captBW - wkBW - 6;
      const bh = 24;
      roundedRect(ctx2, bx, pillY + pillH / 2 - bh / 2, captBW, bh, 5);
      ctx2.fillStyle = '#FFD700'; ctx2.fill();
      ctx2.fillStyle = '#000'; ctx2.font = 'bold 14px Arial, sans-serif';
      ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
      ctx2.fillText('(C)', bx + captBW / 2, pillY + pillH / 2);
    }

    if (isWK) {
      const bx = ROW_X2 + ROW_W2 - wkBW - 6;
      const bh = 24;
      roundedRect(ctx2, bx, pillY + pillH / 2 - bh / 2, wkBW, bh, 5);
      ctx2.fillStyle = 'rgba(96,165,250,0.85)'; ctx2.fill();
      ctx2.fillStyle = '#fff'; ctx2.font = 'bold 13px Arial, sans-serif';
      ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
      ctx2.fillText('WK', bx + wkBW / 2, pillY + pillH / 2);
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY2 = HDR_H2 + xi.length * ROW_H2;

  const fDg2 = ctx2.createLinearGradient(ROW_X2, 0, W - 24, 0);
  fDg2.addColorStop(0, 'transparent'); fDg2.addColorStop(0.08, '#4CAF50');
  fDg2.addColorStop(0.92, '#4CAF50'); fDg2.addColorStop(1, 'transparent');
  ctx2.strokeStyle = fDg2; ctx2.lineWidth = 1.5;
  ctx2.beginPath(); ctx2.moveTo(ROW_X2, footerY2 + 16); ctx2.lineTo(W - 24, footerY2 + 16); ctx2.stroke();

  if (twelfth2) {
    ctx2.fillStyle = 'rgba(255,255,255,0.48)';
    ctx2.font = '18px Arial, sans-serif';
    ctx2.textAlign = 'right'; ctx2.textBaseline = 'top';
    ctx2.fillText(`12TH MAN:  ${twelfth2.name} ${twelfth2.surname}`.toUpperCase(), W - 28, footerY2 + 24);
  }

  const matchLine2 = [
    opponent2 ? `vs ${opponent2}` : null,
    match.matchDate ? fmtMatchDate(match.matchDate) : null,
    match.scheduledStartTime ? match.scheduledStartTime.slice(0, 5) : null,
    match.fieldName,
  ].filter(Boolean).join('  ·  ');
  if (matchLine2) {
    ctx2.fillStyle = 'rgba(255,255,255,0.42)';
    ctx2.font = '20px Arial, sans-serif';
    ctx2.textAlign = 'right'; ctx2.textBaseline = 'bottom';
    ctx2.fillText(matchLine2, W - 28, H - 36, ROW_W2);
  }

  return new Promise<string>(resolve => {
    canvas2.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/png');
  });
}
