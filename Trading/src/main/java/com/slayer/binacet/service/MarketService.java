package com.slayer.binacet.service;

import com.slayer.binacet.dto.response.MarketResponse;
import com.slayer.binacet.dto.response.OrderBookResponse;

import java.math.BigDecimal;
import java.util.List;

public interface MarketService {
    List<MarketResponse> getAllMarkets();

    MarketResponse getMarketBySymbol(String symbol);

    OrderBookResponse getOrderBook(String symbol);

    BigDecimal getCurrentPrice(String symbol);
}
