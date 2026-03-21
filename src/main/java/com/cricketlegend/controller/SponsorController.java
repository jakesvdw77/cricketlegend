package com.cricketlegend.controller;

import com.cricketlegend.dto.SponsorDTO;
import com.cricketlegend.service.SponsorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/sponsors")
@RequiredArgsConstructor
@Tag(name = "Sponsors", description = "Sponsor management endpoints")
public class SponsorController {

    private final SponsorService sponsorService;

    @GetMapping
    @Operation(summary = "Get all sponsors")
    public ResponseEntity<List<SponsorDTO>> findAll() {
        return ResponseEntity.ok(sponsorService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get sponsor by ID")
    public ResponseEntity<SponsorDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(sponsorService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Create a sponsor")
    public ResponseEntity<SponsorDTO> create(@RequestBody SponsorDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sponsorService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update a sponsor")
    public ResponseEntity<SponsorDTO> update(@PathVariable Long id, @RequestBody SponsorDTO dto) {
        return ResponseEntity.ok(sponsorService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a sponsor")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        sponsorService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
