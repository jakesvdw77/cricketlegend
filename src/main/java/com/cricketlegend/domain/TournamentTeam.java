package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tournament_team")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentTeam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long tournamentTeamId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pool_id", nullable = false)
    private TournamentPool pool;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;
}
