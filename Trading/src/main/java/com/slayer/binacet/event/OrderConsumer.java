package com.slayer.binacet.event;

import com.slayer.binacet.dto.event.OrderEvent;
import com.slayer.binacet.service.impl.FuturesMatchingServiceImpl;
import com.slayer.binacet.service.impl.IdempotentService;
import com.slayer.binacet.service.impl.LiveMatchingEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderConsumer {

    private final LiveMatchingEngine liveMatchingEngine;
    private final IdempotentService idempotentService;

    @KafkaListener(topics = "spot-order-events", groupId = "matching-engine-group")
    public void consumeOrder(OrderEvent event) {

        String idempotentKey = new StringBuilder()
                .append("idempotent:spot:")
                .append(event.getOrderId())
                .append(":")
                .append(event.getAction())
                .toString();

        // kiem tra neu message da dc xu li xong tu truoc
        if(idempotentService.isAlreadyProcessed(idempotentKey)) {
            log.warn("Bỏ qua OrderEvent trùng lặp đã xử lý thành công: {}", idempotentKey);
            return;
        }

        // thu lock processing
        boolean acquired = idempotentService.tryAcquired(idempotentKey, Duration.ofSeconds(30));
        if(!acquired) {
            log.warn("OrderEvent đang được xử lý bởi instance khác: {}", idempotentKey);
            return;
        }
        try {
            // khớp
            liveMatchingEngine.matchSingleOrder(event.getOrderId());

            // hoàn thành
            idempotentService.markProcessed(idempotentKey, Duration.ofDays(1));
            log.info("xử lí thành công OrderEvent : {}", event.getOrderId());
            

        } catch (Exception e) {
            log.error("Lỗi khi xử lý Order {}: {}", event.getOrderId(), e.getMessage(), e);
            // giai phong lock de cho phep retry
            idempotentService.release(idempotentKey);
            throw e;
        }

    }


}