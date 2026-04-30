package com.cricketlegend.controller;

import com.cricketlegend.dto.AppSettingsDTO;
import com.cricketlegend.service.AppSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/app-settings")
@RequiredArgsConstructor
@Tag(name = "App Settings", description = "Application feature flag management")
public class AppSettingsController {

    private final AppSettingsService appSettingsService;

    @GetMapping
    @Operation(summary = "Get application settings (public)")
    public ResponseEntity<AppSettingsDTO> get() {
        return ResponseEntity.ok(appSettingsService.get());
    }

    @PutMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update application settings")
    public ResponseEntity<AppSettingsDTO> update(@RequestBody AppSettingsDTO dto) {
        return ResponseEntity.ok(appSettingsService.update(dto));
    }
}
