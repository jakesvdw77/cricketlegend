package com.cricketlegend.repository;

import com.cricketlegend.domain.AiAnalysisCache;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiAnalysisCacheRepository extends JpaRepository<AiAnalysisCache, Long> {

    Optional<AiAnalysisCache> findByAnalysisTypeAndPrimaryIdAndSecondaryIdIsNull(
            String analysisType, Long primaryId);

    Optional<AiAnalysisCache> findByAnalysisTypeAndPrimaryIdAndSecondaryId(
            String analysisType, Long primaryId, Long secondaryId);
}
