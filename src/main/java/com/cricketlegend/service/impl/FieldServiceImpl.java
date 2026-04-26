package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Club;
import com.cricketlegend.domain.Field;
import com.cricketlegend.dto.FieldDTO;
import com.cricketlegend.exception.ConflictException;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.FieldMapper;
import com.cricketlegend.repository.ClubRepository;
import com.cricketlegend.repository.FieldRepository;
import com.cricketlegend.service.FieldService;
import com.cricketlegend.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FieldServiceImpl implements FieldService {

    private final FieldRepository fieldRepository;
    private final ClubRepository clubRepository;
    private final FieldMapper fieldMapper;
    private final FileStorageService fileStorageService;

    @Override
    public List<FieldDTO> findAll() {
        return fieldRepository.findAll().stream().map(fieldMapper::toDto).toList();
    }

    @Override
    public FieldDTO findById(Long id) {
        return fieldRepository.findById(id)
                .map(fieldMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("Field", id));
    }

    @Override
    @Transactional
    public FieldDTO create(FieldDTO dto) {
        if (fieldRepository.existsByNameIgnoreCase(dto.getName()))
            throw new ConflictException("A field with this name already exists.");
        Field field = fieldMapper.toEntity(dto);
        resolveClub(field, dto.getHomeClubId());
        return fieldMapper.toDto(fieldRepository.save(field));
    }

    @Override
    @Transactional
    public FieldDTO update(Long id, FieldDTO dto) {
        Field existing = fieldRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Field", id));
        if (fieldRepository.existsByNameIgnoreCaseAndFieldIdNot(dto.getName(), id))
            throw new ConflictException("A field with this name already exists.");
        existing.setName(dto.getName());
        existing.setAddress(dto.getAddress());
        existing.setGoogleMapsUrl(dto.getGoogleMapsUrl());
        existing.setIconUrl(dto.getIconUrl());
        resolveClub(existing, dto.getHomeClubId());
        return fieldMapper.toDto(fieldRepository.save(existing));
    }

    @Override
    @Transactional
    public void removeLogo(Long id) {
        Field existing = fieldRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Field", id));
        fileStorageService.deleteFile(existing.getIconUrl());
        existing.setIconUrl(null);
        fieldRepository.save(existing);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!fieldRepository.existsById(id)) throw NotFoundException.of("Field", id);
        fieldRepository.deleteById(id);
    }

    private void resolveClub(Field field, Long clubId) {
        if (clubId != null) {
            Club club = clubRepository.findById(clubId)
                    .orElseThrow(() -> NotFoundException.of("Club", clubId));
            field.setHomeClub(club);
        }
    }
}
