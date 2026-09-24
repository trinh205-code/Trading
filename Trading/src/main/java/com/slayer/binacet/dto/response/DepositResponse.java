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
public class DepositResponse {
    private String transactionId; // Mã giao dịch của hệ thống bạn (VD: DEP_12345)
    private BigDecimal amount;
    private String currency;

    private String paymentMethod;
    private String bankName;           // VD: Vietcombank
    private String bankAccountNumber;  // VD: 0123456789
    private String accountName;        // VD: NGUYEN VAN A
    private String transferContent;    // NỘI DUNG CHUYỂN KHOẢN BẮT BUỘC (VD: NAP 12345)

    private String paymentUrl;
}
