package com.cricketlegend.dto;

import lombok.*;

import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolStandingsDTO {
    private Long poolId;
    private String poolName;
    private List<PoolStandingEntryDTO> entries;
}
