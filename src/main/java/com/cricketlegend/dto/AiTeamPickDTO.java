package com.cricketlegend.dto;

import lombok.*;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AiTeamPickDTO {

    private String selectionRationale;
    private String bowlingRotation;
    private String fairnessNote;
    private List<SelectedPlayer> selectedXi;
    private SelectedPlayer twelfthMan;
    private List<Long>   resolvedXiPlayerIds;   // pre-resolved IDs in batting order (1-11)
    private Long         resolvedTwelfthManId;
    private ChartData chartData;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SelectedPlayer {
        private String  name;
        private Integer battingPosition;
        private String  role;
        private String  selectionReason;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChartData {
        private List<LabelCount>       availabilitySummary;
        private List<PlayerAppearance> tournamentAppearances;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LabelCount {
        private String  label;
        private Integer count;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PlayerAppearance {
        private String  player;
        private Integer matches;
        private Boolean selected;
    }
}
