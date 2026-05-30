package com.cricketlegend.service;

import org.springframework.ai.chat.metadata.Usage;

public interface AiUsageService {
    void log(String feature, String model, Usage usage);
}
