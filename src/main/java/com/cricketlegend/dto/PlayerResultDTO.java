package com.cricketlegend.dto;

import com.cricketlegend.domain.enums.DismissalType;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PlayerResultDTO {
    private Long playerResultId;
    private Long playerId;
    private String playerName;
    private Long matchId;
    private Long teamId;
    private String teamName;
    private Integer battingPosition;
    private Integer score;
    private Integer ballsFaced;
    private Integer foursHit;
    private Integer sixesHit;
    private Boolean dismissed;
    private Long dismissedByBowlerId;
    private String dismissedByBowlerName;
    private DismissalType dismissalType;
    private String oversBowled;
    private Integer wickets;
    private Integer wides;
    private Integer noBalls;
    private Integer dots;
    private Integer catches;
    private Boolean manOfMatch;
}
