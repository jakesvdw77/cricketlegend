package com.cricketlegend.repository;

import com.cricketlegend.domain.MediaContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MediaContentRepository extends JpaRepository<MediaContent, Long>,
        JpaSpecificationExecutor<MediaContent> {
}
