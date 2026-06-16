import React, { useEffect, useState } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Chip } from '@mui/material';
import { Match, MatchResult, TeamScorecard, Tournament } from '../../types';
import { tournamentApi } from '../../api/tournamentApi';

interface Props {
  result: MatchResult;
  match: Match;
}

const BOARD_BG = '#060f08';
const PANEL_BG = '#0a1a0d';
const BORDER = '#1a3320';
const SCORE_COLOR = '#ffd700';
const NAME_COLOR = '#e2e8f0';
const LABEL_MUTED = '#5a7a62';   // column headers / labels — subtle
const DATA_DIM = '#9db8a4';      // secondary numeric data — readable
const GREEN = '#4ade80';
const RED = '#f87171';
const HEADER_BG = '#040c06';

const LedNumber: React.FC<{ children: React.ReactNode; size?: 'xl' | 'lg' | 'md' }> = ({ children, size = 'md' }) => {
  const fontSize = size === 'xl' ? 52 : size === 'lg' ? 36 : 24;
  return (
    <Typography
      component="span"
      sx={{
        fontFamily: '"Courier New", "Lucida Console", monospace',
        fontWeight: 900,
        fontSize,
        color: SCORE_COLOR,
        letterSpacing: size === 'xl' ? 4 : 2,
        lineHeight: 1,
        textShadow: `0 0 12px rgba(255,215,0,0.5), 0 0 4px rgba(255,215,0,0.3)`,
      }}
    >
      {children}
    </Typography>
  );
};

const Cell: React.FC<{ children?: React.ReactNode; align?: 'left' | 'right' | 'center'; muted?: boolean; bold?: boolean; mono?: boolean; highlight?: boolean; width?: string | number; sx?: object }> = ({
  children, align = 'left', muted, bold, mono, highlight, width, sx,
}) => (
  <Box
    component="td"
    sx={{
      px: 1,
      py: 0.6,
      textAlign: align,
      color: highlight ? GREEN : muted ? DATA_DIM : NAME_COLOR,
      fontWeight: bold ? 700 : 400,
      fontFamily: mono ? '"Courier New", monospace' : 'inherit',
      fontSize: 13,
      width: width ?? 'auto',
      whiteSpace: 'nowrap',
      borderBottom: `1px solid ${BORDER}`,
      ...sx,
    }}
  >
    {children}
  </Box>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ bgcolor: '#0a160c', px: 2, py: 0.75, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
    <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: LABEL_MUTED, textTransform: 'uppercase' }}>
      {children}
    </Typography>
  </Box>
);

const extrasBreakdown = (sc: TeamScorecard) => {
  const parts: string[] = [];
  if (sc.byes) parts.push(`B ${sc.byes}`);
  if (sc.legByes) parts.push(`LB ${sc.legByes}`);
  if (sc.wides) parts.push(`Wd ${sc.wides}`);
  if (sc.noBalls) parts.push(`NB ${sc.noBalls}`);
  if (sc.penaltyRuns) parts.push(`P ${sc.penaltyRuns}`);
  const total = (sc.byes ?? 0) + (sc.legByes ?? 0) + (sc.wides ?? 0) + (sc.noBalls ?? 0) + (sc.penaltyRuns ?? 0);
  return { parts, total };
};

