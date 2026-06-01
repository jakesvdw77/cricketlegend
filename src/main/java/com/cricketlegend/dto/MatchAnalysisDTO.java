package com.cricketlegend.dto;

import lombok.*;

import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchAnalysisDTO {

    private String matchSummary;
    private TeamPerformance teamPerformance;
    private List<String> keyInsights;
    private List<PlayerHighlight> playerHighlights;
    private List<String> recommendations;
    private ChartData chartData;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TeamPerformance {
        private Double battingRating;
        private Double bowlingRating;
        private Double overallRating;
        private String verdict;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PlayerHighlight {
        private String name;
        private String role;
        private String achievement;
        private Boolean isStandout;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChartData {
        private List<BattingContribution> battingContributions;
        private List<BowlingAnalysis> bowlingAnalysis;
        private List<DismissalType> dismissalBreakdown;
        private TeamComparison teamComparison;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BattingContribution {
        private String player;
        private Integer runs;
        private Integer balls;
        private Double strikeRate;
        private Integer fours;
        private Integer sixes;
        private Boolean isTopPerformer;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BowlingAnalysis {
        private String player;
        private Double overs;
        private Integer runs;
        private Integer wickets;
        private Double economy;
        private Integer maidens;
        private Boolean isTopPerformer;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DismissalType {
        private String type;
        private Integer count;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TeamComparison {
        private TeamScore myTeam;
        private TeamScore opposition;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TeamScore {
        private String name;
        private Integer runs;
        private Integer wickets;
        private String overs;
        private Double runRate;
    }
}
