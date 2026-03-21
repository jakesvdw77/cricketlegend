package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "field")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Field {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long fieldId;

    @Column(nullable = false)
    private String name;

    private String address;

    private String googleMapsUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_club_id")
    private Club homeClub;
}
