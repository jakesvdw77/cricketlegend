package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Club;
import com.cricketlegend.domain.ClubFinancialAdmin;
import com.cricketlegend.domain.Manager;
import com.cricketlegend.dto.ClubFinancialAdminDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.repository.ClubFinancialAdminRepository;
import com.cricketlegend.repository.ClubRepository;
import com.cricketlegend.repository.ManagerRepository;
import com.cricketlegend.repository.PlayerRepository;
import com.cricketlegend.service.ClubFinancialAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClubFinancialAdminServiceImpl implements ClubFinancialAdminService {

    private final ClubFinancialAdminRepository repo;
    private final ManagerRepository managerRepository;
    private final ClubRepository clubRepository;
    private final PlayerRepository playerRepository;

    @Override
    public List<ClubFinancialAdminDTO> getAllAssignments() {
        return repo.findAll().stream().map(this::toDto).toList();
    }

    @Override
    @Transactional
    public ClubFinancialAdminDTO assign(Long managerId, Long clubId) {
        Manager manager = managerRepository.findById(managerId)
                .orElseThrow(() -> NotFoundException.of("Manager", managerId));
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> NotFoundException.of("Club", clubId));
        if (repo.existsByManagerManagerIdAndClubClubId(managerId, clubId)) {
            return repo.findByManagerManagerId(managerId).stream()
                    .filter(cfa -> cfa.getClub().getClubId().equals(clubId))
                    .map(this::toDto)
                    .findFirst().orElseThrow();
        }
        return toDto(repo.save(ClubFinancialAdmin.builder().manager(manager).club(club).build()));
    }

    @Override
    @Transactional
    public void unassign(Long id) {
        if (!repo.existsById(id)) throw NotFoundException.of("ClubFinancialAdmin", id);
        repo.deleteById(id);
    }

    @Override
    public Optional<Long> getClubIdForFinancialAdmin(String email) {
        return repo.findClubIdByManagerEmail(email);
    }

    @Override
    public boolean isFinancialAdminForClub(String email, Long clubId) {
        return getClubIdForFinancialAdmin(email).map(id -> id.equals(clubId)).orElse(false);
    }

    @Override
    public boolean canManagePlayer(String email, Long playerId) {
        Long clubId = getClubIdForFinancialAdmin(email).orElse(null);
        if (clubId == null) return false;
        return playerRepository.findById(playerId)
                .map(p -> p.getHomeClub() != null && clubId.equals(p.getHomeClub().getClubId()))
                .orElse(false);
    }

    private ClubFinancialAdminDTO toDto(ClubFinancialAdmin cfa) {
        Manager m = cfa.getManager();
        String displayName = (m.getName() != null)
                ? m.getName() + " " + m.getSurname()
                : m.getEmail();
        return ClubFinancialAdminDTO.builder()
                .id(cfa.getId())
                .managerId(m.getManagerId())
                .managerDisplayName(displayName)
                .managerEmail(m.getEmail())
                .clubId(cfa.getClub().getClubId())
                .clubName(cfa.getClub().getName())
                .build();
    }
}
