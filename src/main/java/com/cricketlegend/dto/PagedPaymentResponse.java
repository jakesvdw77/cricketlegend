package com.cricketlegend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedPaymentResponse {
    private List<PaymentDTO> content;
    private long totalElements;
    private int totalPages;
    private BigDecimal subtotal;
    private BigDecimal vatTotal;
    private BigDecimal grandTotal;
}
