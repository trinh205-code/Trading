package com.slayer.binacet.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ChangeTransferPinRequest {

    @NotBlank(message = "Mã OTP cũ không được để trống")
    private String oldPin;

    @NotBlank(message = "Mã OTP mới không được để trống")
    @Pattern(regexp = "^\\d{4}$", message = "Mã OTP mới phải gồm đúng 4 chữ số")
    private String newPin;

}
