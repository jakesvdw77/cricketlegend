package com.cricketlegend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.anthropic.api.AnthropicApi;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AiService {

    private final AiSettingsService aiSettingsService;
    private final AiUsageService    aiUsageService;

    /**
     * Text-only call. Pass null for apiKey or model to fall back to the admin-configured defaults.
     */
    public String call(String apiKey, String model, String feature,
                       String systemPrompt, String userPrompt) {
        String resolvedApiKey = resolveApiKey(apiKey);
        String resolvedModel  = resolveModel(model);

        AnthropicChatModel chatModel = buildChatModel(resolvedApiKey, resolvedModel);

        Prompt prompt = new Prompt(List.of(
                new SystemMessage(systemPrompt),
                new UserMessage(userPrompt)
        ));

        ChatResponse response = chatModel.call(prompt);
        aiUsageService.log(feature, resolvedModel, response.getMetadata().getUsage());
        return response.getResult().getOutput().getText();
    }

    /**
     * Multipart call with an image or PDF attachment.
     * Pass null for apiKey or model to fall back to admin-configured defaults.
     */
    public String call(String apiKey, String model, String feature,
                       String systemPrompt, String userPrompt,
                       MimeType mimeType, Resource resource) {
        String resolvedApiKey = resolveApiKey(apiKey);
        String resolvedModel  = resolveModel(model);

        AnthropicChatModel chatModel = buildChatModel(resolvedApiKey, resolvedModel);

        Prompt prompt = new Prompt(List.of(
                new SystemMessage(systemPrompt),
                UserMessage.builder()
                        .text(userPrompt)
                        .media(new Media(mimeType, resource))
                        .build()
        ));

        ChatResponse response = chatModel.call(prompt);
        aiUsageService.log(feature, resolvedModel, response.getMetadata().getUsage());
        return response.getResult().getOutput().getText();
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private AnthropicChatModel buildChatModel(String apiKey, String model) {
        AnthropicApi api = AnthropicApi.builder()
                .apiKey(apiKey)
                .build();
        AnthropicChatOptions options = AnthropicChatOptions.builder()
                .model(model)
                .maxTokens(4096)
                .build();
        return AnthropicChatModel.builder()
                .anthropicApi(api)
                .defaultOptions(options)
                .build();
    }

    private String resolveApiKey(String apiKey) {
        if (apiKey != null && !apiKey.isBlank()) return apiKey;
        String adminKey = aiSettingsService.getDefaultApiKey();
        if (adminKey == null || adminKey.isBlank()) {
            throw new IllegalStateException(
                    "No AI API key provided and no admin default configured. " +
                    "Set one under System Admin → AI Settings.");
        }
        return adminKey;
    }

    private String resolveModel(String model) {
        if (model != null && !model.isBlank()) return model;
        return aiSettingsService.getDefaultModel();
    }
}
