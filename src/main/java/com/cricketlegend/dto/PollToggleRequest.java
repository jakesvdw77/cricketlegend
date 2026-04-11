package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class PollToggleRequest {
    private Long teamId;
    private boolean open;
}
