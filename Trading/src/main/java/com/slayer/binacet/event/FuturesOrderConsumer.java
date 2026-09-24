package com.slayer.binacet.event;

import com.slayer.binacet.dto.event.OrderEvent;
import com.slayer.binacet.service.impl.FuturesMatchingServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class FuturesOrderConsumer {

    private final FuturesMatchingServiceImpl matchingEngineService;

    @KafkaListener(topics = "futures-orders", groupId = "futures-matching-engine-group")
    public void consumeOrder(OrderEvent event) {
        log.info("⚙️ Kafka Consumer đang xử lý Futures Order: {} [{}] - Action: {}",
                event.getOrderId(), event.getSymbol(), event.getAction());
        try {
            matchingEngineService.matchFuturesOrder(event.getOrderId());
        } catch (Exception e) {
            log.error("Lỗi khi xử lý Futures Order {}: {}", event.getOrderId(), e.getMessage(), e);
        }
    }
}