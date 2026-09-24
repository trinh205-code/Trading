package com.slayer.binacet.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class PnlChartPointDto {
    private String timestamp;           // ISO format hoặc Epoch millis
    private String dateLabel;           // "27-08", "02-09", "14-09",...
    private BigDecimal assetValue;      // Tổng giá trị tài sản tại điểm đó ($)
    private BigDecimal dailyPnl;        // PnL riêng trong ngày đó ($)
    private BigDecimal dailyPnlPercent; // % PnL riêng trong ngày đó (%)
    private BigDecimal cumulativePnl;   // PnL lũy kế tính đến điểm đó ($)
}