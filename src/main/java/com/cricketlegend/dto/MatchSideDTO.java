package com.cricketlegend.dto;

import lombok.*;

import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchSideDTO {
    private Long matchSideId;
    private Long matchId;
    private Long teamId;
    private String teamName;
    private List<Long> playingXi;
    private Long twelfthManPlayerId;
    private Long wicketKeeperPlayerId;
    private Long captainPlayerId;
}
