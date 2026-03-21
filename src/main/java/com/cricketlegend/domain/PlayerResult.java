package com.cricketlegend.domain;

import com.cricketlegend.domain.enums.DismissalType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "player_result")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlayerResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long playerResultId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    private Integer battingPosition;
    private Integer score;
    private Integer ballsFaced;
    private Integer foursHit;
    private Integer sixesHit;
    private Boolean dismissed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dismissed_by_bowler_id")
    private Player dismissedByBowler;

    @Enumerated(EnumType.STRING)
    private DismissalType dismissalType;

    private String oversBowled;
    private Integer wickets;
    private Integer wides;
    private Integer noBalls;
    private Integer dots;
    private Integer catches;
    private Boolean manOfMatch;
}
