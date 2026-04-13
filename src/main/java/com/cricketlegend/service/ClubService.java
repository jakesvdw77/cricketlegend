package com.cricketlegend.service;

import com.cricketlegend.dto.ClubDTO;

import java.util.List;

public interface ClubService {
    List<ClubDTO> findAll();
    ClubDTO findById(Long id);
    ClubDTO create(ClubDTO dto);
    ClubDTO update(Long id, ClubDTO dto);
    void delete(Long id);
    void removeLogo(Long id);
}
