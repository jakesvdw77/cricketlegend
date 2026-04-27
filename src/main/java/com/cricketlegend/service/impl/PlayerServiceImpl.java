package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Club;
import com.cricketlegend.domain.Player;
import com.cricketlegend.dto.PlayerDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.PlayerMapper;
import com.cricketlegend.repository.ClubRepository;
import com.cricketlegend.repository.PlayerRepository;
import com.cricketlegend.service.FileStorageService;
import com.cricketlegend.service.PlayerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlayerServiceImpl implements PlayerService {

    private final PlayerRepository playerRepository;
    private final ClubRepository clubRepository;
    private final PlayerMapper playerMapper;
    private final FileStorageService fileStorageService;

    @Override
    public List<PlayerDTO> findAll() {
        return playerRepository.findAll().stream().map(playerMapper::toDto).toList();
    }

    @Override
    public PlayerDTO findById(Long id) {
        return playerRepository.findById(id)
                .map(playerMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("Player", id));
    }

    @Override
    public List<PlayerDTO> search(String query) {
        return playerRepository
                .findByNameContainingIgnoreCaseOrSurnameContainingIgnoreCase(query, query)
                .stream().map(playerMapper::toDto).toList();
    }

    @Override
    public PlayerDTO findMe(String email) {
        return playerRepository.findByEmailIgnoreCase(email)
                .map(playerMapper::toDto)
                .orElseThrow(() -> new com.cricketlegend.exception.NotFoundException("No player profile linked to " + email));
    }

    @Override
    @Transactional
    public PlayerDTO updateMe(String email, PlayerDTO dto) {
        Player existing = playerRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new com.cricketlegend.exception.NotFoundException("No player profile linked to " + email));
        dto.setEmail(email); // email is the identifier — cannot be changed via self-service
        return update(existing.getPlayerId(), dto);
    }

    @Override
    @Transactional
    public PlayerDTO create(PlayerDTO dto) {
        Player player = playerMapper.toEntity(dto);
        resolveClub(player, dto.getHomeClubId());
        return playerMapper.toDto(playerRepository.save(player));
    }

    @Override
    @Transactional
    public PlayerDTO update(Long id, PlayerDTO dto) {
        Player existing = playerRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Player", id));
        existing.setName(dto.getName());
        existing.setSurname(dto.getSurname());
        existing.setDateOfBirth(dto.getDateOfBirth());
        existing.setContactNumber(dto.getContactNumber());
        existing.setEmail(dto.getEmail());
        existing.setAlternativeContactNumber(dto.getAlternativeContactNumber());
        existing.setShirtNumber(dto.getShirtNumber());
        existing.setProfilePictureUrl(dto.getProfilePictureUrl());
        existing.setCareerUrl(dto.getCareerUrl());
        existing.setBattingPosition(dto.getBattingPosition());
        existing.setBattingStance(dto.getBattingStance());
        existing.setBowlingArm(dto.getBowlingArm());
        existing.setBowlingType(dto.getBowlingType());
        existing.setWicketKeeper(dto.getWicketKeeper());
        existing.setPartTimeBowler(dto.getPartTimeBowler());
        existing.setGender(dto.getGender());
        existing.setShirtSize(dto.getShirtSize());
        existing.setPantSize(dto.getPantSize());
        existing.setConsentEmail(dto.getConsentEmail());
        resolveClub(existing, dto.getHomeClubId());
        return playerMapper.toDto(playerRepository.save(existing));
    }

    @Override
    @Transactional
    public void removeProfilePicture(Long id) {
        Player existing = playerRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Player", id));
        fileStorageService.deleteFile(existing.getProfilePictureUrl());
        existing.setProfilePictureUrl(null);
        playerRepository.save(existing);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!playerRepository.existsById(id)) throw NotFoundException.of("Player", id);
        playerRepository.deleteById(id);
    }

    private void resolveClub(Player player, Long clubId) {
        if (clubId != null) {
            Club club = clubRepository.findById(clubId)
                    .orElseThrow(() -> NotFoundException.of("Club", clubId));
            player.setHomeClub(club);
        } else {
            player.setHomeClub(null);
        }
    }
}
