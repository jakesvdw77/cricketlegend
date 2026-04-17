package com.cricketlegend.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class WalletDTO {
    private BigDecimal balance;
    private List<PaymentDTO> transactions;
    private List<WalletAllocationDTO> allocations;
}
