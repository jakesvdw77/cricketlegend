package com.cricketlegend.domain.scorecard;

import lombok.Data;

@Data
public class BattingEntry {
    private Long playerId;
    private String playerName;
    private Integer battingPosition;
    private Boolean batted;
    private Integer score;
    private Integer ballsFaced;
    private Integer fours;
    private Integer sixes;
    private Integer dots;
    private Boolean dismissed;
    private String dismissalType;
    private String dismissedBowler;
    private String dismissedDescription;
}
