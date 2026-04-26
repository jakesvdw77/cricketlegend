package com.cricketlegend.repository;

import com.cricketlegend.domain.Club;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClubRepository extends JpaRepository<Club, Long> {
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndClubIdNot(String name, Long clubId);
}
