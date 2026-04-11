package com.cricketlegend.repository;

import com.cricketlegend.domain.MatchAvailabilityPoll;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MatchAvailabilityPollRepository extends JpaRepository<MatchAvailabilityPoll, Long> {
    Optional<MatchAvailabilityPoll> findByMatchMatchIdAndTeamTeamId(Long matchId, Long teamId);
}
