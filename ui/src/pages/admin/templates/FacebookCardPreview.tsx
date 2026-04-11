import React from 'react';
import { Match, Tournament } from '../../../types';

interface Props {
  text: string;
  match: Match;
  tournament: Tournament | null;
}

/** Parses the generated Facebook prose text and renders it as a
 *  social-media style card suitable for sharing / downloading. */
const FacebookCardPreview: React.FC<Props> = ({ text, match, tournament }) => {
  const allParas = text.split('\n\n').filter(Boolean);

  // Last paragraph is the hashtag line if it starts with #
  const lastPara = allParas[allParas.length - 1] ?? '';
  const hasHashtags = lastPara.startsWith('#');
  const hashtags   = hasHashtags ? lastPara.split(' ') : [];
  const bodyParas  = hasHashtags ? allParas.slice(0, -1) : allParas;

  // First paragraph is the headline ("🏏 Match Report: X vs Y")
  const headline  = bodyParas[0] ?? '';
  const restParas = bodyParas.slice(1);

  const s: Record<string, React.CSSProperties> = {
    card: {
      fontFamily: "'Segoe UI', Arial, sans-serif",
      width: 640,
      backgroundColor: '#ffffff',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    },
    topBar: {
      background: 'linear-gradient(135deg, #1a5276 0%, #0d3349 100%)',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brand: {
      color: '#a9cce3',
      fontSize: 11,
      letterSpacing: 2,
      textTransform: 'uppercase',
      fontWeight: 600,
    },
    matchBanner: {
      background: 'linear-gradient(135deg, #1a5276 0%, #154360 100%)',
      borderBottom: '4px solid #28b463',
      padding: '20px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    teamName: {
      color: '#ffffff',
      fontSize: 20,
      fontWeight: 800,
      textAlign: 'center',
      flex: 1,
    },
    vs: {
      color: '#28b463',
      fontSize: 13,
      fontWeight: 800,
      letterSpacing: 1,
      flexShrink: 0,
    },
    meta: {
      display: 'flex',
      gap: 20,
      justifyContent: 'center',
      flexWrap: 'wrap',
      padding: '10px 24px',
      backgroundColor: '#f0f4f8',
      borderBottom: '1px solid #dde3ea',
    },
    metaItem: {
      color: '#4a6fa5',
      fontSize: 12,
      fontWeight: 500,
    },
    body: {
      padding: '24px 28px 16px',
      backgroundColor: '#ffffff',
    },
    headlineText: {
      fontSize: 18,
      fontWeight: 800,
      color: '#1a3a52',
      marginBottom: 16,
      lineHeight: 1.3,
    },
    para: {
      fontSize: 14,
      color: '#2c3e50',
      lineHeight: 1.8,
      marginBottom: 14,
    },
    hashtagRow: {
      padding: '14px 28px',
      borderTop: '1px solid #eef0f3',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
    },
    hashtag: {
      color: '#1a5276',
      fontSize: 13,
      fontWeight: 600,
      backgroundColor: '#eaf3fb',
      borderRadius: 20,
      padding: '3px 10px',
    },
    footer: {
      background: 'linear-gradient(135deg, #1a5276 0%, #0d3349 100%)',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerText: {
      color: '#a9cce3',
      fontSize: 11,
    },
  };

  return (
    <div style={s.card}>

      {/* Top branding bar */}
      <div style={s.topBar}>
        <span style={s.brand}>Cricket Legend — Match Report</span>
        {tournament?.logoUrl
          ? <img src={tournament.logoUrl} alt="tournament" crossOrigin="anonymous" style={{ height: 40, width: 40, objectFit: 'contain', borderRadius: 6, background: 'rgba(255,255,255,0.12)', padding: 3 }} />
          : <span style={{ fontSize: 20 }}>🏏</span>
        }
      </div>

      {/* Teams banner */}
      <div style={s.matchBanner}>
        <span style={s.teamName}>{match.homeTeamName}</span>
        <span style={s.vs}>VS</span>
        <span style={s.teamName}>{match.oppositionTeamName}</span>
      </div>

      {/* Meta row */}
      {(match.matchDate || match.fieldName || match.tournamentName) && (
        <div style={s.meta}>
          {match.matchDate      && <span style={s.metaItem}>📅 {String(match.matchDate)}</span>}
          {match.fieldName      && <span style={s.metaItem}>📍 {match.fieldName}</span>}
          {match.tournamentName && <span style={s.metaItem}>🏆 {match.tournamentName}</span>}
        </div>
      )}

      {/* Prose body */}
      <div style={s.body}>
        {headline && (
          <div style={s.headlineText}>{headline}</div>
        )}
        {restParas.map((para, i) => (
          <p key={i} style={s.para}>{para}</p>
        ))}
      </div>

      {/* Hashtags */}
      {hashtags.length > 0 && (
        <div style={s.hashtagRow}>
          {hashtags.map((tag, i) => (
            <span key={i} style={s.hashtag}>{tag}</span>
          ))}
        </div>
      )}

      {/* Sponsors */}
      {(tournament?.sponsors ?? []).filter(sp => sp.brandLogoUrl).length > 0 && (
        <div style={{ backgroundColor: '#f8f9fb', padding: '10px 24px', borderTop: '1px solid #e8ecf0' }}>
          <div style={{ color: '#9e9e9e', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8, textAlign: 'center' as const }}>
            Sponsors
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' as const }}>
            {tournament!.sponsors!.filter(sp => sp.brandLogoUrl).map(sp => (
              <img key={sp.sponsorId} src={sp.brandLogoUrl} alt={sp.name} crossOrigin="anonymous" title={sp.name}
                style={{ height: 34, maxWidth: 100, objectFit: 'contain' }} />
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

export default FacebookCardPreview;
