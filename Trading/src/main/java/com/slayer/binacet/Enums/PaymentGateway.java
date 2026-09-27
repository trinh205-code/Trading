package com.slayer.binacet.Enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum PaymentGateway {
    VNPAY,
    MOMO;

    @JsonCreator
    public static PaymentGateway from(String value) {
        try {
            return PaymentGateway.valueOf(value.toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Gateway must be one of: VNPAY, MOMO"
            );
        }
    }

}
