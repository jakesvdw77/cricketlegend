package com.cricketlegend.repository;

import com.cricketlegend.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, Long> {
    boolean existsByAssociatedClubClubId(Long clubId);

    @Query("SELECT t FROM Team t WHERE :playerId MEMBER OF t.squadPlayerIds")
    List<Team> findBySquadPlayerIdsContaining(@Param("playerId") Long playerId);
}
