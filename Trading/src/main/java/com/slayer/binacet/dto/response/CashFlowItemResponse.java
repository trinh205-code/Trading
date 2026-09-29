package com.slayer.binacet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CashFlowItemResponse {
    private String id;
    private String type;          // DEPOSIT, WITHDRAW, TRANSFER, TRADING_FEE, REALIZED_PNL
    private String subType;       // VNPAY_DEPOSIT, SPOT_TO_FUTURES, FUTURES_TO_SPOT, SPOT_FEE, FUTURES_FEE, EXIT, TPSL_EXIT, LIQUIDATION, WITHDRAW
    private BigDecimal amount;    // Số tiền biến động
    private String currency;      // USDT, VND, BTC...
    private BigDecimal fee;       // Phí giao dịch kèm theo (nếu có)
    private String direction;     // IN (tiền vào), OUT (tiền ra), NEUTRAL (chuyển ví nội bộ)
    private String description;   // Diễn giải chi tiết
    private String status;        // COMPLETED, PENDING, FAILED
    private Instant timestamp;    // Thời gian phát sinh
    private String referenceId;   // Mã tham chiếu (mã đơn, mã giao dịch, symbol...)
}
