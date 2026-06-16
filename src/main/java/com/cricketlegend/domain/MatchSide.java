package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "match_side_player_roles",
            joinColumns = @JoinColumn(name = "match_side_id"))
    @MapKeyColumn(name = "player_id")
    @Column(name = "role")
    private Map<Long, String> playerRoles = new HashMap<>();
}