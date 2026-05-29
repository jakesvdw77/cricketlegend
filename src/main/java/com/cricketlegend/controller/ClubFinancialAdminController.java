package com.cricketlegend.controller;

import com.cricketlegend.dto.ClubFinancialAdminDTO;
import com.cricketlegend.service.ClubFinancialAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Financial Admins", description = "Club financial admin assignment management")
public class ClubFinancialAdminController {

    private final ClubFinancialAdminService service;

    @GetMapping("/api/v1/admin/financial-admins")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get all financial admin assignments")
    public ResponseEntity<List<ClubFinancialAdminDTO>> getAllAssignments() {
        return ResponseEntity.ok(service.getAllAssignments());
    }

    @PostMapping("/api/v1/admin/financial-admins")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Assign a financial admin to a club")
    public ResponseEntity<ClubFinancialAdminDTO> assign(@RequestBody Map<String, Object> body) {
        Long managerId = ((Number) body.get("managerId")).longValue();
        Long clubId = ((Number) body.get("clubId")).longValue();
        return ResponseEntity.ok(service.assign(managerId, clubId));
    }

    @DeleteMapping("/api/v1/admin/financial-admins/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Remove a financial admin assignment")
    public ResponseEntity<Void> unassign(@PathVariable Long id) {
        service.unassign(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/financial-admin/my-club-id")
    @PreAuthorize("hasAnyRole('admin','financial_admin')")
    @Operation(summary = "Get the club ID the current user is financial admin for")
    public ResponseEntity<Long> getMyClubId(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return service.getClubIdForFinancialAdmin(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
