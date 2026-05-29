package com.cricketlegend.repository;

import com.cricketlegend.domain.ClubFinancialAdmin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ClubFinancialAdminRepository extends JpaRepository<ClubFinancialAdmin, Long> {

    List<ClubFinancialAdmin> findByManagerManagerId(Long managerId);

    List<ClubFinancialAdmin> findByClubClubId(Long clubId);

    boolean existsByManagerManagerIdAndClubClubId(Long managerId, Long clubId);

    @Query("SELECT cfa.club.clubId FROM ClubFinancialAdmin cfa WHERE cfa.manager.email = :email")
    Optional<Long> findClubIdByManagerEmail(String email);
}
