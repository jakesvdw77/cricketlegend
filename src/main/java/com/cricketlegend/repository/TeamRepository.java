package com.cricketlegend.repository;

import com.cricketlegend.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<Team, Long> {
    boolean existsByAssociatedClubClubId(Long clubId);
}
