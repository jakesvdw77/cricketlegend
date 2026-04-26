package com.cricketlegend.dto;

import com.cricketlegend.domain.enums.MatchStage;
import com.cricketlegend.domain.enums.TossDecision;
import com.cricketlegend.domain.enums.TossWinner;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchDTO {
    private Long matchId;
    private LocalDate matchDate;
    private LocalTime scheduledStartTime;
    private LocalTime tossTime;
    private LocalTime arrivalTime;
    private String umpire;
    private String scoringUrl;
    private String youtubeUrl;
    private MatchStage matchStage;
    private TossWinner tossWonBy;
    private TossDecision tossDecision;
    private Long homeTeamId;
    private String homeTeamName;
    private String homeTeamLogoUrl;
    private Long oppositionTeamId;
    private String oppositionTeamName;
    private String oppositionTeamLogoUrl;
    private Long fieldId;
    private String fieldName;
    private String fieldAddress;
    private String fieldIconUrl;
    private String fieldGoogleMapsUrl;
    private Long tournamentId;
    private String tournamentName;

    // Result summary (read-only, mapped from result relationship)
    private Boolean matchCompleted;
    private Boolean matchDrawn;
    private Boolean forfeited;
    private Boolean noResult;
    private String  matchOutcomeDescription;
    private Integer scoreBattingFirst;
    private Integer wicketsLostBattingFirst;
    private String  oversBattingFirst;
    private Integer scoreBattingSecond;
    private Integer wicketsLostBattingSecond;
    private String  oversBattingSecond;
}
