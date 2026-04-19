package com.cricketlegend.dto;

import lombok.*;

import java.math.BigDecimal;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentFeePlayerDataDTO {
    private Long playerId;
    private String playerName;
    private BigDecimal walletBalance;
    private int tournamentPaymentCount;
    private BigDecimal tournamentPaymentTotal;
    private BigDecimal tournamentFeeAllocated;
    private Long teamId;
    private String teamName;
}
