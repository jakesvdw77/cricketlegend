package com.cricketlegend.service;

import com.cricketlegend.dto.ManagerDTO;

import java.util.List;

public interface ManagerService {
    List<ManagerDTO> findAll();
    ManagerDTO findById(Long id);
    ManagerDTO create(ManagerDTO dto);
    ManagerDTO update(Long id, ManagerDTO dto);
    void delete(Long id);
}
