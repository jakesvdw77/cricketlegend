package com.cricketlegend.repository;

import com.cricketlegend.domain.WalletAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WalletAllocationRepository extends JpaRepository<WalletAllocation, Long>, JpaSpecificationExecutor<WalletAllocation> {
    List<WalletAllocation> findByPlayerPlayerId(Long playerId);
    List<WalletAllocation> findByPlayerPlayerIdAndCategory(Long playerId, String category);
    List<WalletAllocation> findByPlayerPlayerIdAndCategoryAndMatchId(Long playerId, String category, Long matchId);
    List<WalletAllocation> findByPlayerPlayerIdAndCategoryAndTournamentId(Long playerId, String category, Long tournamentId);

    @Query("SELECT a FROM WalletAllocation a JOIN FETCH a.player WHERE a.id IN :ids")
    List<WalletAllocation> findByIds(@Param("ids") List<Long> ids);
}
