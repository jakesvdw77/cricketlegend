package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "app_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AppSettings {

    @Id
    private Long id = 1L;

    @Column(nullable = false)
    private boolean showUpcomingSection = true;

    @Column(nullable = false)
    private boolean showLiveMatchesSection = true;

    @Column(nullable = false)
    private boolean showLogStandingsSection = true;
}
