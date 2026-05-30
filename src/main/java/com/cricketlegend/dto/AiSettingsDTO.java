package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AiSettingsDTO {
    private String apiKey;       // always empty on GET — never expose the stored key
    private String defaultModel;
}
