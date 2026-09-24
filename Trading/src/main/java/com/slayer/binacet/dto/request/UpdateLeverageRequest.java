package com.slayer.binacet.dto.request;

import jakarta.validation.constraints.DecimalMax;
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
public class UpdateLeverageRequest {

    @NotBlank(message = "Symbol không được để trống")
    private String symbol;

    @NotNull(message = "Đòn bẩy không được để trống")
    @DecimalMin(value = "1", message = "Đòn bẩy tối thiểu là 1x")
    @DecimalMax(value = "200", message = "Đòn bẩy tối đa là 200x")
    private BigDecimal leverage;
}