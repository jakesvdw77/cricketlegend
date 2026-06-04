package com.cricketlegend.repository;

import com.cricketlegend.domain.MatchAvailabilityPoll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MatchAvailabilityPollRepository extends JpaRepository<MatchAvailabilityPoll, Long> {
    Optional<MatchAvailabilityPoll> findByMatchMatchIdAndTeamTeamId(Long matchId, Long teamId);

    @Query("""
        SELECT p FROM MatchAvailabilityPoll p
        WHERE p.open = true
          AND :playerId MEMBER OF p.team.squadPlayerIds
          AND (p.match.result IS NULL
            OR (
              (p.match.result.matchCompleted IS NULL OR p.match.result.matchCompleted = false)
              AND (p.match.result.forfeited IS NULL OR p.match.result.forfeited = false)
              AND (p.match.result.noResult IS NULL OR p.match.result.noResult = false)
              AND (p.match.result.matchDrawn IS NULL OR p.match.result.matchDrawn = false)
            )
          )
        """)
    List<MatchAvailabilityPoll> findOpenPollsForPlayer(@Param("playerId") Long playerId);
}
