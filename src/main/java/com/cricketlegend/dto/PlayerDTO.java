package com.cricketlegend.dto;

import com.cricketlegend.domain.enums.BattingPosition;
import com.cricketlegend.domain.enums.BattingStance;
import com.cricketlegend.domain.enums.BowlingArm;
import com.cricketlegend.domain.enums.BowlingType;
import com.cricketlegend.domain.enums.ClothingSize;
import com.cricketlegend.domain.enums.Gender;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PlayerDTO {
    private Long playerId;
    private String name;
    private String surname;
    private LocalDate dateOfBirth;
    private String contactNumber;
    private String email;
    private String alternativeContactNumber;
    private Integer shirtNumber;
    private String profilePictureUrl;
    private String careerUrl;
    private BattingPosition battingPosition;
    private BattingStance battingStance;
    private BowlingArm bowlingArm;
    private BowlingType bowlingType;
    private Boolean wicketKeeper;
    private Boolean partTimeBowler;
    private ClothingSize shirtSize;
    private ClothingSize pantSize;
    private Gender gender;
    private Long homeClubId;
    private String homeClubName;
    private List<MediaContentDTO> mediaContent;
}
