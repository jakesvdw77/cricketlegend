package com.cricketlegend.dto;

import lombok.*;

import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchPollDTO {
    private Long pollId;
    private Long matchId;
    private String matchDate;
    private String scheduledStartTime;
    private String arrivalTime;
    private String homeTeamName;
    private String oppositionTeamName;
    private String homeTeamLogoUrl;
    private String oppositionTeamLogoUrl;
    private String fieldName;
    private String fieldAddress;
    private String fieldGoogleMapsUrl;
    private String fieldIconUrl;
    private String tournamentName;
    private String matchStage;
    private String umpire;
    private Long teamId;
    private String teamName;
    private boolean open;
    private List<PlayerAvailabilityDTO> availability;
}
