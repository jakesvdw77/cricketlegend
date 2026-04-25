package com.cricketlegend.dto;

import com.cricketlegend.domain.scorecard.ScorecardData;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchResultDTO {
    private Long matchResultId;
    private Long matchId;
    private Boolean matchCompleted;
    private Boolean matchDrawn;
    private Boolean forfeited;
    private Boolean decidedOnDLS;
    private Boolean wonWithBonusPoint;
    private Long winningTeamId;
    private String winningTeamName;
    private Long manOfTheMatchId;
    private String manOfTheMatchName;
    private Long sideBattingFirstId;
    private String sideBattingFirstName;
    private Integer scoreBattingFirst;
    private Integer wicketsLostBattingFirst;
    private String oversBattingFirst;
    private Integer scoreBattingSecond;
    private Integer wicketsLostBattingSecond;
    private String oversBattingSecond;
    private String matchOutcomeDescription;
    private ScorecardData scoreCard;
}
