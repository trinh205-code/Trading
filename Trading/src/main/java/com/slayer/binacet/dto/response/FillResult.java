package com.slayer.binacet.dto.response;

import java.math.BigDecimal;

public record FillResult(BigDecimal realizedPnl, BigDecimal marginReleased,BigDecimal marginToLock) {}
