package com.slayer.binacet.service.impl;

import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.dto.response.*;
import com.slayer.binacet.entity.Market;
import com.slayer.binacet.exception.ExternalApiException;
import com.slayer.binacet.mapper.MarketMapper;
import com.slayer.binacet.repository.MarketRepository;
import com.slayer.binacet.service.MarketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketServiceImpl implements MarketService {

    private final RestTemplate restTemplate;
    private final MarketMapper marketMapper;
    private final MarketRepository marketRepository;
    private final MarketPriceCache marketPriceCache;

    @Value("${binance.api.url}")
    private String BINANCE_API_URL;

    private static final List<String> DEFAULT_PAIRS = List.of(
            "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"
    );

    @Override
    public List<MarketResponse> getAllMarkets() {
        List<String> activeSymbols = new ArrayList<>();

        try {
            List<Market> activeMarkets = marketRepository.findByStatus("TRADING");
            activeSymbols = activeMarkets.stream()
                    .map(Market::getSymbol)
                    .toList();
        } catch (Exception e) {
            log.warn("Không thể truy vấn DB bảng Market, sử dụng danh sách mặc định. Lỗi: {}", e.getMessage());
        }

        // Nếu DB rỗng hoặc chưa đồng bộ, dùng danh sách mặc định
        if (activeSymbols.isEmpty()) {
            activeSymbols = DEFAULT_PAIRS;
        }

        List<MarketResponse> result = new ArrayList<>();

        // Lấy thông tin ticker cho từng symbol an toàn 100%
        for (String symbol : activeSymbols) {
            try {
                MarketResponse res = getMarketBySymbol(symbol);
                if (res != null) {
                    result.add(res);
                }
            } catch (Exception e) {
                log.warn("Bỏ qua symbol {} do không lấy được giá từ Binance", symbol);
            }
        }

        return result;
      }

    @Override
    public MarketResponse getMarketBySymbol(String symbol) {
        String safeSymbol = validateAndNormalize(symbol);
        log.info("Gọi Binance API lấy giá 24h cho cặp: {}", safeSymbol);

        String url = UriComponentsBuilder.fromHttpUrl(BINANCE_API_URL + "/ticker/24hr")
                .queryParam("symbol", safeSymbol)
                .toUriString();

        try {
            BinanceTickerResponse ticker = restTemplate.getForObject(url, BinanceTickerResponse.class);
            return marketMapper.toResponse(ticker);
        } catch (Exception e) {
            log.error("Lỗi khi gọi Binance cho cặp {}", safeSymbol, e);
            throw new ExternalApiException("Không thể lấy dữ liệu từ Binance cho cặp: " + safeSymbol, e);
        }
    }

    @Override
    public OrderBookResponse getOrderBook(String symbol) {
        String safeSymbol = validateAndNormalize(symbol);
        log.info("Gọi Binance API lấy sổ lệnh cho cặp: {}", safeSymbol);

        String url = UriComponentsBuilder.fromHttpUrl(BINANCE_API_URL + "/depth")
                .queryParam("symbol", safeSymbol)
                .queryParam("limit", 10)
                .toUriString();

        try {
            BinanceDepthResponse depth = restTemplate.getForObject(url, BinanceDepthResponse.class);

            return OrderBookResponse.builder()
                    .symbol(safeSymbol)
                    .bids(mapToOrderEntries(depth.getBids()))
                    .asks(mapToOrderEntries(depth.getAsks()))
                    .build();

        } catch (Exception e) {
            log.error("Lỗi khi lấy sổ lệnh cho cặp {}", safeSymbol, e);
            throw new ExternalApiException("Không thể lấy sổ lệnh từ Binance cho: " + safeSymbol, e);
        }
    }

    @Override
    public BigDecimal getCurrentPrice(String symbol) {
        String safeSymbol = validateAndNormalize(symbol);
        try {
            MarketResponse response = getMarketBySymbol(safeSymbol);
            if (response != null && response.getCurrentPrice() != null) {
                BigDecimal price = response.getCurrentPrice();
                // Nạp ngược lại vào RAM Cache để các request đặt lệnh sau dùng ngay
                marketPriceCache.updateLastPrice(safeSymbol, price);
                marketPriceCache.updateMarkPrice(safeSymbol, price);
                return price;
            }
        } catch (Exception e) {
            log.error("Không thể lấy giá qua REST API cho {}: {}", safeSymbol, e.getMessage());
        }
        return null;
    }

    private String validateAndNormalize(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("Symbol không được để trống");
        }
        return symbol.toUpperCase();
    }

    private List<OrderEntry> mapToOrderEntries(List<List<String>> binanceOrders) {
        if (binanceOrders == null) return List.of();

        return binanceOrders.stream()
                .map(order -> new OrderEntry(
                        new BigDecimal(order.get(0)), // Giá
                        new BigDecimal(order.get(1))  // Số lượng
                ))
                .collect(Collectors.toList());
    }
}