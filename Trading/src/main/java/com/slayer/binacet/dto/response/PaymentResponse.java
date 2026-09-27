package com.slayer.binacet.dto.response;

import com.slayer.binacet.Enums.PaymentGateway;
import com.slayer.binacet.Enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {
    private Long id;
    private String transactionId;
    private BigDecimal amountVnd;
    private BigDecimal usdtAmount;
    private BigDecimal exchangeRate;
    private PaymentStatus paymentStatus;
    private PaymentGateway paymentGateway;
    private String paymentUrl;
    private String bankCode;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
