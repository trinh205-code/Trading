package com.slayer.binacet.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class TransferRequest {
    @NotBlank(message = "UID người nhận không được để trống")
    private String receiverId; // Đổi từ receiverEmail sang receiverId (UID)

    @NotBlank(message = "Loại tiền tệ không được để trống")
    private String currency; // VD: USDT

    @NotNull(message = "Số tiền không được để trống")
    @Positive(message = "Số tiền chuyển phải lớn hơn 0")
    private BigDecimal amount;
}
