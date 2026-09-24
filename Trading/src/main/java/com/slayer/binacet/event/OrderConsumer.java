package com.slayer.binacet.event;

import com.slayer.binacet.dto.event.OrderEvent;
import com.slayer.binacet.service.impl.FuturesMatchingServiceImpl;
import com.slayer.binacet.service.impl.LiveMatchingEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderConsumer {

    private final LiveMatchingEngine liveMatchingEngine;


    @KafkaListener(topics = "spot-order-events", groupId = "matching-engine-group")
    public void consumeOrder(OrderEvent event) {
        log.info("⚙️ Kafka Consumer đang xử lý Order: {} [{}] - Action: {}",
                event.getOrderId(), event.getSymbol(), event.getAction());
        try {
            // LiveMatchingEngine nhận thẳng event hoặc orderId để khớp lệnh
            liveMatchingEngine.matchSingleOrder(event.getOrderId());
        } catch (Exception e) {
            log.error("Lỗi khi xử lý Order {}: {}", event.getOrderId(), e.getMessage(), e);
        }
    }


}