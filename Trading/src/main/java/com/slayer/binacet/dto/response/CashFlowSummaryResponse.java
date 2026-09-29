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
public class CashFlowSummaryResponse {
    private BigDecimal totalDeposit;      // Tổng nạp tiền (USDT)
    private BigDecimal totalWithdraw;     // Tổng rút tiền (USDT)
    private BigDecimal totalTradingFee;   // Tổng phí giao dịch (USDT)
    private BigDecimal totalRealizedPnl;  // Tổng Lời / Lỗ đã chốt (USDT)
    private BigDecimal totalTransferIn;   // Tổng chuyển vào Futures (USDT)
    private BigDecimal totalTransferOut;  // Tổng chuyển về Spot (USDT)
    private BigDecimal netCashFlow;       // Dòng tiền ròng tổng thể (USDT)
}
