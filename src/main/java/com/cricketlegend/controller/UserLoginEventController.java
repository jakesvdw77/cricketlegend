package com.cricketlegend.controller;

import com.cricketlegend.dto.PagedLoginEventResponse;
import com.cricketlegend.service.UserLoginEventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth Events", description = "Login event tracking endpoints")
public class UserLoginEventController {

    private final UserLoginEventService loginEventService;

    @PostMapping("/login-event")
    @Operation(summary = "Record a login event for the authenticated user")
    public ResponseEntity<Void> record(@AuthenticationPrincipal Jwt jwt) {
        loginEventService.record(jwt);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/login-events")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get login events with optional name filter (server-side paginated)")
    public ResponseEntity<PagedLoginEventResponse> findAll(
            @RequestParam(required = false) String name,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(loginEventService.findWithFilters(name, page, size));
    }
}
