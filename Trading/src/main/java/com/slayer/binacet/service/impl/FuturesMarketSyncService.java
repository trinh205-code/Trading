package com.slayer.binacet.service.impl;

import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.dto.response.BinanceFuturesExchangeInfoResponse;
import com.slayer.binacet.dto.response.BinanceFuturesSymbol;
import com.slayer.binacet.entity.FuturesInstrument;
import com.slayer.binacet.exception.ExternalApiException;
import com.slayer.binacet.repository.FuturesInstrumentRepository;
import com.slayer.binacet.service.ws.BinanceWebSocketClient;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class FuturesMarketSyncService {

    private final RestTemplate restTemplate;
    private final FuturesInstrumentRepository futuresInstrumentRepository;

    private final MarketPriceCache marketPriceCache;

    private final MarketServiceImpl marketService;


    private static final String BINANCE_FUTURES_EXCHANGE_INFO_URL = "https://fapi.binance.com/fapi/v1/exchangeInfo";

    // Chỉ đồng bộ hợp đồng Perpetual (vĩnh cửu) - loại phổ biến nhất, bỏ qua hợp đồng có kỳ hạn (quarterly)
    private static final String CONTRACT_TYPE_PERPETUAL = "PERPETUAL";

    private static final Set<String> TOP_FUTURES_SYMBOLS = Set.of(
            "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT",
            "ADAUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT", "LTCUSDT", "TRXUSDT",
            "MATICUSDT", "ATOMUSDT", "NEARUSDT", "APTUSDT", "ARBUSDT", "OPUSDT"
    );


    // (admin chỉnh được qua UI) nếu cần thay đổi theo VIP tier sau này.
    private static final BigDecimal DEFAULT_MAKER_FEE = new BigDecimal("0.0002"); // 0.02%
    private static final BigDecimal DEFAULT_TAKER_FEE = new BigDecimal("0.0004"); // 0.04%
    private static final BigDecimal DEFAULT_MAX_LEVERAGE = new BigDecimal("200");
    private static final int DEFAULT_FUNDING_FREQUENCY_HOURS = 8;

    @PostConstruct
    @Transactional
    public void syncOnStartup() {
        syncFuturesInstrumentsFromBinance();
    }

    // Đòn bẩy/quy chuẩn giá thay đổi không thường xuyên -> đồng bộ lại mỗi 6 tiếng là đủ, tránh spam API Binance
    @Scheduled(fixedDelay = 6 * 60 * 60 * 1000)
    @Transactional
    public void scheduledSync() {
        syncFuturesInstrumentsFromBinance();
    }

    private void syncFuturesInstrumentsFromBinance() {
        log.info("Bắt đầu đồng bộ danh sách Futures Instrument từ Binance...");

        BinanceFuturesExchangeInfoResponse response;
        try {
            response = restTemplate.getForObject(BINANCE_FUTURES_EXCHANGE_INFO_URL, BinanceFuturesExchangeInfoResponse.class);
        } catch (Exception e) {
            log.error("Lỗi khi gọi Binance Futures exchangeInfo: ", e);
            throw new ExternalApiException("Không thể đồng bộ Futures instrument từ Binance", e);
        }

        if (response == null || response.getSymbols() == null) {
            log.warn("Không nhận được dữ liệu symbols từ Binance Futures!");
            return;
        }

        int upserted = 0;

        for (BinanceFuturesSymbol bs : response.getSymbols()) {
            if (!TOP_FUTURES_SYMBOLS.contains(bs.getSymbol())) continue;
            if (!CONTRACT_TYPE_PERPETUAL.equals(bs.getContractType())) continue;

            // =========================================================================
            // 1. THÊM TẠI ĐÂY: Nếu DB đã có cặp coin này rồi -> BỎ QUA LUÔN
            // =========================================================================
            if (futuresInstrumentRepository.existsById(bs.getSymbol())) {
                continue;
            }

            // 2. Chỉ chạy xuống đây khi là CẶP COIN MỚI TINH (lần đầu khởi chạy)
            FuturesInstrument instrument = FuturesInstrument.builder()
                    .symbol(bs.getSymbol())
                    .baseAsset(bs.getBaseAsset())                     // THÊM: "BTC", "ETH" để load icon
                    .quoteAsset(bs.getQuoteAsset())                   // THÊM: "USDT"
                    .marginCurrencyShortName(bs.getQuoteAsset())
                    .kind("perpetual")
                    .makerFee(DEFAULT_MAKER_FEE)
                    .takerFee(DEFAULT_TAKER_FEE)
                    .maxLeverageLong(DEFAULT_MAX_LEVERAGE)
                    .maxLeverageShort(DEFAULT_MAX_LEVERAGE)
                    .fundingFrequency(DEFAULT_FUNDING_FREQUENCY_HOURS)
                    .status("TRADING".equals(bs.getStatus()) ? "active" : "inactive")
                    .maintenanceMarginRate(new BigDecimal("0.005")) // Mặc định 0.5%
                    .build();

            applyFilters(instrument, bs.getFilters());

            futuresInstrumentRepository.save(instrument);
            upserted++;
        }


        log.info("Đã đồng bộ {} Futures instrument mới từ Binance!", upserted);
    }



    private void applyFilters(FuturesInstrument instrument, List<Map<String, String>> filters) {
        if (filters == null) return;

        for (Map<String, String> filter : filters) {
            String type = filter.get("filterType");

            if ("PRICE_FILTER".equals(type)) {
                instrument.setMinPrice(toBigDecimal(filter.get("minPrice")));
                instrument.setMaxPrice(toBigDecimal(filter.get("maxPrice")));
                instrument.setPriceIncrement(toBigDecimal(filter.get("tickSize")));
            }

            if ("LOT_SIZE".equals(type)) {
                instrument.setQuantityIncrement(toBigDecimal(filter.get("stepSize")));
            }

            // Futures dùng "MIN_NOTIONAL" (khác Spot dùng "NOTIONAL")
            if ("MIN_NOTIONAL".equals(type)) {
                instrument.setMinNotional(toBigDecimal(filter.get("notional")));
            }
        }
    }

    private BigDecimal toBigDecimal(String value) {
        return value != null ? new BigDecimal(value) : null;
    }

    public BigDecimal getMarkPrice(String symbol) {
        BigDecimal price = marketPriceCache.getMarkPrice(symbol);

        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            price = marketService.getCurrentPrice(symbol);
            if(price != null && price.compareTo(BigDecimal.ZERO) > 0) {
                return price;
            }
            log.error("⚠️ Không có giá realtime cho {} trong MarketPriceCache", symbol);
            throw new RuntimeException("Hệ thống chưa có giá thị trường cho " + symbol + ", vui lòng thử lại sau ít giây.");
        }
        return price;
    }
}