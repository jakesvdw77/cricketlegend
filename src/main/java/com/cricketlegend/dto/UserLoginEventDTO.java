package com.cricketlegend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserLoginEventDTO {
    private Long loginEventId;
    private String firstName;
    private String lastName;
    private String role;
    private LocalDateTime loginTime;
}
