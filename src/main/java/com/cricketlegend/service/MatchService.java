package com.cricketlegend.service;

import com.cricketlegend.dto.MatchDTO;
import com.cricketlegend.dto.MatchResultDTO;
import com.cricketlegend.dto.MatchResultSummaryDTO;

import java.util.List;

public interface MatchService {
    List<MatchDTO> findAll();
    MatchDTO findById(Long id);
    List<MatchDTO> findByTournament(Long tournamentId);
    List<MatchDTO> findCompletedMatches();
    List<MatchDTO> findLiveMatches();
    List<MatchDTO> findUpcomingMatches();
    MatchDTO create(MatchDTO dto);
    MatchDTO update(Long id, MatchDTO dto);
    void delete(Long id);
    MatchResultDTO getResult(Long matchId);
    MatchResultDTO saveResult(Long matchId, MatchResultDTO dto);
    List<MatchResultSummaryDTO> findResultsByTournament(Long tournamentId);
    List<MatchResultSummaryDTO> findRecentResults(int limit);
}
