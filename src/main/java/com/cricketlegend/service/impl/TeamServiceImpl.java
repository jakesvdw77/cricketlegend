package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Team;
import com.cricketlegend.dto.PlayerDTO;
import com.cricketlegend.dto.TeamDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.PlayerMapper;
import com.cricketlegend.mapper.TeamMapper;
import com.cricketlegend.repository.ClubRepository;
import com.cricketlegend.repository.FieldRepository;
import com.cricketlegend.repository.PlayerRepository;
import com.cricketlegend.repository.TeamRepository;
import com.cricketlegend.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeamServiceImpl implements TeamService {

    private final TeamRepository teamRepository;
    private final ClubRepository clubRepository;
    private final PlayerRepository playerRepository;
    private final FieldRepository fieldRepository;
    private final TeamMapper teamMapper;
    private final PlayerMapper playerMapper;

    @Override
    public List<TeamDTO> findAll() {
        return teamRepository.findAll().stream().map(teamMapper::toDto).toList();
    }

    @Override
    public TeamDTO findById(Long id) {
        return teamRepository.findById(id)
                .map(teamMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("Team", id));
    }

    @Override
    @Transactional
    public TeamDTO create(TeamDTO dto) {
        Team team = teamMapper.toEntity(dto);
        resolveAssociations(team, dto);
        return teamMapper.toDto(teamRepository.save(team));
    }

    @Override
    @Transactional
    public TeamDTO update(Long id, TeamDTO dto) {
        Team existing = teamRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Team", id));
        existing.setTeamName(dto.getTeamName());
        existing.setAbbreviation(dto.getAbbreviation());
        existing.setCoach(dto.getCoach());
        existing.setManager(dto.getManager());
        existing.setAdministrator(dto.getAdministrator());
        existing.setEmail(dto.getEmail());
        existing.setContactNumber(dto.getContactNumber());
        existing.setSelector(dto.getSelector());
        existing.setLogoUrl(dto.getLogoUrl());
        existing.setTeamPhotoUrl(dto.getTeamPhotoUrl());
        existing.setWebsiteUrl(dto.getWebsiteUrl());
        existing.setFacebookUrl(dto.getFacebookUrl());
        resolveAssociations(existing, dto);
        return teamMapper.toDto(teamRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!teamRepository.existsById(id)) throw NotFoundException.of("Team", id);
        teamRepository.deleteById(id);
    }

    @Override
    public List<PlayerDTO> getSquad(Long teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));
        return team.getSquadPlayerIds().stream()
                .map(pid -> playerRepository.findById(pid)
                        .map(playerMapper::toDto)
                        .orElse(null))
                .filter(p -> p != null)
                .toList();
    }

    @Override
    @Transactional
    public void addToSquad(Long teamId, Long playerId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));
        if (!playerRepository.existsById(playerId)) throw NotFoundException.of("Player", playerId);
        if (!team.getSquadPlayerIds().contains(playerId)) {
            team.getSquadPlayerIds().add(playerId);
            teamRepository.save(team);
        }
    }

    @Override
    @Transactional
    public void removeFromSquad(Long teamId, Long playerId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));
        team.getSquadPlayerIds().remove(playerId);
        teamRepository.save(team);
    }

    private void resolveAssociations(Team team, TeamDTO dto) {
        if (dto.getAssociatedClubId() != null) {
            team.setAssociatedClub(clubRepository.findById(dto.getAssociatedClubId())
                    .orElseThrow(() -> NotFoundException.of("Club", dto.getAssociatedClubId())));
        }
        if (dto.getCaptainId() != null) {
            team.setCaptain(playerRepository.findById(dto.getCaptainId())
                    .orElseThrow(() -> NotFoundException.of("Player", dto.getCaptainId())));
        }
        if (dto.getHomeFieldId() != null) {
            team.setHomeField(fieldRepository.findById(dto.getHomeFieldId())
                    .orElseThrow(() -> NotFoundException.of("Field", dto.getHomeFieldId())));
        }
    }
}
