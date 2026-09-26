package com.slayer.binacet.service;


import com.slayer.binacet.dto.event.OrderEvent;
import com.slayer.binacet.service.impl.FuturesMatchingServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class FuturesOrderBookService {

    // Map chứa Order Book cho từng cặp Coin (Ví dụ: BTCUSDT -> OrderBook)
    private final Map<String, OrderBook> orderBooks = new ConcurrentHashMap<>();

    private final FuturesMatchingServiceImpl matchingEngineService;

    // Vô hiệu hoá @KafkaListener ở đây vì Futures sử dụng mô hình khớp theo Binance Live Price Cache
    // qua FuturesOrderConsumer + FuturesLimitOrderScanner. Việc bật đồng thời cả 2 listener với groupId khác nhau
    // dẫn tới 1 lệnh bị khớp kép (double-fill) và khớp với lệnh cũ tồn dư trong bộ nhớ RAM chưa bị dọn dẹp.
    // @KafkaListener(topics = "futures-orders", groupId = "matching-engine-group")
    public void consumeOrderEvent(OrderEvent event) {
        log.info("Nhận sự kiện từ Kafka: {} lệnh {}", event.getAction(), event.getOrderId());

        OrderBook book = orderBooks.computeIfAbsent(event.getSymbol(), k -> new OrderBook());

        if ("CREATE".equals(event.getAction())) {
            book.addOrder(event);
            matchOrders(book, event.getSymbol());
        } else if ("CANCEL".equals(event.getAction())) {
            book.removeOrder(event);
        }
    }

    private void matchOrders(OrderBook book, String symbol) {
        // Chạy vòng lặp liên tục chừng nào Sổ lệnh vẫn còn cả người Mua và Bán
        while (!book.bids.isEmpty() && !book.asks.isEmpty()) {

            // 1. Lấy ra người MUA trả giá CAO NHẤT (Đỉnh cây Bids)
            Map.Entry<BigDecimal, Queue<OrderEvent>> maxBidEntry = book.bids.firstEntry();
            BigDecimal maxBidPrice = maxBidEntry.getKey();
            Queue<OrderEvent> bidQueue = maxBidEntry.getValue();
            OrderEvent bestBid = bidQueue.peek();

            // 2. Lấy ra người BÁN rao giá RẺ NHẤT (Đáy cây Asks)
            Map.Entry<BigDecimal, Queue<OrderEvent>> minAskEntry = book.asks.firstEntry();
            BigDecimal minAskPrice = minAskEntry.getKey();
            Queue<OrderEvent> askQueue = minAskEntry.getValue();
            OrderEvent bestAsk = askQueue.peek();

            // 3. ĐIỀU KIỆN KHỚP LỆNH: Giá mua cao hơn hoặc bằng Giá bán
            if (maxBidPrice.compareTo(minAskPrice) >= 0) {

                // Khối lượng khớp = Số nhỏ hơn giữa (Lượng người mua cần) và (Lượng người bán có)
                BigDecimal matchQuantity = bestBid.getRemainingQuantity().min(bestAsk.getRemainingQuantity());

                // Giá khớp = Giá của lệnh được đặt trước (Maker Price)
                BigDecimal matchPrice = bestBid.getTimestamp().isBefore(bestAsk.getTimestamp())
                        ? maxBidPrice : minAskPrice;

                log.info("💥 KHỚP LỆNH LIMIT: Mua {} - Bán {} | SL: {} | Giá: {}",
                        bestBid.getOrderId(), bestAsk.getOrderId(), matchQuantity, matchPrice);

                // 4. Gửi thông tin sang Database Service để trừ tiền, cộng Vị thế (Bất đồng bộ)
                matchingEngineService.executeMatchedLimitOrders(bestBid, bestAsk, matchQuantity, matchPrice);

                // 5. Cập nhật lại số lượng dư trên RAM
                bestBid.setRemainingQuantity(bestBid.getRemainingQuantity().subtract(matchQuantity));
                bestAsk.setRemainingQuantity(bestAsk.getRemainingQuantity().subtract(matchQuantity));

                // 6. Xóa lệnh khỏi Sổ nếu đã khớp hết 100%
                if (bestBid.getRemainingQuantity().compareTo(BigDecimal.ZERO) == 0) {
                    bidQueue.poll();
                    if (bidQueue.isEmpty()) book.bids.remove(maxBidPrice);
                }

                if (bestAsk.getRemainingQuantity().compareTo(BigDecimal.ZERO) == 0) {
                    askQueue.poll();
                    if (askQueue.isEmpty()) book.asks.remove(minAskPrice);
                }

            } else {
                // Giá Mua cao nhất vẫn thấp hơn Giá Bán rẻ nhất -> Thoát vòng lặp, chờ lệnh mới
                break;
            }
        }
    }


    private static class OrderBook {
        // Phe mua (Bids): Sắp xếp giá giảm dần (Mua giá cao xếp trước)
        TreeMap<BigDecimal, Queue<OrderEvent>> bids = new TreeMap<>(Collections.reverseOrder());

        // Phe bán (Asks): Sắp xếp giá tăng dần (Bán giá rẻ xếp trước)
        TreeMap<BigDecimal, Queue<OrderEvent>> asks = new TreeMap<>();

        void addOrder(OrderEvent order) {
            if (order.getSide().name().equals("BUY")) {
                bids.computeIfAbsent(order.getPrice(), k -> new LinkedList<>()).add(order);
            } else {
                asks.computeIfAbsent(order.getPrice(), k -> new LinkedList<>()).add(order);
            }
        }

        void removeOrder(OrderEvent order) {
            // Logic tìm và xóa lệnh khỏi TreeMap khi người dùng nhấn Hủy
        }
    }
}
