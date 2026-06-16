import React from 'react';

export interface PlayerEntry {
  name: string;
  surname: string;
  isCaptain: boolean;
  isWicketKeeper: boolean;
}

export interface PlayingXiPlayerCardProps {
  playerPhotoUrl: string | null;
  teamName: string;
  players: PlayerEntry[];
  twelfthMan: PlayerEntry | null;
  tournamentName: string | null;
  tournamentLogoUrl: string | null;
  matchLabel: string;
  photoOpacity?: number;
  photoPositionX?: number;
  photoPositionY?: number;
  sponsorLogoUrls?: string[];
}

const PlayingXiPlayerCardPreview: React.FC<PlayingXiPlayerCardProps> = ({
  playerPhotoUrl, teamName, players, twelfthMan,
  tournamentName, tournamentLogoUrl, matchLabel,
  photoOpacity = 100, photoPositionX = 50, photoPositionY = 0,
  sponsorLogoUrls = [],
}) => {
  const rows = players.slice(0, 11);

  return (
    <div style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      width: 600,
      height: sponsorLogoUrls.length > 0 ? 670 : 620,
      backgroundColor: '#091509',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
    }}>

      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        backgroundColor: '#060e06',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase' }}>
            {tournamentName ?? 'Cricket Legend'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>
            {matchLabel}
          </div>
        </div>
        {tournamentLogoUrl ? (
          <img
            src={tournamentLogoUrl}
            crossOrigin="anonymous"
            style={{ height: 40, width: 40, objectFit: 'contain', borderRadius: 6, background: 'rgba(255,255,255,0.06)', padding: 3 }}
          />
        ) : (
          <div style={{
            height: 40, width: 40, borderRadius: 20,
            background: 'rgba(74,222,128,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🏏</div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left: player photo */}
        <div style={{
          width: '38%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#162616',
          flexShrink: 0,
        }}>
          {playerPhotoUrl ? (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: `url(${playerPhotoUrl})`,
              backgroundSize: 'auto 130%',
              backgroundPosition: `${photoPositionX}% ${photoPositionY}%`,
              backgroundRepeat: 'no-repeat',
              opacity: photoOpacity / 100,
            }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              opacity: 0.25,
            }}>
              <div style={{ fontSize: 64 }}>👤</div>
              <div style={{ color: '#4ade80', fontSize: 10, marginTop: 8, letterSpacing: 1 }}>SELECT PHOTO</div>
            </div>
          )}
          {/* Gradient on right edge to blend into list panel */}
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 36,
            background: 'linear-gradient(to left, #0e1f0e, transparent)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Right: PLAYING XI header + player list */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #0e1f0e 0%, #091509 100%)',
          overflow: 'hidden',
        }}>

          {/* PLAYING XI header */}
          <div style={{
            padding: '14px 16px 10px 14px',
            flexShrink: 0,
          }}>
            <div style={{
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 900,
              lineHeight: 0.9,
              textTransform: 'uppercase',
              letterSpacing: -0.5,
            }}>
              MATCH DAY
            </div>
            <div style={{
              backgroundColor: '#1a5c28',
              display: 'inline-block',
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 900,
              lineHeight: 1,
              textTransform: 'uppercase',
              letterSpacing: -0.5,
              padding: '4px 10px 4px 6px',
              marginTop: 4,
              borderLeft: '4px solid #4ade80',
            }}>
              SQUAD
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginTop: 6,
            }}>
              {teamName || 'Team'}
            </div>
            {/* Divider */}
            <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  height: 2, borderRadius: 1,
                  width: i === 1 ? 20 : 8,
                  backgroundColor: i === 1 ? '#4ade80' : 'rgba(74,222,128,0.2)',
                }} />
              ))}
            </div>
          </div>

          {/* Player rows */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {rows.length === 0 ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flex: 1, color: 'rgba(255,255,255,0.2)', fontSize: 13,
              }}>
                No playing XI selected
              </div>
            ) : (
              rows.map((p, idx) => {
                const isEven = idx % 2 === 0;
                const isCap = p.isCaptain;
                const rowBg = isCap
                  ? 'rgba(74,222,128,0.12)'
                  : isEven
                    ? 'rgba(255,255,255,0.04)'
                    : 'transparent';

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flex: 1,
                      minHeight: 0,
                      padding: '0 12px 0 10px',
                      backgroundColor: rowBg,
                      borderLeft: isCap ? '3px solid #4ade80' : '3px solid transparent',
                      gap: 6,
                    }}
                  >
                    {/* Row number */}
                    <div style={{
                      width: 18,
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: 10,
                      fontWeight: 700,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}>
                      {idx + 1}
                    </div>

                    {/* Player name */}
                    <div style={{
                      flex: 1,
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {p.name} {p.surname}
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {p.isCaptain && (
                        <div style={{
                          backgroundColor: '#7c5c0a',
                          color: '#ffd700',
                          fontSize: 8,
                          fontWeight: 800,
                          padding: '2px 5px',
                          borderRadius: 3,
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                        }}>
                          C
                        </div>
                      )}
                      {p.isWicketKeeper && (
                        <div style={{
                          backgroundColor: 'rgba(56,189,248,0.2)',
                          color: '#38bdf8',
                          fontSize: 8,
                          fontWeight: 800,
                          padding: '2px 5px',
                          borderRadius: 3,
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                          border: '1px solid rgba(56,189,248,0.3)',
                        }}>
                          WK
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* 12th Man / Super Sub row */}
            {twelfthMan && (
              <>
                <div style={{
                  height: 1,
                  backgroundColor: 'rgba(74,222,128,0.15)',
                  marginLeft: 10,
                  marginRight: 12,
                }} />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 34,
                  flexShrink: 0,
                  padding: '0 12px 0 10px',
                  backgroundColor: 'rgba(251,146,60,0.07)',
                  gap: 6,
                }}>
                  <div style={{
                    width: 18,
                    color: 'rgba(255,255,255,0.25)',
                    fontSize: 9,
                    fontWeight: 700,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}>
                    12
                  </div>
                  <div style={{
                    flex: 1,
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {twelfthMan.name} {twelfthMan.surname}
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(251,146,60,0.2)',
                    color: '#fb923c',
                    fontSize: 8,
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: 3,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    border: '1px solid rgba(251,146,60,0.35)',
                    flexShrink: 0,
                  }}>
                    SS
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sponsor bar */}
      {sponsorLogoUrls.length > 0 && (
        <div style={{
          height: 50,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: '0 16px',
          backgroundColor: '#060e06',
          borderTop: '1px solid rgba(74,222,128,0.18)',
          boxSizing: 'border-box',
        }}>
          {sponsorLogoUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              crossOrigin="anonymous"
              style={{ height: 30, maxWidth: 90, objectFit: 'contain', opacity: 0.88 }}
            />
          ))}
        </div>
      )}

    </div>
  );
};

export default PlayingXiPlayerCardPreview;
