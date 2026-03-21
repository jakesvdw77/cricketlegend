package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Club;
import com.cricketlegend.dto.ClubDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.ClubMapper;
import com.cricketlegend.repository.ClubRepository;
import com.cricketlegend.service.ClubService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClubServiceImpl implements ClubService {

    private final ClubRepository clubRepository;
    private final ClubMapper clubMapper;

    @Override
    public List<ClubDTO> findAll() {
        return clubRepository.findAll().stream().map(clubMapper::toDto).toList();
    }

    @Override
    public ClubDTO findById(Long id) {
        return clubRepository.findById(id)
                .map(clubMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("Club", id));
    }

    @Override
    @Transactional
    public ClubDTO create(ClubDTO dto) {
        Club saved = clubRepository.save(clubMapper.toEntity(dto));
        return clubMapper.toDto(saved);
    }

    @Override
    @Transactional
    public ClubDTO update(Long id, ClubDTO dto) {
        Club existing = clubRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Club", id));
        existing.setName(dto.getName());
        existing.setLogoUrl(dto.getLogoUrl());
        existing.setGoogleMapsUrl(dto.getGoogleMapsUrl());
        existing.setWebsiteUrl(dto.getWebsiteUrl());
        existing.setContactPerson(dto.getContactPerson());
        existing.setEmail(dto.getEmail());
        existing.setContactNumber(dto.getContactNumber());
        return clubMapper.toDto(clubRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!clubRepository.existsById(id)) throw NotFoundException.of("Club", id);
        clubRepository.deleteById(id);
    }
}
