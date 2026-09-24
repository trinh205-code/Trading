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
public class FuturesOrderProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    public static final String FUTURES_ORDER_TOPIC = "futures-orders";

    public void sendOrderToQueue(OrderEvent event) {
        Runnable sendTask = () -> {
            // Dùng symbol làm key -> Kafka đảm bảo mọi event cùng symbol xử lý theo đúng thứ tự (FIFO)
            kafkaTemplate.send(FUTURES_ORDER_TOPIC, event.getSymbol(), event)
                    .whenComplete((res, ex) -> {
                        if (ex == null) {
                            log.info("📥 [KAFKA] Đã đẩy Futures Order [{}] vào topic {} partition {}",
                                    event.getOrderId(), FUTURES_ORDER_TOPIC, res.getRecordMetadata().partition());
                        } else {
                            log.error("❌ Lỗi khi gửi Futures Order vào Kafka: {}", ex.getMessage());
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