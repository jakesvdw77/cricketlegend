package com.cricketlegend.domain;

import com.cricketlegend.domain.enums.AgeGroup;
import com.cricketlegend.domain.enums.CricketFormat;
import com.cricketlegend.domain.enums.TournamentGender;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tournament")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Tournament {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long tournamentId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDate startDate;
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    private CricketFormat cricketFormat;

    @Enumerated(EnumType.STRING)
    private AgeGroup ageGroup;

    @Enumerated(EnumType.STRING)
    private TournamentGender tournamentGender;

    private String bannerUrl;
    private String logoUrl;
    private String playingConditionsUrl;
    private String websiteLink;
    private String facebookLink;
    private String registrationPageUrl;

    private BigDecimal entryFee;
    private BigDecimal registrationFee;
    private BigDecimal matchFee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winning_team_id")
    private Team winningTeam;

    private Integer pointsForWin;
    private Integer pointsForDraw;
    private Integer pointsForNoResult;
    private Integer pointsForBonus;

    @OneToMany(mappedBy = "tournament", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TournamentPool> pools = new ArrayList<>();

    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(name = "tournament_media",
            joinColumns = @JoinColumn(name = "tournament_id"),
            inverseJoinColumns = @JoinColumn(name = "media_id"))
    @Builder.Default
    private List<MediaContent> mediaContent = new ArrayList<>();

    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(name = "tournament_sponsor",
            joinColumns = @JoinColumn(name = "tournament_id"),
            inverseJoinColumns = @JoinColumn(name = "sponsor_id"))
    @Builder.Default
    private List<Sponsor> sponsors = new ArrayList<>();
}
