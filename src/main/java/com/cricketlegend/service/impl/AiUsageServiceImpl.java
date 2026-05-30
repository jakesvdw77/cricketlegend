package com.cricketlegend.service.impl;

import com.cricketlegend.domain.AiUsageLog;
import com.cricketlegend.repository.AiUsageLogRepository;
import com.cricketlegend.service.AiUsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiUsageServiceImpl implements AiUsageService {

    private final AiUsageLogRepository aiUsageLogRepository;

    @Async
    @Override
    @Transactional
    public void log(String feature, String model, Usage usage) {
        try {
            long prompt     = usage.getPromptTokens()     != null ? usage.getPromptTokens()     : 0;
            long completion = usage.getCompletionTokens() != null ? usage.getCompletionTokens() : 0;
            long total      = usage.getTotalTokens()      != null ? usage.getTotalTokens()      : prompt + completion;

            aiUsageLogRepository.save(AiUsageLog.builder()
                    .feature(feature)
                    .model(model)
                    .promptTokens(prompt)
                    .completionTokens(completion)
                    .totalTokens(total)
                    .loggedAt(LocalDateTime.now())
                    .build());

            log.debug("AI usage logged — feature={} model={} tokens={}/{}/{}",
                    feature, model, prompt, completion, total);
        } catch (Exception e) {
            log.warn("Failed to log AI usage: {}", e.getMessage());
        }
    }
}
