package com.cricketlegend.dto;

import lombok.*;

import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchPollDTO {
    private Long pollId;
    private Long matchId;
    private String matchDate;
    private String homeTeamName;
    private String oppositionTeamName;
    private Long teamId;
    private String teamName;
    private boolean open;
    private List<PlayerAvailabilityDTO> availability;
}
