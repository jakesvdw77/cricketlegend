package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ManagerTeamDTO {
    private Long id;
    private Long managerId;
    private String managerDisplayName;
    private String managerEmail;
    private Long teamId;
    private String teamName;
}
