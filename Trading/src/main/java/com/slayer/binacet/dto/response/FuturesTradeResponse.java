package com.slayer.binacet.dto.response;

import com.slayer.binacet.Enums.OrderSide;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FuturesTradeResponse {
    private Long id;

    private String orderId;

    private String symbol;

    private OrderSide side;
    private BigDecimal price;
    private BigDecimal quantity;
    private BigDecimal notional; // gia tri khop (price * qtty)
    private BigDecimal feeAmount;

    private Boolean isMaker;
    private Instant timestamp;
}
