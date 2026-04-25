import React from 'react';
import { BattingEntry, BowlingEntry } from '../../../types';
import { TemplateProps } from './types';

const BroadcastScorecardPreview: React.FC<TemplateProps> = ({
  match, result, tournament, firstTeamName, secondTeamName, firstCard, secondCard, motmName,
}) => {
  const w = 760;

  const s = {
    card: {
      fontFamily: "'Arial Narrow', Arial, 'Helvetica Neue', sans-serif",
      width: w,
      background: 'radial-gradient(ellipse at 50% 100%, #1a4a1a 0%, #0d2a0d 40%, #060e06 100%)',
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 16px 64px rgba(0,0,0,0.9)',
      position: 'relative' as const,
    },

    // ── Title bar ─────────────────────────────────────────
    titleBar: {
      backgroundColor: 'rgba(0,0,0,0.78)',
      padding: '7px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    } as React.CSSProperties,
    titleText: {
      color: '#d0dce8',
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
    },

    // ── Diagonal-stripe banner (MATCH SUMMARY / RESULT) ───
    banner: {
      position: 'relative' as const,
      background: 'repeating-linear-gradient(-50deg, #c8d4dc, #c8d4dc 6px, #dde6ec 6px, #dde6ec 18px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '9px 24px',
      borderTop: '3px solid #00bcd4',
      borderBottom: '3px solid #00bcd4',
    } as React.CSSProperties,
    bannerText: {
      color: '#0d2a4a',
      fontSize: 18,
      fontWeight: 900,
      letterSpacing: 3,
      textTransform: 'uppercase' as const,
      textShadow: '0 1px 2px rgba(255,255,255,0.4)',
    },

    // ── Team header ───────────────────────────────────────
    teamHeader: {
      background: 'linear-gradient(90deg, #1256b0 0%, #1976d2 50%, #1256b0 100%)',
      display: 'flex',
      alignItems: 'center',
      padding: '7px 14px',
      gap: 10,
      borderBottom: '2px solid #0d47a1',
    } as React.CSSProperties,
    teamName: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: 900,
      letterSpacing: 2,
      textTransform: 'uppercase' as const,
      flex: 1,
    },
    teamOvers: {
      color: '#90caf9',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 1.5,
      textTransform: 'uppercase' as const,
      marginRight: 12,
    },
    teamScore: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: 900,
      letterSpacing: 1,
      background: 'linear-gradient(90deg, #1976d2, #0d47a1)',
      padding: '2px 12px',
      borderRadius: 3,
      border: '1px solid rgba(255,255,255,0.2)',
    },

    // ── Column headers ────────────────────────────────────
    colHeader: {
      display: 'grid' as const,
      gridTemplateColumns: '1fr 80px 1fr 80px',
      backgroundColor: '#d0dce8',
      padding: '4px 14px',
      borderBottom: '1px solid #b0bec5',
    } as React.CSSProperties,
    colLabel: {
      color: '#37474f',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: 1.5,
      textTransform: 'uppercase' as const,
    },
    colLabelRight: {
      color: '#37474f',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: 1.5,
      textTransform: 'uppercase' as const,
      textAlign: 'right' as const,
    },

    // ── Data rows ─────────────────────────────────────────
    row: (i: number): React.CSSProperties => ({
      display: 'grid',
      gridTemplateColumns: '1fr 80px 1fr 80px',
      backgroundColor: i % 2 === 0 ? '#eef2f6' : '#dde4ec',
      padding: '5px 14px',
      alignItems: 'center',
      borderBottom: '1px solid #c8d4dc',
      minHeight: 30,
    }),
    playerName: {
      color: '#1a2a3a',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
    },
    batScore: {
      color: '#bf360c',
      fontSize: 12,
      fontWeight: 800,
      textAlign: 'right' as const,
    },
    batBalls: {
      color: '#78909c',
      fontSize: 10,
      fontWeight: 400,
    },
    bowlFigures: {
      color: '#1b5e20',
      fontSize: 12,
      fontWeight: 800,
      textAlign: 'right' as const,
    },

    // ── Gap between innings ───────────────────────────────
    gap: {
      height: 10,
      background: 'radial-gradient(ellipse at 50% 100%, #1a4a1a 0%, #060e06 100%)',
    } as React.CSSProperties,

    // ── Result banner ─────────────────────────────────────
    resultBanner: {
      position: 'relative' as const,
      background: 'repeating-linear-gradient(-50deg, #c8d4dc, #c8d4dc 6px, #dde6ec 6px, #dde6ec 18px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 24px',
      borderTop: '3px solid #1976d2',
      borderBottom: '3px solid #1976d2',
    } as React.CSSProperties,
    resultText: {
      color: '#0d2a4a',
      fontSize: 16,
      fontWeight: 900,
      letterSpacing: 3,
      textTransform: 'uppercase' as const,
    },

    // ── Bottom stats bar ──────────────────────────────────
    bottomBar: {
      backgroundColor: 'rgba(0,0,0,0.88)',
      display: 'flex',
      alignItems: 'center',
      padding: '7px 16px',
      gap: 24,
      borderTop: '2px solid #1976d2',
    } as React.CSSProperties,
    bottomLabel: {
      color: '#78909c',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: 1.5,
      textTransform: 'uppercase' as const,
      marginBottom: 1,
    },
    bottomValue: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: 800,
      letterSpacing: 0.5,
    },
    bottomDivider: {
      width: 1,
      height: 28,
      backgroundColor: 'rgba(255,255,255,0.12)',
      flexShrink: 0,
    } as React.CSSProperties,
    motmPill: {
      backgroundColor: '#f0c040',
      color: '#0d1a2a',
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: 1,
      padding: '3px 10px',
      borderRadius: 3,
      textTransform: 'uppercase' as const,
      flexShrink: 0,
    },
  };

  const stageMap: Record<string, string> = { FRIENDLY: 'Friendly', POOL: 'Pool Stage', QUARTER_FINAL: 'Quarter-Final', SEMI_FINAL: 'Semi-Final', FINAL: 'Final' };

  const titleParts = [
    match.homeTeamName,
    'vs',
    match.oppositionTeamName,
    (tournament?.name ?? match.tournamentName) && `– ${tournament?.name ?? match.tournamentName}`,
    match.matchStage && stageMap[match.matchStage],
    match.matchDate && `· ${match.matchDate}`,
  ].filter(Boolean).join(' ');

  const renderInnings = (
    teamName: string,
    score: number | undefined,
    wkts: number | undefined,
    overs: string | undefined,
    batters: BattingEntry[],
    bowlers: BowlingEntry[],
  ) => {
    const scoreStr = score != null
      ? `${score}${wkts != null ? ` - ${wkts}` : ''}`
      : '—';
    const rows = Math.max(batters.length, bowlers.length, 1);

    return (
      <>
        {/* Team header */}
        <div style={s.teamHeader}>
          <span style={s.teamName}>{teamName}</span>
          {overs && <span style={s.teamOvers}>{overs} Overs</span>}
          <span style={s.teamScore}>{scoreStr}</span>
        </div>

        {/* Column headers */}
        <div style={s.colHeader}>
          <span style={s.colLabel}>Batsman</span>
          <span style={s.colLabelRight}>R (B)</span>
          <span style={{ ...s.colLabel, paddingLeft: 8 }}>Bowler</span>
          <span style={s.colLabelRight}>W - R</span>
        </div>

        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => {
          const bat  = batters[i];
          const bowl = bowlers[i];
          return (
            <div key={i} style={s.row(i)}>
              {/* Batting */}
              <span style={s.playerName}>{bat?.playerName ?? ''}</span>
              <span style={s.batScore}>
                {bat?.playerName
                  ? <>
                      {bat.score ?? '—'}
                      <span style={s.batBalls}>{bat.ballsFaced != null ? ` (${bat.ballsFaced})` : ''}</span>
                    </>
                  : ''}
              </span>

              {/* Bowling */}
              <span style={{ ...s.playerName, paddingLeft: 8 }}>{bowl?.playerName ?? ''}</span>
              <span style={s.bowlFigures}>
                {bowl?.playerName
                  ? `${bowl.wickets ?? 0} - ${bowl.runs ?? 0}`
                  : ''}
              </span>
            </div>
          );
        })}
      </>
    );
  };

  const winnerName = result.winningTeamName;
  const resultLine = result.matchDrawn
    ? 'MATCH DRAWN'
    : result.matchOutcomeDescription
      ? result.matchOutcomeDescription.toUpperCase()
      : winnerName
        ? `${winnerName.toUpperCase()} WON`
        : null;

  return (
    <div style={s.card}>

      {/* Title */}
      <div style={s.titleBar}>
        {tournament?.logoUrl && (
          <img src={tournament.logoUrl} alt="tournament" crossOrigin="anonymous"
            style={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 5, background: 'rgba(255,255,255,0.08)', padding: 3, marginRight: 10, flexShrink: 0 }} />
        )}
        <span style={s.titleText}>{titleParts}</span>
      </div>

      {/* MATCH SUMMARY banner */}
      <div style={s.banner}>
        <span style={s.bannerText}>Match Summary</span>
      </div>

      {/* 1st Innings */}
      {renderInnings(
        firstTeamName,
        result.scoreBattingFirst,
        result.wicketsLostBattingFirst,
        result.oversBattingFirst,
        firstCard.batting ?? [],
        firstCard.bowling ?? [],
      )}

      <div style={s.gap} />

      {/* 2nd Innings */}
      {renderInnings(
        secondTeamName,
        result.scoreBattingSecond,
        result.wicketsLostBattingSecond,
        result.oversBattingSecond,
        secondCard.batting ?? [],
        secondCard.bowling ?? [],
      )}

      {/* Result */}
      {resultLine && (
        <div style={s.resultBanner}>
          <span style={s.resultText}>{resultLine}</span>
        </div>
      )}

      {/* Sponsors */}
      {(tournament?.sponsors ?? []).filter(sp => sp.brandLogoUrl).length > 0 && (
        <div style={{ backgroundColor: 'rgba(255,255,255,0.94)', padding: '8px 16px', borderTop: '2px solid #1976d2' }}>
          <div style={{ color: '#9e9e9e', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6, textAlign: 'center' as const }}>
            Sponsors
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' as const }}>
            {tournament!.sponsors!.filter(sp => sp.brandLogoUrl).map(sp => (
              <img key={sp.sponsorId} src={sp.brandLogoUrl} alt={sp.name} crossOrigin="anonymous" title={sp.name}
                style={{ height: 32, maxWidth: 100, objectFit: 'contain' }} />
            ))}
          </div>
        </div>
      )}

      {/* Bottom stats bar */}
      <div style={s.bottomBar}>
        <div>
          <div style={s.bottomLabel}>Venue</div>
          <div style={s.bottomValue}>{match.fieldName ?? '—'}</div>
        </div>

        <div style={s.bottomDivider} />

        <div>
          <div style={s.bottomLabel}>Date</div>
          <div style={s.bottomValue}>{match.matchDate ? String(match.matchDate) : '—'}</div>
        </div>

        {match.umpire && (
          <>
            <div style={s.bottomDivider} />
            <div>
              <div style={s.bottomLabel}>Umpire</div>
              <div style={s.bottomValue}>{match.umpire}</div>
            </div>
          </>
        )}

        {motmName && (
          <>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end' }}>
              <div style={s.bottomLabel}>Man of the Match</div>
              <div style={s.motmPill}>⭐ {motmName}</div>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default BroadcastScorecardPreview;
