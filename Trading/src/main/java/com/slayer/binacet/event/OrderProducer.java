package com.slayer.binacet.event;

import com.slayer.binacet.dto.event.OrderEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    public static final String SPOT_ORDER_TOPIC = "spot-order-events";

    public void sendOrderToQueue(OrderEvent event) {
        Runnable sendTask = () -> {
            // Dùng symbol làm key để bảo đảm thứ tự khớp lệnh FIFO theo từng cặp coin
            kafkaTemplate.send(SPOT_ORDER_TOPIC, event.getSymbol(), event)
                    .whenComplete((res, ex) -> {
                        if (ex == null) {
                            log.info("[KAFKA] Đã đẩy Order [{}] vào topic {} partition {}",
                                    event.getOrderId(), SPOT_ORDER_TOPIC, res.getRecordMetadata().partition());
                        } else {
                            log.error("Lỗi khi gửi Order vào Kafka: {}", ex.getMessage());
                        }
                    });
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendTask.run();
                }
            });
        } else {
            sendTask.run();
        }
    }
}