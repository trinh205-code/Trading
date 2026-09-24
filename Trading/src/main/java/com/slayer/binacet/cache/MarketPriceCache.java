package com.slayer.binacet.cache;

import com.slayer.binacet.service.impl.MarketServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.concurrent.ConcurrentHashMap;


@Component
@RequiredArgsConstructor
@Slf4j
public class MarketPriceCache {


    // 1. Cache lưu giá khớp cuối cùng (Last Price) - Dùng cho Chart, Order Book Limit
    private final ConcurrentHashMap<String, BigDecimal> lastPrices = new ConcurrentHashMap<>();

    // 2. Cache lưu giá đánh dấu (Mark Price) - Dùng cho Thanh lý (Liquidation) và tính UPnL
    private final ConcurrentHashMap<String, BigDecimal> markPrices = new ConcurrentHashMap<>();

    // ==========================================
    // CÁC HÀM XỬ LÝ LAST PRICE
    // ==========================================
    public void updateLastPrice(String symbol, BigDecimal price) {
        lastPrices.put(symbol.toUpperCase(), price);
    }

    public BigDecimal getLastPrice(String symbol) {
        return lastPrices.get(symbol.toUpperCase());
    }

    // ==========================================
    // CÁC HÀM XỬ LÝ MARK PRICE
    // ==========================================
    public void updateMarkPrice(String symbol, BigDecimal price) {
        markPrices.put(symbol.toUpperCase(), price);
    }

    public BigDecimal getMarkPrice(String symbol) {
        BigDecimal markPrice = markPrices.get(symbol.toUpperCase());
        if (markPrice == null) {
            log.info("markPrice is null {}", symbol);
            return getLastPrice(symbol);
        }
        return markPrice;
    }


}
