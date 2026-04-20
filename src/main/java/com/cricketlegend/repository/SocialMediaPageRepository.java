package com.cricketlegend.repository;

import com.cricketlegend.domain.SocialMediaPage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SocialMediaPageRepository extends JpaRepository<SocialMediaPage, Long> {
    List<SocialMediaPage> findAllByEnabledTrue();
}
