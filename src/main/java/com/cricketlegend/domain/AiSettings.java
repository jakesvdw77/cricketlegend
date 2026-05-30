package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ai_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiSettings {

    @Id
    private Long id = 1L;

    @Column
    private String apiKey;

    @Column(nullable = false)
    private String defaultModel = "claude-opus-4-8";
}
