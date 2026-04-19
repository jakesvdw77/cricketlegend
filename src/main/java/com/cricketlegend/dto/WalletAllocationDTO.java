package com.cricketlegend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class WalletAllocationDTO {
    private Long id;
    private Long playerId;
    private String playerName;
    private BigDecimal amount;
    private String category;
    private String description;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate allocationDate;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    private Long matchId;
    private String matchLabel;
    private Long tournamentId;
    private String tournamentName;
    private Integer subscriptionYear;
}
