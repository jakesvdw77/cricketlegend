package com.cricketlegend.controller;

import com.cricketlegend.dto.PlayerResultDTO;
import com.cricketlegend.service.PlayerResultService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/player-results")
@RequiredArgsConstructor
@Tag(name = "Player Results", description = "Individual player performance records per match")
public class PlayerResultController {

    private final PlayerResultService playerResultService;

    @GetMapping("/match/{matchId}")
    @Operation(summary = "Get all player results for a match")
    public ResponseEntity<List<PlayerResultDTO>> findByMatch(@PathVariable Long matchId) {
        return ResponseEntity.ok(playerResultService.findByMatch(matchId));
    }

    @GetMapping("/player/{playerId}")
    @Operation(summary = "Get all results for a player (career stats)")
    public ResponseEntity<List<PlayerResultDTO>> findByPlayer(@PathVariable Long playerId) {
        return ResponseEntity.ok(playerResultService.findByPlayer(playerId));
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Create a player result entry")
    public ResponseEntity<PlayerResultDTO> create(@RequestBody PlayerResultDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(playerResultService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update a player result entry")
    public ResponseEntity<PlayerResultDTO> update(@PathVariable Long id, @RequestBody PlayerResultDTO dto) {
        return ResponseEntity.ok(playerResultService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a player result entry")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        playerResultService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
