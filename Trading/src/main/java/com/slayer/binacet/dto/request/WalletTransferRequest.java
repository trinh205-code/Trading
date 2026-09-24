package com.slayer.binacet.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class WalletTransferRequest {

    @NotBlank(message = "Đơn vị tiền tệ không được để trống")
    private String currency;

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "0.00000001", message = "Số tiền chuyển phải lớn hơn 0")
    private BigDecimal amount;
}