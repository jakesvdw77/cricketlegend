import React from 'react';
import { BattingEntry, BowlingEntry } from '../../../types';
import { TemplateProps, topBatters, topBowlers } from './types';

interface Props extends TemplateProps {
  bgPhotoUrl: string | null;
  photoOpacity?: number;
  photoPositionX?: number;
  photoPositionY?: number;
  inset?: number;
  customLogos?: string[];
}

// Card dimensions
const W = 1200;
const H = 675;
const MAX_ROWS = 4;

// Fixed section heights (sponsor bar height computed dynamically from inset)
const TOP_BAR_H  = 78;
const BANNER_H   = 54;
const COL_HDR_H  = 17;
const STAT_ROW_H = 38;
const GAP_H      = 5;
const RESULT_H   = 44;
const FIXED_H    = TOP_BAR_H + 2 * (BANNER_H + COL_HDR_H + MAX_ROWS * STAT_ROW_H) + GAP_H + RESULT_H; // 573

const MatchResultGraphicPreview: React.FC<Props> = ({
  match, result, tournament,
  firstTeamName, secondTeamName, firstCard, secondCard,
  bgPhotoUrl,
  photoOpacity = 80,
  photoPositionX = 50,
  photoPositionY = 50,
  inset = 22,
  customLogos,
}) => {
  const marginX   = inset;
  const marginY   = inset;
  const innerH    = H - 2 * marginY;
  const sponsorH  = Math.max(innerH - FIXED_H, 10);
  const fmtScore = (card: typeof firstCard, fallbackRuns?: number): string => {
    const runs = card?.score ?? fallbackRuns;
    if (runs == null) return '—';
    const w = card?.wickets != null ? `/${card.wickets}` : '';
    return `${runs}${w}`;
  };

  const pad = <T,>(arr: T[], len: number): (T | null)[] => {
    const out = arr.slice(0, len) as (T | null)[];
    while (out.length < len) out.push(null);
    return out;
  };

  const bat1  = pad(topBatters(firstCard),  MAX_ROWS);
  const bowl1 = pad(topBowlers(secondCard), MAX_ROWS);
  const bat2  = pad(topBatters(secondCard), MAX_ROWS);
  const bowl2 = pad(topBowlers(firstCard),  MAX_ROWS);

  const fmtBowl = (e: BowlingEntry | null): string => {
    if (!e) return '';
    return `${e.overs ?? 0}-${e.maidens ?? 0}-${e.runs ?? 0}-${e.wickets ?? 0}`;
  };

  const fmtDate = (d: any): string => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { return String(d); }
  };

  const notOut = (e: BattingEntry | null): string =>
    (e && e.dismissed === false) ? '*' : '';

  const firstScore  = fmtScore(firstCard,  result.scoreBattingFirst);
  const secondScore = fmtScore(secondCard, result.scoreBattingSecond);
  const homeLogoUrl  = match.homeTeamLogoUrl;
  const awayLogoUrl  = match.oppositionTeamLogoUrl;
  const tournLogoUrl = tournament?.logoUrl ?? null;
  const tournName    = tournament?.name ?? match.tournamentName ?? 'Cricket Legend';
  const sponsorUrls: string[] = customLogos && customLogos.length > 0
    ? customLogos
    : (tournament?.sponsors ?? []).filter(s => s.brandLogoUrl).map(s => s.brandLogoUrl!).slice(0, 6);

  const resultText =
    result.matchDrawn  ? 'MATCH DRAWN' :
    result.forfeited   ? 'MATCH FORFEITED' :
    result.noResult    ? 'NO RESULT — MATCH ABANDONED' :
    result.matchOutcomeDescription
      ? (result.winningTeamName
          ? `${result.winningTeamName.toUpperCase()}  —  ${result.matchOutcomeDescription}`
          : result.matchOutcomeDescription.toUpperCase())
      : result.winningTeamName
        ? `${result.winningTeamName.toUpperCase()} WON`
        : 'RESULT PENDING';

  const teamInitials = (name: string | null | undefined) =>
    (name ?? '').split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 3).toUpperCase();

  const renderInnings = (
    teamName: string,
    score: string,
    overs: string | null | undefined,
    batters: (BattingEntry | null)[],
    bowlers: (BowlingEntry | null)[],
  ) => (
    <>
      {/* Team banner */}
      <div style={{
        height: BANNER_H,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        background: 'linear-gradient(90deg, #1565e0 0%, #0d50c0 55%, #0b3ea0 100%)',
        borderTop: '2px solid rgba(255,255,255,0.18)',
        borderBottom: '2px solid rgba(0,20,80,0.45)',
        boxShadow: '0 3px 12px rgba(0,0,0,0.40)',
        gap: 12,
        boxSizing: 'border-box',
      }}>
        <div style={{
          flex: 1,
          fontSize: 28,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: -0.3,
          color: '#ffffff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          lineHeight: 1,
        }}>
          {teamName}
        </div>
        {overs && (
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.72)',
            letterSpacing: 1,
            textTransform: 'uppercase',
            flexShrink: 0,
          }}>
            {overs} OVS
          </div>
        )}
        <div style={{
          background: 'linear-gradient(180deg, #cc0022 0%, #7a0015 100%)',
          color: '#ffffff',
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: -0.5,
          padding: '5px 18px',
          borderRadius: 4,
          minWidth: 90,
          textAlign: 'center',
          flexShrink: 0,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 8px rgba(0,0,0,0.45)',
          lineHeight: 1,
        }}>
          {score}
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        height: COL_HDR_H,
        flexShrink: 0,
        display: 'flex',
        background: 'rgba(5, 14, 52, 0.84)',
        borderBottom: '1px solid rgba(100,140,255,0.12)',
        boxSizing: 'border-box',
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 8,
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ flex: 1, fontSize: 9, fontWeight: 800, color: '#7098e8', letterSpacing: 1.5, textTransform: 'uppercase' }}>BATSMAN</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#7098e8', letterSpacing: 1.5, minWidth: 32, textAlign: 'right' }}>R</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(112,152,232,0.5)', letterSpacing: 1.5, minWidth: 30, textAlign: 'right' }}>B</span>
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px 0 10px',
          gap: 8,
        }}>
          <span style={{ flex: 1, fontSize: 9, fontWeight: 800, color: '#7098e8', letterSpacing: 1.5, textTransform: 'uppercase' }}>BOWLER</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#7098e8', letterSpacing: 1, whiteSpace: 'nowrap' }}>O-M-R-W</span>
        </div>
      </div>

      {/* Stat rows */}
      {batters.map((bat, idx) => {
        const bowl = bowlers[idx];
        const rowBg = idx % 2 === 0 ? 'rgba(8, 20, 65, 0.82)' : 'rgba(5, 14, 50, 0.76)';
        return (
          <div key={idx} style={{
            height: STAT_ROW_H,
            flexShrink: 0,
            display: 'flex',
            background: rowBg,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            boxSizing: 'border-box',
          }}>
            {/* Batting half */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              gap: 6,
              borderRight: '1px solid rgba(255,255,255,0.07)',
              overflow: 'hidden',
            }}>
              {bat ? (
                <>
                  <span style={{
                    flex: 1,
                    color: bat.topPerformer ? '#ffd060' : '#ffffff',
                    fontSize: 15,
                    fontWeight: bat.topPerformer ? 800 : 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)',
                  }}>
                    {bat.playerName}{notOut(bat)}
                  </span>
                  <span style={{
                    color: '#ffffff',
                    fontSize: 19,
                    fontWeight: 900,
                    minWidth: 32,
                    textAlign: 'right',
                    flexShrink: 0,
                    lineHeight: 1,
                    textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                  }}>
                    {bat.score ?? '—'}
                  </span>
                  <span style={{
                    color: 'rgba(200,218,255,0.80)',
                    fontSize: 12,
                    fontWeight: 600,
                    minWidth: 30,
                    textAlign: 'right',
                    flexShrink: 0,
                    lineHeight: 1,
                    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                  }}>
                    {bat.ballsFaced != null ? `(${bat.ballsFaced})` : ''}
                  </span>
                </>
              ) : null}
            </div>
            {/* Bowling half */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px 0 10px',
              gap: 6,
              overflow: 'hidden',
            }}>
              {bowl ? (
                <>
                  <span style={{
                    flex: 1,
                    color: bowl.topPerformer ? '#ffd060' : '#ffffff',
                    fontSize: 15,
                    fontWeight: bowl.topPerformer ? 800 : 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)',
                  }}>
                    {bowl.playerName}
                  </span>
                  <span style={{
                    color: (bowl.wickets ?? 0) >= 3 ? '#80e8a0' : 'rgba(200,218,255,0.90)',
                    fontSize: 14,
                    fontWeight: 700,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                  }}>
                    {fmtBowl(bowl)}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <div style={{
      fontFamily: "'Arial Narrow', Arial, 'Helvetica Neue', sans-serif",
      width: W,
      height: H,
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
      flexShrink: 0,
    }}>

      {/* Background photo */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: bgPhotoUrl ? `url(${bgPhotoUrl})` : undefined,
        backgroundSize: 'auto 130%',
        backgroundPosition: `${photoPositionX}% ${photoPositionY}%`,
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#040c28',
        opacity: photoOpacity / 100,
      }} />

      {/* Dark gradient overlay to keep text readable */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: bgPhotoUrl
          ? 'radial-gradient(ellipse at center, rgba(0,5,20,0.30) 0%, rgba(0,5,20,0.65) 100%)'
          : 'radial-gradient(ellipse at 30% 60%, #0a1e5a 0%, #020a1e 100%)',
        pointerEvents: 'none',
      }} />

      {/* Inner scorecard panel — inset so the photo bleeds out at every edge */}
      <div style={{
        position: 'absolute',
        top: marginY,
        left: marginX,
        right: marginX,
        bottom: marginY,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 6px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
      }}>

        {/* ── TOP BAR ── */}
        <div style={{
          height: TOP_BAR_H,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(238,246,255,0.92) 100%)',
          borderBottom: '3px solid rgba(21,101,192,0.30)',
          gap: 16,
          boxSizing: 'border-box',
        }}>
          {/* Tournament logo + name + date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            {tournLogoUrl ? (
              <img src={tournLogoUrl} crossOrigin="anonymous"
                style={{ height: 52, width: 52, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }} />
            ) : (
              <div style={{
                height: 52, width: 52, borderRadius: 26, flexShrink: 0,
                background: 'linear-gradient(135deg, #1565e0, #0940a8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, color: '#fff',
              }}>🏏</div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 20,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: '#0a1e60',
                lineHeight: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {tournName}
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 2.5,
                color: '#1565e0',
                marginTop: 5,
                lineHeight: 1,
              }}>
                MATCH SUMMARY
              </div>
              {match.matchDate && (
                <div style={{
                  fontSize: 11,
                  color: 'rgba(10,30,96,0.55)',
                  marginTop: 4,
                  lineHeight: 1,
                }}>
                  {fmtDate(match.matchDate)}
                </div>
              )}
            </div>
          </div>

          {/* Team logos + vs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {homeLogoUrl ? (
              <img src={homeLogoUrl} crossOrigin="anonymous"
                style={{ height: 52, width: 52, objectFit: 'contain', borderRadius: 4 }} />
            ) : (
              <div style={{
                height: 52, width: 52, borderRadius: 4,
                background: '#dce8ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#0a1e60', textAlign: 'center', lineHeight: 1.2,
              }}>
                {teamInitials(match.homeTeamName)}
              </div>
            )}
            <div style={{
              fontSize: 13,
              fontWeight: 900,
              color: '#0a1e60',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              VS
            </div>
            {awayLogoUrl ? (
              <img src={awayLogoUrl} crossOrigin="anonymous"
                style={{ height: 52, width: 52, objectFit: 'contain', borderRadius: 4 }} />
            ) : (
              <div style={{
                height: 52, width: 52, borderRadius: 4,
                background: '#dce8ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#0a1e60', textAlign: 'center', lineHeight: 1.2,
              }}>
                {teamInitials(match.oppositionTeamName)}
              </div>
            )}
          </div>
        </div>

        {/* ── FIRST INNINGS ── */}
        {renderInnings(firstTeamName, firstScore, firstCard.overs, bat1, bowl1)}

        {/* Gap between innings */}
        <div style={{ height: GAP_H, background: 'rgba(255,255,255,0.10)', flexShrink: 0 }} />

        {/* ── SECOND INNINGS ── */}
        {renderInnings(secondTeamName, secondScore, secondCard.overs, bat2, bowl2)}

        {/* ── RESULT BAR ── */}
        <div style={{
          height: RESULT_H,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          background: 'linear-gradient(90deg, rgba(195,218,255,0.90) 0%, rgba(218,235,255,0.87) 100%)',
          borderTop: '2px solid rgba(100,148,255,0.25)',
          gap: 12,
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: 6,
            height: 24,
            borderRadius: 2,
            background: 'linear-gradient(180deg, #c8a800, #9e8200)',
            flexShrink: 0,
          }} />
          <div style={{
            flex: 1,
            fontSize: 17,
            fontWeight: 900,
            fontStyle: 'italic',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: '#0a1e60',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}>
            {resultText}
          </div>
        </div>

        {/* ── SPONSOR BAR ── */}
        <div style={{
          height: sponsorH,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          background: 'rgba(4, 10, 32, 0.88)',
          borderTop: '1px solid rgba(100,140,255,0.15)',
          gap: 24,
          boxSizing: 'border-box',
        }}>
          {sponsorUrls.length > 0 ? sponsorUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              crossOrigin="anonymous"
              style={{ height: sponsorH - 22, maxWidth: 130, objectFit: 'contain', opacity: 0.90 }}
            />
          )) : (
            <div style={{
              color: 'rgba(255,255,255,0.22)',
              fontSize: 12,
              letterSpacing: 3,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>
              CRICKET LEGEND
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MatchResultGraphicPreview;
