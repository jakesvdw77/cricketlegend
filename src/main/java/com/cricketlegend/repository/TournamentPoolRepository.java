package com.cricketlegend.repository;

import com.cricketlegend.domain.TournamentPool;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TournamentPoolRepository extends JpaRepository<TournamentPool, Long> {
    List<TournamentPool> findByTournamentTournamentId(Long tournamentId);
}
