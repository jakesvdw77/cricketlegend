package com.cricketlegend.repository;

import com.cricketlegend.domain.MatchSide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MatchSideRepository extends JpaRepository<MatchSide, Long> {
    List<MatchSide> findByMatchMatchId(Long matchId);
    Optional<MatchSide> findByMatchMatchIdAndTeamTeamId(Long matchId, Long teamId);
}
