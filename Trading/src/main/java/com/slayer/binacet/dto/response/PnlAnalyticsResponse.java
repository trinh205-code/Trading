package com.slayer.binacet.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class PnlAnalyticsResponse {
    private BigDecimal currentTotalAsset;   // Tổng giá trị ước tính hiện tại (USD)
    private BigDecimal periodPnl;            // Lợi nhuận trong chu kỳ (+/- USD)
    private BigDecimal periodPnlPercentage;  // Tỷ lệ lợi nhuận trong chu kỳ (+/- %)
    private String period;                   // "1D", "7D", "30D", "180D", "1Y"
    private List<PnlChartPointDto> chartPoints; // Danh sách các điểm vẽ đồ thị
}