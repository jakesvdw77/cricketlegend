package com.cricketlegend.controller;

import com.cricketlegend.domain.enums.AvailabilityStatus;
import com.cricketlegend.dto.MatchPollDTO;
import com.cricketlegend.dto.PlayerNotificationDTO;
import com.cricketlegend.dto.PollToggleRequest;
import com.cricketlegend.service.ManagerTeamService;
import com.cricketlegend.service.MatchPollService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

record SendNotificationRequest(String subject, String message) {}

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Match Polls", description = "Match availability polling")
public class MatchPollController {

    private final MatchPollService pollService;
    private final ManagerTeamService managerTeamService;

    @PostMapping("/matches/{matchId}/poll")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Open or close an availability poll for a team")
    public ResponseEntity<MatchPollDTO> togglePoll(
            @PathVariable Long matchId,
            @RequestBody PollToggleRequest request,
            Authentication authentication,
            @AuthenticationPrincipal Jwt jwt) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_admin"));
        if (!isAdmin) {
            String email = jwt.getClaimAsString("email");
            if (!managerTeamService.canManageTeam(email, request.getTeamId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(pollService.togglePoll(matchId, request.getTeamId(), request.isOpen()));
    }

    @GetMapping("/matches/{matchId}/poll/{teamId}")
    @Operation(summary = "Get poll details with squad availability")
    public ResponseEntity<MatchPollDTO> getPoll(
            @PathVariable Long matchId,
            @PathVariable Long teamId) {
        return ResponseEntity.ok(pollService.getPoll(matchId, teamId));
    }

    @PostMapping("/matches/{matchId}/poll/{teamId}/availability")
    @Operation(summary = "Submit my availability for a match poll")
    public ResponseEntity<Void> setMyAvailability(
            @PathVariable Long matchId,
            @PathVariable Long teamId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        AvailabilityStatus status = AvailabilityStatus.valueOf(body.get("status"));
        pollService.setMyAvailability(matchId, teamId, status, email);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/matches/{matchId}/poll/{teamId}/players/{playerId}/availability")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Manager override a player's availability")
    public ResponseEntity<Void> setPlayerAvailability(
            @PathVariable Long matchId,
            @PathVariable Long teamId,
            @PathVariable Long playerId,
            @RequestBody Map<String, String> body) {
        AvailabilityStatus status = AvailabilityStatus.valueOf(body.get("status"));
        pollService.setPlayerAvailability(matchId, teamId, playerId, status);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/notifications")
    @Operation(summary = "Get my notifications")
    public ResponseEntity<List<PlayerNotificationDTO>> getMyNotifications(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return ResponseEntity.ok(pollService.getMyNotifications(email));
    }

    @GetMapping("/notifications/unread-count")
    @Operation(summary = "Get my unread notification count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return ResponseEntity.ok(Map.of("count", pollService.countUnreadNotifications(email)));
    }

    @PutMapping("/notifications/{notificationId}/read")
    @Operation(summary = "Mark a notification as read")
    public ResponseEntity<Void> markRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        pollService.markNotificationRead(notificationId, email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/notifications/send")
    @PreAuthorize("hasAnyRole('admin','manager')")
    @Operation(summary = "Send a message notification to managed players")
    public ResponseEntity<Void> sendNotification(
            @RequestBody SendNotificationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        pollService.sendManagerNotification(request.subject(), request.message(), email);
        return ResponseEntity.ok().build();
    }
}
