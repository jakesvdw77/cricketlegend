package com.cricketlegend.service;

import com.cricketlegend.dto.PlayerDTO;
import com.cricketlegend.dto.TeamDTO;

import java.util.List;

public interface TeamService {
    List<TeamDTO> findAll();
    TeamDTO findById(Long id);
    TeamDTO create(TeamDTO dto);
    TeamDTO update(Long id, TeamDTO dto);
    void delete(Long id);

    List<TeamDTO> findByPlayerId(Long playerId);
    List<PlayerDTO> getSquad(Long teamId);
    void addToSquad(Long teamId, Long playerId);
    void removeFromSquad(Long teamId, Long playerId);
}
