package com.cricketlegend.controller;

import com.cricketlegend.dto.ClubEventDTO;
import com.cricketlegend.service.ClubEventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Tag(name = "Club Events", description = "Club event management")
public class ClubEventController {

    private final ClubEventService eventService;

    @GetMapping("/my")
    @Operation(summary = "Get events relevant to the current player")
    public ResponseEntity<List<ClubEventDTO>> getMyEvents(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(eventService.getMyEvents(jwt.getClaimAsString("email")));
    }

    @GetMapping("/club/{clubId}")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Get all events for a club")
    public ResponseEntity<List<ClubEventDTO>> getByClub(@PathVariable Long clubId) {
        return ResponseEntity.ok(eventService.getByClub(clubId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Create a club event (and recurring instances)")
    public ResponseEntity<ClubEventDTO> create(@RequestBody ClubEventDTO dto,
                                               @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.create(dto, jwt.getClaimAsString("email")));
    }

    @PutMapping("/{eventId}")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Update a single event occurrence")
    public ResponseEntity<ClubEventDTO> update(@PathVariable Long eventId,
                                               @RequestBody ClubEventDTO dto) {
        return ResponseEntity.ok(eventService.update(eventId, dto));
    }

    @DeleteMapping("/{eventId}")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Delete a single event occurrence")
    public ResponseEntity<Void> delete(@PathVariable Long eventId,
                                       @RequestParam(defaultValue = "false") boolean notify) {
        eventService.delete(eventId, notify);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/series/{seriesId}")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Delete all occurrences in a recurring series")
    public ResponseEntity<Void> deleteSeries(@PathVariable Long seriesId,
                                             @RequestParam(defaultValue = "false") boolean notify) {
        eventService.deleteSeries(seriesId, notify);
        return ResponseEntity.noContent().build();
    }
}
