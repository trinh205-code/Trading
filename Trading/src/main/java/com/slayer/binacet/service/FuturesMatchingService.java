package com.slayer.binacet.service;

import com.slayer.binacet.entity.FuturesOrder;

public interface FuturesMatchingService {
    void executeMarketOrder(FuturesOrder order);
    void processOrder(FuturesOrder order);
}

