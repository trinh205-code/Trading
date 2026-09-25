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
public class FuturesPositionHistoryResponse {
    private String id;
    private String symbol;
    private String stage;            // default, exit, tpsl_exit, liquidation
    private BigDecimal realizedPnl;  // amount
    private BigDecimal feeAmount;
    private BigDecimal leverage;
    private BigDecimal avgPrice;
    private String source;           // user, system
    private String parentType;       // order, Liquidation
    private String parentId;
    private Instant createdAt;
}
