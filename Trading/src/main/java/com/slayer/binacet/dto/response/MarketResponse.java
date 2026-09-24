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
public class MarketResponse {
    private String symbol;             // VD: "BTCUSDT"
    private BigDecimal currentPrice;   // Giá hiện tại
    private BigDecimal priceChange;    // % thay đổi trong 24h (VD: +5.2%)
    private BigDecimal highPrice;      // Giá cao nhất 24h
    private BigDecimal lowPrice;       // Giá thấp nhất 24h
    private BigDecimal volume24h;      // Khối lượng giao dịch 24h
}
