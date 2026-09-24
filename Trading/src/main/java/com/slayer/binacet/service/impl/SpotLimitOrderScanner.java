package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.Enums.OrderStatus;
import com.slayer.binacet.Enums.OrderType;
import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.entity.Order;
import com.slayer.binacet.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Quét định kỳ các lệnh Spot LIMIT đang chờ khớp (NEW / PARTIALLY_FILLED).
 * Khi giá thị trường chạm hoặc vượt mức giá đặt, tự động gọi LiveMatchingEngine để khớp lệnh.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SpotLimitOrderScanner {

    private static final List<OrderStatus> PENDING_STATUSES =
            List.of(OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED);

    private final OrderRepository orderRepository;
    private final MarketPriceCache marketPriceCache;
    private final MarketServiceImpl marketService;
    private final LiveMatchingEngine liveMatchingEngine;

    @Scheduled(fixedDelay = 10000) // quét mỗi 2 giây để phản ứng tức thì với biến động giá
    public void scanPendingSpotLimitOrders() {
        List<Order> pendingOrders = orderRepository.findByStatusIn(PENDING_STATUSES);

        for (Order order : pendingOrders) {
            try {
                if (order.getOrderType() != OrderType.LIMIT) continue;

                String symbol = order.getMarket().getSymbol();
                BigDecimal currentPrice = marketPriceCache.getMarkPrice(symbol);
                if (currentPrice == null || currentPrice.compareTo(BigDecimal.ZERO) <= 0) {
                    currentPrice = marketService.getCurrentPrice(symbol);
                }
                if (currentPrice == null || currentPrice.compareTo(BigDecimal.ZERO) <= 0) continue;

                boolean shouldTrigger = (order.getSide() == OrderSide.BUY && order.getPricePerUnit().compareTo(currentPrice) >= 0)
                        || (order.getSide() == OrderSide.SELL && order.getPricePerUnit().compareTo(currentPrice) <= 0);

                if (shouldTrigger) {
                    log.info("🎯 Lệnh Spot LIMIT {} đủ điều kiện khớp (Side={}, Giá đặt={}, Giá thị trường={})",
                            order.getId(), order.getSide(), order.getPricePerUnit(), currentPrice);

                    liveMatchingEngine.matchSingleOrder(order.getId());
                }
            } catch (Exception e) {
                log.error("Lỗi khi quét lệnh Spot LIMIT {}: ", order.getId(), e);
            }
        }
    }
}
