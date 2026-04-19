package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Payment;
import com.cricketlegend.domain.Player;
import com.cricketlegend.domain.enums.PaymentCategory;
import com.cricketlegend.domain.enums.PaymentStatus;
import com.cricketlegend.domain.enums.PaymentType;
import com.cricketlegend.dto.AllocationResultDTO;
import com.cricketlegend.dto.MatchFeePlayerDataDTO;
import com.cricketlegend.dto.PagedAllocationResponse;
import com.cricketlegend.dto.PagedPaymentResponse;
import com.cricketlegend.dto.PaymentDTO;
import com.cricketlegend.dto.TournamentFeePlayerDataDTO;
import com.cricketlegend.dto.WalletAllocationDTO;
import com.cricketlegend.dto.WalletDTO;
import com.cricketlegend.domain.Match;
import com.cricketlegend.domain.Tournament;
import com.cricketlegend.domain.WalletAllocation;
import com.cricketlegend.domain.MatchSide;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.PaymentMapper;
import com.cricketlegend.repository.MatchRepository;
import com.cricketlegend.repository.MatchSideRepository;
import com.cricketlegend.repository.PaymentRepository;
import com.cricketlegend.repository.PlayerRepository;
import com.cricketlegend.repository.SponsorRepository;
import com.cricketlegend.repository.TeamRepository;
import com.cricketlegend.repository.TournamentPoolRepository;
import com.cricketlegend.repository.TournamentRepository;
import com.cricketlegend.repository.WalletAllocationRepository;
import com.cricketlegend.service.PaymentService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

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
    private final MatchRepository matchRepository;
    private final MatchSideRepository matchSideRepository;
    private final TournamentPoolRepository tournamentPoolRepository;
    private final TeamRepository teamRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public PagedPaymentResponse findWithFilters(Long playerId, Long sponsorId, Long tournamentId,
                                                PaymentType paymentType, PaymentStatus status,
                                                Integer year, Integer month, int page, int size) {
        LocalDate startDate = null;
        LocalDate endDate = null;
        if (year != null && month != null) {
            startDate = LocalDate.of(year, month, 1);
            endDate = startDate.plusMonths(1).minusDays(1);
        } else if (year != null) {
            startDate = LocalDate.of(year, 1, 1);
            endDate = LocalDate.of(year, 12, 31);
        }

        // JpaSpecificationExecutor uses Criteria API — handles nullable params without
        // the PostgreSQL "could not determine data type of parameter" JPQL issue.
        Specification<Payment> spec = buildSpec(playerId, sponsorId, tournamentId, paymentType, status, startDate, endDate);
        Page<Payment> rawPage = paymentRepository.findAll(
                spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "paymentDate")));

        List<PaymentDTO> content;
        if (rawPage.isEmpty()) {
            content = List.of();
        } else {
            // Extract IDs from the lazy-loaded page (avoids N+1), then re-fetch with JOIN FETCH.
            List<Long> ids = rawPage.getContent().stream().map(Payment::getPaymentId).toList();
            List<Payment> payments = paymentRepository.findByIds(ids);
            Map<Long, Payment> byId = payments.stream()
                    .collect(Collectors.toMap(Payment::getPaymentId, p -> p));
            content = ids.stream()
                    .map(byId::get)
                    .filter(Objects::nonNull)
                    .map(paymentMapper::toDto)
                    .toList();
        }

        // Aggregate totals across ALL matching records (independent of current page).
        // Uses dynamic JPQL so only non-null params are bound — avoids Hibernate 6 null-type issues.
        BigDecimal[] totals = computeTotals(playerId, sponsorId, tournamentId, paymentType, status, startDate, endDate);
        BigDecimal subtotal = totals[0];
        BigDecimal vatTotal = totals[1];

        return PagedPaymentResponse.builder()
                .content(content)
                .totalElements(rawPage.getTotalElements())
                .totalPages(rawPage.getTotalPages())
                .subtotal(subtotal)
                .vatTotal(vatTotal)
                .grandTotal(subtotal.add(vatTotal))
                .build();
    }

    private Specification<Payment> buildSpec(Long playerId, Long sponsorId, Long tournamentId,
                                             PaymentType paymentType, PaymentStatus status,
                                             LocalDate startDate, LocalDate endDate) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (playerId != null)
                predicates.add(cb.equal(root.get("player").get("playerId"), playerId));
            if (sponsorId != null)
                predicates.add(cb.equal(root.get("sponsor").get("sponsorId"), sponsorId));
            if (tournamentId != null)
                predicates.add(cb.equal(root.get("tournament").get("tournamentId"), tournamentId));
            if (paymentType != null)
                predicates.add(cb.equal(root.get("paymentType"), paymentType));
            if (status != null)
                predicates.add(cb.equal(root.get("status"), status));
            if (startDate != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("paymentDate"), startDate));
            if (endDate != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("paymentDate"), endDate));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Computes subtotal and VAT total across ALL records matching the given filters.
     * Uses dynamic JPQL so only non-null parameters are bound — this avoids the Hibernate 6
     * "cannot determine JDBC type for null parameter" issue that affects both JPQL (:param IS NULL)
     * and native queries with nullable parameters.
     */
    private BigDecimal[] computeTotals(Long playerId, Long sponsorId, Long tournamentId,
                                       PaymentType paymentType, PaymentStatus status,
                                       LocalDate startDate, LocalDate endDate) {
        StringBuilder jpql = new StringBuilder(
            "SELECT COALESCE(SUM(p.amount), 0), " +
            "COALESCE(SUM(CASE WHEN p.taxable = TRUE THEN p.amount * 0.15 ELSE 0 END), 0) " +
            "FROM Payment p " +
            "LEFT JOIN p.player pl LEFT JOIN p.sponsor sp LEFT JOIN p.tournament t " +
            "WHERE 1=1");

        if (playerId != null)    jpql.append(" AND pl.playerId = :playerId");
        if (sponsorId != null)   jpql.append(" AND sp.sponsorId = :sponsorId");
        if (tournamentId != null) jpql.append(" AND t.tournamentId = :tournamentId");
        if (paymentType != null) jpql.append(" AND p.paymentType = :paymentType");
        if (status != null)      jpql.append(" AND p.status = :status");
        if (startDate != null)   jpql.append(" AND p.paymentDate >= :startDate");
        if (endDate != null)     jpql.append(" AND p.paymentDate <= :endDate");

        TypedQuery<Object[]> query = entityManager.createQuery(jpql.toString(), Object[].class);
        if (playerId != null)    query.setParameter("playerId", playerId);
        if (sponsorId != null)   query.setParameter("sponsorId", sponsorId);
        if (tournamentId != null) query.setParameter("tournamentId", tournamentId);
        if (paymentType != null) query.setParameter("paymentType", paymentType);
        if (status != null)      query.setParameter("status", status);
        if (startDate != null)   query.setParameter("startDate", startDate);
        if (endDate != null)     query.setParameter("endDate", endDate);

        Object[] row = query.getSingleResult();
        return new BigDecimal[]{
            new BigDecimal(row[0].toString()),
            new BigDecimal(row[1].toString())
        };
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
    public AllocationResultDTO allocatePlayerAnnualSubscription(Long playerId, BigDecimal amount, Integer year) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> NotFoundException.of("Player", playerId));
        List<Payment> allPayments = paymentRepository.findAllWithRelations();
        String fullName = player.getName() + " " + player.getSurname();
        int subscriptionYear = (year != null) ? year : LocalDate.now().getYear();

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
                .description("Annual subscription " + subscriptionYear)
                .subscriptionYear(subscriptionYear)
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

    @Override
    public List<MatchFeePlayerDataDTO> getMatchFeePlayerData(Long matchId, List<Long> sideIds) {
        var match = matchRepository.findById(matchId)
                .orElseThrow(() -> NotFoundException.of("Match", matchId));
        Long tournamentId = match.getTournament() != null ? match.getTournament().getTournamentId() : null;

        List<MatchSide> sides = matchSideRepository.findByMatchMatchId(matchId);
        if (sideIds != null && !sideIds.isEmpty()) {
            sides = sides.stream().filter(s -> sideIds.contains(s.getMatchSideId())).toList();
        }

        // Collect unique player IDs per side (playing XI + 12th man)
        Map<Long, MatchFeePlayerDataDTO.MatchFeePlayerDataDTOBuilder> playerBuilders = new LinkedHashMap<>();
        for (MatchSide side : sides) {
            String teamName = side.getTeam() != null ? side.getTeam().getTeamName() : "";
            List<Long> playerIds = new ArrayList<>();
            if (side.getPlayingXi() != null) playerIds.addAll(side.getPlayingXi());
            if (side.getTwelfthManPlayerId() != null) playerIds.add(side.getTwelfthManPlayerId());

            for (Long pid : playerIds) {
                if (!playerBuilders.containsKey(pid)) {
                    playerBuilders.put(pid, MatchFeePlayerDataDTO.builder()
                            .playerId(pid)
                            .matchSideId(side.getMatchSideId())
                            .teamName(teamName));
                }
            }
        }

        if (playerBuilders.isEmpty()) return List.of();

        List<Payment> allPayments = paymentRepository.findAllWithRelations();
        List<Player> players = playerRepository.findAllById(playerBuilders.keySet());
        Map<Long, Player> playerMap = new java.util.HashMap<>();
        players.forEach(p -> playerMap.put(p.getPlayerId(), p));

        List<MatchFeePlayerDataDTO> result = new ArrayList<>();
        for (var entry : playerBuilders.entrySet()) {
            Long pid = entry.getKey();
            Player player = playerMap.get(pid);
            if (player == null) continue;

            BigDecimal income = allPayments.stream()
                    .filter(p -> p.getPlayer() != null && p.getPlayer().getPlayerId().equals(pid) && p.getStatus() == PaymentStatus.APPROVED)
                    .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal allocated = allocationRepository.findByPlayerPlayerId(pid).stream()
                    .map(WalletAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            List<Payment> tourPayments = tournamentId == null ? List.of() : allPayments.stream()
                    .filter(p -> p.getPlayer() != null && p.getPlayer().getPlayerId().equals(pid)
                            && p.getTournament() != null && p.getTournament().getTournamentId().equals(tournamentId)
                            && p.getStatus() == PaymentStatus.APPROVED)
                    .toList();

            BigDecimal tourPaymentTotal = tourPayments.stream()
                    .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal matchFeeAllocated = allocationRepository
                    .findByPlayerPlayerIdAndCategoryAndMatchId(pid, "MATCH_FEE", matchId).stream()
                    .map(WalletAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            result.add(entry.getValue()
                    .playerName(player.getName() + " " + player.getSurname())
                    .walletBalance(income.subtract(allocated))
                    .tournamentPaymentCount(tourPayments.size())
                    .tournamentPaymentTotal(tourPaymentTotal)
                    .matchFeeAllocated(matchFeeAllocated)
                    .build());
        }
        return result;
    }

    @Override
    @Transactional
    public AllocationResultDTO allocatePlayerMatchFee(Long playerId, BigDecimal amount, Long matchId, BigDecimal matchFee, String description) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> NotFoundException.of("Player", playerId));
        String fullName = player.getName() + " " + player.getSurname();

        List<Payment> allPayments = paymentRepository.findAllWithRelations();
        BigDecimal income = allPayments.stream()
                .filter(p -> p.getPlayer() != null && p.getPlayer().getPlayerId().equals(playerId) && p.getStatus() == PaymentStatus.APPROVED)
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal allocated = allocationRepository.findByPlayerPlayerId(playerId).stream()
                .map(WalletAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal walletBalance = income.subtract(allocated);

        // Enforce match fee cap
        if (matchFee != null && matchFee.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal alreadyAllocatedForMatch = allocationRepository
                    .findByPlayerPlayerIdAndCategoryAndMatchId(playerId, "MATCH_FEE", matchId).stream()
                    .map(WalletAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal remaining = matchFee.subtract(alreadyAllocatedForMatch);
            if (amount.compareTo(remaining) > 0) {
                return AllocationResultDTO.builder()
                        .allocated(List.of())
                        .skipped(List.of(AllocationResultDTO.SkippedEntry.builder()
                                .playerId(playerId).playerName(fullName)
                                .reason("Amount exceeds remaining match fee (" + remaining + ")")
                                .walletBalance(walletBalance).required(amount)
                                .build()))
                        .build();
            }
        }

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

        String desc = description != null && !description.isBlank() ? description : "Match fee";
        allocationRepository.save(WalletAllocation.builder()
                .player(player)
                .amount(amount)
                .category("MATCH_FEE")
                .description(desc)
                .matchId(matchId)
                .allocationDate(LocalDate.now())
                .build());

        return AllocationResultDTO.builder()
                .allocated(List.of(AllocationResultDTO.AllocatedEntry.builder()
                        .playerId(playerId).playerName(fullName).amount(amount).build()))
                .skipped(List.of())
                .build();
    }

    @Override
    public List<TournamentFeePlayerDataDTO> getTournamentFeePlayerData(Long tournamentId) {
        tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> NotFoundException.of("Tournament", tournamentId));

        // Build player → team mapping from tournament pool squads
        Map<Long, Long[]> playerTeamMap = new java.util.HashMap<>(); // playerId → [teamId, teamName placeholder]
        Map<Long, com.cricketlegend.domain.Team> teamById = new java.util.HashMap<>();
        tournamentPoolRepository.findByTournamentTournamentId(tournamentId).forEach(pool ->
            pool.getTeams().forEach(tt -> {
                com.cricketlegend.domain.Team team = teamRepository.findById(tt.getTeam().getTeamId()).orElse(null);
                if (team != null) {
                    teamById.put(team.getTeamId(), team);
                    team.getSquadPlayerIds().forEach(pid ->
                        playerTeamMap.put(pid, new Long[]{team.getTeamId()}));
                }
            })
        );

        List<Player> players = playerRepository.findAll();
        List<Payment> allPayments = paymentRepository.findAllWithRelations();

        List<TournamentFeePlayerDataDTO> result = new ArrayList<>();
        for (Player player : players) {
            Long pid = player.getPlayerId();

            BigDecimal income = allPayments.stream()
                    .filter(p -> p.getPlayer() != null && p.getPlayer().getPlayerId().equals(pid) && p.getStatus() == PaymentStatus.APPROVED)
                    .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal allocated = allocationRepository.findByPlayerPlayerId(pid).stream()
                    .map(WalletAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            List<Payment> tourPayments = allPayments.stream()
                    .filter(p -> p.getPlayer() != null && p.getPlayer().getPlayerId().equals(pid)
                            && p.getTournament() != null && p.getTournament().getTournamentId().equals(tournamentId)
                            && p.getStatus() == PaymentStatus.APPROVED)
                    .toList();

            BigDecimal tourPaymentTotal = tourPayments.stream()
                    .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal tournamentFeeAllocated = allocationRepository
                    .findByPlayerPlayerIdAndCategoryAndTournamentId(pid, "TOURNAMENT_FEE", tournamentId).stream()
                    .map(WalletAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            Long[] teamRef = playerTeamMap.get(pid);
            Long teamId = teamRef != null ? teamRef[0] : null;
            com.cricketlegend.domain.Team team = teamId != null ? teamById.get(teamId) : null;

            result.add(TournamentFeePlayerDataDTO.builder()
                    .playerId(pid)
                    .playerName(player.getName() + " " + player.getSurname())
                    .walletBalance(income.subtract(allocated))
                    .tournamentPaymentCount(tourPayments.size())
                    .tournamentPaymentTotal(tourPaymentTotal)
                    .tournamentFeeAllocated(tournamentFeeAllocated)
                    .teamId(teamId)
                    .teamName(team != null ? team.getTeamName() : null)
                    .build());
        }

        result.sort((a, b) -> {
            String ta = a.getTeamName() != null ? a.getTeamName() : "";
            String tb = b.getTeamName() != null ? b.getTeamName() : "";
            int cmp = ta.compareTo(tb);
            return cmp != 0 ? cmp : a.getPlayerName().compareTo(b.getPlayerName());
        });
        return result;
    }

    @Override
    @Transactional
    public AllocationResultDTO allocatePlayerTournamentFee(Long playerId, BigDecimal amount, Long tournamentId, BigDecimal registrationFee, String description) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> NotFoundException.of("Player", playerId));
        String fullName = player.getName() + " " + player.getSurname();

        List<Payment> allPayments = paymentRepository.findAllWithRelations();
        BigDecimal income = allPayments.stream()
                .filter(p -> p.getPlayer() != null && p.getPlayer().getPlayerId().equals(playerId) && p.getStatus() == PaymentStatus.APPROVED)
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal allocated = allocationRepository.findByPlayerPlayerId(playerId).stream()
                .map(WalletAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal walletBalance = income.subtract(allocated);

        // Enforce registration fee cap
        if (registrationFee != null && registrationFee.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal alreadyAllocatedForTournament = allocationRepository
                    .findByPlayerPlayerIdAndCategoryAndTournamentId(playerId, "TOURNAMENT_FEE", tournamentId).stream()
                    .map(WalletAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal remaining = registrationFee.subtract(alreadyAllocatedForTournament);
            if (amount.compareTo(remaining) > 0) {
                return AllocationResultDTO.builder()
                        .allocated(List.of())
                        .skipped(List.of(AllocationResultDTO.SkippedEntry.builder()
                                .playerId(playerId).playerName(fullName)
                                .reason("Amount exceeds remaining registration fee (" + remaining + ")")
                                .walletBalance(walletBalance).required(amount)
                                .build()))
                        .build();
            }
        }

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

        String desc = description != null && !description.isBlank() ? description : "Tournament registration fee";
        allocationRepository.save(WalletAllocation.builder()
                .player(player)
                .amount(amount)
                .category("TOURNAMENT_FEE")
                .description(desc)
                .tournamentId(tournamentId)
                .allocationDate(LocalDate.now())
                .build());

        return AllocationResultDTO.builder()
                .allocated(List.of(AllocationResultDTO.AllocatedEntry.builder()
                        .playerId(playerId).playerName(fullName).amount(amount).build()))
                .skipped(List.of())
                .build();
    }

    @Override
    @Transactional
    public AllocationResultDTO allocatePlayerOther(Long playerId, BigDecimal amount, String description) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> NotFoundException.of("Player", playerId));
        String fullName = player.getName() + " " + player.getSurname();

        List<Payment> allPayments = paymentRepository.findAllWithRelations();
        BigDecimal income = allPayments.stream()
                .filter(p -> p.getPlayer() != null && p.getPlayer().getPlayerId().equals(playerId) && p.getStatus() == PaymentStatus.APPROVED)
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal allocated = allocationRepository.findByPlayerPlayerId(playerId).stream()
                .map(WalletAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal walletBalance = income.subtract(allocated);

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
                .category("OTHER")
                .description(description)
                .allocationDate(LocalDate.now())
                .build());

        return AllocationResultDTO.builder()
                .allocated(List.of(AllocationResultDTO.AllocatedEntry.builder()
                        .playerId(playerId).playerName(fullName).amount(amount).build()))
                .skipped(List.of())
                .build();
    }

    @Override
    public PagedAllocationResponse findAllocationsWithFilters(Long playerId, Long clubId, String category, Integer year, Integer month, int page, int size) {
        LocalDate startDate = null;
        LocalDate endDate = null;
        if (year != null && month != null) {
            startDate = LocalDate.of(year, month, 1);
            endDate = startDate.plusMonths(1).minusDays(1);
        } else if (year != null) {
            startDate = LocalDate.of(year, 1, 1);
            endDate = LocalDate.of(year, 12, 31);
        }

        final LocalDate fStart = startDate;
        final LocalDate fEnd = endDate;

        org.springframework.data.jpa.domain.Specification<WalletAllocation> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (playerId != null)
                predicates.add(cb.equal(root.get("player").get("playerId"), playerId));
            if (clubId != null)
                predicates.add(cb.equal(root.get("player").get("homeClub").get("clubId"), clubId));
            if (category != null && !category.isBlank())
                predicates.add(cb.equal(root.get("category"), category));
            if (fStart != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("allocationDate"), fStart));
            if (fEnd != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("allocationDate"), fEnd));
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        org.springframework.data.domain.Page<WalletAllocation> rawPage = allocationRepository.findAll(
                spec, org.springframework.data.domain.PageRequest.of(page, size,
                        org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")));

        List<WalletAllocationDTO> content;
        if (rawPage.isEmpty()) {
            content = List.of();
        } else {
            List<Long> ids = rawPage.getContent().stream().map(WalletAllocation::getId).toList();
            List<WalletAllocation> fetched = allocationRepository.findByIds(ids);
            Map<Long, WalletAllocation> byId = fetched.stream()
                    .collect(Collectors.toMap(WalletAllocation::getId, a -> a));

            // Collect unique match and tournament IDs for bulk lookup
            java.util.Set<Long> matchIds = fetched.stream()
                    .filter(a -> a.getMatchId() != null).map(WalletAllocation::getMatchId)
                    .collect(Collectors.toSet());
            java.util.Set<Long> tournamentIds = fetched.stream()
                    .filter(a -> a.getTournamentId() != null).map(WalletAllocation::getTournamentId)
                    .collect(Collectors.toSet());

            Map<Long, Match> matchMap = matchIds.isEmpty() ? Map.of() :
                    matchRepository.findAllById(matchIds).stream()
                            .collect(Collectors.toMap(Match::getMatchId, m -> m));
            Map<Long, Tournament> tournamentMap = tournamentIds.isEmpty() ? Map.of() :
                    tournamentRepository.findAllById(tournamentIds).stream()
                            .collect(Collectors.toMap(Tournament::getTournamentId, t -> t));

            content = ids.stream().map(byId::get).filter(Objects::nonNull).map(a -> {
                String matchLabel = null;
                if (a.getMatchId() != null) {
                    Match m = matchMap.get(a.getMatchId());
                    if (m != null) {
                        matchLabel = (m.getHomeTeam() != null ? m.getHomeTeam().getTeamName() : "?")
                                + " vs " + (m.getOppositionTeam() != null ? m.getOppositionTeam().getTeamName() : "?")
                                + (m.getMatchDate() != null ? " (" + m.getMatchDate() + ")" : "");
                    }
                }
                String tournamentName = null;
                if (a.getTournamentId() != null) {
                    Tournament t = tournamentMap.get(a.getTournamentId());
                    if (t != null) tournamentName = t.getName();
                }
                Player p = a.getPlayer();
                return WalletAllocationDTO.builder()
                        .id(a.getId())
                        .playerId(p != null ? p.getPlayerId() : null)
                        .playerName(p != null ? p.getName() + " " + p.getSurname() : null)
                        .amount(a.getAmount())
                        .category(a.getCategory())
                        .description(a.getDescription())
                        .allocationDate(a.getAllocationDate())
                        .createdAt(a.getCreatedAt())
                        .matchId(a.getMatchId())
                        .matchLabel(matchLabel)
                        .tournamentId(a.getTournamentId())
                        .tournamentName(tournamentName)
                        .subscriptionYear(a.getSubscriptionYear())
                        .build();
            }).toList();
        }

        BigDecimal total = content.stream()
                .map(WalletAllocationDTO::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return PagedAllocationResponse.builder()
                .content(content)
                .totalElements(rawPage.getTotalElements())
                .totalPages(rawPage.getTotalPages())
                .total(total)
                .build();
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
