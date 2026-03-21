package com.cricketlegend.repository;

import com.cricketlegend.domain.Tournament;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TournamentRepository extends JpaRepository<Tournament, Long> {}
