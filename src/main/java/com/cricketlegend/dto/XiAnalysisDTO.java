package com.cricketlegend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class XiAnalysisDTO {

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime generatedAt;

    private String xiSummary;
    private String battingOrderSuggestion;
    private String bowlingPlanSuggestion;
    private List<String> strengths;
    private List<String> concerns;
    private List<String> recommendations;
    private ChartData chartData;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChartData {
        private List<RadarPoint>   xiStrengthRadar;
        private List<LabelCount>   battingPositionBreakdown;
        private List<LabelCount>   bowlingVariety;
        private List<PlayerRole>   playerRoles;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RadarPoint {
        private String skill;
        private Double score;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LabelCount {
        private String  label;
        private Integer count;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PlayerRole {
        private String  name;
        private Integer battingPosition;
        private String  role;
        private Double  rating;
        private String  keyContribution;
    }
}
