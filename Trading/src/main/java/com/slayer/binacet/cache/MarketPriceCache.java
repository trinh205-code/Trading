package com.slayer.binacet.cache;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class MarketPriceCache {

    public static final String REDIS_HASH_LAST_PRICES = "market:last_price";
    public static final String REDIS_HASH_MARK_PRICES = "market:mark_price";

    // 1. L1 Cache: In-memory ConcurrentHashMap để truy xuất siêu tốc (sub-microsecond)
    private final ConcurrentHashMap<String, BigDecimal> lastPrices = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, BigDecimal> markPrices = new ConcurrentHashMap<>();

    // 2. L2 Cache: Redis lưu trữ phân tán cho multi-instance & giữ giá khi khởi động lại
    private final StringRedisTemplate redisTemplate;

    public MarketPriceCache(@Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // ==========================================
    // CÁC HÀM XỬ LÝ LAST PRICE
    // ==========================================
    public void updateLastPrice(String symbol, BigDecimal price) {
        if (symbol == null || price == null) return;
        String sym = symbol.toUpperCase();
        lastPrices.put(sym, price);

        if (redisTemplate != null) {
            try {
                redisTemplate.opsForHash().put(REDIS_HASH_LAST_PRICES, sym, price.toPlainString());
            } catch (IllegalStateException e) {
                // Xảy ra khi Spring context đang đóng hoặc restart (LettuceConnectionFactory destroyed)
                log.debug("Redis connection factory đã đóng khi tắt ứng dụng: {}", e.getMessage());
            } catch (Exception e) {
                log.warn("Không thể ghi Last Price lên Redis cho {}: {}", sym, e.getMessage());
            }
        }
    }

    public BigDecimal getLastPrice(String symbol) {
        if (symbol == null) return null;
        String sym = symbol.toUpperCase();

        BigDecimal price = lastPrices.get(sym);
        if (price != null) {
            return price;
        }

        // Fallback L2: Đọc từ Redis nếu L1 chưa có (sau restart)
        if (redisTemplate != null) {
            try {
                Object val = redisTemplate.opsForHash().get(REDIS_HASH_LAST_PRICES, sym);
                if (val != null) {
                    BigDecimal redisPrice = new BigDecimal(val.toString());
                    lastPrices.put(sym, redisPrice);
                    return redisPrice;
                }
            } catch (Exception e) {
                log.warn("Không thể đọc Last Price từ Redis cho {}: {}", sym, e.getMessage());
            }
        }

        return null;
    }

    // ==========================================
    // CÁC HÀM XỬ LÝ MARK PRICE
    // ==========================================
    public void updateMarkPrice(String symbol, BigDecimal price) {
        if (symbol == null || price == null) return;
        String sym = symbol.toUpperCase();
        markPrices.put(sym, price);

        if (redisTemplate != null) {
            try {
                redisTemplate.opsForHash().put(REDIS_HASH_MARK_PRICES, sym, price.toPlainString());
            } catch (IllegalStateException e) {
                // Xảy ra khi Spring context đang đóng hoặc restart
                log.debug("Redis connection factory đã đóng khi tắt ứng dụng: {}", e.getMessage());
            } catch (Exception e) {
                log.warn("Không thể ghi Mark Price lên Redis cho {}: {}", sym, e.getMessage());
            }
        }
    }

    public BigDecimal getMarkPrice(String symbol) {
        if (symbol == null) return null;
        String sym = symbol.toUpperCase();

        BigDecimal markPrice = markPrices.get(sym);
        if (markPrice != null) {
            return markPrice;
        }

        // Fallback L2: Đọc từ Redis
        if (redisTemplate != null) {
            try {
                Object val = redisTemplate.opsForHash().get(REDIS_HASH_MARK_PRICES, sym);
                if (val != null) {
                    BigDecimal redisPrice = new BigDecimal(val.toString());
                    markPrices.put(sym, redisPrice);
                    return redisPrice;
                }
            } catch (Exception e) {
                log.warn("Không thể đọc Mark Price từ Redis cho {}: {}", sym, e.getMessage());
            }
        }

        log.info("markPrice is null {}", sym);
        return getLastPrice(sym);
    }
}
