package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SponsorDTO {
    private Long sponsorId;
    private String name;
    private String brandLogoUrl;
    private String brandWebsite;
    private String contactNumber;
    private String contactEmail;
    private String address;
    private String vatNumber;
    private String registrationNumber;
}
