package com.slayer.binacet.dto.response;

import java.math.BigDecimal;

public record FillResult(
    BigDecimal realizedPnl,
    BigDecimal marginReleased,
    BigDecimal marginToLock,
    BigDecimal entryPrice,
    BigDecimal leverage
) {
    public FillResult(BigDecimal realizedPnl, BigDecimal marginReleased, BigDecimal marginToLock) {
        this(realizedPnl, marginReleased, marginToLock, null, null);
    }
}
