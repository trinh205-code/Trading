package com.slayer.binacet.dto.request;

import com.slayer.binacet.Enums.WalletType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferWalletRequest {

    @NotBlank(message = "Loại tiền không được để trống")
    private String currency;

    @NotNull(message = "Số lượng không được để trống")
    @DecimalMin(value = "0.0000001", message = "Số lượng đặt lệnh phải lớn hơn 0")
    private BigDecimal amount;

    @NotNull(message = "Tài khoản nguồn không được để trống")
    private WalletType fromAccount; // (SPOT/FUTURES)

    @NotNull(message = "Tài khoản đích không được để trống")
    private WalletType toAccount;   // (SPOT/FUTURES)
}
