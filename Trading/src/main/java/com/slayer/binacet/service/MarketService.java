package com.slayer.binacet.service;

import com.slayer.binacet.dto.response.MarketResponse;
import com.slayer.binacet.dto.response.OrderBookResponse;
import com.slayer.binacet.dto.response.TopCoinResponse;
import com.slayer.binacet.dto.response.TopCoinsOverviewResponse;

import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.List;

public interface MarketService {
    List<MarketResponse> getAllMarkets();

    Page<MarketResponse> getPagedMarkets(int page, int size, String sortBy, String direction, String search, String category, List<String> symbols);

    MarketResponse getMarketBySymbol(String symbol);

    OrderBookResponse getOrderBook(String symbol);

    BigDecimal getCurrentPrice(String symbol);

    TopCoinsOverviewResponse getTopCoinsOverview();

    List<TopCoinResponse> getTopCoinsByCategory(String category, int limit);
}
