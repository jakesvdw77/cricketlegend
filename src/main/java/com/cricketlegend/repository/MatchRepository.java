package com.cricketlegend.repository;

import com.cricketlegend.domain.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {
    List<Match> findByTournamentTournamentId(Long tournamentId);

    @Query("SELECT m FROM Match m WHERE m.result IS NOT NULL AND m.result.matchCompleted = true ORDER BY m.matchDate DESC")
    List<Match> findCompletedMatches();

    @Query("SELECT m FROM Match m WHERE m.matchDate = :today")
    List<Match> findTodaysMatches(@Param("today") LocalDate today);

    @Query("SELECT m FROM Match m WHERE m.matchDate > :today")
    List<Match> findUpcomingMatches(@Param("today") LocalDate today);

    List<Match> findByHomeTeamTeamIdOrOppositionTeamTeamId(Long homeTeamId, Long oppositionTeamId);

    @Query("SELECT m FROM Match m WHERE m.tournament.tournamentId = :tournamentId AND m.result IS NOT NULL AND m.result.matchCompleted = true ORDER BY m.matchDate DESC")
    List<Match> findCompletedByTournament(@Param("tournamentId") Long tournamentId);

    @Query("SELECT DISTINCT m FROM Match m " +
           "WHERE :playerId MEMBER OF m.homeTeam.squadPlayerIds " +
           "OR :playerId MEMBER OF m.oppositionTeam.squadPlayerIds " +
           "OR EXISTS (SELECT ms FROM MatchSide ms JOIN ms.playingXi pid WHERE ms.match = m AND pid = :playerId) " +
           "ORDER BY m.matchDate ASC NULLS LAST")
    List<Match> findByPlayerInSquadOrPlayingXi(@Param("playerId") Long playerId);
}
