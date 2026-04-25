package com.cricketlegend.domain;

import com.cricketlegend.domain.scorecard.ScorecardData;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "match_result")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long matchResultId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    private Boolean matchCompleted;
    private Boolean matchDrawn;
    private Boolean forfeited;
    private Boolean noResult;

    @Column(name = "decided_on_dls")
    private Boolean decidedOnDLS;
    private Boolean wonWithBonusPoint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winning_team_id")
    private Team winningTeam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "man_of_match_id")
    private Player manOfTheMatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "side_batting_first_id")
    private Team sideBattingFirst;

    private Integer scoreBattingFirst;
    private Integer wicketsLostBattingFirst;
    private String oversBattingFirst;
    private Integer scoreBattingSecond;
    private Integer wicketsLostBattingSecond;
    private String oversBattingSecond;

    @Column(columnDefinition = "TEXT")
    private String matchOutcomeDescription;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "score_card", columnDefinition = "jsonb")
    private ScorecardData scoreCard;
}
