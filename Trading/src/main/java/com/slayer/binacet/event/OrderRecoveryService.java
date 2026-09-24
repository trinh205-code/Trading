package com.slayer.binacet.event;

import com.slayer.binacet.Enums.OrderStatus;
import com.slayer.binacet.dto.event.OrderEvent;
import com.slayer.binacet.entity.Order;
import com.slayer.binacet.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderRecoveryService {

    private final OrderRepository orderRepository;
    private final OrderProducer orderProducer;

    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void recoverStuckOrders() {
        try {
            // Chờ 5 giây để WebSocket kết nối và cache có giá trước
            Thread.sleep(3000);
        } catch (InterruptedException ignored) {}

        log.info("🔍 [RECOVERY] Đang quét Database để tìm các lệnh bị kẹt...");

        List<Order> stuckOrders = orderRepository.findByStatusIn(List.of(OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED));

        if (stuckOrders.isEmpty()) {
            log.info("✅ [RECOVERY] Tuyệt vời! Không có lệnh nào bị kẹt.");
            return;
        }

        log.warn("⚠️ [RECOVERY] Phát hiện {} lệnh đang bị kẹt. Đẩy vào Kafka để xử lý lại...", stuckOrders.size());

        for (Order order : stuckOrders) {
            OrderEvent event = OrderEvent.builder()
                    .orderId(order.getId())
                    .symbol(order.getMarket().getSymbol())
                    .side(order.getSide())
                    .price(order.getPricePerUnit())
                    .quantity(order.getTotalQuantity())
                    .remainingQuantity(order.getRemainingQuantity())
                    .timestamp(Instant.now())
                    .action("RECOVER")
                    .build();

            orderProducer.sendOrderToQueue(event);
        }
    }
}