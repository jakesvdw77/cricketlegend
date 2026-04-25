import React from 'react';
import { TeamScorecard } from '../../../types';
import { TemplateProps } from './types';

const MatchCardPreview: React.FC<TemplateProps> = ({
  match, result, tournament, firstTeamName, secondTeamName, firstCard, secondCard, motmName,
}) => {
  const s = {
    card: {
      fontFamily: "'Segoe UI', Arial, sans-serif",
      width: 620,
      backgroundColor: '#0d3349',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    } as React.CSSProperties,
    header: {
      background: 'linear-gradient(135deg, #1a5276 0%, #0d3349 100%)',
      padding: '20px 24px 16px',
      borderBottom: '3px solid #28b463',
    } as React.CSSProperties,
    brand: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
    } as React.CSSProperties,
    brandText: { color: '#a9cce3', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const, fontWeight: 600 },
    vsRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 } as React.CSSProperties,
    teamName: { color: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center' as const, flex: 1 } as React.CSSProperties,
    vs: { color: '#28b463', fontSize: 14, fontWeight: 700 },
    metaRow: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' as const } as React.CSSProperties,
    meta: { color: '#a9cce3', fontSize: 12 },

    section: (alt = false) => ({
      backgroundColor: alt ? '#112d3e' : '#0f2837',
      padding: '12px 24px',
      borderBottom: '1px solid #1a4060',
    } as React.CSSProperties),
    sectionTitle: { color: '#28b463', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 6 },
    inningsHeader: { color: '#7fb3d3', fontSize: 13, fontWeight: 600, marginBottom: 4 } as React.CSSProperties,
    score: { color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 6 } as React.CSSProperties,
    scoreOvers: { fontSize: 13, fontWeight: 400, color: '#7fb3d3', marginLeft: 8 },
    row: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 } as React.CSSProperties,
    icon: { color: '#28b463', fontSize: 10, fontWeight: 700, minWidth: 28 },
    name: { color: '#cde4f0', fontSize: 13, fontWeight: 600, minWidth: 140 } as React.CSSProperties,
    stat: { color: '#7fb3d3', fontSize: 12 } as React.CSSProperties,

    result: {
      background: 'linear-gradient(135deg, #1e8449 0%, #145a32 100%)',
      padding: '14px 24px',
    } as React.CSSProperties,
    resultText: { color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 4 } as React.CSSProperties,
    motm: { color: '#f9e79f', fontSize: 13, fontWeight: 600 } as React.CSSProperties,
    badge: { color: '#a9dfbf', fontSize: 11, marginBottom: 4 } as React.CSSProperties,

    footer: {
      backgroundColor: '#091e2d',
      padding: '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    } as React.CSSProperties,
    footerText: { color: '#4a7a99', fontSize: 11 },
  };

  const stageMap: Record<string, string> = { FRIENDLY: 'Friendly', POOL: 'Pool Stage', QUARTER_FINAL: 'Quarter-Final', SEMI_FINAL: 'Semi-Final', FINAL: 'Final' };

  const renderBatting = (card: TeamScorecard) =>
    (card.batting ?? []).filter(b => b.playerName).map((b, i) => {
      const stat = [
        b.score      != null && `${b.score}${b.ballsFaced != null ? `(${b.ballsFaced})` : ''}`,
        b.fours != null && b.fours > 0 && `${b.fours}×4`,
        b.sixes != null && b.sixes > 0 && `${b.sixes}×6`,
      ].filter(Boolean).join('  ');
      return (
        <div key={i} style={s.row}>
          <span style={s.icon}>🏏</span>
          <span style={s.name}>{b.playerName}</span>
          <span style={s.stat}>{stat}</span>
        </div>
      );
    });

  const renderBowling = (card: TeamScorecard) =>
    (card.bowling ?? []).filter(b => b.playerName).map((b, i) => {
      const stat = [
        b.wickets != null && `${b.wickets}/${b.runs ?? '?'}`,
        b.overs           && `${b.overs} ov`,
        b.maidens != null && b.maidens > 0 && `${b.maidens}m`,
      ].filter(Boolean).join('  ');
      return (
        <div key={i} style={s.row}>
          <span style={s.icon}>🔴</span>
          <span style={s.name}>{b.playerName}</span>
          <span style={s.stat}>{stat}</span>
        </div>
      );
    });

  const tossTeam =
    match.tossWonBy === 'HOME'       ? match.homeTeamName :
    match.tossWonBy === 'OPPOSITION' ? match.oppositionTeamName : null;
  const tossDecision =
    match.tossDecision === 'BAT'  ? 'elected to bat' :
    match.tossDecision === 'BOWL' ? 'elected to bowl' : null;

  const winnerName = result.winningTeamName ?? '';

  return (
    <div style={s.card}>

      {/* Header */}
      <div style={s.header}>
        <div style={s.brand}>
          <span style={s.brandText}>Cricket Legend — Match Report</span>
          {tournament?.logoUrl
            ? <img src={tournament.logoUrl} alt="tournament" crossOrigin="anonymous" style={{ height: 44, width: 44, objectFit: 'contain', borderRadius: 6, background: 'rgba(255,255,255,0.1)', padding: 3 }} />
            : <span style={{ fontSize: 22 }}>🏏</span>
          }
        </div>
        <div style={s.vsRow}>
          <span style={s.teamName}>{match.homeTeamName}</span>
          <span style={s.vs}>VS</span>
          <span style={s.teamName}>{match.oppositionTeamName}</span>
        </div>
        <div style={s.metaRow}>
          {match.matchDate && <span style={s.meta}>📅 {String(match.matchDate)}</span>}
          {match.fieldName && <span style={s.meta}>📍 {match.fieldName}</span>}
          {match.umpire    && <span style={s.meta}>🧑‍⚖️ {match.umpire}</span>}
        </div>
      </div>

      {/* Tournament */}
      {(tournament || match.tournamentName) && (
        <div style={s.section()}>
          <div style={s.sectionTitle}>Tournament</div>
          <span style={{ color: '#cde4f0', fontSize: 13 }}>
            🏆 {tournament?.name ?? match.tournamentName}
            {tournament?.cricketFormat && ` · ${tournament.cricketFormat}`}
            {match.matchStage && ` · ${stageMap[match.matchStage] ?? match.matchStage}`}
          </span>
        </div>
      )}

      {/* Toss */}
      {tossTeam && (
        <div style={s.section(true)}>
          <div style={s.sectionTitle}>Toss</div>
          <span style={{ color: '#cde4f0', fontSize: 13 }}>
            🪙 {tossTeam} won the toss{tossDecision ? ` and ${tossDecision}` : ''}
          </span>
        </div>
      )}

      {/* 1st Innings */}
      <div style={s.section()}>
        <div style={s.sectionTitle}>1st Innings</div>
        <div style={s.inningsHeader}>{firstTeamName}</div>
        {result.scoreBattingFirst != null && (
          <div style={s.score}>
            {result.scoreBattingFirst}/{result.wicketsLostBattingFirst ?? '?'}
            <span style={s.scoreOvers}>({result.oversBattingFirst ?? '?'} ov)</span>
          </div>
        )}
        {renderBatting(firstCard)}
        {renderBowling(secondCard)}
      </div>

      {/* 2nd Innings */}
      <div style={s.section(true)}>
        <div style={s.sectionTitle}>2nd Innings</div>
        <div style={s.inningsHeader}>{secondTeamName}</div>
        {result.scoreBattingSecond != null && (
          <div style={s.score}>
            {result.scoreBattingSecond}/{result.wicketsLostBattingSecond ?? '?'}
            <span style={s.scoreOvers}>({result.oversBattingSecond ?? '?'} ov)</span>
          </div>
        )}
        {renderBatting(secondCard)}
        {renderBowling(firstCard)}
      </div>

      {/* Result */}
      <div style={s.result}>
        {result.matchDrawn ? (
          <div style={s.resultText}>⚖️ Match Drawn</div>
        ) : winnerName || result.matchOutcomeDescription ? (
          <div style={s.resultText}>
            🏆 {result.matchOutcomeDescription || `${winnerName} won`}
          </div>
        ) : null}
        {(result.decidedOnDLS || result.wonWithBonusPoint) && (
          <div style={s.badge}>
            {result.decidedOnDLS      && 'DLS method  '}
            {result.wonWithBonusPoint && 'Bonus point'}
          </div>
        )}
        {motmName && <div style={s.motm}>🌟 Man of the Match: {motmName}</div>}
      </div>

      {/* Sponsors */}
      {(tournament?.sponsors ?? []).filter(sp => sp.brandLogoUrl).length > 0 && (
        <div style={{ backgroundColor: '#ffffff', padding: '10px 20px', borderTop: '1px solid #e0e0e0' }}>
          <div style={{ color: '#9e9e9e', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8, textAlign: 'center' as const }}>
            Sponsors
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' as const }}>
            {(tournament!.sponsors!).filter(sp => sp.brandLogoUrl).map(sp => (
              <img
                key={sp.sponsorId}
                src={sp.brandLogoUrl}
                alt={sp.name}
                crossOrigin="anonymous"
                title={sp.name}
                style={{ height: 36, maxWidth: 100, objectFit: 'contain' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={s.footer}>
        <span style={s.footerText}>Cricket Legend</span>
        <span style={s.footerText}>🏏 cricketlegend.co.za</span>
      </div>

    </div>
  );
};

export default MatchCardPreview;
