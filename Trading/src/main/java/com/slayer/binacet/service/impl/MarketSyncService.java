package com.slayer.binacet.service.impl;

import com.slayer.binacet.dto.response.BinanceExchangeInfoResponse;
import com.slayer.binacet.dto.response.BinanceSymbol;
import com.slayer.binacet.entity.Market;
import com.slayer.binacet.repository.MarketRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketSyncService {

    private final RestTemplate restTemplate;
    private final MarketRepository marketRepository;

    private static final String BINANCE_EXCHANGE_INFO_URL = "https://api.binance.com/api/v3/exchangeInfo";

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

                // CHỈ LẤY NHỮNG COIN NẰM TRONG DANH SÁCH TOP 50
                if (!TOP_50_COINS.contains(bs.getSymbol())) {
                    continue;
                }

                Market market = new Market();
                market.setSymbol(bs.getSymbol());
                market.setPair(bs.getBaseAsset() + "/" + bs.getQuoteAsset());
                market.setBaseCurrencyShortName(bs.getBaseAsset());
                market.setTargetCurrencyShortName(bs.getQuoteAsset());
                market.setStatus(bs.getStatus());

                for (Map<String, Object> filter : bs.getFilters()) {
                    // 1. Dùng String.valueOf() để ép Object thành String an toàn
                    String filterType = String.valueOf(filter.get("filterType"));

                    if ("PRICE_FILTER".equals(filterType)) {
                        // 2. Chuyển Object -> String -> BigDecimal
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

                    // Ghi chú: Binance có 2 bộ lọc là NOTIONAL và MIN_NOTIONAL tùy vào cặp coin
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
}
