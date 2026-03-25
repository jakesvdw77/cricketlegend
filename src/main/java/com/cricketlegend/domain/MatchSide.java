package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "match_side")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchSide {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long matchSideId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ElementCollection
    @CollectionTable(name = "match_side_players", joinColumns = @JoinColumn(name = "match_side_id"))
    @Column(name = "player_id")
    private List<Long> playingXi = new ArrayList<>();

    private Long twelfthManPlayerId;

    private Long wicketKeeperPlayerId;

    private Long captainPlayerId;

    private Boolean teamAnnounced = false;
}