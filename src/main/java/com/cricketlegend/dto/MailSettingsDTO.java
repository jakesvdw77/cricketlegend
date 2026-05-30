package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MailSettingsDTO {
    private String smtpHost;
    private int smtpPort;
    private String username;
    private String password;
}
