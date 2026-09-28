package com.slayer.binacet.service.impl;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.slayer.binacet.dto.response.ExchangeRateResponse;
import com.slayer.binacet.service.ExchangeRateService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExchangeRateServiceImpl implements ExchangeRateService {

    private final RestTemplate restTemplate;

    private static final BigDecimal DEFAULT_RATE = new BigDecimal("26000");
    private final AtomicReference<BigDecimal> currentRate = new AtomicReference<>(DEFAULT_RATE);
    private final AtomicReference<String> currentSource = new AtomicReference<>("Default");
    private final AtomicReference<LocalDateTime> lastUpdated = new AtomicReference<>(LocalDateTime.now());


    private static final String BINANCE_P2P_URL = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";
    private static final String COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd";
    private static final String OPEN_ER_URL = "https://open.er-api.com/v6/latest/USD";

    @PostConstruct
    public void init() {
        updateExchangeRate();
    }

    /**
     * Tự động cập nhật tỷ giá USDT/VND theo thời gian thực mỗi 600 giây.
     */
    @Scheduled(fixedRate = 600000)
    public void updateExchangeRate() {
        if (fetchFromBinanceP2P()) {
            return;
        }
        if (fetchFromCoinGecko()) {
            return;
        }
        fetchFromOpenEr();
    }

    private boolean fetchFromBinanceP2P() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            headers.set("Accept", "application/json");

            JsonObject requestBody = new JsonObject();
            requestBody.addProperty("asset", "USDT");
            requestBody.addProperty("fiat", "VND");
            requestBody.addProperty("tradeType", "BUY");
            requestBody.addProperty("page", 1);
            requestBody.addProperty("rows", 3);

            HttpEntity<String> entity = new HttpEntity<>(requestBody.toString(), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(BINANCE_P2P_URL, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonObject json = JsonParser.parseString(response.getBody()).getAsJsonObject();
                if (json.has("data") && json.get("data").isJsonArray()) {
                    JsonArray data = json.getAsJsonArray("data");
                    if (data.size() > 0) {
                        JsonObject firstAdv = data.get(0).getAsJsonObject();
                        if (firstAdv.has("adv")) {
                            JsonObject adv = firstAdv.getAsJsonObject("adv");
                            if (adv.has("price")) {
                                String priceStr = adv.get("price").getAsString();
                                BigDecimal price = new BigDecimal(priceStr).setScale(0, RoundingMode.HALF_UP);
                                if (isValidRate(price)) {
                                    applyRate(price, "Binance P2P Real-time");
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Không thể lấy tỷ giá từ Binance P2P: {}", e.getMessage());
        }
        return false;
    }

    private boolean fetchFromCoinGecko() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(COINGECKO_URL, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonObject json = JsonParser.parseString(response.getBody()).getAsJsonObject();
                if (json.has("tether")) {
                    JsonObject tether = json.getAsJsonObject("tether");
                    if (tether.has("vnd")) {
                        BigDecimal price = tether.get("vnd").getAsBigDecimal().setScale(0, RoundingMode.HALF_UP);
                        if (isValidRate(price)) {
                            applyRate(price, "CoinGecko Real-time");
                            return true;
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Không thể lấy tỷ giá từ CoinGecko: {}", e.getMessage());
        }
        return false;
    }

    private boolean fetchFromOpenEr() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(OPEN_ER_URL, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonObject json = JsonParser.parseString(response.getBody()).getAsJsonObject();
                if (json.has("rates")) {
                    JsonObject rates = json.getAsJsonObject("rates");
                    if (rates.has("VND")) {
                        BigDecimal price = rates.get("VND").getAsBigDecimal().setScale(0, RoundingMode.HALF_UP);
                        if (isValidRate(price)) {
                            applyRate(price, "Open Exchange Rates");
                            return true;
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Không thể lấy tỷ giá từ Open ER: {}", e.getMessage());
        }
        return false;
    }

    private boolean isValidRate(BigDecimal rate) {
        // Tỷ giá USDT/VND hợp lý nằm trong khoảng từ 20,000 đến 35,000 VND
        return rate != null && rate.compareTo(new BigDecimal("20000")) > 0 && rate.compareTo(new BigDecimal("35000")) < 0;
    }

    private void applyRate(BigDecimal newRate, String source) {
        currentRate.set(newRate);
        currentSource.set(source);
        lastUpdated.set(LocalDateTime.now());
        log.info("Cập nhật tỷ giá USDT/VND thời gian thực: {} VND (Nguồn: {})", newRate, source);
    }

    @Override
    public BigDecimal getUsdtToVndRate() {
        return currentRate.get();
    }

    @Override
    public ExchangeRateResponse getRateResponse() {
        return ExchangeRateResponse.builder()
                .symbol("USDT/VND")
                .rate(currentRate.get())
                .source(currentSource.get())
                .updatedAt(lastUpdated.get())
                .build();
    }
}
