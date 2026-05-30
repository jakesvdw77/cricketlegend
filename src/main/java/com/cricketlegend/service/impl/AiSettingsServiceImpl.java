package com.cricketlegend.service.impl;

import com.cricketlegend.domain.AiSettings;
import com.cricketlegend.dto.AiSettingsDTO;
import com.cricketlegend.repository.AiSettingsRepository;
import com.cricketlegend.service.AiSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiSettingsServiceImpl implements AiSettingsService {

    private final AiSettingsRepository aiSettingsRepository;

    @Override
    public AiSettingsDTO get() {
        AiSettings s = aiSettingsRepository.findById(1L).orElseGet(AiSettings::new);
        return AiSettingsDTO.builder()
                .apiKey("")                  // never expose the stored key
                .defaultModel(s.getDefaultModel())
                .build();
    }

    @Override
    @Transactional
    public AiSettingsDTO update(AiSettingsDTO dto) {
        AiSettings s = aiSettingsRepository.findById(1L).orElseGet(AiSettings::new);
        s.setId(1L);
        if (dto.getApiKey() != null && !dto.getApiKey().isBlank()) {
            s.setApiKey(dto.getApiKey());
        }
        if (dto.getDefaultModel() != null && !dto.getDefaultModel().isBlank()) {
            s.setDefaultModel(dto.getDefaultModel());
        }
        aiSettingsRepository.save(s);
        return get();
    }

    @Override
    public String getDefaultApiKey() {
        return aiSettingsRepository.findById(1L)
                .map(AiSettings::getApiKey)
                .orElse(null);
    }

    @Override
    public String getDefaultModel() {
        return aiSettingsRepository.findById(1L)
                .map(AiSettings::getDefaultModel)
                .orElse("claude-opus-4-8");
    }
}
