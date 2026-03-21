package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FieldDTO {
    private Long fieldId;
    private String name;
    private String address;
    private String googleMapsUrl;
    private Long homeClubId;
    private String homeClubName;
}
