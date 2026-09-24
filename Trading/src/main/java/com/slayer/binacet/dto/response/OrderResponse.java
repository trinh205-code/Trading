package com.slayer.binacet.dto.response;

import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.Enums.OrderStatus;
import com.slayer.binacet.Enums.OrderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {

    private String id;
    private String clientOrderId;

    private String userId;

    private String symbol;

    private OrderSide side;
    private OrderType orderType;
    private OrderStatus status;

    private BigDecimal pricePerUnit;
    private BigDecimal totalQuantity;
    private BigDecimal remainingQuantity;
    private BigDecimal avgPrice;
    private BigDecimal feeAmount;

    private Instant createdAt;
    private Instant updatedAt;
}
