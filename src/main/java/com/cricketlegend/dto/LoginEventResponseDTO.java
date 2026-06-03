package com.cricketlegend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginEventResponseDTO {
    private boolean firstLogin;
}
