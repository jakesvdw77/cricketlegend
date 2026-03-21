package com.cricketlegend.dto;

import com.cricketlegend.domain.enums.CricketFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentDTO {
    private Long tournamentId;
    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private CricketFormat cricketFormat;
    private String bannerUrl;
    private String logoUrl;
    private String playingConditionsUrl;
    private String websiteLink;
    private String facebookLink;
    private String registrationPageUrl;
    private BigDecimal entryFee;
    private BigDecimal registrationFee;
    private BigDecimal matchFee;
    private Long winningTeamId;
    private String winningTeamName;

    private Integer pointsForWin;
    private Integer pointsForDraw;
    private Integer pointsForNoResult;
    private Integer pointsForBonus;
    private List<TournamentPoolDTO> pools;
    private List<MediaContentDTO> mediaContent;
    private List<SponsorDTO> sponsors;
}
