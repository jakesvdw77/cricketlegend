package com.cricketlegend.controller;

import com.cricketlegend.dto.ManagerTeamDTO;
import com.cricketlegend.service.ManagerTeamService;
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
import java.util.Set;

@RestController
@RequiredArgsConstructor
@Tag(name = "Manager Teams", description = "Manager-to-team assignment management")
public class ManagerTeamController {

    private final ManagerTeamService managerTeamService;

    @GetMapping("/api/v1/admin/manager-teams")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get all manager-team assignments")
    public ResponseEntity<List<ManagerTeamDTO>> getAllAssignments() {
        return ResponseEntity.ok(managerTeamService.getAllAssignments());
    }

    @PostMapping("/api/v1/admin/manager-teams")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Assign a manager to a team")
    public ResponseEntity<ManagerTeamDTO> assign(@RequestBody Map<String, Object> body) {
        Long managerId = ((Number) body.get("managerId")).longValue();
        Long teamId = ((Number) body.get("teamId")).longValue();
        return ResponseEntity.ok(managerTeamService.assign(managerId, teamId));
    }

    @DeleteMapping("/api/v1/admin/manager-teams/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Remove a manager-team assignment")
    public ResponseEntity<Void> unassign(@PathVariable Long id) {
        managerTeamService.unassign(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/managers/my-teams")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Get team IDs the current manager is assigned to")
    public ResponseEntity<Set<Long>> getMyTeams(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return ResponseEntity.ok(managerTeamService.getTeamIdsForManager(email));
    }

    @GetMapping("/api/v1/managers/my-managed-teams")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Get teams (with names) the current manager is assigned to")
    public ResponseEntity<List<ManagerTeamDTO>> getMyManagedTeams(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return ResponseEntity.ok(managerTeamService.getManagedTeams(email));
    }

    @GetMapping("/api/v1/managers/my-squad-player-ids")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Get player IDs across all squads the current manager manages")
    public ResponseEntity<Set<Long>> getMySquadPlayerIds(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return ResponseEntity.ok(managerTeamService.getSquadPlayerIdsForManager(email));
    }
}
