package com.cricketlegend.dto;

import com.cricketlegend.domain.enums.AvailabilityStatus;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PlayerAvailabilityDTO {
    private Long playerId;
    private String playerName;
    private AvailabilityStatus status;
}
