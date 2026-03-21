package com.cricketlegend.controller;

import com.cricketlegend.dto.PlayerDTO;
import com.cricketlegend.dto.TeamDTO;
import com.cricketlegend.service.TeamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/teams")
@RequiredArgsConstructor
@Tag(name = "Teams", description = "Team management endpoints")
public class TeamController {

    private final TeamService teamService;

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
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update a team")
    public ResponseEntity<TeamDTO> update(@PathVariable Long id, @RequestBody TeamDTO dto) {
        return ResponseEntity.ok(teamService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a team")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        teamService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/squad")
    @Operation(summary = "Get team squad")
    public ResponseEntity<List<PlayerDTO>> getSquad(@PathVariable Long id) {
        return ResponseEntity.ok(teamService.getSquad(id));
    }

    @PostMapping("/{id}/squad/{playerId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Add player to squad")
    public ResponseEntity<Void> addToSquad(@PathVariable Long id, @PathVariable Long playerId) {
        teamService.addToSquad(id, playerId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/squad/{playerId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Remove player from squad")
    public ResponseEntity<Void> removeFromSquad(@PathVariable Long id, @PathVariable Long playerId) {
        teamService.removeFromSquad(id, playerId);
        return ResponseEntity.noContent().build();
    }
}
