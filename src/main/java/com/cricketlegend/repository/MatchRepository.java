package com.cricketlegend.repository;

import com.cricketlegend.domain.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {
    List<Match> findByTournamentTournamentId(Long tournamentId);

    @Query("SELECT m FROM Match m WHERE m.matchDate < :today AND m.result IS NOT NULL")
    List<Match> findPreviousMatches(@Param("today") LocalDate today);

    @Query("SELECT m FROM Match m WHERE m.matchDate >= :today")
    List<Match> findUpcomingMatches(@Param("today") LocalDate today);

    List<Match> findByHomeTeamTeamIdOrOppositionTeamTeamId(Long homeTeamId, Long oppositionTeamId);

    @Query("SELECT m FROM Match m WHERE m.tournament.tournamentId = :tournamentId AND m.result IS NOT NULL AND m.result.matchCompleted = true ORDER BY m.matchDate DESC")
    List<Match> findCompletedByTournament(@Param("tournamentId") Long tournamentId);
}
