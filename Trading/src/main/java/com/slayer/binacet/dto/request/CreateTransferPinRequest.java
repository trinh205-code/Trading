package com.slayer.binacet.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CreateTransferPinRequest {

    @NotBlank(message = "Mã OTP không được để trống")
    @Pattern(regexp = "^\\d{4}$", message = "Mã OTP phải gồm đúng 4 chữ số")
    private String pin;
}
