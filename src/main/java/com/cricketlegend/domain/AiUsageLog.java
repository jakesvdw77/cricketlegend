package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_usage_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String feature;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false)
    private long promptTokens;

    @Column(nullable = false)
    private long completionTokens;

    @Column(nullable = false)
    private long totalTokens;

    @Column(nullable = false)
    private LocalDateTime loggedAt;
}
