package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tournament_pool")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentPool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long poolId;

    @Column(nullable = false)
    private String poolName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @OneToMany(mappedBy = "pool", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TournamentTeam> teams = new ArrayList<>();
}
