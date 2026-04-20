package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SocialMediaPageDTO {
    private Long id;
    private String url;
    private String label;
    private boolean enabled;
}
