import React from 'react';

export interface MotmCardProps {
  playerName: string;
  playerPhotoUrl: string | null;
  homeTeam: string;
  awayTeam: string;
  tournamentName: string | null;
  tournamentLogoUrl: string | null;
  battingFigures: string;
  bowlingFigures: string;
  description: string;
}

const ManOfTheMatchCardPreview: React.FC<MotmCardProps> = ({
  playerName, playerPhotoUrl,
  homeTeam, awayTeam,
  tournamentName, tournamentLogoUrl,
  battingFigures, bowlingFigures, description,
}) => {
  const stats = [battingFigures, bowlingFigures].filter(Boolean).join('   |   ');

  return (
    <div style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      width: 600,
      height: 600,
      backgroundColor: '#091509',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
    }}>

      {/* Top bar — tournament name + logo */}
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
            {homeTeam} vs {awayTeam}
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

      {/* Body — left text + right photo */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left: MAN OF THE MATCH text */}
        <div style={{
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '20px 16px 20px 24px',
          background: 'linear-gradient(160deg, #0e1f0e 0%, #091509 100%)',
          flexShrink: 0,
        }}>
          <div style={{
            color: '#ffffff',
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 0.88,
            textTransform: 'uppercase',
            letterSpacing: -1,
          }}>
            MAN
          </div>
          <div style={{
            color: '#4ade80',
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 0.88,
            textTransform: 'uppercase',
            letterSpacing: -1,
            marginTop: 6,
          }}>
            OF THE
          </div>
          <div style={{
            backgroundColor: '#1a5c28',
            color: '#ffffff',
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 0.88,
            textTransform: 'uppercase',
            letterSpacing: -1,
            padding: '8px 0 8px 6px',
            marginTop: 6,
            borderLeft: '4px solid #4ade80',
          }}>
            MATCH
          </div>

          {/* Decorative dots */}
          <div style={{ marginTop: 24, display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: i === 1 ? '#4ade80' : 'rgba(74,222,128,0.25)',
              }} />
            ))}
          </div>
        </div>

        {/* Right: player photo */}
        <div style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#162616',
        }}>
          {playerPhotoUrl ? (
            <img
              src={playerPhotoUrl}
              crossOrigin="anonymous"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              opacity: 0.25,
            }}>
              <div style={{ fontSize: 72 }}>👤</div>
              <div style={{ color: '#4ade80', fontSize: 11, marginTop: 8, letterSpacing: 1 }}>SELECT PHOTO</div>
            </div>
          )}
          {/* Gradient overlay on left edge to blend with text panel */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 32,
            background: 'linear-gradient(to right, #0e1f0e, transparent)',
            pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* Bottom strip — player name + stats */}
      <div style={{
        background: 'linear-gradient(135deg, #1a5c28 0%, #28b463 100%)',
        padding: '14px 20px 16px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              color: '#ffffff',
              fontSize: 20,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 1,
              lineHeight: 1.1,
            }}>
              {playerName || 'Player Name'}
            </div>
            {description && (
              <div style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: 12,
                marginTop: 4,
                lineHeight: 1.4,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              } as React.CSSProperties}>
                {description}
              </div>
            )}
          </div>
          {stats && (
            <div style={{
              color: '#ffd700',
              fontSize: 17,
              fontWeight: 800,
              textAlign: 'right',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              lineHeight: 1.3,
            }}>
              {stats}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ManOfTheMatchCardPreview;
