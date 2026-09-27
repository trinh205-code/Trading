package com.slayer.binacet.service.impl;

import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.dto.response.BinanceExchangeInfoResponse;
import com.slayer.binacet.dto.response.BinanceSymbol;
import com.slayer.binacet.dto.response.BinanceTickerResponse;
import com.slayer.binacet.entity.Market;
import com.slayer.binacet.repository.MarketRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketSyncService {

    private final RestTemplate restTemplate;
    private final MarketRepository marketRepository;
    private final MarketPriceCache marketPriceCache;

    private static final String BINANCE_EXCHANGE_INFO_URL = "https://api.binance.com/api/v3/exchangeInfo";
    private static final String BINANCE_TICKER_24HR_URL = "https://api.binance.com/api/v3/ticker/24hr";

    // Danh sách ước lượng Circulating Supply cho các coin phổ biến để tính MarketCap chính xác
    private static final Map<String, BigDecimal> CIRCULATING_SUPPLIES = Map.ofEntries(
            Map.entry("BTCUSDT", new BigDecimal("19700000")),
            Map.entry("ETHUSDT", new BigDecimal("120000000")),
            Map.entry("BNBUSDT", new BigDecimal("153000000")),
            Map.entry("SOLUSDT", new BigDecimal("468000000")),
            Map.entry("XRPUSDT", new BigDecimal("56000000000")),
            Map.entry("DOGEUSDT", new BigDecimal("146000000000")),
            Map.entry("ADAUSDT", new BigDecimal("35000000000")),
            Map.entry("TRXUSDT", new BigDecimal("86000000000")),
            Map.entry("AVAXUSDT", new BigDecimal("400000000")),
            Map.entry("LINKUSDT", new BigDecimal("600000000")),
            Map.entry("SUIUSDT", new BigDecimal("2800000000")),
            Map.entry("NEARUSDT", new BigDecimal("1200000000")),
            Map.entry("DOTUSDT", new BigDecimal("1400000000")),
            Map.entry("MATICUSDT", new BigDecimal("9900000000")),
            Map.entry("SHIBUSDT", new BigDecimal("589000000000000")),
            Map.entry("LTCUSDT", new BigDecimal("75000000")),
            Map.entry("BCHUSDT", new BigDecimal("19700000")),
            Map.entry("UNIUSDT", new BigDecimal("600000000")),
            Map.entry("XLMUSDT", new BigDecimal("29000000000")),
            Map.entry("ATOMUSDT", new BigDecimal("390000000")),
            Map.entry("APTUSDT", new BigDecimal("490000000")),
            Map.entry("ARBUSDT", new BigDecimal("3400000000")),
            Map.entry("OPUSDT", new BigDecimal("1100000000"))
    );

    // Danh sách TOP 50 đồng coin phổ biến nhất
    private static final List<String> TOP_50_COINS = Arrays.asList(
            "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT",
            "DOGEUSDT", "TRXUSDT", "DOTUSDT", "MATICUSDT", "LTCUSDT", "BCHUSDT",
            "LINKUSDT", "SHIBUSDT", "AVAXUSDT", "ATOMUSDT", "UNIUSDT", "XLMUSDT",
            "XMRUSDT", "ETCUSDT", "FILUSDT", "ICPUSDT", "VETUSDT", "NEARUSDT",
            "APTUSDT", "ARBUSDT", "OPUSDT", "LDOUSDT", "INJUSDT", "RNDRUSDT",
            "STXUSDT", "IMXUSDT", "SNXUSDT", "GRTUSDT", "THETAUSDT", "EOSUSDT",
            "SANDUSDT", "MANAUSDT", "AAVEUSDT", "MKRUSDT", "AXSUSDT", "RUNEUSDT",
            "FTMUSDT", "ALGOUSDT", "QNTUSDT", "FLOWUSDT", "EGLDUSDT", "CRVUSDT",
            "CHZUSDT", "GALAUSDT"
    );

    @PostConstruct
    public void init() {
        syncMarketsFromBinance();
        syncBatchTickerPrices();
    }

    @Transactional
    public void syncMarketsFromBinance() {
        log.info("Bắt đầu đồng bộ danh sách TOP 50 Market từ Binance...");

        try {
            BinanceExchangeInfoResponse response = restTemplate.getForObject(
                    BINANCE_EXCHANGE_INFO_URL, BinanceExchangeInfoResponse.class);

            if (response == null || response.getSymbols() == null) {
                log.warn("Không lấy được dữ liệu từ Binance!");
                return;
            }

            List<Market> marketsToSave = new ArrayList<>();

            for (BinanceSymbol bs : response.getSymbols()) {
                if (!TOP_50_COINS.contains(bs.getSymbol())) {
                    continue;
                }

                Market market = marketRepository.findById(bs.getSymbol()).orElseGet(() -> {
                    Market m = new Market();
                    m.setSymbol(bs.getSymbol());
                    return m;
                });

                market.setPair(bs.getBaseAsset() + "/" + bs.getQuoteAsset());
                market.setBaseCurrencyShortName(bs.getBaseAsset());
                market.setTargetCurrencyShortName(bs.getQuoteAsset());
                market.setStatus(bs.getStatus());

                for (Map<String, Object> filter : bs.getFilters()) {
                    String filterType = String.valueOf(filter.get("filterType"));

                    if ("PRICE_FILTER".equals(filterType)) {
                        if (filter.get("minPrice") != null) {
                            market.setMinPrice(new BigDecimal(String.valueOf(filter.get("minPrice"))));
                        }
                        if (filter.get("maxPrice") != null) {
                            market.setMaxPrice(new BigDecimal(String.valueOf(filter.get("maxPrice"))));
                        }
                    }

                    if ("LOT_SIZE".equals(filterType)) {
                        if (filter.get("minQty") != null) {
                            market.setMinQuantity(new BigDecimal(String.valueOf(filter.get("minQty"))));
                        }
                        if (filter.get("maxQty") != null) {
                            market.setMaxQuantity(new BigDecimal(String.valueOf(filter.get("maxQty"))));
                        }
                    }

                    if ("NOTIONAL".equals(filterType) || "MIN_NOTIONAL".equals(filterType)) {
                        if (filter.get("minNotional") != null) {
                            market.setMinNotional(new BigDecimal(String.valueOf(filter.get("minNotional"))));
                        }
                    }
                }

                marketsToSave.add(market);
            }

            marketRepository.saveAll(marketsToSave);
            log.info("Đã đồng bộ thành công {} cặp giao dịch vào Database!", marketsToSave.size());

        } catch (Exception e) {
            log.error("Lỗi khi đồng bộ Market từ Binance: ", e);
        }
    }

    /**
     * Đồng bộ BATCH giá và chỉ số 24h từ Binance mỗi 30 giây (CHỈ 1 REQUEST CHO TẤT CẢ 50 COIN)
     */
    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void syncBatchTickerPrices() {
        try {
            log.info("Bắt đầu đồng bộ Batch 24hr Ticker từ Binance...");
            BinanceTickerResponse[] tickers = restTemplate.getForObject(
                    BINANCE_TICKER_24HR_URL, BinanceTickerResponse[].class);

            if (tickers == null || tickers.length == 0) {
                log.warn("Không nhận được dữ liệu 24hr ticker từ Binance");
                return;
            }

            Map<String, BinanceTickerResponse> tickerMap = new HashMap<>();
            for (BinanceTickerResponse t : tickers) {
                if (t.getSymbol() != null) {
                    tickerMap.put(t.getSymbol().toUpperCase(), t);
                }
            }

            List<Market> activeMarkets = marketRepository.findAll();
            if (activeMarkets.isEmpty()) return;

            for (Market m : activeMarkets) {
                String sym = m.getSymbol().toUpperCase();
                BinanceTickerResponse t = tickerMap.get(sym);
                if (t == null) continue;

                BigDecimal lastPrice = t.getLastPrice();
                BigDecimal priceChange = t.getPriceChange();
                BigDecimal pct = t.getPriceChangePercent();
                BigDecimal high = t.getHighPrice();
                BigDecimal low = t.getLowPrice();
                BigDecimal vol = t.getVolume();
                BigDecimal quoteVol = t.getQuoteVolume();

                if (lastPrice != null) {
                    m.setCurrentPrice(lastPrice);
                    marketPriceCache.updateLastPrice(sym, lastPrice);
                    marketPriceCache.updateMarkPrice(sym, lastPrice);
                }
                if (priceChange != null) m.setPriceChange(priceChange);
                if (pct != null) m.setPriceChangePercent(pct);
                if (high != null) m.setHigh24h(high);
                if (low != null) m.setLow24h(low);
                if (vol != null) m.setVolume24h(vol);
                if (quoteVol != null) m.setQuoteVolume24h(quoteVol);

                // Tính vốn hóa thị trường
                BigDecimal supply = CIRCULATING_SUPPLIES.get(sym);
                if (supply != null && lastPrice != null) {
                    m.setMarketCap(lastPrice.multiply(supply).setScale(2, RoundingMode.HALF_UP));
                } else if (quoteVol != null) {
                    m.setMarketCap(quoteVol.multiply(BigDecimal.valueOf(15)).setScale(2, RoundingMode.HALF_UP));
                }
            }

            marketRepository.saveAll(activeMarkets);
            log.info("Đã đồng bộ thành công giá và chỉ số 24h cho {} cặp thị trường vào Database!", activeMarkets.size());

        } catch (Exception e) {
            log.error("Lỗi khi đồng bộ Batch 24hr Ticker từ Binance: {}", e.getMessage());
        }
    }
}
