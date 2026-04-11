package com.cricketlegend.repository;

import com.cricketlegend.domain.PlayerAvailability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlayerAvailabilityRepository extends JpaRepository<PlayerAvailability, Long> {
    List<PlayerAvailability> findByPollPollId(Long pollId);
    Optional<PlayerAvailability> findByPollPollIdAndPlayerPlayerId(Long pollId, Long playerId);
}
