package com.slayer.binacet.dto.request;

import com.slayer.binacet.Enums.FuturesOrderType;
import com.slayer.binacet.Enums.OrderSide;
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
public class CreateFuturesOrderRequest {
    @NotBlank(message = "mã cặp giao dịch không được để trống")
    String symbol;

    @NotNull(message = "Chiều giao dịch không được để trống")
    OrderSide side;

    @NotNull(message = "Loại lệnh không được để trống")
    FuturesOrderType orderType;

    @DecimalMin(value = "1", message = "Số tiền phải lớn hơn 1")
    BigDecimal price;
    BigDecimal stopPrice;

    @NotNull(message = "Số lượng không được để trống")
    @DecimalMin(value = "0.0000001", message = "Số lượng đặt lệnh phải lớn hơn 0")
    BigDecimal quantity;

    @NotNull(message = "Đòn bẩy không được để trống")
    @DecimalMin(value = "1", message = "Đòn bẩy phải lớn hơn hoặc bằng 1")
    BigDecimal leverage;
    BigDecimal takeProfit;
    BigDecimal stopLossPrice;

    private boolean reduceOnly; // Đánh dấu lệnh chỉ giảm/đóng vị thế

}
