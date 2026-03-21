import { Player, Team } from '../types';
import { playerDescription } from './playerDescription';

export function printSquad(team: Team, squad: Player[]): void {
  const logoHtml = team.logoUrl
    ? `<img src="${team.logoUrl}" alt="${team.teamName} logo" class="logo" />`
    : `<div class="logo-placeholder">${team.teamName.charAt(0)}</div>`;

  const metaRows = [
    team.associatedClubName && `<span><strong>Club:</strong> ${team.associatedClubName}</span>`,
    team.captainName && `<span><strong>Captain:</strong> ${team.captainName}</span>`,
    team.coach && `<span><strong>Coach:</strong> ${team.coach}</span>`,
    team.manager && `<span><strong>Manager:</strong> ${team.manager}</span>`,
    team.homeFieldName && `<span><strong>Home Ground:</strong> ${team.homeFieldName}</span>`,
  ].filter(Boolean).join('');

  const rows = squad.map((p, i) => {
    const roles = playerDescription(p);
    return `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="shirt">${p.shirtNumber != null ? `#${p.shirtNumber}` : ''}</td>
        <td class="name">${p.name} ${p.surname}</td>
        <td class="roles">${roles}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${team.teamName} — Squad</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }

    /* ── Header ─────────────────────────────── */
    .header {
      display: flex;
      align-items: center;
      gap: 18px;
      border-bottom: 3px solid #1a237e;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .logo {
      width: 80px;
      height: 80px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .logo-placeholder {
      width: 80px;
      height: 80px;
      flex-shrink: 0;
      background: #1a237e;
      color: #fff;
      font-size: 36px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    .header-text h1 {
      font-size: 22px;
      color: #1a237e;
      margin-bottom: 6px;
    }
    .header-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 11px;
      color: #444;
    }

    /* ── Squad title ─────────────────────────── */
    .section-title {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #1a237e;
      margin-bottom: 8px;
    }

    /* ── Table ───────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead tr {
      background: #1a237e;
      color: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    thead th {
      padding: 6px 8px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    tbody tr:nth-child(even) { background: #f5f5f5; }
    tbody td {
      padding: 5px 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    .num  { width: 28px; color: #333; text-align: center; }
    .shirt { width: 40px; color: #111; text-align: center; font-weight: 600; }
    .name  { font-weight: 600; }
    .roles { color: #111; font-size: 11px; }

    /* ── Footer ──────────────────────────────── */
    .footer {
      margin-top: 24px;
      font-size: 10px;
      color: #aaa;
      text-align: right;
    }

    @media print {
      body { padding: 0; }
      @page { margin: 18mm 16mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="header-text">
      <h1>${team.teamName}</h1>
      <div class="header-meta">${metaRows}</div>
    </div>
  </div>

  <div class="section-title">Squad (${squad.length} players)</div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th class="shirt">Shirt</th>
        <th class="name">Player</th>
        <th class="roles">Batting / Bowling / Role</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">Printed ${new Date().toLocaleDateString()}</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  // Small delay to let the logo image load before printing
  setTimeout(() => win.print(), team.logoUrl ? 800 : 0);
}
