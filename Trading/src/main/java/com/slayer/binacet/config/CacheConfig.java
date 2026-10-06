package com.slayer.binacet.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**

 * Cache name must match the value used in @Cacheable("marketTickers") on MarketServiceImpl.
 * TTL is intentionally short (5s) — this is live market data, not something that should be
 * cached for minutes. Its only job is to absorb bursts of concurrent requests hitting the
 * same symbol within the same second, not to serve stale prices.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("marketTickers");
        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(5, TimeUnit.SECONDS)
                .maximumSize(100));
        return manager;
    }
}
