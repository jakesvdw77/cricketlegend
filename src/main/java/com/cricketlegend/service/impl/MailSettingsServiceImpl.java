package com.cricketlegend.service.impl;

import com.cricketlegend.domain.MailSettings;
import com.cricketlegend.dto.MailSettingsDTO;
import com.cricketlegend.repository.MailSettingsRepository;
import com.cricketlegend.service.MailSettingsService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Properties;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MailSettingsServiceImpl implements MailSettingsService {

    private final MailSettingsRepository mailSettingsRepository;

    @Override
    public MailSettingsDTO get() {
        MailSettings s = mailSettingsRepository.findById(1L).orElseGet(MailSettings::new);
        return MailSettingsDTO.builder()
                .smtpHost(s.getSmtpHost())
                .smtpPort(s.getSmtpPort())
                .username(s.getUsername())
                .password("") // never expose the stored password
                .build();
    }

    @Override
    @Transactional
    public MailSettingsDTO update(MailSettingsDTO dto) {
        MailSettings s = mailSettingsRepository.findById(1L).orElseGet(MailSettings::new);
        s.setId(1L);
        s.setSmtpHost(dto.getSmtpHost());
        s.setSmtpPort(dto.getSmtpPort() > 0 ? dto.getSmtpPort() : 587);
        s.setUsername(dto.getUsername());
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            s.setPassword(dto.getPassword());
        }
        mailSettingsRepository.save(s);
        return get();
    }

    @Override
    public MailSettings getForSending() {
        return mailSettingsRepository.findById(1L).orElse(null);
    }

    @Override
    public void sendTestEmail(String toEmail) {
        MailSettings cfg = getForSending();
        if (cfg == null || cfg.getSmtpHost() == null || cfg.getUsername() == null || cfg.getPassword() == null) {
            throw new IllegalStateException("Mail server settings are not fully configured.");
        }

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(cfg.getSmtpHost());
        sender.setPort(cfg.getSmtpPort());
        sender.setUsername(cfg.getUsername());
        sender.setPassword(cfg.getPassword());
        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(cfg.getUsername(), "Cricket Legend");
            helper.setTo(toEmail);
            helper.setSubject("Cricket Legend — Mail Server Test");
            helper.setText("""
                    <div style="font-family:sans-serif;padding:24px;">
                      <h2 style="color:#1b5e20;">&#127951; Cricket Legend</h2>
                      <p>Your mail server is configured correctly.</p>
                      <p style="color:#666;font-size:13px;">SMTP: %s:%d &bull; From: %s</p>
                    </div>
                    """.formatted(cfg.getSmtpHost(), cfg.getSmtpPort(), cfg.getUsername()), true);
            sender.send(message);
            log.info("Test email sent to {} via {}:{}", toEmail, cfg.getSmtpHost(), cfg.getSmtpPort());
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Test email failed: {}", e.getMessage());
            throw new RuntimeException("Failed to send test email: " + e.getMessage(), e);
        }
    }
}
