package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "club")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Club {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long clubId;

    @Column(nullable = false)
    private String name;

    private String logoUrl;
    private String googleMapsUrl;
    private String websiteUrl;
    private String contactPerson;
    private String email;
    private String contactNumber;
}
