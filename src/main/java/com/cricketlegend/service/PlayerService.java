package com.cricketlegend.service;

import com.cricketlegend.dto.PlayerDTO;

import java.util.List;

public interface PlayerService {
    List<PlayerDTO> findAll();
    PlayerDTO findById(Long id);
    List<PlayerDTO> search(String query);
    PlayerDTO findMe(String email);
    PlayerDTO updateMe(String email, PlayerDTO dto);
    PlayerDTO create(PlayerDTO dto);
    PlayerDTO update(Long id, PlayerDTO dto);
    void delete(Long id);
    void removeProfilePicture(Long id);
}
