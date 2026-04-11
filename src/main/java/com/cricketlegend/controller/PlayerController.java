package com.cricketlegend.controller;

import com.cricketlegend.dto.PlayerDTO;
import com.cricketlegend.dto.PlayerResultDTO;
import com.cricketlegend.service.ManagerTeamService;
import com.cricketlegend.service.PlayerResultService;
import com.cricketlegend.service.PlayerService;
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
@RequestMapping("/api/v1/players")
@RequiredArgsConstructor
@Tag(name = "Players", description = "Player management and statistics endpoints")
public class PlayerController {

    private final PlayerService playerService;
    private final PlayerResultService playerResultService;
    private final ManagerTeamService managerTeamService;

    @GetMapping
    @Operation(summary = "Get all players")
    public ResponseEntity<List<PlayerDTO>> findAll() {
        return ResponseEntity.ok(playerService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get player by ID")
    public ResponseEntity<PlayerDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(playerService.findById(id));
    }

    @GetMapping("/search")
    @Operation(summary = "Search players by name or surname")
    public ResponseEntity<List<PlayerDTO>> search(@RequestParam String query) {
        return ResponseEntity.ok(playerService.search(query));
    }

    @GetMapping("/{id}/statistics")
    @Operation(summary = "Get player statistics (all match results)")
    public ResponseEntity<List<PlayerResultDTO>> getStatistics(@PathVariable Long id) {
        return ResponseEntity.ok(playerResultService.findByPlayer(id));
    }

    @GetMapping("/me")
    @Operation(summary = "Get the player profile for the currently authenticated user")
    public ResponseEntity<PlayerDTO> findMe(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(playerService.findMe(jwt.getClaimAsString("email")));
    }

    @PutMapping("/me")
    @Operation(summary = "Update the player profile for the currently authenticated user")
    public ResponseEntity<PlayerDTO> updateMe(@AuthenticationPrincipal Jwt jwt, @RequestBody PlayerDTO dto) {
        return ResponseEntity.ok(playerService.updateMe(jwt.getClaimAsString("email"), dto));
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Create a player")
    public ResponseEntity<PlayerDTO> create(@RequestBody PlayerDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(playerService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Update a player")
    public ResponseEntity<PlayerDTO> update(
            @PathVariable Long id,
            @RequestBody PlayerDTO dto,
            Authentication authentication,
            @AuthenticationPrincipal Jwt jwt) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_admin"));
        if (!isAdmin) {
            String email = jwt.getClaimAsString("email");
            if (!managerTeamService.canManagePlayer(email, id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(playerService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a player")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        playerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
