package com.cricketlegend.dto;

import lombok.*;

import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentPoolDTO {
    private Long poolId;
    private String poolName;
    private Long tournamentId;
    private List<TournamentTeamDTO> teams;
}
