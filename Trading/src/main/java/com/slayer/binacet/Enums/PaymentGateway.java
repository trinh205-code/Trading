package com.slayer.binacet.Enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum PaymentGateway {
    VNPAY,
    MOMO;

    @JsonCreator
    public static PaymentStatus from(String value) {
        try {
            return PaymentStatus.valueOf(value.toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Status must be one of: PENDING, SUCCESS, FAILED"
            );
        }
    }

}
