package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentTeamDTO {
    private Long tournamentTeamId;
    private Long poolId;
    private Long teamId;
    private String teamName;
}
