package com.cricketlegend.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AllocationResultDTO {

    private List<AllocatedEntry> allocated;
    private List<SkippedEntry> skipped;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AllocatedEntry {
        private Long playerId;
        private String playerName;
        private BigDecimal amount;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SkippedEntry {
        private Long playerId;
        private String playerName;
        private String reason;
        private BigDecimal walletBalance;
        private BigDecimal required;
    }
}
