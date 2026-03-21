package com.cricketlegend.controller;

import com.cricketlegend.dto.PlayerDTO;
import com.cricketlegend.dto.PlayerResultDTO;
import com.cricketlegend.service.PlayerResultService;
import com.cricketlegend.service.PlayerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/players")
@RequiredArgsConstructor
@Tag(name = "Players", description = "Player management and statistics endpoints")
public class PlayerController {

    private final PlayerService playerService;
    private final PlayerResultService playerResultService;

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

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Create a player")
    public ResponseEntity<PlayerDTO> create(@RequestBody PlayerDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(playerService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update a player")
    public ResponseEntity<PlayerDTO> update(@PathVariable Long id, @RequestBody PlayerDTO dto) {
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
