package com.slayer.binacet.dto.request;

import com.slayer.binacet.Enums.FuturesOrderType;
import jakarta.validation.constraints.DecimalMin;
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
public class ClosePartialPositionRequest {

    @NotNull(message = "ID vị thế không được để trống")
    private Long positionId;

    @NotNull(message = "Số lượng đóng không được để trống")
    @DecimalMin(value = "0.00000001", message = "Số lượng đóng phải lớn hơn 0")
    private BigDecimal quantity;

    @Builder.Default
    private FuturesOrderType orderType = FuturesOrderType.MARKET;

    private BigDecimal price;
}