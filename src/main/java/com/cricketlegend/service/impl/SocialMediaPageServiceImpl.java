package com.cricketlegend.service.impl;

import com.cricketlegend.dto.SocialMediaPageDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.SocialMediaPageMapper;
import com.cricketlegend.repository.SocialMediaPageRepository;
import com.cricketlegend.service.SocialMediaPageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SocialMediaPageServiceImpl implements SocialMediaPageService {

    private final SocialMediaPageRepository socialMediaPageRepository;
    private final SocialMediaPageMapper socialMediaPageMapper;

    @Override
    public List<SocialMediaPageDTO> findAll() {
        return socialMediaPageRepository.findAll().stream().map(socialMediaPageMapper::toDto).toList();
    }

    @Override
    public List<SocialMediaPageDTO> findEnabled() {
        return socialMediaPageRepository.findAllByEnabledTrue().stream().map(socialMediaPageMapper::toDto).toList();
    }

    @Override
    @Transactional
    public SocialMediaPageDTO create(SocialMediaPageDTO dto) {
        return socialMediaPageMapper.toDto(socialMediaPageRepository.save(socialMediaPageMapper.toEntity(dto)));
    }

    @Override
    @Transactional
    public SocialMediaPageDTO update(Long id, SocialMediaPageDTO dto) {
        var existing = socialMediaPageRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("SocialMediaPage", id));
        existing.setUrl(dto.getUrl());
        existing.setLabel(dto.getLabel());
        existing.setEnabled(dto.isEnabled());
        return socialMediaPageMapper.toDto(socialMediaPageRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!socialMediaPageRepository.existsById(id)) throw NotFoundException.of("SocialMediaPage", id);
        socialMediaPageRepository.deleteById(id);
    }
}
