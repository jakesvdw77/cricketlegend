package com.cricketlegend.controller;

import com.cricketlegend.dto.AiSettingsDTO;
import com.cricketlegend.service.AiSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai-settings")
@RequiredArgsConstructor
@Tag(name = "AI Settings", description = "Admin AI configuration (API key, default model)")
public class AiSettingsController {

    private final AiSettingsService aiSettingsService;

    @GetMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get AI settings")
    public ResponseEntity<AiSettingsDTO> get() {
        return ResponseEntity.ok(aiSettingsService.get());
    }

    @PutMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update AI settings")
    public ResponseEntity<AiSettingsDTO> update(@RequestBody AiSettingsDTO dto) {
        return ResponseEntity.ok(aiSettingsService.update(dto));
    }
}
