package com.cricketlegend.repository;

import com.cricketlegend.domain.Player;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findByNameContainingIgnoreCaseOrSurnameContainingIgnoreCase(String name, String surname);
    boolean existsByHomeClubClubId(Long clubId);
}
