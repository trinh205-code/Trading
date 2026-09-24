package com.slayer.binacet.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class TradeResponse {
    private Long id;
    private String orderId;
    private String symbol;
    private String side;
    private BigDecimal price;
    private BigDecimal quantity;
    private BigDecimal totalQuote;
    private BigDecimal feeAmount;
    private String executionVenue;
    private Instant timestamp;
}
