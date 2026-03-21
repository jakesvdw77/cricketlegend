package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolStandingEntryDTO {
    private Long teamId;
    private String teamName;
    private String logoUrl;
    private int gamesPlayed;
    private int won;
    private int lost;
    private int noResults;
    private int draws;
    private int points;
    private int bonusPoints;
    private double netRunRate;
}
