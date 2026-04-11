package com.cricketlegend.dto;

import com.cricketlegend.domain.enums.MediaType;
import lombok.*;

import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MediaContentDTO {
    private Long id;
    private String url;
    private String caption;
    private MediaType mediaType;
    private Long playerId;
    private String playerName;
    private Long teamId;
    private String teamName;
    private Long matchId;
    private String matchLabel;
    private Long tournamentId;
    private String tournamentName;
    private Long fieldId;
    private String fieldName;
    private Long clubId;
    private String clubName;
    private LocalDateTime uploadedAt;
}
