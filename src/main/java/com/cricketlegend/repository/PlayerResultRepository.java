package com.cricketlegend.repository;

import com.cricketlegend.domain.PlayerResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PlayerResultRepository extends JpaRepository<PlayerResult, Long> {
    List<PlayerResult> findByPlayerPlayerId(Long playerId);
    List<PlayerResult> findByMatchMatchId(Long matchId);

    @Query("SELECT pr FROM PlayerResult pr WHERE pr.player.playerId = :playerId ORDER BY pr.match.matchDate DESC")
    List<PlayerResult> findPlayerStats(@Param("playerId") Long playerId);
}
