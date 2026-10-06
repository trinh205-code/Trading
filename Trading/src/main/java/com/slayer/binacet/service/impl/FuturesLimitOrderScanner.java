package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.FuturesOrderStatus;
import com.slayer.binacet.Enums.FuturesOrderType;
import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.dto.event.OrderEvent;
import com.slayer.binacet.entity.FuturesOrder;
import com.slayer.binacet.event.FuturesOrderProducer;
import com.slayer.binacet.mapper.OrderEventMapper;
import com.slayer.binacet.repository.FuturesOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Quét định kỳ các lệnh Futures LIMIT đang chờ (OPEN/PARTIALLY_FILLED), kiểm tra điều kiện
 * giá so với MarketPriceCache. Nếu đủ điều kiện, đẩy vào Kafka để FuturesOrderConsumer gọi
 * matchFuturesOrder() xử lý khớp thật.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FuturesLimitOrderScanner {

    private static final List<FuturesOrderStatus> PENDING_STATUSES =
            List.of(FuturesOrderStatus.OPEN, FuturesOrderStatus.PARTIALLY_FILLED);

    private final FuturesOrderRepository orderRepository;
    private final MarketPriceCache marketPriceCache;
    private final FuturesOrderProducer futuresOrderProducer;
    private final OrderEventMapper orderEventMapper;

    @Scheduled(fixedDelay = 2000) // quét mỗi 2 giây — phản ứng nhanh với biến động giá
    public void scanPendingLimitOrders() {
        List<FuturesOrder> pendingOrders = orderRepository.findByOrderTypeAndStatusIn(
                FuturesOrderType.LIMIT, PENDING_STATUSES);

        for (FuturesOrder order : pendingOrders) {
            try {
                String symbol = order.getInstrument().getSymbol();
                BigDecimal markPrice = marketPriceCache.getMarkPrice(symbol);
                if (markPrice == null || markPrice.compareTo(BigDecimal.ZERO) <= 0) continue;

                boolean shouldTrigger = (order.getSide() == OrderSide.BUY && order.getPrice().compareTo(markPrice) >= 0)
                        || (order.getSide() == OrderSide.SELL && order.getPrice().compareTo(markPrice) <= 0);

                if (shouldTrigger) {
                    log.info("Lệnh LIMIT {} đủ điều kiện khớp (giá đặt={}, giá thị trường={})",
                            order.getId(), order.getPrice(), markPrice);

                    OrderEvent event = orderEventMapper.toFuturesOrderEvent(order, "TRIGGER");

                    futuresOrderProducer.sendOrderToQueue(event);
                }
            } catch (Exception e) {
                // Lỗi ở 1 lệnh không được làm dừng cả vòng quét — các lệnh khác vẫn cần được kiểm tra.
                log.error("Lỗi khi quét lệnh LIMIT {}: ", order.getId(), e);
            }
        }
    }
}