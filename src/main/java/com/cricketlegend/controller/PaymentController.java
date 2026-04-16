package com.cricketlegend.controller;

import com.cricketlegend.domain.enums.PaymentStatus;
import com.cricketlegend.domain.enums.PaymentType;
import com.cricketlegend.dto.PaymentDTO;
import com.cricketlegend.service.PaymentService;
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
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Payment management endpoints")
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    @Operation(summary = "Get payments with optional filters")
    public ResponseEntity<List<PaymentDTO>> findAll(
            @RequestParam(required = false) Long playerId,
            @RequestParam(required = false) Long sponsorId,
            @RequestParam(required = false) Long tournamentId,
            @RequestParam(required = false) PaymentType paymentType,
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        return ResponseEntity.ok(paymentService.findWithFilters(playerId, sponsorId, tournamentId, paymentType, status, year, month));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get payment by ID")
    public ResponseEntity<PaymentDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Record a payment")
    public ResponseEntity<PaymentDTO> create(@RequestBody PaymentDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update a payment")
    public ResponseEntity<PaymentDTO> update(@PathVariable Long id, @RequestBody PaymentDTO dto) {
        return ResponseEntity.ok(paymentService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a payment")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        paymentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/mine")
    @Operation(summary = "Get payments for the currently logged-in player")
    public ResponseEntity<List<PaymentDTO>> findMine(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return ResponseEntity.ok(paymentService.findMine(email));
    }

    @PostMapping("/submit")
    @Operation(summary = "Submit a proof of payment (player-initiated)")
    public ResponseEntity<PaymentDTO> submitProof(@AuthenticationPrincipal Jwt jwt, @RequestBody PaymentDTO dto) {
        String email = jwt.getClaimAsString("email");
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.submitProof(email, dto));
    }
}
