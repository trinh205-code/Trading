package com.slayer.binacet.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data

public class BlacklistTokenRequest {

    @NotBlank(message = "Token không được để trống")
    private String token;

}
