package com.cricketlegend.repository;

import com.cricketlegend.domain.Field;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FieldRepository extends JpaRepository<Field, Long> {
    boolean existsByHomeClubClubId(Long clubId);
}
