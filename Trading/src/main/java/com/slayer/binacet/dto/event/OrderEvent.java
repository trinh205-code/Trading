package com.slayer.binacet.dto.event;

import com.slayer.binacet.Enums.FuturesOrderType;
import com.slayer.binacet.Enums.OrderSide;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderEvent {
    private String orderId;
    private String symbol;
    private OrderSide side;
    private FuturesOrderType orderType;
    private BigDecimal price;
    private BigDecimal quantity;

    private BigDecimal remainingQuantity;
    private Instant timestamp;

    private String action; // CREATE hoặc CANCEL
}
