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
  const HDR_H   = 290;
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

  const W          = 1080;
  const HMARGIN    = 56;
  const HDR_H      = teamName ? 310 : 270;
  const DATE_H     = 56;
  const MATCH_H    = 106;
  const VENUE_H    = showVenue ? 28 : 0;  // extra height per match when venue shown
  const MATCH_GAP  = 18;
  const DATE_GAP   = 32;

  const H = HDR_H
    + dateGroups.length * DATE_H
    + sorted.length * (MATCH_H + VENUE_H)
    + Math.max(sorted.length - 1, 0) * MATCH_GAP
    + Math.max(dateGroups.length - 1, 0) * DATE_GAP
    + 48;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx     = canvas.getContext('2d')!;

  // Background
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

  // Header
  const logoR  = 44;
  const logoCY = 28 + logoR;
  drawPhoto(ctx, tournamentLogo, W / 2, logoCY, logoR, tournamentName.charAt(0));

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font      = 'bold 26px Arial, sans-serif';
  ctx.fillText(tournamentName.toUpperCase(), W / 2, logoCY + logoR + 14, W - HMARGIN * 2);

  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 72px Arial, sans-serif';
  ctx.fillText('MATCH SCHEDULE', W / 2, logoCY + logoR + 48);

  // Team name pill (optional)
  if (teamName) {
    const pillText = teamName.toUpperCase();
    ctx.font       = 'bold 22px Arial, sans-serif';
    const pillW2   = ctx.measureText(pillText).width + 40;
    const pillH2   = 36;
    const pillX2   = W / 2 - pillW2 / 2;
    const pillY2   = logoCY + logoR + 48 + 76;
    roundedRect(ctx, pillX2, pillY2, pillW2, pillH2, pillH2 / 2);
    ctx.fillStyle   = 'rgba(78,160,100,0.35)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(134,239,172,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.fillStyle    = '#86efac';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillText, W / 2, pillY2 + pillH2 / 2);
  }

  const divY = HDR_H - 20;
  const dg   = ctx.createLinearGradient(HMARGIN, 0, W - HMARGIN, 0);
  dg.addColorStop(0, 'transparent'); dg.addColorStop(0.12, '#4CAF50');
  dg.addColorStop(0.88, '#4CAF50'); dg.addColorStop(1, 'transparent');
  ctx.strokeStyle = dg; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(HMARGIN, divY); ctx.lineTo(W - HMARGIN, divY); ctx.stroke();

  // Match rows
  const VS_R     = 30;
  const PILL_H   = 76;
  const PILL_R   = PILL_H / 2;
  const availW   = W - HMARGIN * 2;
  const pillW    = (availW - VS_R * 2 - 20) / 2;
  const LOGO_R   = 24;

  let y = HDR_H + 8;

  for (let di = 0; di < dateGroups.length; di++) {
    const [dateKey, dayMatches] = dateGroups[di];

    const dateLabel = dateKey !== 'TBD' ? fmtMatchDate(dateKey) : 'Date TBD';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font      = 'bold 28px Arial, sans-serif';
    ctx.fillText(dateLabel, W / 2, y + DATE_H / 2, W - HMARGIN * 2);
    y += DATE_H;

    for (let mi = 0; mi < dayMatches.length; mi++) {
      const m       = dayMatches[mi];
      const matchCY = y + MATCH_H / 2;
      const pillTop = matchCY - PILL_H / 2;

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

      const drawTeamName = (text: string, textX: number) => {
        const maxW = pillW - PILL_R * 2 - 16;
        let fs = 26;
        ctx.font = `bold ${fs}px Arial, sans-serif`;
        while (ctx.measureText(text).width > maxW && fs > 13) { fs--; ctx.font = `bold ${fs}px Arial, sans-serif`; }
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(text, textX, matchCY, maxW);
      };

      // Home
      drawPill(HMARGIN);
      const hLogoCX = HMARGIN + PILL_R;
      drawPhoto(ctx, m.homeTeamLogoUrl ? logos.get(m.homeTeamLogoUrl) ?? null : null,
        hLogoCX, matchCY, LOGO_R, (m.homeTeamAbbreviation ?? m.homeTeamName ?? '?').slice(0, 2));
      drawTeamName((m.homeTeamAbbreviation ?? m.homeTeamName ?? 'TBD').toUpperCase(), hLogoCX + PILL_R + 10);

      // Away
      const aPillX = W - HMARGIN - pillW;
      drawPill(aPillX);
      const aLogoCX = aPillX + PILL_R;
      drawPhoto(ctx, m.oppositionTeamLogoUrl ? logos.get(m.oppositionTeamLogoUrl) ?? null : null,
        aLogoCX, matchCY, LOGO_R, (m.oppositionTeamAbbreviation ?? m.oppositionTeamName ?? '?').slice(0, 2));
      drawTeamName((m.oppositionTeamAbbreviation ?? m.oppositionTeamName ?? 'TBD').toUpperCase(), aLogoCX + PILL_R + 10);

      // VS
      ctx.beginPath(); ctx.arc(W / 2, matchCY, VS_R, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.fillStyle = '#0a3c19'; ctx.font = 'bold 18px Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('VS', W / 2, matchCY);

      // Time
      if (m.scheduledStartTime) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '20px Arial, sans-serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText(m.scheduledStartTime.slice(0, 5), W - HMARGIN, pillTop - 4);
      }

      // Venue
      if (showVenue && m.fieldName) {
        ctx.fillStyle    = 'rgba(255,255,255,0.45)';
        ctx.font         = '19px Arial, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`📍 ${m.fieldName}`, W / 2, y + MATCH_H + 4, W - HMARGIN * 2);
      }

      y += MATCH_H + VENUE_H + (mi < dayMatches.length - 1 ? MATCH_GAP : 0);
    }
    if (di < dateGroups.length - 1) y += DATE_GAP;
  }

  return new Promise<string>(resolve => {
    canvas.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/png');
  });
}
