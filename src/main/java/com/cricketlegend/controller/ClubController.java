package com.cricketlegend.controller;

import com.cricketlegend.dto.ClubDTO;
import com.cricketlegend.service.ClubService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/clubs")
@RequiredArgsConstructor
@Tag(name = "Clubs", description = "Club management endpoints")
public class ClubController {

    private final ClubService clubService;

    @GetMapping
    @Operation(summary = "Get all clubs")
    public ResponseEntity<List<ClubDTO>> findAll() {
        return ResponseEntity.ok(clubService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get club by ID")
    public ResponseEntity<ClubDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(clubService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Create a club")
    public ResponseEntity<ClubDTO> create(@RequestBody ClubDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clubService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update a club")
    public ResponseEntity<ClubDTO> update(@PathVariable Long id, @RequestBody ClubDTO dto) {
        return ResponseEntity.ok(clubService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a club")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        clubService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
