package com.cricketlegend.repository;

import com.cricketlegend.domain.PlayerNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlayerNotificationRepository extends JpaRepository<PlayerNotification, Long> {
    List<PlayerNotification> findByPlayerPlayerIdOrderByCreatedAtDesc(Long playerId);
    List<PlayerNotification> findByPlayerPlayerIdAndReadFalse(Long playerId);
    long countByPlayerPlayerIdAndReadFalse(Long playerId);
}
