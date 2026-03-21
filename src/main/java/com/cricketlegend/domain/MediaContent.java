package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "media_content")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MediaContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String url;
}
