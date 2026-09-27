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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
        List<Market> activeMarkets = marketRepository.findByStatus("TRADING");
        if (activeMarkets.isEmpty()) {
            activeMarkets = marketRepository.findAll();
        }

        if (activeMarkets.isEmpty()) {
            return DEFAULT_PAIRS.stream()
                    .map(this::getMarketBySymbol)
                    .filter(Objects::nonNull)
                    .toList();
        }

        return activeMarkets.stream()
                .map(m -> {
                    BigDecimal price = m.getCurrentPrice() != null ? m.getCurrentPrice() : marketPriceCache.getLastPrice(m.getSymbol());
                    return MarketResponse.builder()
                            .symbol(m.getSymbol())
                            .currentPrice(price)
                            .priceChange(m.getPriceChangePercent() != null ? m.getPriceChangePercent() : BigDecimal.ZERO)
                            .highPrice(m.getHigh24h())
                            .lowPrice(m.getLow24h())
                            .volume24h(m.getVolume24h())
                            .build();
                })
                .toList();
    }

    @Override
    public MarketResponse getMarketBySymbol(String symbol) {
        String safeSymbol = validateAndNormalize(symbol);

        // 1. Kiểm tra trong DB local trước
        Optional<Market> marketOpt = marketRepository.findById(safeSymbol);
        if (marketOpt.isPresent() && marketOpt.get().getCurrentPrice() != null) {
            Market m = marketOpt.get();
            return MarketResponse.builder()
                    .symbol(m.getSymbol())
                    .currentPrice(m.getCurrentPrice())
                    .priceChange(m.getPriceChangePercent() != null ? m.getPriceChangePercent() : BigDecimal.ZERO)
                    .highPrice(m.getHigh24h())
                    .lowPrice(m.getLow24h())
                    .volume24h(m.getVolume24h())
                    .build();
        }

        // 2. Nếu DB chưa có, gọi Binance trực tiếp làm fallback
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
            BigDecimal cached = marketPriceCache.getLastPrice(safeSymbol);
            if (cached != null && cached.compareTo(BigDecimal.ZERO) > 0) {
                return cached;
            }

            Optional<Market> m = marketRepository.findById(safeSymbol);
            if (m.isPresent() && m.get().getCurrentPrice() != null) {
                BigDecimal p = m.get().getCurrentPrice();
                marketPriceCache.updateLastPrice(safeSymbol, p);
                marketPriceCache.updateMarkPrice(safeSymbol, p);
                return p;
            }

            MarketResponse response = getMarketBySymbol(safeSymbol);
            if (response != null && response.getCurrentPrice() != null) {
                BigDecimal price = response.getCurrentPrice();
                marketPriceCache.updateLastPrice(safeSymbol, price);
                marketPriceCache.updateMarkPrice(safeSymbol, price);
                return price;
            }
        } catch (Exception e) {
            log.error("Không thể lấy giá qua REST API cho {}: {}", safeSymbol, e.getMessage());
        }
        return null;
    }

    @Override
    public TopCoinsOverviewResponse getTopCoinsOverview() {
        Pageable limit7 = PageRequest.of(0, 7);

        List<TopCoinResponse> highlights = toTopList(marketRepository.findByStatusOrderByQuoteVolume24hDesc("TRADING", limit7));
        List<TopCoinResponse> gainers = toTopList(marketRepository.findByStatusOrderByPriceChangePercentDesc("TRADING", limit7));
        List<TopCoinResponse> losers = toTopList(marketRepository.findByStatusOrderByPriceChangePercentAsc("TRADING", limit7));
        List<TopCoinResponse> newListings = toTopList(marketRepository.findByStatusOrderBySymbolAsc("TRADING", limit7));
        List<TopCoinResponse> topMarketCap = toTopList(marketRepository.findByStatusOrderByMarketCapDesc("TRADING", limit7));
        List<TopCoinResponse> topVolume = toTopList(marketRepository.findByStatusOrderByQuoteVolume24hDesc("TRADING", limit7));

        return TopCoinsOverviewResponse.builder()
                .highlights(highlights)
                .gainers(gainers)
                .losers(losers)
                .newListings(newListings)
                .topMarketCap(topMarketCap)
                .topVolume(topVolume)
                .build();
    }

    @Override
    public List<TopCoinResponse> getTopCoinsByCategory(String category, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        Pageable pageable = PageRequest.of(0, safeLimit);

        String cat = category != null ? category.toLowerCase().trim() : "highlights";

        List<Market> markets = switch (cat) {
            case "gainers", "top-gainers", "tang-gia" ->
                    marketRepository.findByStatusOrderByPriceChangePercentDesc("TRADING", pageable);
            case "losers", "top-losers", "giam-gia" ->
                    marketRepository.findByStatusOrderByPriceChangePercentAsc("TRADING", pageable);
            case "volume", "top-volume", "gia-tri" ->
                    marketRepository.findByStatusOrderByQuoteVolume24hDesc("TRADING", pageable);
            case "market-cap", "marketcap", "von-hoa" ->
                    marketRepository.findByStatusOrderByMarketCapDesc("TRADING", pageable);
            case "new", "new-listings", "moi-niem-yet" ->
                    marketRepository.findByStatusOrderBySymbolAsc("TRADING", pageable);
            default -> // highlights, popular, pho-bien
                    marketRepository.findByStatusOrderByQuoteVolume24hDesc("TRADING", pageable);
        };

        return toTopList(markets);
    }

    private List<TopCoinResponse> toTopList(List<Market> markets) {
        if (markets == null) return List.of();
        return markets.stream()
                .map(m -> TopCoinResponse.builder()
                        .symbol(m.getSymbol())
                        .pair(m.getPair() != null ? m.getPair() : m.getBaseCurrencyShortName() + "/" + m.getTargetCurrencyShortName())
                        .baseCurrency(m.getBaseCurrencyShortName())
                        .targetCurrency(m.getTargetCurrencyShortName())
                        .currentPrice(m.getCurrentPrice() != null ? m.getCurrentPrice() : marketPriceCache.getLastPrice(m.getSymbol()))
                        .priceChange(m.getPriceChange())
                        .priceChangePercent(m.getPriceChangePercent())
                        .high24h(m.getHigh24h())
                        .low24h(m.getLow24h())
                        .volume24h(m.getVolume24h())
                        .quoteVolume24h(m.getQuoteVolume24h())
                        .marketCap(m.getMarketCap())
                        .build())
                .toList();
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