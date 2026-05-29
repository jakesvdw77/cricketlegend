package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ClubFinancialAdminDTO {
    private Long id;
    private Long managerId;
    private String managerDisplayName;
    private String managerEmail;
    private Long clubId;
    private String clubName;
}
