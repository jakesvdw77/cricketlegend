package com.cricketlegend.service;

import com.cricketlegend.domain.enums.PaymentStatus;
import com.cricketlegend.domain.enums.PaymentType;
import com.cricketlegend.dto.PaymentDTO;

import java.util.List;

public interface PaymentService {
    List<PaymentDTO> findWithFilters(Long playerId, Long sponsorId, Long tournamentId, PaymentType paymentType, PaymentStatus status, Integer year, Integer month);
    PaymentDTO findById(Long id);
    PaymentDTO create(PaymentDTO dto);
    PaymentDTO update(Long id, PaymentDTO dto);
    void delete(Long id);
    List<PaymentDTO> findMine(String email);
    PaymentDTO submitProof(String email, PaymentDTO dto);
}
