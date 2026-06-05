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
        JOIN p.match m
        LEFT JOIN m.result r
        WHERE p.open = true
          AND (
            :playerId MEMBER OF p.team.squadPlayerIds
            OR EXISTS (
              SELECT a FROM PlayerAvailability a
              WHERE a.poll = p AND a.player.playerId = :playerId
            )
          )
          AND (r IS NULL
            OR (
              (r.matchCompleted IS NULL OR r.matchCompleted = false)
              AND (r.forfeited IS NULL OR r.forfeited = false)
              AND (r.noResult IS NULL OR r.noResult = false)
              AND (r.matchDrawn IS NULL OR r.matchDrawn = false)
            )
          )
        """)
    List<MatchAvailabilityPoll> findOpenPollsForPlayer(@Param("playerId") Long playerId);
}
