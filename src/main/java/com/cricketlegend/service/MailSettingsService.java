package com.cricketlegend.service;

import com.cricketlegend.domain.MailSettings;
import com.cricketlegend.dto.MailSettingsDTO;

public interface MailSettingsService {
    MailSettingsDTO get();
    MailSettingsDTO update(MailSettingsDTO dto);
    MailSettings getForSending();
    void sendTestEmail(String toEmail);
}
