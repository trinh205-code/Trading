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
public class FuturesInstrumentResponse {
    private String symbol;
    private String baseAsset;                   // BTC (để ghép URL icon)
    private String quoteAsset;                  // USDT
    private String marginCurrencyShortName;     // USDT
    private String kind;                        // perpetual

    // Bộ lọc giá & khối lượng (Price/Lot filters)
    private BigDecimal priceIncrement;          // tickSize (ví dụ: 0.1)
    private BigDecimal quantityIncrement;       // stepSize (ví dụ: 0.001)
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private BigDecimal minNotional;             // Giá trị lệnh tối thiểu (5 USDT)

    // Đòn bẩy & Phí
    private BigDecimal maxLeverage;             // Đòn bẩy tối đa (render Slider)
    private BigDecimal makerFee;
    private BigDecimal takerFee;
    private Integer fundingFrequency;           // Chu kỳ funding (8h)

    // Trạng thái & Giá tham chiếu
    private BigDecimal lastPrice;
    private BigDecimal markPrice;
    private String status;                      // active / inactive
}