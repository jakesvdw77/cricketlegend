package com.cricketlegend.controller;

import com.cricketlegend.dto.SocialMediaPageDTO;
import com.cricketlegend.service.SocialMediaPageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/social-media-pages")
@RequiredArgsConstructor
@Tag(name = "Social Media Pages", description = "Social media page management endpoints")
public class SocialMediaPageController {

    private final SocialMediaPageService socialMediaPageService;

    @GetMapping
    @Operation(summary = "Get all social media pages (admin)")
    public ResponseEntity<List<SocialMediaPageDTO>> findAll() {
        return ResponseEntity.ok(socialMediaPageService.findAll());
    }

    @GetMapping("/enabled")
    @Operation(summary = "Get enabled social media pages (public)")
    public ResponseEntity<List<SocialMediaPageDTO>> findEnabled() {
        return ResponseEntity.ok(socialMediaPageService.findEnabled());
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Create a social media page")
    public ResponseEntity<SocialMediaPageDTO> create(@RequestBody SocialMediaPageDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(socialMediaPageService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update a social media page")
    public ResponseEntity<SocialMediaPageDTO> update(@PathVariable Long id, @RequestBody SocialMediaPageDTO dto) {
        return ResponseEntity.ok(socialMediaPageService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a social media page")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        socialMediaPageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