const BattingTable: React.FC<{ innings: TeamScorecard }> = ({ innings }) => {
  const { parts, total } = extrasBreakdown(innings);
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
        <Box component="thead">
          <Box component="tr" sx={{ bgcolor: '#0a160c' }}>
            {['#', 'Batsman', 'Dismissal', 'R', 'B', '4s', '6s', 'SR'].map((h, i) => (
              <Box component="th" key={h} sx={{ px: 1, py: 0.75, textAlign: i >= 3 ? 'right' : 'left', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: LABEL_MUTED, textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' }}>
                {h}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {(innings.batting ?? []).map((b, i) => {
            const noStats = !b.dismissed && !b.ballsFaced;
            const sr = b.ballsFaced ? (((b.score ?? 0) / b.ballsFaced) * 100).toFixed(1) : '—';
            return (
              <Box component="tr" key={i} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                <Cell muted width={28}>{b.battingPosition}</Cell>
                <Cell bold highlight={!b.dismissed && !!b.ballsFaced} width={160}>{b.playerName}</Cell>
                {noStats ? (
                  <Box component="td" colSpan={6} sx={{ borderBottom: `1px solid ${BORDER}` }} />
                ) : (
                  <>
                    <Cell width={200}>
                      {b.dismissed
                        ? <Typography component="span" sx={{ fontSize: 12, color: RED }}>{b.dismissalType?.replace(/_/g, ' ')} {b.dismissedDescription ? `— ${b.dismissedDescription}` : ''}</Typography>
                        : <Chip label="not out" size="small" sx={{ height: 18, fontSize: 11, bgcolor: 'rgba(74,222,128,0.15)', color: GREEN, border: `1px solid ${GREEN}` }} />}
                    </Cell>
                    <Cell align="right" bold mono>{b.score ?? 0}</Cell>
                    <Cell align="right" muted mono>{b.ballsFaced ?? 0}</Cell>
                    <Cell align="right" muted mono>{b.fours ?? 0}</Cell>
                    <Cell align="right" muted mono>{b.sixes ?? 0}</Cell>
                    <Cell align="right" muted mono>{sr}</Cell>
                  </>
                )}
              </Box>
            );
          })}
          {/* Extras row */}
          <Box component="tr" sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
            <Cell muted />
            <Cell bold>Extras</Cell>
            <Cell muted>{parts.length > 0 ? parts.join(' · ') : '—'}</Cell>
            <Cell align="right" bold mono>{total}</Cell>
            <Cell /><Cell /><Cell /><Cell />
          </Box>
          {/* Total row */}
          <Box component="tr" sx={{ bgcolor: 'rgba(255,215,0,0.06)' }}>
            <Cell />
            <Cell bold sx={{ color: SCORE_COLOR }}>Total</Cell>
            <Cell muted>{innings.overs} overs</Cell>
            <Box component="td" colSpan={5} sx={{ px: 1, py: 0.6, textAlign: 'right', borderBottom: `1px solid ${BORDER}` }}>
              <LedNumber size="md">{innings.score}/{innings.wickets}</LedNumber>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const BowlingTable: React.FC<{ innings: TeamScorecard }> = ({ innings }) => (
  <Box sx={{ overflowX: 'auto' }}>
    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
      <Box component="thead">
        <Box component="tr" sx={{ bgcolor: '#0a160c' }}>
          {['Bowler', 'O', 'R', 'W', 'Dots', 'Wd', 'NB'].map((h, i) => (
            <Box component="th" key={h} sx={{ px: 1, py: 0.75, textAlign: i === 0 ? 'left' : 'right', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: LABEL_MUTED, textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' }}>
              {h}
            </Box>
          ))}
        </Box>
      </Box>
      <Box component="tbody">
        {(innings.bowling ?? []).map((b, i) => (
          <Box component="tr" key={i} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
            <Cell bold width={160}>{b.playerName}</Cell>
            <Cell align="right" mono>{b.overs}</Cell>
            <Cell align="right" mono>{b.runs ?? 0}</Cell>
            <Cell align="right" bold mono highlight={(b.wickets ?? 0) >= 3}>{b.wickets ?? 0}</Cell>
            <Cell align="right" muted mono>{b.dots ?? 0}</Cell>
            <Cell align="right" muted mono>{b.wides ?? 0}</Cell>
            <Cell align="right" muted mono>{b.noBalls ?? 0}</Cell>
          </Box>
        ))}
      </Box>
    </Box>
  </Box>
);

export const ElectronicScoreboard: React.FC<Props> = ({ result, match }) => {
  const [innings, setInnings] = useState<1 | 2>(1);
  const [tournament, setTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    if (match.tournamentId) tournamentApi.findById(match.tournamentId).then(setTournament).catch(() => {});
  }, [match.tournamentId]);

  const sc1 = result.scoreCard?.teamA;
  const sc2 = result.scoreCard?.teamB;
  const team1Name = result.sideBattingFirstName ?? match.homeTeamName;
  const team2Name = result.sideBattingFirstName === match.homeTeamName ? match.oppositionTeamName : match.homeTeamName;
  const team1Logo = result.sideBattingFirstName === match.homeTeamName ? match.homeTeamLogoUrl : match.oppositionTeamLogoUrl;
  const team2Logo = result.sideBattingFirstName === match.homeTeamName ? match.oppositionTeamLogoUrl : match.homeTeamLogoUrl;

  const currentSc = innings === 1 ? sc1 : sc2;
  const currentTeam = innings === 1 ? team1Name : team2Name;

  const sponsors = (tournament?.sponsors ?? []).filter(s => s.brandLogoUrl).slice(0, 4);

  return (
    <Box sx={{ bgcolor: BOARD_BG, borderRadius: 2, overflow: 'hidden', border: `1px solid ${BORDER}`, fontFamily: '"Inter", "Segoe UI", sans-serif' }}>

      {/* Header: tournament + sponsors */}
      <Box sx={{ bgcolor: HEADER_BG, px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${BORDER}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          {tournament?.logoUrl && (
            <Box component="img" src={tournament.logoUrl} alt={tournament.name} sx={{ height: 32, objectFit: 'contain', opacity: 0.9 }} />
          )}
          <Box>
            <Typography sx={{ fontSize: 11, color: LABEL_MUTED, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {tournament?.name ?? match.tournamentName ?? 'Match'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: NAME_COLOR }}>
              {match.matchDate}{match.fieldName ? ` · ${match.fieldName}` : ''}
            </Typography>
          </Box>
        </Box>
        {sponsors.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {sponsors.map(s => (
              <Box key={s.sponsorId} component="img" src={s.brandLogoUrl} alt={s.name} sx={{ height: 28, objectFit: 'contain', opacity: 0.8, filter: 'brightness(0) invert(1)' }} />
            ))}
          </Box>
        )}
      </Box>

      {/* Score summary */}
      <Box sx={{ bgcolor: PANEL_BG, px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 3, borderBottom: `1px solid ${BORDER}`, flexWrap: 'wrap' }}>
        {/* Team 1 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 180 }}>
          {team1Logo && <Box component="img" src={team1Logo} sx={{ height: 40, width: 40, objectFit: 'contain', borderRadius: 1 }} />}
          <Box>
            <Typography sx={{ fontSize: 12, color: LABEL_MUTED, letterSpacing: 1, textTransform: 'uppercase', mb: 0.25 }}>{team1Name}</Typography>
            <LedNumber size="lg">{result.scoreBattingFirst ?? sc1?.score ?? '—'}/{result.wicketsLostBattingFirst ?? sc1?.wickets ?? '—'}</LedNumber>
            <Typography component="span" sx={{ fontSize: 13, color: LABEL_MUTED, ml: 1 }}>({result.oversBattingFirst ?? sc1?.overs} ov)</Typography>
          </Box>
        </Box>

        {/* VS + result */}
        <Box sx={{ textAlign: 'center', px: 2 }}>
          <Typography sx={{ fontSize: 12, color: LABEL_MUTED, letterSpacing: 3, textTransform: 'uppercase' }}>vs</Typography>
          {result.matchOutcomeDescription && (
            <Typography sx={{ fontSize: 11, color: SCORE_COLOR, mt: 0.5, textAlign: 'center', maxWidth: 180 }}>
              {result.matchOutcomeDescription}
            </Typography>
          )}
        </Box>

        {/* Team 2 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 180, justifyContent: 'flex-end' }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: 12, color: LABEL_MUTED, letterSpacing: 1, textTransform: 'uppercase', mb: 0.25 }}>{team2Name}</Typography>
            <LedNumber size="lg">{result.scoreBattingSecond ?? sc2?.score ?? '—'}/{result.wicketsLostBattingSecond ?? sc2?.wickets ?? '—'}</LedNumber>
            <Typography component="span" sx={{ fontSize: 13, color: LABEL_MUTED, ml: 1 }}>({result.oversBattingSecond ?? sc2?.overs} ov)</Typography>
          </Box>
          {team2Logo && <Box component="img" src={team2Logo} sx={{ height: 40, width: 40, objectFit: 'contain', borderRadius: 1 }} />}
        </Box>
      </Box>

      {/* Innings toggle */}
      <Box sx={{ px: 2, py: 1.25, bgcolor: HEADER_BG, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ fontSize: 11, color: LABEL_MUTED, letterSpacing: 1.5, textTransform: 'uppercase', mr: 1 }}>Innings</Typography>
        <ToggleButtonGroup
          value={innings}
          exclusive
          onChange={(_, v) => v && setInnings(v)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: LABEL_MUTED,
              borderColor: BORDER,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1,
              px: 2,
              py: 0.5,
              textTransform: 'uppercase',
              '&.Mui-selected': { bgcolor: 'rgba(255,215,0,0.12)', color: SCORE_COLOR, borderColor: SCORE_COLOR },
            },
          }}
        >
          <ToggleButton value={1}>1st — {team1Name}</ToggleButton>
          <ToggleButton value={2}>2nd — {team2Name}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Batting */}
      {currentSc && (
        <>
          <SectionHeader>Batting — {currentTeam}</SectionHeader>
          <BattingTable innings={currentSc} />

          {/* Bowling */}
          <SectionHeader>Bowling</SectionHeader>
          <BowlingTable innings={currentSc} />
        </>
      )}

      {!currentSc && (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: LABEL_MUTED }}>No scorecard data for this innings.</Typography>
        </Box>
      )}
    </Box>
  );
};
