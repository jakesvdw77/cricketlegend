package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Match;
import com.cricketlegend.domain.MatchResult;
import com.cricketlegend.domain.Player;
import com.cricketlegend.domain.PlayerResult;
import com.cricketlegend.domain.Team;
import com.cricketlegend.domain.enums.DismissalType;
import com.cricketlegend.domain.scorecard.BattingEntry;
import com.cricketlegend.domain.scorecard.BowlingEntry;
import com.cricketlegend.domain.scorecard.ScorecardData;
import com.cricketlegend.domain.scorecard.TeamScorecard;
import com.cricketlegend.dto.MatchDTO;
import com.cricketlegend.dto.MatchResultDTO;
import com.cricketlegend.dto.MatchResultSummaryDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.MatchMapper;
import com.cricketlegend.mapper.MatchResultMapper;
import com.cricketlegend.repository.*;
import com.cricketlegend.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Sort;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MatchServiceImpl implements MatchService {

    private final MatchRepository matchRepository;
    private final MatchResultRepository matchResultRepository;
    private final PlayerResultRepository playerResultRepository;
    private final TeamRepository teamRepository;
    private final FieldRepository fieldRepository;
    private final TournamentRepository tournamentRepository;
    private final PlayerRepository playerRepository;
    private final MatchMapper matchMapper;
    private final MatchResultMapper matchResultMapper;

    @Override
    public List<MatchDTO> findAll() {
        return matchRepository.findAll(Sort.by(Sort.Direction.DESC, "matchDate")).stream().map(this::toMatchDto).toList();
    }

    @Override
    public MatchDTO findById(Long id) {
        return matchRepository.findById(id)
                .map(this::toMatchDto)
                .orElseThrow(() -> NotFoundException.of("Match", id));
    }

    @Override
    public List<MatchDTO> findByTournament(Long tournamentId) {
        return matchRepository.findByTournamentTournamentId(tournamentId)
                .stream().map(this::toMatchDto).toList();
    }

    @Override
    public List<MatchDTO> findCompletedMatches() {
        return matchRepository.findCompletedMatches()
                .stream().map(this::toMatchDto).toList();
    }

    @Override
    public List<MatchDTO> findLiveMatches() {
        LocalTime now = LocalTime.now();
        return matchRepository.findTodaysMatches(LocalDate.now())
                .stream()
                .filter(m -> {
                    // Exclude matches that are already fully completed
                    if (m.getResult() != null && Boolean.TRUE.equals(m.getResult().getMatchCompleted())) return false;
                    // Show if no start time, or if we are within 1 hour before (or past) the start time
                    if (m.getScheduledStartTime() == null) return true;
                    return !now.isBefore(m.getScheduledStartTime().minusHours(1));
                })
                .map(this::toMatchDto)
                .toList();
    }

    @Override
    public List<MatchDTO> findUpcomingMatches() {
        return matchRepository.findUpcomingMatches(LocalDate.now())
                .stream().map(this::toMatchDto).toList();
    }

    @Override
    @Transactional
    public MatchDTO create(MatchDTO dto) {
        Match match = matchMapper.toEntity(dto);
        match.setHomeTeamPlaceholder(dto.getHomeTeamPlaceholder());
        match.setAwayTeamPlaceholder(dto.getAwayTeamPlaceholder());
        resolveAssociations(match, dto);
        return toMatchDto(matchRepository.save(match));
    }

    @Override
    @Transactional
    public MatchDTO update(Long id, MatchDTO dto) {
        Match existing = matchRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Match", id));
        existing.setMatchDate(dto.getMatchDate());
        existing.setScheduledStartTime(dto.getScheduledStartTime());
        existing.setUmpire(dto.getUmpire());
        existing.setScoringUrl(dto.getScoringUrl());
        existing.setYoutubeUrl(dto.getYoutubeUrl());
        existing.setMatchStage(dto.getMatchStage());
        existing.setTossTime(dto.getTossTime());
        existing.setArrivalTime(dto.getArrivalTime());
        existing.setTossWonBy(dto.getTossWonBy());
        existing.setTossDecision(dto.getTossDecision());
        existing.setHomeTeamPlaceholder(dto.getHomeTeamPlaceholder());
        existing.setAwayTeamPlaceholder(dto.getAwayTeamPlaceholder());
        resolveAssociations(existing, dto);
        return toMatchDto(matchRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!matchRepository.existsById(id)) throw NotFoundException.of("Match", id);
        matchRepository.deleteById(id);
    }

    @Override
    public MatchResultDTO getResult(Long matchId) {
        return matchResultRepository.findByMatchMatchId(matchId)
                .map(matchResultMapper::toDto)
                .orElseThrow(() -> new NotFoundException("No result found for match: " + matchId));
    }

    @Override
    @Transactional
    public MatchResultDTO saveResult(Long matchId, MatchResultDTO dto) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> NotFoundException.of("Match", matchId));

        MatchResult result = matchResultRepository.findByMatchMatchId(matchId)
                .orElse(MatchResult.builder().match(match).build());

        result.setMatchCompleted(dto.getMatchCompleted());
        result.setMatchDrawn(dto.getMatchDrawn());
        result.setForfeited(Boolean.TRUE.equals(dto.getForfeited()));
        result.setNoResult(Boolean.TRUE.equals(dto.getNoResult()));
        result.setDecidedOnDLS(dto.getDecidedOnDLS());
        result.setWonWithBonusPoint(dto.getWonWithBonusPoint());
        result.setScoreBattingFirst(dto.getScoreBattingFirst());
        result.setWicketsLostBattingFirst(dto.getWicketsLostBattingFirst());
        result.setOversBattingFirst(dto.getOversBattingFirst());
        result.setScoreBattingSecond(dto.getScoreBattingSecond());
        result.setWicketsLostBattingSecond(dto.getWicketsLostBattingSecond());
        result.setOversBattingSecond(dto.getOversBattingSecond());
        result.setMatchOutcomeDescription(dto.getMatchOutcomeDescription());
        result.setScoreCard(dto.getScoreCard());
        result.setResultVisibility(dto.getResultVisibility() != null ? dto.getResultVisibility() : com.cricketlegend.domain.enums.ResultVisibility.NOT_PUBLISHED);

        if (dto.getWinningTeamId() != null) {
            result.setWinningTeam(teamRepository.findById(dto.getWinningTeamId())
                    .orElseThrow(() -> NotFoundException.of("Team", dto.getWinningTeamId())));
        }
        if (dto.getManOfTheMatchId() != null) {
            result.setManOfTheMatch(playerRepository.findById(dto.getManOfTheMatchId())
                    .orElseThrow(() -> NotFoundException.of("Player", dto.getManOfTheMatchId())));
        }
        if (dto.getSideBattingFirstId() != null) {
            result.setSideBattingFirst(teamRepository.findById(dto.getSideBattingFirstId())
                    .orElseThrow(() -> NotFoundException.of("Team", dto.getSideBattingFirstId())));
        }

        // Persist toss data on the match so it survives for managers who cannot call the match update endpoint
        if (dto.getTossWonBy() != null)   match.setTossWonBy(dto.getTossWonBy());
        if (dto.getTossDecision() != null) match.setTossDecision(dto.getTossDecision());
        matchRepository.save(match);

        MatchResult saved = matchResultRepository.save(result);

        // Derive individual player stats from the scorecard
        if (saved.getScoreCard() != null && saved.getSideBattingFirst() != null) {
            extractAndSavePlayerResults(match, saved);
        }

        return matchResultMapper.toDto(saved);
    }

    @Override
    public List<MatchDTO> findMySchedule(String email) {
        Player player = playerRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("Player not found for email: " + email));
        return matchRepository.findByPlayerInSquadOrPlayingXi(player.getPlayerId())
                .stream()
                .map(this::toMatchDto)
                .toList();
    }

    // ── Player result extraction ───────────────────────────────────────────────

    private void extractAndSavePlayerResults(Match match, MatchResult matchResult) {
        // Full replace for this match
        playerResultRepository.deleteAll(playerResultRepository.findByMatchMatchId(match.getMatchId()));

        Team teamA = matchResult.getSideBattingFirst();
        Team teamB = null;
        if (match.getHomeTeam() != null && !match.getHomeTeam().getTeamId().equals(teamA.getTeamId())) {
            teamB = match.getHomeTeam();
        } else if (match.getOppositionTeam() != null && !match.getOppositionTeam().getTeamId().equals(teamA.getTeamId())) {
            teamB = match.getOppositionTeam();
        }
        if (teamB == null) return;

        ScorecardData sc = matchResult.getScoreCard();
        TeamScorecard a = sc.getTeamA();
        TeamScorecard b = sc.getTeamB();

        Map<Long, PlayerResult> teamAMap = new LinkedHashMap<>();
        Map<Long, PlayerResult> teamBMap = new LinkedHashMap<>();

        // teamA batting → teamA players
        if (a != null && a.getBatting() != null) {
            for (BattingEntry e : a.getBatting()) {
                PlayerResult pr = prForBatting(teamAMap, e, match, teamA);
                if (pr != null) applyBatting(pr, e);
            }
        }
        // teamB bowling → teamA players (teamA bowled when teamB batted)
        if (b != null && b.getBowling() != null) {
            for (BowlingEntry e : b.getBowling()) {
                PlayerResult pr = prForBowling(teamAMap, e, match, teamA);
                if (pr != null) applyBowling(pr, e);
            }
        }
        // teamB batting → teamB players
        if (b != null && b.getBatting() != null) {
            for (BattingEntry e : b.getBatting()) {
                PlayerResult pr = prForBatting(teamBMap, e, match, teamB);
                if (pr != null) applyBatting(pr, e);
            }
        }
        // teamA bowling → teamB players (teamB bowled when teamA batted)
        if (a != null && a.getBowling() != null) {
            for (BowlingEntry e : a.getBowling()) {
                PlayerResult pr = prForBowling(teamBMap, e, match, teamB);
                if (pr != null) applyBowling(pr, e);
            }
        }

        // Man of the match flag
        if (matchResult.getManOfTheMatch() != null) {
            Long motmId = matchResult.getManOfTheMatch().getPlayerId();
            teamAMap.values().forEach(pr -> pr.setManOfMatch(pr.getPlayer().getPlayerId().equals(motmId)));
            teamBMap.values().forEach(pr -> pr.setManOfMatch(pr.getPlayer().getPlayerId().equals(motmId)));
        }

        List<PlayerResult> all = new ArrayList<>();
        all.addAll(teamAMap.values());
        all.addAll(teamBMap.values());
        playerResultRepository.saveAll(all);
    }

    private PlayerResult prForBatting(Map<Long, PlayerResult> map, BattingEntry e, Match match, Team team) {
        if (e.getPlayerId() == null) return null;
        return map.computeIfAbsent(e.getPlayerId(), id ->
                playerRepository.findById(id).map(p -> PlayerResult.builder().player(p).match(match).team(team).build()).orElse(null));
    }

    private PlayerResult prForBowling(Map<Long, PlayerResult> map, BowlingEntry e, Match match, Team team) {
        if (e.getPlayerId() == null) return null;
        return map.computeIfAbsent(e.getPlayerId(), id ->
                playerRepository.findById(id).map(p -> PlayerResult.builder().player(p).match(match).team(team).build()).orElse(null));
    }

    private static void applyBatting(PlayerResult pr, BattingEntry e) {
        pr.setBattingPosition(e.getBattingPosition());
        pr.setScore(e.getScore());
        pr.setBallsFaced(e.getBallsFaced());
        pr.setFoursHit(e.getFours());
        pr.setSixesHit(e.getSixes());
        pr.setDismissed(Boolean.TRUE.equals(e.getDismissed()));
        if (e.getDismissalType() != null) {
            try { pr.setDismissalType(DismissalType.valueOf(e.getDismissalType())); } catch (IllegalArgumentException ignored) {}
        }
    }

    private static void applyBowling(PlayerResult pr, BowlingEntry e) {
        pr.setOversBowled(e.getOvers());
        pr.setWickets(e.getWickets());
        pr.setWides(e.getWides());
        pr.setNoBalls(e.getNoBalls());
        pr.setDots(e.getDots());
    }

    private void resolveAssociations(Match match, MatchDTO dto) {
        if (dto.getHomeTeamId() != null) {
            match.setHomeTeam(teamRepository.findById(dto.getHomeTeamId())
                    .orElseThrow(() -> NotFoundException.of("Team", dto.getHomeTeamId())));
        } else {
            match.setHomeTeam(null);
        }
        if (dto.getOppositionTeamId() != null) {
            match.setOppositionTeam(teamRepository.findById(dto.getOppositionTeamId())
                    .orElseThrow(() -> NotFoundException.of("Team", dto.getOppositionTeamId())));
        } else {
            match.setOppositionTeam(null);
        }
        if (dto.getFieldId() != null) {
            match.setField(fieldRepository.findById(dto.getFieldId())
                    .orElseThrow(() -> NotFoundException.of("Field", dto.getFieldId())));
        }
        if (dto.getTournamentId() != null) {
            match.setTournament(tournamentRepository.findById(dto.getTournamentId())
                    .orElseThrow(() -> NotFoundException.of("Tournament", dto.getTournamentId())));
        }
    }

    @Override
    public List<MatchResultSummaryDTO> findResultsByTournament(Long tournamentId) {
        return matchRepository.findCompletedByTournament(tournamentId).stream()
                .map(this::toSummary)
                .toList();
    }

    @Override
    public List<MatchResultSummaryDTO> findRecentResults(int limit) {
        return matchRepository.findCompletedMatches().stream()
                .limit(limit)
                .map(this::toSummary)
                .toList();
    }

    /** Wraps matchMapper.toDto and manually copies fields not yet in the generated mapper. */
    private MatchDTO toMatchDto(Match m) {
        MatchDTO dto = matchMapper.toDto(m);
        dto.setHomeTeamPlaceholder(m.getHomeTeamPlaceholder());
        dto.setAwayTeamPlaceholder(m.getAwayTeamPlaceholder());
        return dto;
    }

    private MatchResultSummaryDTO toSummary(Match m) {
        MatchResult r = m.getResult();
        return MatchResultSummaryDTO.builder()
                .matchId(m.getMatchId())
                .tournamentId(m.getTournament() != null ? m.getTournament().getTournamentId() : null)
                .matchDate(m.getMatchDate())
                .homeTeamName(m.getHomeTeam() != null ? m.getHomeTeam().getTeamName() : null)
                .oppositionTeamName(m.getOppositionTeam() != null ? m.getOppositionTeam().getTeamName() : null)
                .fieldName(m.getField() != null ? m.getField().getName() : null)
                .scoringUrl(m.getScoringUrl())
                .youtubeUrl(m.getYoutubeUrl())
                .sideBattingFirstName(r.getSideBattingFirst() != null ? r.getSideBattingFirst().getTeamName() : null)
                .scoreBattingFirst(r.getScoreBattingFirst())
                .wicketsLostBattingFirst(r.getWicketsLostBattingFirst())
                .oversBattingFirst(r.getOversBattingFirst())
                .scoreBattingSecond(r.getScoreBattingSecond())
                .wicketsLostBattingSecond(r.getWicketsLostBattingSecond())
                .oversBattingSecond(r.getOversBattingSecond())
                .matchDrawn(r.getMatchDrawn())
                .decidedOnDLS(r.getDecidedOnDLS())
                .wonWithBonusPoint(r.getWonWithBonusPoint())
                .winningTeamName(r.getWinningTeam() != null ? r.getWinningTeam().getTeamName() : null)
                .manOfTheMatchName(r.getManOfTheMatch() != null
                        ? r.getManOfTheMatch().getName() + " " + r.getManOfTheMatch().getSurname() : null)
                .matchOutcomeDescription(r.getMatchOutcomeDescription())
                .build();
    }
}
