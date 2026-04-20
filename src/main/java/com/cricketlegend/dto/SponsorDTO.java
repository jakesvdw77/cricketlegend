package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SponsorDTO {
    private Long sponsorId;
    private String name;
    private String brandLogoUrl;
    private String printLogoUrl;
    private String brandWebsite;
    private String facebookUrl;
    private String instagramUrl;
    private String youtubeUrl;
    private String contactPerson;
    private String contactNumber;
    private String contactEmail;
    private String address;
    private String vatNumber;
    private String registrationNumber;
}
