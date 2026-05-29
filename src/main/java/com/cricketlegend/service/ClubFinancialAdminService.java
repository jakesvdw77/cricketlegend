package com.cricketlegend.service;

import com.cricketlegend.dto.ClubFinancialAdminDTO;

import java.util.List;
import java.util.Optional;

public interface ClubFinancialAdminService {

    List<ClubFinancialAdminDTO> getAllAssignments();

    ClubFinancialAdminDTO assign(Long managerId, Long clubId);

    void unassign(Long id);

    /** Returns the club ID this financial admin is assigned to, resolved from their email. */
    Optional<Long> getClubIdForFinancialAdmin(String email);

    /** Returns true if the user with the given email is the financial admin for the given club. */
    boolean isFinancialAdminForClub(String email, Long clubId);

    /** Returns true if the player belongs to the financial admin's assigned club. */
    boolean canManagePlayer(String email, Long playerId);
}
