package com.cricketlegend.repository;

import com.cricketlegend.domain.MatchSide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MatchSideRepository extends JpaRepository<MatchSide, Long> {
    List<MatchSide> findByMatchMatchId(Long matchId);
    Optional<MatchSide> findByMatchMatchIdAndTeamTeamId(Long matchId, Long teamId);

    @Query("SELECT ms FROM MatchSide ms JOIN ms.playingXi pid WHERE pid = :playerId")
    List<MatchSide> findByPlayingXiContaining(@Param("playerId") Long playerId);

    @Query("SELECT ms FROM MatchSide ms WHERE ms.match.tournament.tournamentId = :tournamentId " +
           "AND ms.team.teamId = :teamId " +
           "AND ms.match.result IS NOT NULL AND ms.match.result.matchCompleted = true")
    List<MatchSide> findCompletedByTournamentAndTeam(@Param("tournamentId") Long tournamentId,
                                                     @Param("teamId") Long teamId);
}
