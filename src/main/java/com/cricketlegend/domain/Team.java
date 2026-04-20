package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "team")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long teamId;

    @Column(nullable = false)
    private String teamName;

    @Column(length = 10)
    private String abbreviation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id")
    private Club associatedClub;

    private String coach;
    private String manager;
    private String administrator;
    private String email;
    private String contactNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "captain_id")
    private Player captain;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_field_id")
    private Field homeField;

    private String selector;
    private String logoUrl;
    private String teamPhotoUrl;
    private String websiteUrl;
    private String facebookUrl;
    private String instagramUrl;
    private String youtubeUrl;

    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(name = "team_media",
            joinColumns = @JoinColumn(name = "team_id"),
            inverseJoinColumns = @JoinColumn(name = "media_id"))
    @Builder.Default
    private List<MediaContent> mediaContent = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "team_squad", joinColumns = @JoinColumn(name = "team_id"))
    @Column(name = "player_id")
    @Builder.Default
    private List<Long> squadPlayerIds = new ArrayList<>();

    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(name = "team_sponsor",
            joinColumns = @JoinColumn(name = "team_id"),
            inverseJoinColumns = @JoinColumn(name = "sponsor_id"))
    @Builder.Default
    private List<Sponsor> sponsors = new ArrayList<>();
}
