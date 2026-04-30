package com.cricketlegend.domain.scorecard;

import lombok.Data;

import java.util.List;

@Data
public class TeamScorecard {
    private Long teamId;
    private Integer score;
    private Integer wickets;
    private String overs;
    private Integer byes;
    private Integer legByes;
    private Integer wides;
    private Integer noBalls;
    private Integer penaltyRuns;
    private List<BattingEntry> batting;
    private List<BowlingEntry> bowling;
}
