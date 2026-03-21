package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Payment;
import com.cricketlegend.domain.enums.PaymentType;
import com.cricketlegend.dto.PaymentDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.PaymentMapper;
import com.cricketlegend.repository.PaymentRepository;
import com.cricketlegend.repository.PlayerRepository;
import com.cricketlegend.repository.SponsorRepository;
import com.cricketlegend.repository.TournamentRepository;
import com.cricketlegend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Override
    public List<PaymentDTO> findWithFilters(Long playerId, Long sponsorId, Long tournamentId,
                                            PaymentType paymentType, Integer year, Integer month) {
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
        resolveRelations(existing, dto);
        return paymentMapper.toDto(paymentRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!paymentRepository.existsById(id)) throw NotFoundException.of("Payment", id);
        paymentRepository.deleteById(id);
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
