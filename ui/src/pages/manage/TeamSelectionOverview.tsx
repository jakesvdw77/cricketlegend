import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Alert, Card, CardActionArea, CardContent,
  Chip, Avatar, Divider, Tooltip, IconButton,
} from '@mui/material';
import {
  Groups, CalendarMonth, AccessTime, LocationOn, EmojiEvents, Share,
} from '@mui/icons-material';
import { MatchSharePanel } from '../../components/match/MatchSharePanel';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import { Match, MatchSide, Player } from '../../types';

interface XiEntry {
  match: Match;
  teamId: number;
  teamName: string;
  side: MatchSide | null;
  players: Player[];          // resolved, in playingXi order
  captainPlayerId?: number;
  wicketKeeperPlayerId?: number;
}

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const fmtTime = (t?: string) => {
  if (!t) return null;
  const [h, m] = t.split(':');
  const d = new Date(); d.setHours(+h, +m);
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
};

const getMondayKey = (dateStr?: string): string => {
  if (!dateStr) return '9999-12-31';
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtWeekLabel = (mondayKey: string, todayKey: string): string => {
  const mon = new Date(mondayKey + 'T00:00:00');
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
  const range = `${fmt(mon)} – ${fmt(sun)}`;
  return mondayKey === todayKey ? `This Week  ·  ${range}` : range;
};

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: 'Friendly', POOL: 'Pool', PLAYOFFS: 'Playoffs',
  ROUND_OF_16: 'Round of 16', QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final', FINAL: 'Final',
};

