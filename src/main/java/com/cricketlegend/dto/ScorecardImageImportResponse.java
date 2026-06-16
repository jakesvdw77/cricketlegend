package com.cricketlegend.dto;

import com.cricketlegend.domain.scorecard.ScorecardData;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ScorecardImageImportResponse {

    private ScorecardData scorecard;
    private List<PlayerMatchResult> playerMatches;

    @Data
    @Builder
    public static class PlayerMatchResult {
        private String name;
        private String team;
        private MatchStatus status;
        private Long matchedPlayerId;
        private String suggestedName;
        private Long suggestedPlayerId;
        private double confidence;
    }

    public enum MatchStatus {
        MATCHED, SUGGESTED, UNMATCHED
    }
}
