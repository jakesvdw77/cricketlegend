package com.cricketlegend.service;

import com.cricketlegend.dto.AiSettingsDTO;

public interface AiSettingsService {
    AiSettingsDTO get();
    AiSettingsDTO update(AiSettingsDTO dto);
    String getDefaultApiKey();
    String getDefaultModel();
}
