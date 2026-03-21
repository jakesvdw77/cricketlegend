package com.cricketlegend.repository;

import com.cricketlegend.domain.Sponsor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SponsorRepository extends JpaRepository<Sponsor, Long> {
}
