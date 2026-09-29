package com.slayer.binacet.service;

import com.slayer.binacet.dto.response.CashFlowResponse;

import java.time.Instant;

public interface CashFlowService {
    CashFlowResponse getCashFlow(String type, Instant startDate, Instant endDate);
}
