package com.cricketlegend.service;

import com.cricketlegend.dto.PlayerResultDTO;

import java.util.List;

public interface PlayerResultService {
    List<PlayerResultDTO> findByMatch(Long matchId);
    List<PlayerResultDTO> findByPlayer(Long playerId);
    PlayerResultDTO create(PlayerResultDTO dto);
    PlayerResultDTO update(Long id, PlayerResultDTO dto);
    void delete(Long id);
}
