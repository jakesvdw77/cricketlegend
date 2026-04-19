package com.cricketlegend.service;

import com.cricketlegend.domain.enums.PaymentStatus;
import com.cricketlegend.domain.enums.PaymentType;
import com.cricketlegend.dto.AllocationResultDTO;
import com.cricketlegend.dto.MatchFeePlayerDataDTO;
import com.cricketlegend.dto.PagedAllocationResponse;
import com.cricketlegend.dto.PagedPaymentResponse;
import com.cricketlegend.dto.PaymentDTO;
import com.cricketlegend.dto.TournamentFeePlayerDataDTO;
import com.cricketlegend.dto.WalletDTO;

import java.util.List;

public interface PaymentService {
    PagedPaymentResponse findWithFilters(Long playerId, Long sponsorId, Long tournamentId, PaymentType paymentType, PaymentStatus status, Integer year, Integer month, int page, int size);
    PaymentDTO findById(Long id);
    PaymentDTO create(PaymentDTO dto);
    PaymentDTO update(Long id, PaymentDTO dto);
    void delete(Long id);
    List<PaymentDTO> findMine(String email);
    PaymentDTO submitProof(String email, PaymentDTO dto);
    WalletDTO getWallet(String email);
    AllocationResultDTO allocateAnnualSubscription(Long clubId);
    AllocationResultDTO allocatePlayerAnnualSubscription(Long playerId, java.math.BigDecimal amount, Integer year);
    java.util.Map<Long, java.math.BigDecimal> getClubWalletBalances(Long clubId);
    java.util.Map<Long, java.math.BigDecimal> getClubAllocationTotals(Long clubId);
    List<MatchFeePlayerDataDTO> getMatchFeePlayerData(Long matchId, List<Long> sideIds);
    AllocationResultDTO allocatePlayerMatchFee(Long playerId, java.math.BigDecimal amount, Long matchId, java.math.BigDecimal matchFee, String description);
    List<TournamentFeePlayerDataDTO> getTournamentFeePlayerData(Long tournamentId);
    AllocationResultDTO allocatePlayerTournamentFee(Long playerId, java.math.BigDecimal amount, Long tournamentId, java.math.BigDecimal registrationFee, String description);
    AllocationResultDTO allocatePlayerOther(Long playerId, java.math.BigDecimal amount, String description);
    PagedAllocationResponse findAllocationsWithFilters(Long playerId, Long clubId, String category, Integer year, Integer month, int page, int size);
}
