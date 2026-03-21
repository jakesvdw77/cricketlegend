package com.cricketlegend.service;

import com.cricketlegend.dto.PoolStandingsDTO;
import com.cricketlegend.dto.TournamentDTO;
import com.cricketlegend.dto.TournamentPoolDTO;

import java.util.List;

public interface TournamentService {
    List<TournamentDTO> findAll();
    TournamentDTO findById(Long id);
    TournamentDTO create(TournamentDTO dto);
    TournamentDTO update(Long id, TournamentDTO dto);
    void delete(Long id);
    TournamentPoolDTO addPool(Long tournamentId, TournamentPoolDTO poolDTO);
    void addTeamToPool(Long poolId, Long teamId);
    void deletePool(Long poolId);
    void removeTeamFromPool(Long poolId, Long teamId);
    List<PoolStandingsDTO> getStandings(Long tournamentId);
}
