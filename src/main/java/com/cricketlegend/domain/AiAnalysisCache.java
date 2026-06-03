package com.cricketlegend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_analysis_cache")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAnalysisCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "analysis_type", nullable = false, length = 50)
    private String analysisType;

    /** For squad analysis: the team ID. For match analyses: the match ID. */
    @Column(name = "primary_id", nullable = false)
    private Long primaryId;

    /** For match analyses: the team ID. Null for squad analysis. */
    @Column(name = "secondary_id")
    private Long secondaryId;

    @Column(name = "result_json", nullable = false, columnDefinition = "TEXT")
    private String resultJson;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;
}
