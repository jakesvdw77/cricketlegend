package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Club;
import com.cricketlegend.dto.ClubDTO;
import com.cricketlegend.exception.ConflictException;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.ClubMapper;
import com.cricketlegend.repository.ClubRepository;
import com.cricketlegend.repository.FieldRepository;
import com.cricketlegend.repository.PlayerRepository;
import com.cricketlegend.repository.TeamRepository;
import com.cricketlegend.service.ClubService;
import com.cricketlegend.service.FileStorageService;
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
    private final PlayerRepository playerRepository;
    private final FieldRepository fieldRepository;
    private final TeamRepository teamRepository;
    private final FileStorageService fileStorageService;

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
    public void removeLogo(Long id) {
        Club existing = clubRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Club", id));
        fileStorageService.deleteFile(existing.getLogoUrl());
        existing.setLogoUrl(null);
        clubRepository.save(existing);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!clubRepository.existsById(id)) throw NotFoundException.of("Club", id);
        if (playerRepository.existsByHomeClubClubId(id))
            throw new ConflictException("Cannot delete club: players are linked to it.");
        if (fieldRepository.existsByHomeClubClubId(id))
            throw new ConflictException("Cannot delete club: fields are linked to it.");
        if (teamRepository.existsByAssociatedClubClubId(id))
            throw new ConflictException("Cannot delete club: teams are linked to it.");
        clubRepository.deleteById(id);
    }
}
