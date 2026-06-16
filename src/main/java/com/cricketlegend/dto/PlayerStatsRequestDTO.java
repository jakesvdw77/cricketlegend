package com.cricketlegend.dto;

import lombok.*;

import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PlayerStatsRequestDTO {

    private String playerName;
    private String tournamentName;
    private String teamName;
    private String battingStance;
    private String bowlingType;

    // Batting
    private int battingInnings;
    private int runs;
    private int dismissals;
    private int notOuts;
    private double battingAverage;
    private double strikeRate;
    private int highestScore;
    private boolean highestScoreNotOut;
    private int fours;
    private int sixes;
    private double dotPctBat;

    // Bowling
    private int bowlingInnings;
    private String oversBowled;
    private int wickets;
    private int runsConceded;
    private double economy;
    private double bowlingSR;
    private String bestBowling;
    private int maidens;
    private double dotPctBowl;

    // Recent match-by-match form (pre-formatted strings)
    private List<String> recentBatting;
    private List<String> recentBowling;
}
