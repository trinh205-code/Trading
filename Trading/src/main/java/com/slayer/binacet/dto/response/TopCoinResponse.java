package com.slayer.binacet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopCoinResponse {
    private String symbol;
    private String pair;
    private String baseCurrency;
    private String targetCurrency;
    private BigDecimal currentPrice;
    private BigDecimal priceChange;
    private BigDecimal priceChangePercent;
    private BigDecimal high24h;
    private BigDecimal low24h;
    private BigDecimal volume24h;
    private BigDecimal quoteVolume24h;
    private BigDecimal marketCap;
}
