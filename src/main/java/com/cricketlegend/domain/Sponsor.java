package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sponsor")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Sponsor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sponsorId;

    @Column(nullable = false)
    private String name;

    private String brandLogoUrl;
    private String printLogoUrl;
    private String brandWebsite;
    private String contactPerson;
    private String contactNumber;
    private String contactEmail;
    private String address;
    private String vatNumber;
    private String registrationNumber;
}
