package com.slayer.binacet.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentRequest {
    // Số tiền VNĐ muốn thanh toán (VD: 2500000)
    private BigDecimal amountVnd;

    // Hoặc số lượng USDT muốn mua (VD: 100)
    private BigDecimal usdtAmount;

    // Tùy chọn mã ngân hàng nếu chọn trước (VNPAYQR, VNBANK, INTCARD...)
    private String bankCode;
}
