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
public class FuturesPositionResponse {

    private String id;

    // Phẳng hóa dữ liệu: Lấy thẳng tên cặp giao dịch từ FuturesInstrument (VD: "BTCUSDT")
    private String symbol;

    private BigDecimal activePos;          // Kích thước vị thế (Dương = Long, Âm = Short)
    private BigDecimal avgPrice;           // Giá vào lệnh trung bình
    private BigDecimal liquidationPrice;   // Giá thanh lý

    private BigDecimal lockedMargin;       // Tổng Margin bị khóa
    private BigDecimal lockedUserMargin;
    private BigDecimal lockedOrderMargin;

    private BigDecimal leverage;           // Đòn bẩy (VD: 10, 20, 50)
    private String marginType;             // "CROSSED" hoặc "ISOLATED"

    private BigDecimal markPrice;          // Giá đánh dấu hiện tại
    private BigDecimal maintenanceMargin;  // Ký quỹ duy trì
    private String marginCurrencyShortName;// Đồng tiền ký quỹ (VD: "USDT")

    // Thêm 3 trường này vào FuturesPositionResponse
    private BigDecimal unrealizedPnl;       // Lãi/Lỗ chưa thực hiện (UPnL)

    private Instant updatedAt;             // Lần cập nhật cuối cùng

}