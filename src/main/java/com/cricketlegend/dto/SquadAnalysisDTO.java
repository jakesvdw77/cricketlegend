package com.cricketlegend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SquadAnalysisDTO {

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime generatedAt;

    private String squadSummary;
    private String balanceVerdict;
    private List<String> strengths;
    private List<String> weaknesses;
    private List<String> selectionRecommendations;
    private List<KeyPlayer> keyPlayers;
    private ChartData chartData;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class KeyPlayer {
        private String name;
        private String primaryRole;
        private String keySkill;
        private Double rating;
        private Boolean isKeyPlayer;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChartData {
        private List<RadarPoint>         squadStrengthRadar;
        private List<LabelCount>         roleDistribution;
        private List<LabelCount>         bowlingVariety;
        private List<LabelCount>         battingDepth;
        private List<PlayerProfile>      playerProfiles;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RadarPoint {
        private String skill;
        private Double score;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LabelCount {
        private String label;
        private Integer count;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PlayerProfile {
        private String  name;
        private String  primaryRole;
        private Double  rating;
        private String  keySkill;
        private Boolean isKeyPlayer;
    }
}
