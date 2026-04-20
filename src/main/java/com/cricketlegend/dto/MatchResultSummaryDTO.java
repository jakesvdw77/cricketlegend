package com.cricketlegend.dto;

import lombok.*;

import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchResultSummaryDTO {
    private Long matchId;
    private LocalDate matchDate;
    private String homeTeamName;
    private String oppositionTeamName;
    private String fieldName;
    private String scoringUrl;
    private String youtubeUrl;

    private String sideBattingFirstName;
    private Integer scoreBattingFirst;
    private Integer wicketsLostBattingFirst;
    private String oversBattingFirst;
    private Integer scoreBattingSecond;
    private Integer wicketsLostBattingSecond;
    private String oversBattingSecond;

    private Boolean matchDrawn;
    private Boolean decidedOnDLS;
    private Boolean wonWithBonusPoint;
    private String winningTeamName;
    private String manOfTheMatchName;
    private String matchOutcomeDescription;
}
