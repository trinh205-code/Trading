package com.slayer.binacet.service;

import com.slayer.binacet.dto.response.PublicTradeResponse;
import com.slayer.binacet.dto.response.TradeResponse;
import com.slayer.binacet.entity.Order;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.List;

public interface TradeService {

    // 1. Nhánh Khớp Nội Bộ (Lưu 2 bản ghi cho Buyer và Seller)
    void recordInternalMatch(Order buyOrder, Order sellOrder, BigDecimal matchPrice, BigDecimal matchQty);

    // 2. Nhánh Môi Giới Ngoài (Chỉ lưu 1 bản ghi cho User nội bộ)
    void recordExternalMatch(Order order, BigDecimal matchPrice, BigDecimal matchQty, String venue, String externalId);

    Page<TradeResponse> getMyTrades(String symbol, int page, int size);

    List<PublicTradeResponse> getRecentMarketTrades(String symbol, int limit);



}
