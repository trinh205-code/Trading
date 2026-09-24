package com.slayer.binacet.service;

import com.slayer.binacet.dto.response.PnlAnalyticsResponse;

import java.math.BigDecimal;

public interface WalletAnalyticsService {
    /** Lấy dữ liệu phân tích PnL theo chu kỳ (1D, 7D, 30D, 180D, 1Y) */
    PnlAnalyticsResponse getPnlAnalytics(String period);

    /** Tính tổng vốn chủ sở hữu thời gian thực (Spot + Futures) */
    BigDecimal calculateCurrentTotalEquity(String userId);

    /** Chụp ảnh số dư hàng ngày vào lúc 00:00 UTC */
    void captureDailySnapshots();
}
