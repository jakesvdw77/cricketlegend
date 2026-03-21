package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ClubDTO {
    private Long clubId;
    private String name;
    private String logoUrl;
    private String googleMapsUrl;
    private String websiteUrl;
    private String contactPerson;
    private String email;
    private String contactNumber;
}
