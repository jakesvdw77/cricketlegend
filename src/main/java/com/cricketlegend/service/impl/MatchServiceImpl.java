package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Match;
import com.cricketlegend.domain.MatchResult;
import com.cricketlegend.dto.MatchDTO;
import com.cricketlegend.dto.MatchResultDTO;
import com.cricketlegend.dto.MatchResultSummaryDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.MatchMapper;
import com.cricketlegend.mapper.MatchResultMapper;
import com.cricketlegend.domain.Player;
import com.cricketlegend.repository.*;
import com.cricketlegend.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Sort;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MatchServiceImpl implements MatchService {

    private final MatchRepository matchRepository;
    private final MatchResultRepository matchResultRepository;
    private final TeamRepository teamRepository;
    private final FieldRepository fieldRepository;
    private final TournamentRepository tournamentRepository;
    private final PlayerRepository playerRepository;
    private final MatchMapper matchMapper;
    private final MatchResultMapper matchResultMapper;

    @Override
    public List<MatchDTO> findAll() {
        return matchRepository.findAll(Sort.by(Sort.Direction.DESC, "matchDate")).stream().map(matchMapper::toDto).toList();
    }

    @Override
    public MatchDTO findById(Long id) {
        return matchRepository.findById(id)
                .map(matchMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("Match", id));
    }

    @Override
    public List<MatchDTO> findByTournament(Long tournamentId) {
        return matchRepository.findByTournamentTournamentId(tournamentId)
                .stream().map(matchMapper::toDto).toList();
    }

    @Override
    public List<MatchDTO> findCompletedMatches() {
        return matchRepository.findCompletedMatches()
                .stream().map(matchMapper::toDto).toList();
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
                .map(matchMapper::toDto)
                .toList();
    }

    @Override
    public List<MatchDTO> findUpcomingMatches() {
        return matchRepository.findUpcomingMatches(LocalDate.now())
                .stream().map(matchMapper::toDto).toList();
    }

    @Override
    @Transactional
    public MatchDTO create(MatchDTO dto) {
        Match match = matchMapper.toEntity(dto);
        resolveAssociations(match, dto);
        return matchMapper.toDto(matchRepository.save(match));
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
        resolveAssociations(existing, dto);
        return matchMapper.toDto(matchRepository.save(existing));
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

        return matchResultMapper.toDto(matchResultRepository.save(result));
    }

    @Override
    public List<MatchDTO> findMySchedule(String email) {
        Player player = playerRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("Player not found for email: " + email));
        return matchRepository.findByPlayerInSquadOrPlayingXi(player.getPlayerId())
                .stream()
                .map(matchMapper::toDto)
                .toList();
    }

    private void resolveAssociations(Match match, MatchDTO dto) {
        if (dto.getHomeTeamId() != null) {
            match.setHomeTeam(teamRepository.findById(dto.getHomeTeamId())
                    .orElseThrow(() -> NotFoundException.of("Team", dto.getHomeTeamId())));
        }
        if (dto.getOppositionTeamId() != null) {
            match.setOppositionTeam(teamRepository.findById(dto.getOppositionTeamId())
                    .orElseThrow(() -> NotFoundException.of("Team", dto.getOppositionTeamId())));
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

    private MatchResultSummaryDTO toSummary(Match m) {
        MatchResult r = m.getResult();
        return MatchResultSummaryDTO.builder()
                .matchId(m.getMatchId())
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
