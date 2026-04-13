package com.cricketlegend.controller;

import com.cricketlegend.dto.PoolStandingsDTO;
import com.cricketlegend.dto.TournamentDTO;
import com.cricketlegend.dto.TournamentPoolDTO;
import com.cricketlegend.service.TournamentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tournaments")
@RequiredArgsConstructor
@Tag(name = "Tournaments", description = "Tournament management endpoints")
public class TournamentController {

    private final TournamentService tournamentService;

    @GetMapping
    @Operation(summary = "Get all tournaments")
    public ResponseEntity<List<TournamentDTO>> findAll() {
        return ResponseEntity.ok(tournamentService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get tournament by ID")
    public ResponseEntity<TournamentDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(tournamentService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Create a tournament")
    public ResponseEntity<TournamentDTO> create(@RequestBody TournamentDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tournamentService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update a tournament")
    public ResponseEntity<TournamentDTO> update(@PathVariable Long id, @RequestBody TournamentDTO dto) {
        return ResponseEntity.ok(tournamentService.update(id, dto));
    }

    @DeleteMapping("/{id}/logo")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Remove the logo from a tournament")
    public ResponseEntity<Void> removeLogo(@PathVariable Long id) {
        tournamentService.removeLogo(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/banner")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Remove the banner from a tournament")
    public ResponseEntity<Void> removeBanner(@PathVariable Long id) {
        tournamentService.removeBanner(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a tournament")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        tournamentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/standings")
    @Operation(summary = "Get pool standings for a tournament")
    public ResponseEntity<List<PoolStandingsDTO>> getStandings(@PathVariable Long id) {
        return ResponseEntity.ok(tournamentService.getStandings(id));
    }

    @PostMapping("/{id}/pools")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Add a pool to a tournament")
    public ResponseEntity<TournamentPoolDTO> addPool(@PathVariable Long id, @RequestBody TournamentPoolDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tournamentService.addPool(id, dto));
    }

    @PostMapping("/pools/{poolId}/teams/{teamId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Add a team to a tournament pool")
    public ResponseEntity<Void> addTeamToPool(@PathVariable Long poolId, @PathVariable Long teamId) {
        tournamentService.addTeamToPool(poolId, teamId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/pools/{poolId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a tournament pool")
    public ResponseEntity<Void> deletePool(@PathVariable Long poolId) {
        tournamentService.deletePool(poolId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/pools/{poolId}/teams/{teamId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Remove a team from a tournament pool")
    public ResponseEntity<Void> removeTeamFromPool(@PathVariable Long poolId, @PathVariable Long teamId) {
        tournamentService.removeTeamFromPool(poolId, teamId);
        return ResponseEntity.noContent().build();
    }
}
