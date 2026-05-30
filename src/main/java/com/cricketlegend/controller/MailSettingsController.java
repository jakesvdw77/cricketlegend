package com.cricketlegend.controller;

import com.cricketlegend.dto.MailSettingsDTO;
import com.cricketlegend.service.MailSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/mail-settings")
@RequiredArgsConstructor
@Tag(name = "Mail Settings", description = "SMTP mail server configuration")
public class MailSettingsController {

    private final MailSettingsService mailSettingsService;

    @GetMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get mail server settings")
    public ResponseEntity<MailSettingsDTO> get() {
        return ResponseEntity.ok(mailSettingsService.get());
    }

    @PutMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update mail server settings")
    public ResponseEntity<MailSettingsDTO> update(@RequestBody MailSettingsDTO dto) {
        return ResponseEntity.ok(mailSettingsService.update(dto));
    }

    @PostMapping("/test")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Send a test email using the saved mail settings")
    public ResponseEntity<Void> sendTest(@RequestBody TestEmailRequest request) {
        mailSettingsService.sendTestEmail(request.email());
        return ResponseEntity.ok().build();
    }

    record TestEmailRequest(String email) {}
}
