package com.cricketlegend.domain;

import com.cricketlegend.domain.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "player_notification")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlayerNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long notificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private Long matchId;
    private Long teamId;

    private boolean read;

    private LocalDateTime createdAt;

    private String subject;

    @Column(columnDefinition = "TEXT")
    private String message;
}
