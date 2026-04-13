package com.cricketlegend.service;

import com.cricketlegend.dto.FieldDTO;

import java.util.List;

public interface FieldService {
    List<FieldDTO> findAll();
    FieldDTO findById(Long id);
    FieldDTO create(FieldDTO dto);
    FieldDTO update(Long id, FieldDTO dto);
    void delete(Long id);
    void removeLogo(Long id);
}
