package com.cricketlegend.service;

import com.cricketlegend.dto.SocialMediaPageDTO;

import java.util.List;

public interface SocialMediaPageService {
    List<SocialMediaPageDTO> findAll();
    List<SocialMediaPageDTO> findEnabled();
    SocialMediaPageDTO create(SocialMediaPageDTO dto);
    SocialMediaPageDTO update(Long id, SocialMediaPageDTO dto);
    void delete(Long id);
}
