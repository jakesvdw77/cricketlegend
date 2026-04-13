package com.cricketlegend.dto;

import lombok.*;

import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TeamDTO {
    private Long teamId;
    private String teamName;
    private String abbreviation;
    private Long associatedClubId;
    private String associatedClubName;
    private String coach;
    private String manager;
    private String administrator;
    private String email;
    private String contactNumber;
    private Long captainId;
    private String captainName;
    private Long homeFieldId;
    private String homeFieldName;
    private String selector;
    private String logoUrl;
    private String teamPhotoUrl;
    private String websiteUrl;
    private String facebookUrl;
    private List<MediaContentDTO> mediaContent;
    private List<SponsorDTO> sponsors;
}
