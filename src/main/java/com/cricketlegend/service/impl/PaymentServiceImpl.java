package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Payment;
import com.cricketlegend.domain.Player;
import com.cricketlegend.domain.enums.PaymentCategory;
import com.cricketlegend.domain.enums.PaymentStatus;
import com.cricketlegend.domain.enums.PaymentType;
import com.cricketlegend.dto.AllocationResultDTO;
import com.cricketlegend.dto.PaymentDTO;
import com.cricketlegend.dto.WalletAllocationDTO;
import com.cricketlegend.dto.WalletDTO;
import com.cricketlegend.domain.WalletAllocation;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.PaymentMapper;
import com.cricketlegend.repository.PaymentRepository;
import com.cricketlegend.repository.PlayerRepository;
import com.cricketlegend.repository.SponsorRepository;
import com.cricketlegend.repository.TournamentRepository;
import com.cricketlegend.repository.WalletAllocationRepository;
import com.cricketlegend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentMapper paymentMapper;
    private final PlayerRepository playerRepository;
    private final SponsorRepository sponsorRepository;
    private final TournamentRepository tournamentRepository;
    private final WalletAllocationRepository allocationRepository;

    @Override
    public List<PaymentDTO> findWithFilters(Long playerId, Long sponsorId, Long tournamentId,
                                            PaymentType paymentType, PaymentStatus status, Integer year, Integer month) {
        LocalDate startDate = null;
        LocalDate endDate = null;
        if (year != null && month != null) {
            startDate = LocalDate.of(year, month, 1);
            endDate = startDate.plusMonths(1).minusDays(1);
        } else if (year != null) {
            startDate = LocalDate.of(year, 1, 1);
            endDate = LocalDate.of(year, 12, 31);
        }

        final LocalDate sd = startDate;
        final LocalDate ed = endDate;

        Stream<Payment> stream = paymentRepository.findAllWithRelations().stream();

        if (playerId != null)
            stream = stream.filter(p -> p.getPlayer() != null && playerId.equals(p.getPlayer().getPlayerId()));
        if (sponsorId != null)
            stream = stream.filter(p -> p.getSponsor() != null && sponsorId.equals(p.getSponsor().getSponsorId()));
        if (tournamentId != null)
            stream = stream.filter(p -> p.getTournament() != null && tournamentId.equals(p.getTournament().getTournamentId()));
        if (paymentType != null)
            stream = stream.filter(p -> paymentType == p.getPaymentType());
        if (status != null)
            stream = stream.filter(p -> status == p.getStatus());
        if (sd != null)
            stream = stream.filter(p -> !p.getPaymentDate().isBefore(sd));
        if (ed != null)
            stream = stream.filter(p -> !p.getPaymentDate().isAfter(ed));

        return stream.map(paymentMapper::toDto).toList();
    }

    @Override
    public PaymentDTO findById(Long id) {
        return paymentRepository.findById(id)
                .map(paymentMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("Payment", id));
    }

    @Override
    @Transactional
    public PaymentDTO create(PaymentDTO dto) {
        Payment payment = paymentMapper.toEntity(dto);
        resolveRelations(payment, dto);
        return paymentMapper.toDto(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentDTO update(Long id, PaymentDTO dto) {
        Payment existing = paymentRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Payment", id));
        existing.setPaymentType(dto.getPaymentType());
        existing.setPaymentCategory(dto.getPaymentCategory());
        existing.setPaymentDate(dto.getPaymentDate());
        existing.setAmount(dto.getAmount());
        existing.setDescription(dto.getDescription());
        existing.setProofOfPaymentUrl(dto.getProofOfPaymentUrl());
        if (dto.getStatus() != null) existing.setStatus(dto.getStatus());
        existing.setTaxable(dto.isTaxable());
        existing.setRejectionReason(dto.getRejectionReason());
        resolveRelations(existing, dto);
        return paymentMapper.toDto(paymentRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!paymentRepository.existsById(id)) throw NotFoundException.of("Payment", id);
        paymentRepository.deleteById(id);
    }

    @Override
    public List<PaymentDTO> findMine(String email) {
        return playerRepository.findByEmailIgnoreCase(email)
                .map(player -> paymentRepository.findAllWithRelations().stream()
                        .filter(p -> p.getPlayer() != null && p.getPlayer().getPlayerId().equals(player.getPlayerId()))
                        .map(paymentMapper::toDto)
                        .toList())
                .orElse(List.of());
    }

    @Override
    @Transactional
    public PaymentDTO submitProof(String email, PaymentDTO dto) {
        Player player = playerRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("No player account found for the logged-in user."));
        Payment payment = new Payment();
        payment.setPlayer(player);
        payment.setPaymentType(PaymentType.PLAYER);
        payment.setPaymentCategory(dto.getPaymentCategory() != null ? dto.getPaymentCategory() : PaymentCategory.OTHER);
        payment.setPaymentDate(LocalDate.now());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(dto.getAmount());
        payment.setDescription(dto.getDescription());
        payment.setProofOfPaymentUrl(dto.getProofOfPaymentUrl());
        if (dto.getTournamentId() != null) {
            payment.setTournament(tournamentRepository.findById(dto.getTournamentId())
                    .orElseThrow(() -> NotFoundException.of("Tournament", dto.getTournamentId())));
        }
        return paymentMapper.toDto(paymentRepository.save(payment));
    }

    @Override
    public WalletDTO getWallet(String email) {
        return playerRepository.findByEmailIgnoreCase(email)
                .map(player -> {
                    List<PaymentDTO> transactions = paymentRepository.findAllWithRelations().stream()
                            .filter(p -> p.getPlayer() != null
                                    && p.getPlayer().getPlayerId().equals(player.getPlayerId())
                                    && p.getStatus() == PaymentStatus.APPROVED)
                            .map(paymentMapper::toDto)
                            .toList();
                    BigDecimal income = transactions.stream()
                            .map(PaymentDTO::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    List<WalletAllocationDTO> allocations = allocationRepository
                            .findByPlayerPlayerId(player.getPlayerId()).stream()
                            .map(a -> WalletAllocationDTO.builder()
                                    .id(a.getId())
                                    .playerId(player.getPlayerId())
                                    .playerName(player.getName() + " " + player.getSurname())
                                    .amount(a.getAmount())
                                    .category(a.getCategory())
                                    .description(a.getDescription())
                                    .allocationDate(a.getAllocationDate())
                                    .createdAt(a.getCreatedAt())
                                    .build())
                            .toList();
                    BigDecimal totalAllocated = allocations.stream()
                            .map(WalletAllocationDTO::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    return WalletDTO.builder()
                            .balance(income.subtract(totalAllocated))
                            .transactions(transactions)
                            .allocations(allocations)
                            .build();
                })
                .orElse(WalletDTO.builder().balance(BigDecimal.ZERO).transactions(List.of()).allocations(List.of()).build());
    }

    @Override
    @Transactional
    public AllocationResultDTO allocateAnnualSubscription(Long clubId) {
        List<Player> players = playerRepository.findByHomeClubClubId(clubId);
        List<Payment> allPayments = paymentRepository.findAllWithRelations();

        List<AllocationResultDTO.AllocatedEntry> allocated = new java.util.ArrayList<>();
        List<AllocationResultDTO.SkippedEntry> skipped = new java.util.ArrayList<>();

        for (Player player : players) {
            processPlayerAllocation(player, allPayments, allocated, skipped);
        }

        return AllocationResultDTO.builder().allocated(allocated).skipped(skipped).build();
    }

    @Override
    @Transactional
    public AllocationResultDTO allocatePlayerAnnualSubscription(Long playerId, BigDecimal amount) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> NotFoundException.of("Player", playerId));
        List<Payment> allPayments = paymentRepository.findAllWithRelations();
        String fullName = player.getName() + " " + player.getSurname();

        // Check wallet balance
        BigDecimal walletIncome = allPayments.stream()
                .filter(p -> p.getPlayer() != null
                        && p.getPlayer().getPlayerId().equals(playerId)
                        && p.getStatus() == PaymentStatus.APPROVED)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal walletAllocated = allocationRepository.findByPlayerPlayerId(playerId).stream()
                .map(WalletAllocation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal walletBalance = walletIncome.subtract(walletAllocated);

        if (walletBalance.compareTo(amount) < 0) {
            return AllocationResultDTO.builder()
                    .allocated(List.of())
                    .skipped(List.of(AllocationResultDTO.SkippedEntry.builder()
                            .playerId(playerId).playerName(fullName)
                            .reason("Insufficient wallet funds")
                            .walletBalance(walletBalance).required(amount)
                            .build()))
                    .build();
        }

        allocationRepository.save(WalletAllocation.builder()
                .player(player)
                .amount(amount)
                .category("ANNUAL_SUBSCRIPTION")
                .description("Annual subscription allocation")
                .allocationDate(LocalDate.now())
                .build());

        return AllocationResultDTO.builder()
                .allocated(List.of(AllocationResultDTO.AllocatedEntry.builder()
                        .playerId(playerId).playerName(fullName).amount(amount)
                        .build()))
                .skipped(List.of())
                .build();
    }

    @Override
    public java.util.Map<Long, BigDecimal> getClubAllocationTotals(Long clubId) {
        List<Player> players = playerRepository.findByHomeClubClubId(clubId);
        java.util.Map<Long, BigDecimal> totals = new java.util.HashMap<>();
        for (Player player : players) {
            Long pid = player.getPlayerId();
            BigDecimal allocated = allocationRepository
                    .findByPlayerPlayerIdAndCategory(pid, "ANNUAL_SUBSCRIPTION").stream()
                    .map(WalletAllocation::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            totals.put(pid, allocated);
        }
        return totals;
    }

    @Override
    public java.util.Map<Long, BigDecimal> getClubWalletBalances(Long clubId) {
        List<Player> players = playerRepository.findByHomeClubClubId(clubId);
        List<Payment> allPayments = paymentRepository.findAllWithRelations();

        java.util.Map<Long, BigDecimal> balances = new java.util.HashMap<>();
        for (Player player : players) {
            Long pid = player.getPlayerId();
            BigDecimal income = allPayments.stream()
                    .filter(p -> p.getPlayer() != null
                            && p.getPlayer().getPlayerId().equals(pid)
                            && p.getStatus() == PaymentStatus.APPROVED)
                    .map(Payment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal allocated = allocationRepository.findByPlayerPlayerId(pid).stream()
                    .map(WalletAllocation::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            balances.put(pid, income.subtract(allocated));
        }
        return balances;
    }

    private void processPlayerAllocation(Player player, List<Payment> allPayments,
                                         List<AllocationResultDTO.AllocatedEntry> allocated,
                                         List<AllocationResultDTO.SkippedEntry> skipped) {
        Long playerId = player.getPlayerId();
        String fullName = player.getName() + " " + player.getSurname();

        BigDecimal subscriptionTotal = allPayments.stream()
                .filter(p -> p.getPlayer() != null
                        && p.getPlayer().getPlayerId().equals(playerId)
                        && p.getPaymentCategory() == PaymentCategory.ANNUAL_SUBSCRIPTION
                        && p.getStatus() == PaymentStatus.APPROVED)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (subscriptionTotal.compareTo(BigDecimal.ZERO) == 0) return;

        BigDecimal alreadyAllocated = allocationRepository
                .findByPlayerPlayerIdAndCategory(playerId, "ANNUAL_SUBSCRIPTION").stream()
                .map(WalletAllocation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal toAllocate = subscriptionTotal.subtract(alreadyAllocated);
        if (toAllocate.compareTo(BigDecimal.ZERO) <= 0) {
            skipped.add(AllocationResultDTO.SkippedEntry.builder()
                    .playerId(playerId).playerName(fullName)
                    .reason("Already fully allocated")
                    .required(BigDecimal.ZERO).walletBalance(BigDecimal.ZERO)
                    .build());
            return;
        }

        BigDecimal walletIncome = allPayments.stream()
                .filter(p -> p.getPlayer() != null
                        && p.getPlayer().getPlayerId().equals(playerId)
                        && p.getStatus() == PaymentStatus.APPROVED)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal walletAllocated = allocationRepository.findByPlayerPlayerId(playerId).stream()
                .map(WalletAllocation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal walletBalance = walletIncome.subtract(walletAllocated);

        if (walletBalance.compareTo(toAllocate) < 0) {
            skipped.add(AllocationResultDTO.SkippedEntry.builder()
                    .playerId(playerId).playerName(fullName)
                    .reason("Insufficient wallet funds")
                    .walletBalance(walletBalance).required(toAllocate)
                    .build());
            return;
        }

        allocationRepository.save(WalletAllocation.builder()
                .player(player)
                .amount(toAllocate)
                .category("ANNUAL_SUBSCRIPTION")
                .description("Annual subscription allocation")
                .allocationDate(LocalDate.now())
                .build());

        allocated.add(AllocationResultDTO.AllocatedEntry.builder()
                .playerId(playerId).playerName(fullName).amount(toAllocate)
                .build());
    }

    private void resolveRelations(Payment payment, PaymentDTO dto) {
        payment.setPlayer(dto.getPlayerId() != null
                ? playerRepository.findById(dto.getPlayerId()).orElseThrow(() -> NotFoundException.of("Player", dto.getPlayerId()))
                : null);
        payment.setSponsor(dto.getSponsorId() != null
                ? sponsorRepository.findById(dto.getSponsorId()).orElseThrow(() -> NotFoundException.of("Sponsor", dto.getSponsorId()))
                : null);
        payment.setTournament(dto.getTournamentId() != null
                ? tournamentRepository.findById(dto.getTournamentId()).orElseThrow(() -> NotFoundException.of("Tournament", dto.getTournamentId()))
                : null);
    }
}
