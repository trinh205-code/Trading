package com.slayer.binacet.service;

import com.slayer.binacet.dto.response.ExchangeRateResponse;

import java.math.BigDecimal;

public interface ExchangeRateService {
    BigDecimal getUsdtToVndRate();
    ExchangeRateResponse getRateResponse();
}
