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
            log.warn("Không thể kết nối tới Binance Futures API ({}): {}. Sử dụng dữ liệu có sẵn trong hệ thống.",
                    BINANCE_FUTURES_EXCHANGE_INFO_URL, e.getMessage());
            initDefaultInstrumentsIfEmpty();
            return;
        }

        if (response == null || response.getSymbols() == null) {
            log.warn("Không nhận được dữ liệu symbols từ Binance Futures!");
            initDefaultInstrumentsIfEmpty();
            return;
        }

        int upserted = 0;

        for (BinanceFuturesSymbol bs : response.getSymbols()) {
            if (!TOP_FUTURES_SYMBOLS.contains(bs.getSymbol())) continue;
            if (!CONTRACT_TYPE_PERPETUAL.equals(bs.getContractType())) continue;

            if (futuresInstrumentRepository.existsById(bs.getSymbol())) {
                continue;
            }

            //  Chỉ chạy xuống đây khi là CẶP COIN MỚI TINH
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

    private void initDefaultInstrumentsIfEmpty() {
        if (futuresInstrumentRepository.count() > 0) {
            log.info("Database đã có {} Futures instrument sẵn có, tiếp tục khởi động bình thường.", futuresInstrumentRepository.count());
            return;
        }

        log.info("Khởi tạo danh sách Futures instrument mặc định do chưa thể kết nối Binance...");
        List<String> defaultSymbols = List.of(
                "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT"
        );
        for (String sym : defaultSymbols) {
            String base = sym.replace("USDT", "");
            FuturesInstrument instrument = FuturesInstrument.builder()
                    .symbol(sym)
                    .baseAsset(base)
                    .quoteAsset("USDT")
                    .marginCurrencyShortName("USDT")
                    .kind("perpetual")
                    .makerFee(DEFAULT_MAKER_FEE)
                    .takerFee(DEFAULT_TAKER_FEE)
                    .maxLeverageLong(DEFAULT_MAX_LEVERAGE)
                    .maxLeverageShort(DEFAULT_MAX_LEVERAGE)
                    .fundingFrequency(DEFAULT_FUNDING_FREQUENCY_HOURS)
                    .status("active")
                    .maintenanceMarginRate(new BigDecimal("0.005"))
                    .minPrice(new BigDecimal("0.01"))
                    .maxPrice(new BigDecimal("1000000"))
                    .priceIncrement(new BigDecimal("0.1"))
                    .quantityIncrement(new BigDecimal("0.001"))
                    .minNotional(new BigDecimal("5"))
                    .build();
            futuresInstrumentRepository.save(instrument);
        }
        log.info("Đã khởi tạo {} Futures instrument mặc định thành công!", defaultSymbols.size());
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
            log.error("Không có giá realtime cho {} trong MarketPriceCache", symbol);
            throw new RuntimeException("Hệ thống chưa có giá thị trường cho " + symbol + ", vui lòng thử lại sau ít giây.");
        }
        return price;
    }
}