package com.cricketlegend.service;

import com.cricketlegend.dto.AppSettingsDTO;

public interface AppSettingsService {
    AppSettingsDTO get();
    AppSettingsDTO update(AppSettingsDTO dto);
}
