package com.cricketlegend.controller;

import com.cricketlegend.dto.ManagerDTO;
import com.cricketlegend.dto.PlayerDTO;
import com.cricketlegend.dto.TeamDTO;
import com.cricketlegend.service.ManagerTeamService;
import com.cricketlegend.service.TeamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/teams")
@RequiredArgsConstructor
@Tag(name = "Teams", description = "Team management endpoints")
public class TeamController {

    private final TeamService teamService;
    private final ManagerTeamService managerTeamService;

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_admin"));
    }

    @GetMapping
    @Operation(summary = "Get all teams")
    public ResponseEntity<List<TeamDTO>> findAll() {
        return ResponseEntity.ok(teamService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get team by ID")
    public ResponseEntity<TeamDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(teamService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Create a team")
    public ResponseEntity<TeamDTO> create(@RequestBody TeamDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(teamService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Update a team")
    public ResponseEntity<TeamDTO> update(
            @PathVariable Long id,
            @RequestBody TeamDTO dto,
            Authentication authentication,
            @AuthenticationPrincipal Jwt jwt) {
        if (!isAdmin(authentication)) {
            String email = jwt.getClaimAsString("email");
            if (!managerTeamService.canManageTeam(email, id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(teamService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a team")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        teamService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/managers")
    @Operation(summary = "Get managers assigned to a team")
    public ResponseEntity<List<ManagerDTO>> getManagers(@PathVariable Long id) {
        return ResponseEntity.ok(managerTeamService.getManagersForTeam(id));
    }

    @GetMapping("/{id}/squad")
    @Operation(summary = "Get team squad")
    public ResponseEntity<List<PlayerDTO>> getSquad(@PathVariable Long id) {
        return ResponseEntity.ok(teamService.getSquad(id));
    }

    @PostMapping("/{id}/squad/{playerId}")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Add player to squad")
    public ResponseEntity<Void> addToSquad(
            @PathVariable Long id,
            @PathVariable Long playerId,
            Authentication authentication,
            @AuthenticationPrincipal Jwt jwt) {
        if (!isAdmin(authentication)) {
            String email = jwt.getClaimAsString("email");
            if (!managerTeamService.canManageTeam(email, id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        teamService.addToSquad(id, playerId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/squad/{playerId}")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Remove player from squad")
    public ResponseEntity<Void> removeFromSquad(
            @PathVariable Long id,
            @PathVariable Long playerId,
            Authentication authentication,
            @AuthenticationPrincipal Jwt jwt) {
        if (!isAdmin(authentication)) {
            String email = jwt.getClaimAsString("email");
            if (!managerTeamService.canManageTeam(email, id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        teamService.removeFromSquad(id, playerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/squad/notify")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Send email notifications to all consenting squad members")
    public ResponseEntity<Void> notifySquad(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, Long> body) {
        Long tournamentId = body != null ? body.get("tournamentId") : null;
        teamService.notifySquad(id, tournamentId);
        return ResponseEntity.ok().build();
    }
}
