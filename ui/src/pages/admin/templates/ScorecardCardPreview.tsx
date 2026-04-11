import React from 'react';
import { BattingEntry, BowlingEntry } from '../../../types';
import { TemplateProps } from './types';

const ScorecardCardPreview: React.FC<TemplateProps> = ({
  match, result, tournament, firstTeamName, secondTeamName, firstCard, secondCard,
}) => {
  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    fontFamily: "'Segoe UI', 'Arial Narrow', Arial, sans-serif",
    width: 700,
    backgroundColor: '#080c14',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
  };

  const titleBar: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0d1b2a 0%, #1a2744 100%)',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    borderBottom: '2px solid #243b55',
  };

  const teamTitle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: 3,
    textTransform: 'uppercase',
  };

  const vsLabel: React.CSSProperties = {
    color: '#4a90d9',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.8,
  };

  const teamHeader = (color: string): React.CSSProperties => ({
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    borderLeft: '4px solid rgba(255,255,255,0.25)',
  });

  const teamHeaderName: React.CSSProperties = {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  };

  const teamScore: React.CSSProperties = {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: 1,
  };

  const teamOvers: React.CSSProperties = {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: 400,
    marginLeft: 6,
  };

  const colHeader: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    borderBottom: '1px solid #1e2d40',
    backgroundColor: '#0d1521',
  };

  const colLabel: React.CSSProperties = {
    color: '#4a90d9',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    padding: '5px 20px',
  };

  const row = (i: number): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    backgroundColor: i % 2 === 0 ? '#0b1322' : '#0f1929',
    borderBottom: '1px solid #131d2b',
    minHeight: 34,
  });

  const cell: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 20px',
    gap: 0,
  };

  const divider: React.CSSProperties = {
    borderLeft: '1px solid #1e2d40',
  };

  const playerName: React.CSSProperties = {
    color: '#e8edf2',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const statBat: React.CSSProperties = {
    color: '#f0c040',
    fontSize: 12,
    fontWeight: 700,
    minWidth: 64,
    textAlign: 'right',
    flexShrink: 0,
  };

  const statBall: React.CSSProperties = {
    color: 'rgba(240,192,64,0.55)',
    fontSize: 11,
    fontWeight: 400,
    marginLeft: 2,
    flexShrink: 0,
  };

  const statBowl: React.CSSProperties = {
    color: '#6ec87a',
    fontSize: 12,
    fontWeight: 700,
    minWidth: 48,
    textAlign: 'right',
    flexShrink: 0,
  };

  const footer: React.CSSProperties = {
    backgroundColor: '#060a10',
    padding: '8px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid #1a2535',
  };

  const footerText: React.CSSProperties = { color: '#2d4a6a', fontSize: 10, letterSpacing: 1 };

  // ── Render helpers ────────────────────────────────────────────────────────
  const formatBat = (b: BattingEntry) => {
    const runs  = b.score      != null ? String(b.score)      : '—';
    const balls = b.ballsFaced != null ? `(${b.ballsFaced})`  : '';
    const extras: string[] = [];
    if (b.fours != null && b.fours > 0) extras.push(`${b.fours}×4`);
    if (b.sixes != null && b.sixes > 0) extras.push(`${b.sixes}×6`);
    return { runs, balls, extras: extras.join(' ') };
  };

  const formatBowl = (b: BowlingEntry) => {
    const wkts = b.wickets != null ? b.wickets : 0;
    const runs  = b.runs    != null ? b.runs    : 0;
    return `${wkts}-${runs}`;
  };

  // Pair each batter with the corresponding bowler (same row index)
  const renderInnings = (
    teamColor: string,
    teamName: string,
    score: number | undefined,
    wkts: number | undefined,
    overs: string | undefined,
    batters: BattingEntry[],
    bowlers: BowlingEntry[],
  ) => {
    const scoreStr = score != null
      ? `${score}${wkts != null ? `/${wkts}` : ''}`
      : '—';
    const rows = Math.max(batters.length, bowlers.length);

    return (
      <div>
        {/* Team header */}
        <div style={teamHeader(teamColor)}>
          <span style={teamHeaderName}>{teamName}</span>
          <span>
            <span style={teamScore}>{scoreStr}</span>
            {overs && <span style={teamOvers}>({overs} ov)</span>}
          </span>
        </div>

        {/* Column labels */}
        <div style={colHeader}>
          <div style={colLabel}>Batting</div>
          <div style={{ ...colLabel, ...divider }}>Bowling</div>
        </div>

        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => {
          const bat  = batters[i];
          const bowl = bowlers[i];
          const { runs, balls, extras } = bat ? formatBat(bat) : { runs: '', balls: '', extras: '' };

          return (
            <div key={i} style={row(i)}>
              {/* Batting cell */}
              <div style={cell}>
                {bat?.playerName ? (
                  <>
                    <span style={playerName}>{bat.playerName}</span>
                    <span style={statBat}>{runs}</span>
                    <span style={statBall}>{balls}</span>
                    {extras && <span style={{ ...statBall, marginLeft: 6, color: 'rgba(240,192,64,0.4)', fontSize: 10 }}>{extras}</span>}
                  </>
                ) : null}
              </div>

              {/* Bowling cell */}
              <div style={{ ...cell, ...divider }}>
                {bowl?.playerName ? (
                  <>
                    <span style={playerName}>{bowl.playerName}</span>
                    <span style={statBowl}>{formatBowl(bowl)}</span>
                    {bowl.overs && <span style={{ ...statBall, color: 'rgba(110,200,122,0.5)' }}> {bowl.overs}ov</span>}
                  </>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {rows === 0 && (
          <div style={{ ...row(0), justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ color: '#2d4a6a', fontSize: 11, padding: '8px 20px' }}>
              No performer data captured
            </span>
          </div>
        )}
      </div>
    );
  };

  const gap: React.CSSProperties = { height: 8, backgroundColor: '#050810' };

  return (
    <div style={card}>

      {/* Title */}
      <div style={titleBar}>
        {tournament?.logoUrl
          ? <img src={tournament.logoUrl} alt="tournament" crossOrigin="anonymous" style={{ height: 40, width: 40, objectFit: 'contain', borderRadius: 6, background: 'rgba(255,255,255,0.08)', padding: 3, flexShrink: 0 }} />
          : <span style={{ width: 40 }} />
        }
        <span style={teamTitle}>{match.homeTeamName}</span>
        <span style={vsLabel}>v</span>
        <span style={teamTitle}>{match.oppositionTeamName}</span>
        {tournament?.logoUrl
          ? <span style={{ width: 40 }} />
          : <span style={{ width: 40 }} />
        }
      </div>

      {/* 1st Innings */}
      {renderInnings(
        'linear-gradient(90deg, #065f46 0%, #047857 100%)',
        firstTeamName,
        result.scoreBattingFirst,
        result.wicketsLostBattingFirst,
        result.oversBattingFirst,
        firstCard.batting ?? [],
        firstCard.bowling ?? [],
      )}

      <div style={gap} />

      {/* 2nd Innings */}
      {renderInnings(
        'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)',
        secondTeamName,
        result.scoreBattingSecond,
        result.wicketsLostBattingSecond,
        result.oversBattingSecond,
        secondCard.batting ?? [],
        secondCard.bowling ?? [],
      )}

      {/* Result strip */}
      {(result.matchOutcomeDescription || result.matchDrawn) && (
        <div style={{
          backgroundColor: '#0d1521',
          padding: '8px 20px',
          borderTop: '1px solid #1e2d40',
          textAlign: 'center',
        }}>
          <span style={{ color: '#f0c040', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            {result.matchDrawn ? 'MATCH DRAWN' : result.matchOutcomeDescription?.toUpperCase()}
          </span>
        </div>
      )}

      {/* Sponsors */}
      {(tournament?.sponsors ?? []).filter(sp => sp.brandLogoUrl).length > 0 && (
        <div style={{ backgroundColor: '#0a1018', padding: '10px 20px', borderTop: '1px solid #1e2d40' }}>
          <div style={{ color: '#4a6a8a', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8, textAlign: 'center' as const }}>
            Sponsors
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' as const }}>
            {tournament!.sponsors!.filter(sp => sp.brandLogoUrl).map(sp => (
              <img key={sp.sponsorId} src={sp.brandLogoUrl} alt={sp.name} crossOrigin="anonymous" title={sp.name}
                style={{ height: 34, maxWidth: 100, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.7 }} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={footer}>
        <span style={footerText}>CRICKET LEGEND</span>
        {match.matchDate && <span style={footerText}>{String(match.matchDate).toUpperCase()}</span>}
        <span style={footerText}>🏏</span>
      </div>

    </div>
  );
};

export default ScorecardCardPreview;
