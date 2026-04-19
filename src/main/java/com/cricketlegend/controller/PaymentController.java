package com.cricketlegend.controller;

import com.cricketlegend.domain.enums.PaymentStatus;
import com.cricketlegend.domain.enums.PaymentType;
import com.cricketlegend.dto.AllocationResultDTO;
import com.cricketlegend.dto.MatchFeePlayerDataDTO;
import com.cricketlegend.dto.PagedAllocationResponse;
import com.cricketlegend.dto.PagedPaymentResponse;
import com.cricketlegend.dto.PaymentDTO;
import com.cricketlegend.dto.TournamentFeePlayerDataDTO;
import com.cricketlegend.dto.WalletDTO;
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
    @Operation(summary = "Get payments with optional filters (server-side paginated)")
    public ResponseEntity<PagedPaymentResponse> findAll(
            @RequestParam(required = false) Long playerId,
            @RequestParam(required = false) Long sponsorId,
            @RequestParam(required = false) Long tournamentId,
            @RequestParam(required = false) PaymentType paymentType,
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(paymentService.findWithFilters(playerId, sponsorId, tournamentId, paymentType, status, year, month, page, size));
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

    @GetMapping("/wallet/me")
    @Operation(summary = "Get the wallet balance and transactions for the logged-in player")
    public ResponseEntity<WalletDTO> getWallet(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return ResponseEntity.ok(paymentService.getWallet(email));
    }

    @PostMapping("/allocate/annual-subscription")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Allocate annual subscription funds from player wallets for a club")
    public ResponseEntity<AllocationResultDTO> allocateAnnualSubscription(@RequestParam Long clubId) {
        return ResponseEntity.ok(paymentService.allocateAnnualSubscription(clubId));
    }

    @GetMapping("/wallet/club/{clubId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get wallet balances for all players in a club")
    public ResponseEntity<java.util.Map<Long, java.math.BigDecimal>> getClubWalletBalances(@PathVariable Long clubId) {
        return ResponseEntity.ok(paymentService.getClubWalletBalances(clubId));
    }

    @GetMapping("/allocations/club/{clubId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get annual subscription allocation totals per player for a club")
    public ResponseEntity<java.util.Map<Long, java.math.BigDecimal>> getClubAllocationTotals(@PathVariable Long clubId) {
        return ResponseEntity.ok(paymentService.getClubAllocationTotals(clubId));
    }

    @PostMapping("/allocate/annual-subscription/player/{playerId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Allocate annual subscription funds from a single player's wallet")
    public ResponseEntity<AllocationResultDTO> allocatePlayerAnnualSubscription(
            @PathVariable Long playerId,
            @RequestParam java.math.BigDecimal amount,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(paymentService.allocatePlayerAnnualSubscription(playerId, amount, year));
    }

    @GetMapping("/match-fee/players")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get wallet balance + tournament payment count for players in match sides")
    public ResponseEntity<List<MatchFeePlayerDataDTO>> getMatchFeePlayerData(
            @RequestParam Long matchId,
            @RequestParam(required = false) List<Long> sideIds) {
        return ResponseEntity.ok(paymentService.getMatchFeePlayerData(matchId, sideIds));
    }

    @PostMapping("/allocate/match-fee/player/{playerId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Allocate match fee funds from a single player's wallet")
    public ResponseEntity<AllocationResultDTO> allocatePlayerMatchFee(
            @PathVariable Long playerId,
            @RequestParam java.math.BigDecimal amount,
            @RequestParam Long matchId,
            @RequestParam(required = false) java.math.BigDecimal matchFee,
            @RequestParam(required = false) String description) {
        return ResponseEntity.ok(paymentService.allocatePlayerMatchFee(playerId, amount, matchId, matchFee, description));
    }

    @GetMapping("/allocations")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get all wallet allocations with optional filters (server-side paginated)")
    public ResponseEntity<PagedAllocationResponse> findAllocations(
            @RequestParam(required = false) Long playerId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(paymentService.findAllocationsWithFilters(playerId, clubId, category, year, month, page, size));
    }

    @GetMapping("/tournament-fee/players")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Get wallet balance + tournament payment data for all players for a tournament")
    public ResponseEntity<List<TournamentFeePlayerDataDTO>> getTournamentFeePlayerData(
            @RequestParam Long tournamentId) {
        return ResponseEntity.ok(paymentService.getTournamentFeePlayerData(tournamentId));
    }

    @PostMapping("/allocate/tournament-fee/player/{playerId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Allocate tournament registration fee from a single player's wallet")
    public ResponseEntity<AllocationResultDTO> allocatePlayerTournamentFee(
            @PathVariable Long playerId,
            @RequestParam java.math.BigDecimal amount,
            @RequestParam Long tournamentId,
            @RequestParam(required = false) java.math.BigDecimal registrationFee,
            @RequestParam(required = false) String description) {
        return ResponseEntity.ok(paymentService.allocatePlayerTournamentFee(playerId, amount, tournamentId, registrationFee, description));
    }

    @PostMapping("/allocate/other/player/{playerId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Allocate other funds from a single player's wallet")
    public ResponseEntity<AllocationResultDTO> allocatePlayerOther(
            @PathVariable Long playerId,
            @RequestParam java.math.BigDecimal amount,
            @RequestParam String description) {
        return ResponseEntity.ok(paymentService.allocatePlayerOther(playerId, amount, description));
    }
}
