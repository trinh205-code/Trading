package com.slayer.binacet.dto.response;

import java.math.BigDecimal;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class BinanceTickerResponse {
    private String symbol;
    private BigDecimal lastPrice;          // Giá hiện tại
    private BigDecimal priceChange;        // Giá thay đổi 24h
    private BigDecimal priceChangePercent; // % Thay đổi
    private BigDecimal highPrice;
    private BigDecimal lowPrice;
    private BigDecimal volume;
    private BigDecimal quoteVolume;        // Khối lượng USDT
}
