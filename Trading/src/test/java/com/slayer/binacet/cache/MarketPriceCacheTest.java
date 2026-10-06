package com.slayer.binacet.cache;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketPriceCacheTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private HashOperations<String, Object, Object> hashOperations;

    private MarketPriceCache cacheWithRedis;
    private MarketPriceCache cacheWithoutRedis;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        cacheWithRedis = new MarketPriceCache(redisTemplate);
        cacheWithoutRedis = new MarketPriceCache(null);
    }

    @Test
    @DisplayName("updateLastPrice & getLastPrice: Lưu và đọc trực tiếp từ L1 cache")
    void testLastPrice_L1Cache() {
        cacheWithoutRedis.updateLastPrice("btcusdt", new BigDecimal("50000.50"));

        BigDecimal price = cacheWithoutRedis.getLastPrice("BTCUSDT");

        assertNotNull(price);
        assertEquals(new BigDecimal("50000.50"), price);
    }

    @Test
    @DisplayName("updateLastPrice: Đồng bộ giá lên Redis Hash khi có redisTemplate")
    void testLastPrice_SyncsToRedis() {
        cacheWithRedis.updateLastPrice("ETHUSDT", new BigDecimal("3000.00"));

        verify(hashOperations).put(MarketPriceCache.REDIS_HASH_LAST_PRICES, "ETHUSDT", "3000.00");
        assertEquals(new BigDecimal("3000.00"), cacheWithRedis.getLastPrice("ETHUSDT"));
    }

    @Test
    @DisplayName("getLastPrice: Fallback đọc từ Redis khi L1 cache chưa có giá")
    void testLastPrice_FallbackToRedis() {
        when(hashOperations.get(MarketPriceCache.REDIS_HASH_LAST_PRICES, "SOLUSDT"))
                .thenReturn("150.25");

        BigDecimal price = cacheWithRedis.getLastPrice("SOLUSDT");

        assertNotNull(price);
        assertEquals(new BigDecimal("150.25"), price);
        // Lần thứ 2 đọc trực tiếp từ L1 đã được nạp
        assertEquals(new BigDecimal("150.25"), cacheWithRedis.getLastPrice("SOLUSDT"));
        verify(hashOperations, times(1)).get(MarketPriceCache.REDIS_HASH_LAST_PRICES, "SOLUSDT");
    }

    @Test
    @DisplayName("updateMarkPrice & getMarkPrice: Lưu và đọc từ L1 cache và đồng bộ Redis")
    void testMarkPrice_L1AndRedis() {
        cacheWithRedis.updateMarkPrice("BTCUSDT", new BigDecimal("50100.00"));

        verify(hashOperations).put(MarketPriceCache.REDIS_HASH_MARK_PRICES, "BTCUSDT", "50100.00");
        assertEquals(new BigDecimal("50100.00"), cacheWithRedis.getMarkPrice("BTCUSDT"));
    }

    @Test
    @DisplayName("getMarkPrice: Fallback đọc từ Redis khi L1 cache chưa có")
    void testMarkPrice_FallbackToRedis() {
        when(hashOperations.get(MarketPriceCache.REDIS_HASH_MARK_PRICES, "BTCUSDT"))
                .thenReturn("50200.00");

        BigDecimal price = cacheWithRedis.getMarkPrice("BTCUSDT");

        assertNotNull(price);
        assertEquals(new BigDecimal("50200.00"), price);
    }

    @Test
    @DisplayName("Redis Exception: Không làm gián đoạn hệ thống khi Redis gặp lỗi kết nối")
    void testRedisException_HandledGracefully() {
        doThrow(new RuntimeException("Redis connection refused"))
                .when(hashOperations).put(any(), any(), any());

        assertDoesNotThrow(() ->
                cacheWithRedis.updateLastPrice("BTCUSDT", new BigDecimal("50000")));

        assertEquals(new BigDecimal("50000"), cacheWithRedis.getLastPrice("BTCUSDT"));
    }
}
