package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Manager;
import com.cricketlegend.domain.ManagerTeam;
import com.cricketlegend.domain.Team;
import com.cricketlegend.dto.ManagerDTO;
import com.cricketlegend.dto.ManagerTeamDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.repository.ManagerRepository;
import com.cricketlegend.repository.ManagerTeamRepository;
import com.cricketlegend.repository.TeamRepository;
import com.cricketlegend.service.ManagerTeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ManagerTeamServiceImpl implements ManagerTeamService {

    private final ManagerTeamRepository managerTeamRepository;
    private final ManagerRepository managerRepository;
    private final TeamRepository teamRepository;
    private final ManagerServiceImpl managerService;

    @Override
    public List<ManagerTeamDTO> getAllAssignments() {
        return managerTeamRepository.findAll().stream().map(this::toDto).toList();
    }

    @Override
    public List<ManagerDTO> getManagersForTeam(Long teamId) {
        return managerTeamRepository.findByTeamTeamId(teamId).stream()
                .map(mt -> managerService.toDto(mt.getManager()))
                .toList();
    }

    @Override
    @Transactional
    public ManagerTeamDTO assign(Long managerId, Long teamId) {
        Manager manager = managerRepository.findById(managerId)
                .orElseThrow(() -> NotFoundException.of("Manager", managerId));
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));

        if (managerTeamRepository.existsByManagerManagerIdAndTeamTeamId(managerId, teamId)) {
            return managerTeamRepository.findByManagerManagerId(managerId).stream()
                    .filter(mt -> mt.getTeam().getTeamId().equals(teamId))
                    .map(this::toDto)
                    .findFirst().orElseThrow();
        }

        ManagerTeam mt = ManagerTeam.builder().manager(manager).team(team).build();
        return toDto(managerTeamRepository.save(mt));
    }

    @Override
    @Transactional
    public void unassign(Long id) {
        if (!managerTeamRepository.existsById(id)) throw NotFoundException.of("ManagerTeam", id);
        managerTeamRepository.deleteById(id);
    }

    @Override
    public Set<Long> getTeamIdsForManager(String email) {
        return managerTeamRepository.findTeamIdsByManagerEmail(email);
    }

    @Override
    public List<ManagerTeamDTO> getManagedTeams(String email) {
        Manager manager = managerRepository.findByEmail(email).orElse(null);
        if (manager == null) return List.of();
        return managerTeamRepository.findByManagerManagerId(manager.getManagerId())
                .stream().map(this::toDto).toList();
    }

    @Override
    public Set<Long> getSquadPlayerIdsForManager(String email) {
        Set<Long> teamIds = getTeamIdsForManager(email);
        Set<Long> playerIds = new HashSet<>();
        for (Long teamId : teamIds) {
            teamRepository.findById(teamId).ifPresent(team -> {
                if (team.getSquadPlayerIds() != null) {
                    playerIds.addAll(team.getSquadPlayerIds());
                }
            });
        }
        return playerIds;
    }

    @Override
    public boolean canManageTeam(String email, Long teamId) {
        return managerTeamRepository.existsByManagerEmailAndTeamId(email, teamId);
    }

    @Override
    public boolean canManagePlayer(String email, Long playerId) {
        return getSquadPlayerIdsForManager(email).contains(playerId);
    }

    private ManagerTeamDTO toDto(ManagerTeam mt) {
        return ManagerTeamDTO.builder()
                .id(mt.getId())
                .managerId(mt.getManager().getManagerId())
                .managerDisplayName(managerService.toDto(mt.getManager()).getDisplayName())
                .managerEmail(mt.getManager().getEmail())
                .teamId(mt.getTeam().getTeamId())
                .teamName(mt.getTeam().getTeamName())
                .build();
    }
}
