package com.cricketlegend.dto;

import com.cricketlegend.domain.enums.AvailabilityStatus;
import com.cricketlegend.domain.enums.NotificationType;
import lombok.*;

import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PlayerNotificationDTO {
    private Long notificationId;
    private NotificationType type;
    private Long matchId;
    private Long teamId;
    private String matchDate;
    private String homeTeamName;
    private String oppositionTeamName;
    private boolean read;
    private LocalDateTime createdAt;
    private String subject;
    private String message;
    private AvailabilityStatus availabilityStatus;
}
