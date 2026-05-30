package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "mail_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MailSettings {

    @Id
    private Long id = 1L;

    @Column
    private String smtpHost;

    @Column(nullable = false)
    private int smtpPort = 587;

    @Column
    private String username;

    @Column
    private String password;
}
