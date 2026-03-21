package com.cricketlegend.controller;

import com.cricketlegend.dto.MatchDTO;
import com.cricketlegend.dto.MatchResultDTO;
import com.cricketlegend.dto.MatchResultSummaryDTO;
import com.cricketlegend.dto.MatchSideDTO;
import com.cricketlegend.service.MatchService;
import com.cricketlegend.service.MatchSideService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/matches")
@RequiredArgsConstructor
@Tag(name = "Matches", description = "Match management, results and team sheets")
public class MatchController {

    private final MatchService matchService;
    private final MatchSideService matchSideService;

    @GetMapping
    @Operation(summary = "Get all matches")
    public ResponseEntity<List<MatchDTO>> findAll() {
        return ResponseEntity.ok(matchService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get match by ID")
    public ResponseEntity<MatchDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(matchService.findById(id));
    }

    @GetMapping("/tournament/{tournamentId}")
    @Operation(summary = "Get matches for a tournament")
    public ResponseEntity<List<MatchDTO>> findByTournament(@PathVariable Long tournamentId) {
        return ResponseEntity.ok(matchService.findByTournament(tournamentId));
    }

    @GetMapping("/tournament/{tournamentId}/results")
    @Operation(summary = "Get completed match results for a tournament")
    public ResponseEntity<List<MatchResultSummaryDTO>> findResultsByTournament(@PathVariable Long tournamentId) {
        return ResponseEntity.ok(matchService.findResultsByTournament(tournamentId));
    }

    @GetMapping("/previous")
    @Operation(summary = "Get all previous completed matches")
    public ResponseEntity<List<MatchDTO>> findPrevious() {
        return ResponseEntity.ok(matchService.findPreviousMatches());
    }

    @GetMapping("/upcoming")
    @Operation(summary = "Get all upcoming matches")
    public ResponseEntity<List<MatchDTO>> findUpcoming() {
        return ResponseEntity.ok(matchService.findUpcomingMatches());
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Create a match")
    public ResponseEntity<MatchDTO> create(@RequestBody MatchDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(matchService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update a match")
    public ResponseEntity<MatchDTO> update(@PathVariable Long id, @RequestBody MatchDTO dto) {
        return ResponseEntity.ok(matchService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a match")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        matchService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/result")
    @Operation(summary = "Get match result and scorecard")
    public ResponseEntity<MatchResultDTO> getResult(@PathVariable Long id) {
        return ResponseEntity.ok(matchService.getResult(id));
    }

    @PostMapping("/{id}/result")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Save or update match result and scorecard")
    public ResponseEntity<MatchResultDTO> saveResult(@PathVariable Long id, @RequestBody MatchResultDTO dto) {
        return ResponseEntity.ok(matchService.saveResult(id, dto));
    }

    @GetMapping("/{id}/teamsheet")
    @Operation(summary = "Get team sheets (playing XI) for a match")
    public ResponseEntity<List<MatchSideDTO>> getTeamSheet(@PathVariable Long id) {
        return ResponseEntity.ok(matchSideService.findByMatch(id));
    }

    @PostMapping("/{id}/teamsheet")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Save or update a team sheet for a match")
    public ResponseEntity<MatchSideDTO> saveTeamSheet(@PathVariable Long id, @RequestBody MatchSideDTO dto) {
        dto.setMatchId(id);
        return ResponseEntity.ok(matchSideService.save(dto));
    }
}
