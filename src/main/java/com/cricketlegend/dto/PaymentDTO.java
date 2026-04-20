package com.cricketlegend.dto;

import com.cricketlegend.domain.enums.PaymentCategory;
import com.cricketlegend.domain.enums.PaymentStatus;
import com.cricketlegend.domain.enums.PaymentType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentDTO {
    private Long paymentId;
    private PaymentType paymentType;
    private PaymentCategory paymentCategory;
    private Long playerId;
    private String playerName;
    private Long sponsorId;
    private String sponsorName;
    private Long tournamentId;
    private String tournamentName;
    private LocalDate paymentDate;
    private BigDecimal amount;
    private PaymentStatus status;
    private boolean taxable;
    private boolean vatInclusive;
    private String description;
    private String rejectionReason;
    private String proofOfPaymentUrl;
    private LocalDateTime createdAt;
}
