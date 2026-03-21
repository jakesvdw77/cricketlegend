package com.cricketlegend.domain.scorecard;

import lombok.Data;

@Data
public class BowlingEntry {
    private Long playerId;
    private String playerName;
    private String overs;
    private Integer runs;
    private Integer wickets;
    private Integer dots;
    private Integer wides;
    private Integer noBalls;
}
