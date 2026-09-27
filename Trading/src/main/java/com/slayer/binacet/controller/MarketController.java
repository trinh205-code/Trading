package com.slayer.binacet.controller;

import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.MarketResponse;
import com.slayer.binacet.dto.response.OrderBookResponse;
import com.slayer.binacet.dto.response.PublicTradeResponse;
import com.slayer.binacet.dto.response.TopCoinResponse;
import com.slayer.binacet.dto.response.TopCoinsOverviewResponse;
import com.slayer.binacet.service.MarketService;
import com.slayer.binacet.service.impl.MarketServiceImpl;
import com.slayer.binacet.service.impl.TradeServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketController {

    private final MarketServiceImpl marketService;
    private final TradeServiceImpl tradeService;

    @GetMapping("/top-coins")
    public ResponseEntity<ApiResponse<TopCoinsOverviewResponse>> getTopCoins() {
        TopCoinsOverviewResponse response = marketService.getTopCoinsOverview();
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy danh sách Top Coins thành công"));
    }

    @GetMapping("/top-coins/{category}")
    public ResponseEntity<ApiResponse<List<TopCoinResponse>>> getTopCoinsByCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "10") int limit) {
        List<TopCoinResponse> coins = marketService.getTopCoinsByCategory(category, limit);
        return ResponseEntity.ok(ApiResponse.success(coins, "Lấy danh sách Top " + category + " thành công"));
    }

    @GetMapping("/prices")
    public ResponseEntity<ApiResponse<List<MarketResponse>>> getAllMarkets() {
        List<MarketResponse> responses = marketService.getAllMarkets();
        return ResponseEntity.ok(ApiResponse.success(responses, "Lấy danh sách thị trường thành công"));
    }

    @GetMapping("/price/{symbol}")
    public ResponseEntity<ApiResponse<MarketResponse>> getMarketBySymbol(@PathVariable String symbol) {
        MarketResponse response = marketService.getMarketBySymbol(symbol);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy thông tin giá thành công"));
    }

    @GetMapping("/order-book/{symbol}")
    public ResponseEntity<ApiResponse<OrderBookResponse>> getOrderBook(@PathVariable String symbol) {
        OrderBookResponse response = marketService.getOrderBook(symbol);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy sổ lệnh thành công"));
    }

    @GetMapping("/trades/{symbol}")
    public ResponseEntity<ApiResponse<List<PublicTradeResponse>>> getRecentTrades(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "50") int limit) {

        // Tránh user truyền limit quá lớn làm sập DB
        int safeLimit = Math.min(limit, 100);

        List<PublicTradeResponse> recentTrades = tradeService.getRecentMarketTrades(symbol.toUpperCase(), safeLimit);

        return ResponseEntity.ok(ApiResponse.success(recentTrades, "Thành công"));
    }
}
