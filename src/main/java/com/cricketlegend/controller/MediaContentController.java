package com.cricketlegend.controller;

import com.cricketlegend.domain.enums.MediaType;
import com.cricketlegend.dto.MediaContentDTO;
import com.cricketlegend.service.MediaContentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
@Tag(name = "Media", description = "Media library management")
public class MediaContentController {

    private final MediaContentService mediaContentService;

    @PostMapping
    @PreAuthorize("hasRole('admin') or hasRole('manager')")
    @Operation(summary = "Save a media record with optional tags")
    public ResponseEntity<MediaContentDTO> create(@RequestBody MediaContentDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mediaContentService.create(dto));
    }

    @GetMapping
    @Operation(summary = "Search media by tag filters")
    public ResponseEntity<List<MediaContentDTO>> search(
            @RequestParam(required = false) Long playerId,
            @RequestParam(required = false) Long teamId,
            @RequestParam(required = false) Long matchId,
            @RequestParam(required = false) Long tournamentId,
            @RequestParam(required = false) Long fieldId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) MediaType mediaType) {
        return ResponseEntity.ok(mediaContentService.search(
                playerId, teamId, matchId, tournamentId, fieldId, clubId, mediaType));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin') or hasRole('manager')")
    @Operation(summary = "Delete a media record")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        mediaContentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