// ── Player badge: avatar + short name + role indicator ────────────────────────
const PlayerBadge: React.FC<{
  player: Player;
  isCaptain: boolean;
  isWK: boolean;
  isTwelfth: boolean;
}> = ({ player, isCaptain, isWK, isTwelfth }) => {
  const fullName = `${player.name} ${player.surname}`;
  const shortName = `${player.name} ${player.surname.charAt(0)}.`;
  const badge = isCaptain ? 'C' : isWK ? 'WK' : null;
  const badgeColor = isCaptain ? '#1565c0' : '#6a1b9a';

  return (
    <Tooltip title={`${fullName}${isCaptain ? ' (C)' : ''}${isWK ? ' (WK)' : ''}${isTwelfth ? ' — 12th Man' : ''}`}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 52 }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar
            src={player.profilePictureUrl ?? undefined}
            sx={{
              width: 40,
              height: 40,
              fontSize: 14,
              bgcolor: isTwelfth ? 'text.disabled' : 'primary.main',
              border: isTwelfth ? '2px dashed' : '2px solid',
              borderColor: isTwelfth ? 'divider' : 'primary.light',
              opacity: isTwelfth ? 0.6 : 1,
            }}
          >
            {player.name.charAt(0)}
          </Avatar>
          {badge && (
            <Box
              sx={{
                position: 'absolute', bottom: -3, right: -3,
                bgcolor: badgeColor, color: '#fff',
                borderRadius: 1, px: 0.4, lineHeight: 1.4,
                fontSize: '0.55rem', fontWeight: 'bold',
              }}
            >
              {badge}
            </Box>
          )}
        </Box>
        <Typography
          variant="caption"
          sx={{
            mt: 0.5, fontSize: '0.6rem', textAlign: 'center',
            lineHeight: 1.2, width: 52,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: isTwelfth ? 'text.disabled' : 'text.primary',
          }}
        >
          {shortName}
        </Typography>
      </Box>
    </Tooltip>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const TeamSelectionOverview: React.FC = () => {
  const navigate = useNavigate();
  const { teamIds: managerTeamIds, restrictByTeam, homeClubId, loaded: teamsLoaded } = useManagerTeams();
  const [entries, setEntries]     = useState<XiEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [shareEntry, setShareEntry] = useState<{ match: Match; teamId: number } | null>(null);

  useEffect(() => {
    if (!teamsLoaded) return;

    const load = async () => {
      const [allTeams, allMatches] = await Promise.all([
        teamApi.findAll(),
        matchApi.findAll(),
      ]);

      let relevantTeamIds: Set<number>;
      if (restrictByTeam) {
        relevantTeamIds = managerTeamIds;
      } else if (homeClubId != null) {
        relevantTeamIds = new Set(
          allTeams.filter(t => t.teamId != null && t.associatedClubId === homeClubId).map(t => t.teamId!)
        );
      } else {
        relevantTeamIds = new Set(allTeams.map(t => t.teamId!).filter(Boolean));
      }

      const teamNameMap = new Map(allTeams.map(t => [t.teamId!, t.teamName]));

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const upcoming = allMatches.filter(m =>
        !m.matchCompleted && !m.forfeited && !m.noResult && !m.matchDrawn &&
        (m.matchDate ?? '') >= todayStr &&
        (
          (m.homeTeamId != null && relevantTeamIds.has(m.homeTeamId)) ||
          (m.oppositionTeamId != null && relevantTeamIds.has(m.oppositionTeamId))
        )
      );

      const pairs: { match: Match; teamId: number; teamName: string }[] = [];
      for (const m of upcoming) {
        if (m.homeTeamId != null && relevantTeamIds.has(m.homeTeamId))
          pairs.push({ match: m, teamId: m.homeTeamId, teamName: m.homeTeamName ?? teamNameMap.get(m.homeTeamId) ?? '' });
        if (m.oppositionTeamId != null && relevantTeamIds.has(m.oppositionTeamId))
          pairs.push({ match: m, teamId: m.oppositionTeamId, teamName: m.oppositionTeamName ?? teamNameMap.get(m.oppositionTeamId) ?? '' });
      }

      pairs.sort((a, b) => {
        const ka = `${a.match.matchDate ?? '9999-12-31'}T${a.match.scheduledStartTime ?? '99:99:99'}`;
        const kb = `${b.match.matchDate ?? '9999-12-31'}T${b.match.scheduledStartTime ?? '99:99:99'}`;
        return ka.localeCompare(kb);
      });

      // Load squads and teamsheets in parallel
      const uniqueTeamIds = [...new Set(pairs.map(p => p.teamId))];
      const uniqueMatchIds = [...new Set(pairs.map(p => p.match.matchId!))];

      const [squadsResults, teamsheetsResults] = await Promise.all([
        Promise.allSettled(uniqueTeamIds.map(tid => teamApi.getSquad(tid))),
        Promise.allSettled(uniqueMatchIds.map(mid => matchApi.getTeamSheet(mid))),
      ]);

      // Build playerMap: playerId → Player
      const playerMap = new Map<number, Player>();
      squadsResults.forEach((r) => {
        if (r.status === 'fulfilled') {
          for (const p of r.value) {
            if (p.playerId != null) playerMap.set(p.playerId, p);
          }
        }
      });

      // Build teamsheetMap: matchId → MatchSide[]
      const teamsheetMap = new Map<number, MatchSide[]>();
      teamsheetsResults.forEach((r, i) => {
        if (r.status === 'fulfilled') teamsheetMap.set(uniqueMatchIds[i], r.value);
      });

      const result: XiEntry[] = pairs.map(p => {
        const sides = teamsheetMap.get(p.match.matchId!) ?? [];
        const side  = sides.find(s => s.teamId === p.teamId) ?? null;
        const xiIds = side?.playingXi ?? [];

        const players = xiIds
          .map(id => playerMap.get(id))
          .filter(Boolean) as Player[];

        return {
          match: p.match,
          teamId: p.teamId,
          teamName: p.teamName,
          side,
          players,
          captainPlayerId: side?.captainPlayerId,
          wicketKeeperPlayerId: side?.wicketKeeperPlayerId,
        };
      });

      setEntries(result);
    };

    load().catch(() => {}).finally(() => setLoading(false));
  }, [teamsLoaded, restrictByTeam, managerTeamIds, homeClubId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!teamsLoaded || loading)
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayMondayKey = getMondayKey(todayStr);

  const weekMap = new Map<string, XiEntry[]>();
  for (const e of entries) {
    const key = getMondayKey(e.match.matchDate);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(e);
  }
  const weeks = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Groups color="primary" />
        <Typography variant="h5">Team Selection</Typography>
      </Box>

      {entries.length === 0 ? (
        <Alert severity="info" icon={<Groups />}>
          No upcoming matches found for your managed teams.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {weeks.map(([mondayKey, weekEntries]) => (
            <Box key={mondayKey}>
              <Typography
                variant="overline"
                sx={{ fontWeight: 'bold', letterSpacing: 1.5, color: 'text.secondary', display: 'block', mb: 1.5 }}
              >
                {fmtWeekLabel(mondayKey, todayMondayKey)}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {weekEntries.map(entry => {
                  const { match, teamId, teamName, side, players, captainPlayerId, wicketKeeperPlayerId } = entry;
                  const announced = side?.teamAnnounced ?? false;
                  const twelfthId = side?.twelfthManPlayerId;
                  const cardKey   = `${match.matchId}-${teamId}`;

                  return (
                    <Card
                      key={cardKey}
                      variant="outlined"
                      sx={{
                        flex: '1 1 320px', minWidth: 300,
                        borderColor: announced ? 'primary.light' : 'divider',
                      }}
                    >
                      <CardActionArea
                        onClick={() => navigate(`/admin/matches/${match.matchId}/detail`, {
                          state: { teamId, initialTab: 1, returnTo: '/manage-club/team-selection' },
                        })}
                        sx={{ height: '100%', alignItems: 'flex-start' }}
                      >
                        <CardContent>
                          {/* Header */}
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, gap: 1, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
                                {match.homeTeamName ?? '—'} vs {match.oppositionTeamName ?? '—'}
                              </Typography>
                              <Chip label={teamName} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                icon={<Groups fontSize="small" />}
                                label={announced ? 'XI Announced' : 'Not Announced'}
                                color={announced ? 'primary' : 'default'}
                                size="small"
                                variant={announced ? 'filled' : 'outlined'}
                              />
                              <Tooltip title="Share match">
                                <IconButton
                                  size="small"
                                  onClick={e => { e.stopPropagation(); setShareEntry({ match, teamId }); }}
                                  sx={{ color: 'text.secondary' }}
                                >
                                  <Share fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>

                          {/* Match meta */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarMonth sx={{ fontSize: 14 }} color="action" />
                              <Typography variant="body2">{fmtDate(match.matchDate)}</Typography>
                            </Box>
                            {fmtTime(match.scheduledStartTime) && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AccessTime sx={{ fontSize: 14 }} color="action" />
                                <Typography variant="body2">{fmtTime(match.scheduledStartTime)}</Typography>
                              </Box>
                            )}
                            {match.fieldName && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationOn sx={{ fontSize: 14 }} color="action" />
                                <Typography variant="body2" noWrap>{match.fieldName}</Typography>
                              </Box>
                            )}
                            {match.tournamentName && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <EmojiEvents sx={{ fontSize: 14 }} color="action" />
                                <Typography variant="body2" noWrap>
                                  {match.tournamentName}
                                  {match.matchStage ? ` — ${STAGE_LABELS[match.matchStage] ?? match.matchStage}` : ''}
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          {/* XI display */}
                          <Divider sx={{ mb: 1.5 }} />

                          {players.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {players.map(p => (
                                <PlayerBadge
                                  key={p.playerId}
                                  player={p}
                                  isCaptain={p.playerId === captainPlayerId}
                                  isWK={p.playerId === wicketKeeperPlayerId}
                                  isTwelfth={p.playerId === twelfthId}
                                />
                              ))}
                              {/* Twelfth man if not in XI */}
                              {twelfthId && !players.some(p => p.playerId === twelfthId) && (() => {
                                const twelfth = entries
                                  .flatMap(e => e.players)
                                  .find(p => p.playerId === twelfthId);
                                return twelfth ? (
                                  <PlayerBadge key={twelfthId} player={twelfth} isCaptain={false} isWK={false} isTwelfth />
                                ) : null;
                              })()}
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1.5, gap: 0.5 }}>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {Array.from({ length: 11 }).map((_, i) => (
                                  <Avatar
                                    key={i}
                                    sx={{ width: 28, height: 28, bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }}
                                  />
                                ))}
                              </Box>
                              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                                XI not announced — tap to select your team
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <MatchSharePanel
        open={!!shareEntry}
        match={shareEntry?.match ?? ({} as Match)}
        teamId={shareEntry?.teamId}
        onClose={() => setShareEntry(null)}
      />
    </Box>
  );
};
