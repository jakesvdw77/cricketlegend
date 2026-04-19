package com.cricketlegend.repository;

import com.cricketlegend.domain.WalletAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WalletAllocationRepository extends JpaRepository<WalletAllocation, Long> {
    List<WalletAllocation> findByPlayerPlayerId(Long playerId);
    List<WalletAllocation> findByPlayerPlayerIdAndCategory(Long playerId, String category);
    List<WalletAllocation> findByPlayerPlayerIdAndCategoryAndMatchId(Long playerId, String category, Long matchId);
}
