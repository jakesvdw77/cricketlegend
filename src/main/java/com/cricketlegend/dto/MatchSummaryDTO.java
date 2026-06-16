package com.cricketlegend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchSummaryDTO {

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime generatedAt;

    private String narrative;
    private String matchVerdict;
    private List<String> keyMoments;
    private List<TeamSummary> teamSummaries;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TeamSummary {
        private String teamName;
        private InningsSummary innings;
        private String battingSummary;
        private String bowlingSummary;
        private List<NotablePlayer> notablePlayers;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InningsSummary {
        private Integer runs;
        private Integer wickets;
        private String overs;
        private Double runRate;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class NotablePlayer {
        private String name;
        private String role;
        private String contribution;
    }
}
