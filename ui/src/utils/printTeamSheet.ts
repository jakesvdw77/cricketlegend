import { Match, MatchSide, Player } from '../types';

function getRoleText(player: Player, battingPosition: number, isWK: boolean): string {
  const isBowler = player.bowlingType && player.bowlingType !== 'NONE' && !player.partTimeBowler;
  const showBat = player.battingPosition !== 'LOWER_ORDER' || battingPosition <= 7;
  if (isWK) return showBat ? '🏏 🧤' : '🧤';
  if (isBowler) return showBat ? '🏏 🔴' : '🔴';
  return showBat ? '🏏' : '';
}

export function printTeamSheet(match: Match, side: MatchSide, xi: Player[], captain: Player | undefined, twelfth: Player | undefined, teamName: string): void {
  const rows = xi.map((p, idx) => {
    const battingPosition = idx + 1;
    const isWK = p.playerId === side.wicketKeeperPlayerId;
    const isCaptain = p.playerId === captain?.playerId;
    const role = getRoleText(p, battingPosition, isWK);
    return `
      <tr>
        <td class="num">${battingPosition}</td>
        <td class="name">${p.name} ${p.surname}${isCaptain ? ' <span class="captain">(C)</span>' : ''}</td>
        <td class="shirt">${p.shirtNumber != null ? `#${p.shirtNumber}` : '—'}</td>
        <td class="role">${role}</td>
      </tr>`;
  }).join('');

  const twelfthRow = twelfth
    ? `<tr class="twelfth"><td colspan="4">12th Man: <strong>${twelfth.name} ${twelfth.surname}</strong>${twelfth.shirtNumber ? ` (#${twelfth.shirtNumber})` : ''}</td></tr>`
    : '';

  const metaItems = [
    match.matchDate ? `📅 ${match.matchDate}` : '',
    match.arrivalTime ? `🚗 Arrive: ${match.arrivalTime}` : '',
    match.tossTime ? `🕐 Toss: ${match.tossTime}` : '',
    match.scheduledStartTime ? `⏰ Start: ${match.scheduledStartTime}` : '',
    match.fieldName ? `📍 ${match.fieldName}` : '',
    match.umpire ? `Umpire: ${match.umpire}` : '',
  ].filter(Boolean).map(s => `<span>${s}</span>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${teamName} — Team Sheet</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }

    .header {
      border-bottom: 3px solid #1a237e;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .header h1 { font-size: 20px; color: #1a237e; margin-bottom: 4px; }
    .header h2 { font-size: 15px; color: #333; margin-bottom: 8px; font-weight: normal; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: #555; }

    .captain-row { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; font-size: 12px; color: #444; }

    .section-title {
      font-size: 13px; font-weight: bold; text-transform: uppercase;
      letter-spacing: 0.05em; color: #1a237e; margin-bottom: 8px;
    }

    table { width: 100%; border-collapse: collapse; }
    thead tr {
      background-color: #1a237e !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    thead th {
      padding: 6px 8px; text-align: left; font-size: 11px;
      text-transform: uppercase; letter-spacing: 0.04em;
      color: #ffffff !important;
      background-color: #1a237e !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    tbody tr:nth-child(even) { background: #f5f5f5; }
    tbody td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }
    .num { width: 28px; text-align: center; }
    .name { font-weight: 600; }
    .shirt { width: 50px; text-align: center; }
    .role { width: 60px; }
    .captain { color: #e67e22; font-weight: bold; }
    .twelfth td { font-size: 11px; color: #555; font-style: italic; padding: 6px 8px; border-top: 1px solid #ccc; }

    .footer { margin-top: 24px; font-size: 10px; color: #aaa; text-align: right; }

    @media print {
      body { padding: 0; }
      @page { margin: 18mm 16mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${match.homeTeamName} vs ${match.oppositionTeamName}</h1>
    <h2>${match.tournamentName ?? ''}</h2>
    <div class="meta">${metaItems}</div>
  </div>

  <div class="section-title">${teamName} — Playing XI</div>
  ${captain ? `<div class="captain-row">⭐ Captain: <strong>${captain.name} ${captain.surname}</strong></div>` : ''}

  <table>
    <thead>
      <tr>
        <th style="background-color:#1a237e;color:#ffffff;padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;width:28px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">#</th>
        <th style="background-color:#1a237e;color:#ffffff;padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Player</th>
        <th style="background-color:#1a237e;color:#ffffff;padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;width:50px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Shirt</th>
        <th style="background-color:#1a237e;color:#ffffff;padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;width:60px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Role</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${twelfthRow}
    </tbody>
  </table>

  <div class="footer">Printed ${new Date().toLocaleDateString()}</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 0);
}
