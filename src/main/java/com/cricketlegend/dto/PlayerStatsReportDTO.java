package com.cricketlegend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PlayerStatsReportDTO {

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime generatedAt;

    private String summary;
    private String battingAnalysis;
    private String bowlingAnalysis;
    private List<String> strengths;
    private List<String> areasForImprovement;
    private List<String> recommendations;
    private Double playerRating;
}
