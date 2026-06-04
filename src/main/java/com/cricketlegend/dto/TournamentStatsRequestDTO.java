package com.cricketlegend.dto;

import lombok.*;

import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentStatsRequestDTO {

    private String tournamentName;

    // Match record
    private int matchesPlayed;
    private int wins;
    private int losses;
    private int draws;
    private int noResults;
    private double winPct;
    private double nrr;

    // Batting
    private int battingInnings;
    private int runsScored;
    private int wicketsLost;
    private int fours;
    private int sixes;
    private double aveScore;
    private double runRate;
    private double boundaryPct;
    private double dotPctBat;
    private int highestScore;
    private int highestScoreWickets;
    private int lowestScore;
    private int lowestScoreWickets;

    // Bowling
    private int bowlingInnings;
    private int wicketsTaken;
    private int runsConceded;
    private int maidens;
    private double aveConc;
    private double economy;
    private double bowlingStrikeRate;
    private double dotPctBowl;
    private String bestBowling;

    // Extras
    private int extrasWides;
    private int extrasNoBalls;
    private int extrasByes;
    private int extrasLegByes;
    private int extrasTotal;
    private double aveExtras;
    private double extrasPct;

    // Top performers (pre-formatted strings)
    private List<String> topBatters;
    private List<String> topBowlers;
}
