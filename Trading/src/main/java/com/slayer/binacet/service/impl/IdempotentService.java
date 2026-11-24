package com.slayer.binacet.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotentService {

    private final StringRedisTemplate redisTemplate;

    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_PROCESSED = "PROCESSED";

    public boolean tryAcquired(String key, Duration processingTimeout) {
        boolean success = redisTemplate.opsForValue().setIfAbsent(key, STATUS_PROCESSING, processingTimeout);

        return Boolean.TRUE.equals(success);
    }

    public boolean isAlreadyProcessed(String key) {
        String status = redisTemplate.opsForValue().get(key);
        return STATUS_PROCESSED.equals(status);
    }

    public void markProcessed(String key, Duration retainDuration) {
        redisTemplate.opsForValue().set(key, STATUS_PROCESSED, retainDuration);
    }

    public void release(String key) {
        redisTemplate.delete(key);
    }


}
