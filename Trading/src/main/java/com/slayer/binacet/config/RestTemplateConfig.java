package com.slayer.binacet.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * If a RestTemplate bean already exists elsewhere in the project, delete this class instead of
 * keeping two — Spring will fail to start with a "no qualifying bean" / ambiguity error, or
 * silently wire the wrong one depending on @Primary usage.
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .connectTimeout(Duration.ofSeconds(3))  // time to establish the TCP connection to Binance
                .readTimeout(Duration.ofSeconds(5))     // time to wait for the response body once connected
                .build();
    }
}
