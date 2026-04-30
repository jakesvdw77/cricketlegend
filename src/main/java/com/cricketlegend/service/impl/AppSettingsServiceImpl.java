package com.cricketlegend.service.impl;

import com.cricketlegend.domain.AppSettings;
import com.cricketlegend.dto.AppSettingsDTO;
import com.cricketlegend.repository.AppSettingsRepository;
import com.cricketlegend.service.AppSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AppSettingsServiceImpl implements AppSettingsService {

    private final AppSettingsRepository appSettingsRepository;

    @Override
    public AppSettingsDTO get() {
        AppSettings s = appSettingsRepository.findById(1L).orElseGet(AppSettings::new);
        return toDto(s);
    }

    @Override
    @Transactional
    public AppSettingsDTO update(AppSettingsDTO dto) {
        AppSettings s = appSettingsRepository.findById(1L).orElseGet(AppSettings::new);
        s.setId(1L);
        s.setShowUpcomingSection(dto.isShowUpcomingSection());
        s.setShowLiveMatchesSection(dto.isShowLiveMatchesSection());
        s.setShowLogStandingsSection(dto.isShowLogStandingsSection());
        return toDto(appSettingsRepository.save(s));
    }

    private AppSettingsDTO toDto(AppSettings s) {
        return AppSettingsDTO.builder()
                .showUpcomingSection(s.isShowUpcomingSection())
                .showLiveMatchesSection(s.isShowLiveMatchesSection())
                .showLogStandingsSection(s.isShowLogStandingsSection())
                .build();
    }
}
