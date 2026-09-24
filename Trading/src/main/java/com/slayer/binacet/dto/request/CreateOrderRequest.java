package com.slayer.binacet.dto.request;

import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.Enums.OrderType;
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
public class CreateOrderRequest {


    private String clientOrderId;

    @NotBlank(message = "Mã cặp giao dịch (Symbol) không được để trống")
    private String symbol; // VD: "BTCUSDT"

    @NotNull(message = "Chiều giao dịch (Side) không được để trống")
    private OrderSide side;

    @NotNull(message = "Loại lệnh (Order Type) không được để trống")
    private OrderType orderType;


    private BigDecimal price;

    @NotNull(message = "Số lượng không được để trống")
    @DecimalMin(value = "0.0000001", message = "Số lượng đặt lệnh phải lớn hơn 0")
    private BigDecimal quantity;
}
