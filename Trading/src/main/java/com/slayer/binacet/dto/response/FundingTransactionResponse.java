package com.slayer.binacet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FundingTransactionResponse {
    private String id;
    private Instant createdAt;
    private String asset;        // USDT, BTC...
    private String type;         // P2P, Airdrop và phần thưởng, Chuyển ví, Nạp tiền, Rút tiền
    private BigDecimal amount;   // +20.00000000, -20.00000000
    private BigDecimal balanceAfter; // Số dư sau giao dịch
    private String note;         // Đặt lệnh USDT, Đã nhận USDT...
}
