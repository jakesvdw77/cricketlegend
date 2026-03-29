package com.cricketlegend.domain;

import com.cricketlegend.domain.enums.BattingPosition;
import com.cricketlegend.domain.enums.BattingStance;
import com.cricketlegend.domain.enums.BowlingArm;
import com.cricketlegend.domain.enums.BowlingType;
import com.cricketlegend.domain.enums.ClothingSize;
import com.cricketlegend.domain.enums.Gender;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "player")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long playerId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String surname;

    private LocalDate dateOfBirth;
    private String contactNumber;
    private String email;
    private String alternativeContactNumber;
    private Integer shirtNumber;
    private String profilePictureUrl;
    private String careerUrl;

    @Enumerated(EnumType.STRING)
    private BattingPosition battingPosition;

    @Enumerated(EnumType.STRING)
    private BattingStance battingStance;

    @Enumerated(EnumType.STRING)
    private BowlingArm bowlingArm;

    @Enumerated(EnumType.STRING)
    private BowlingType bowlingType;

    private Boolean wicketKeeper;
    private Boolean partTimeBowler;

    @Enumerated(EnumType.STRING)
    private ClothingSize shirtSize;

    @Enumerated(EnumType.STRING)
    private ClothingSize pantSize;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_club_id")
    private Club homeClub;

    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(name = "player_media",
            joinColumns = @JoinColumn(name = "player_id"),
            inverseJoinColumns = @JoinColumn(name = "media_id"))
    @Builder.Default
    private List<MediaContent> mediaContent = new ArrayList<>();
}
