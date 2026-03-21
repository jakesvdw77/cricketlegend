package com.cricketlegend.service;

import com.cricketlegend.dto.MatchSideDTO;

import java.util.List;

public interface MatchSideService {
    List<MatchSideDTO> findByMatch(Long matchId);
    MatchSideDTO findById(Long id);
    MatchSideDTO save(MatchSideDTO dto);
    void delete(Long id);
}
