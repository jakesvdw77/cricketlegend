package com.cricketlegend.repository;

import com.cricketlegend.domain.MatchResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MatchResultRepository extends JpaRepository<MatchResult, Long> {
    Optional<MatchResult> findByMatchMatchId(Long matchId);
}
