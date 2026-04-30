package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AppSettingsDTO {
    private boolean showUpcomingSection;
    private boolean showLiveMatchesSection;
    private boolean showLogStandingsSection;
}
