package com.cricketlegend.service;

import com.cricketlegend.dto.SponsorDTO;

import java.util.List;

public interface SponsorService {
    List<SponsorDTO> findAll();
    SponsorDTO findById(Long id);
    SponsorDTO create(SponsorDTO dto);
    SponsorDTO update(Long id, SponsorDTO dto);
    void delete(Long id);
    void removeLogo(Long id);
}
