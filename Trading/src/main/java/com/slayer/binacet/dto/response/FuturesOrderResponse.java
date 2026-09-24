package com.slayer.binacet.dto.response;

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
public class FuturesOrderResponse {
    private String id;
    private String symbol;
    private String side;
    private String orderType;
    private String status;
    private BigDecimal price;
    private BigDecimal stopPrice;
    private BigDecimal avgPrice;
    private BigDecimal totalQuantity;
    private BigDecimal remainingQuantity;
    private BigDecimal cancelledQuantity;
    private BigDecimal leverage;
    private String positionMarginType;     // crossed, isolated
    private String marginCurrencyShortName;
    private BigDecimal takeProfitPrice;
    private BigDecimal stopLossPrice;
    private String stage;
    private String groupId;
    private Instant createdAt;
    private Instant updatedAt;
}
