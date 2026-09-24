package com.slayer.binacet.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class PublicTradeResponse {
    private Long id;
    private BigDecimal price;
    private BigDecimal quantity;
    private String side;
    private Instant timestamp;
}