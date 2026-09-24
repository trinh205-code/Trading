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
    private BigDecimal priceChangePercent; // % Thay đổi (Binance trả về phần trăm)
    private BigDecimal highPrice;
    private BigDecimal lowPrice;
    private BigDecimal volume;
}
