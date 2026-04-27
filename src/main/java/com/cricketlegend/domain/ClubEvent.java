package com.cricketlegend.domain;

import com.cricketlegend.domain.enums.EventCategory;
import com.cricketlegend.domain.enums.RecurrenceType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "club_event")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClubEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long eventId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id")
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventCategory category;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private LocalDate eventDate;

    private LocalTime startTime;
    private LocalTime endTime;

    private String locationName;
    private String googleMapsUrl;
    private String meetingUrl;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RecurrenceType recurrence = RecurrenceType.NONE;

    private LocalDate recurrenceEndDate;

    private Long seriesId;

    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_player_id")
    private Player createdBy;
}
