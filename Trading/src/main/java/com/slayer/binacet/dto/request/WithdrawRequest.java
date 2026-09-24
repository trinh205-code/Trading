package com.slayer.binacet.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class WithdrawRequest {
    @NotBlank(message = "Loại tiền tệ không được để trống")
    private String currency;

    @NotNull(message = "Số tiền không được để trống")
    @Positive(message = "Số tiền phải lớn hơn 0")
    private BigDecimal amount;

    @NotBlank(message = "Địa chỉ ví nhận không được để trống")
    private String destinationAddress;
}
