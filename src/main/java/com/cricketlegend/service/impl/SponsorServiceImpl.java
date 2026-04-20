package com.cricketlegend.service.impl;

import com.cricketlegend.dto.SponsorDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.SponsorMapper;
import com.cricketlegend.repository.SponsorRepository;
import com.cricketlegend.service.FileStorageService;
import com.cricketlegend.service.SponsorService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SponsorServiceImpl implements SponsorService {

    private final SponsorRepository sponsorRepository;
    private final SponsorMapper sponsorMapper;
    private final FileStorageService fileStorageService;

    @Override
    public List<SponsorDTO> findAll() {
        return sponsorRepository.findAll().stream().map(sponsorMapper::toDto).toList();
    }

    @Override
    public SponsorDTO findById(Long id) {
        return sponsorRepository.findById(id)
                .map(sponsorMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("Sponsor", id));
    }

    @Override
    @Transactional
    public SponsorDTO create(SponsorDTO dto) {
        return sponsorMapper.toDto(sponsorRepository.save(sponsorMapper.toEntity(dto)));
    }

    @Override
    @Transactional
    public SponsorDTO update(Long id, SponsorDTO dto) {
        var existing = sponsorRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Sponsor", id));
        existing.setName(dto.getName());
        existing.setBrandLogoUrl(dto.getBrandLogoUrl());
        existing.setPrintLogoUrl(dto.getPrintLogoUrl());
        existing.setBrandWebsite(dto.getBrandWebsite());
        existing.setFacebookUrl(dto.getFacebookUrl());
        existing.setInstagramUrl(dto.getInstagramUrl());
        existing.setYoutubeUrl(dto.getYoutubeUrl());
        existing.setContactPerson(dto.getContactPerson());
        existing.setContactNumber(dto.getContactNumber());
        existing.setContactEmail(dto.getContactEmail());
        existing.setAddress(dto.getAddress());
        existing.setVatNumber(dto.getVatNumber());
        existing.setRegistrationNumber(dto.getRegistrationNumber());
        return sponsorMapper.toDto(sponsorRepository.save(existing));
    }

    @Override
    @Transactional
    public void removeLogo(Long id) {
        var existing = sponsorRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Sponsor", id));
        fileStorageService.deleteFile(existing.getBrandLogoUrl());
        existing.setBrandLogoUrl(null);
        sponsorRepository.save(existing);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!sponsorRepository.existsById(id)) throw NotFoundException.of("Sponsor", id);
        sponsorRepository.deleteById(id);
    }
}
