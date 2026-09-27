package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.Enums.OrderStatus;
import com.slayer.binacet.Enums.OrderType;
import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.entity.Order;
import com.slayer.binacet.repository.OrderRepository;
import com.slayer.binacet.service.TradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LiveMatchingEngine {

    private final OrderRepository orderRepository;
    private final WalletServiceImpl walletService;
    private final MarketPriceCache marketPriceCache;
    private final MarketServiceImpl marketService;

    // 1. Tiêm TradeService vào Engine
    private final TradeService tradeService;

    @Transactional
    public void matchSingleOrder(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Order"));

        if (order.getStatus() != OrderStatus.NEW && order.getStatus() != OrderStatus.PARTIALLY_FILLED) {
            return;
        }

        String symbol = order.getMarket().getSymbol();
        BigDecimal currentMarketPrice = marketPriceCache.getMarkPrice(symbol);


        if (currentMarketPrice == null || currentMarketPrice.compareTo(BigDecimal.ZERO) <= 0) {
            currentMarketPrice = marketService.getCurrentPrice(symbol);
        }


        if (currentMarketPrice == null) {
            throw new RuntimeException("Chưa lấy được giá thị trường cho cặp " + symbol + ", tạm hoãn khớp lệnh " + order.getId());
        }

        boolean shouldFill = false;

        // Logic kiểm tra điều kiện khớp lệnh
        if (order.getOrderType() == OrderType.MARKET) {
            shouldFill = true;
        } else {
            if (order.getSide() == OrderSide.BUY && order.getPricePerUnit().compareTo(currentMarketPrice) >= 0) {
                shouldFill = true;
            } else if (order.getSide() == OrderSide.SELL && order.getPricePerUnit().compareTo(currentMarketPrice) <= 0) {
                shouldFill = true;
            }
        }

        // Nếu đủ điều kiện thì tiến hành thanh toán
        if (shouldFill) {
            processFill(order, currentMarketPrice);
        } else {
            log.info("Lệnh {} chưa đủ điều kiện khớp. Giá mong muốn: {}, Giá thị trường: {}",
                    order.getId(), order.getPricePerUnit(), currentMarketPrice);
        }
    }

    private static final BigDecimal FEE_RATE = new BigDecimal("0.001"); // 0.1% phí Spot chuẩn Binance

    public void processFill(Order order, BigDecimal fillPrice) {
        BigDecimal matchedQuantity = order.getRemainingQuantity();
        BigDecimal actualUsdtValue = matchedQuantity.multiply(fillPrice);

        String baseAsset = order.getMarket().getBaseCurrencyShortName();   // BTC
        String targetAsset = order.getMarket().getTargetCurrencyShortName(); // USDT
        String userId = order.getUser().getId();

        if (order.getSide() == OrderSide.BUY) {
            // -- LỆNH MUA --
            BigDecimal lockedUsdtValue = order.getLockedAmount();

            // Trừ sạch phần tiền đã khóa
            walletService.deductLockedBalance(userId, targetAsset, lockedUsdtValue);

            // Tính tiền thừa và hoàn trả (Refund)
            BigDecimal refundAmount = lockedUsdtValue.subtract(actualUsdtValue);

            if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
                walletService.addAvailableBalance(userId, targetAsset, refundAmount);
            }

            // Khấu trừ phí giao dịch Spot (0.1% lượng coin mua được)
            BigDecimal fee = matchedQuantity.multiply(FEE_RATE);
            BigDecimal netReceivedCoin = matchedQuantity.subtract(fee);

            // Cộng coin thực nhận (đã trừ phí 0.1%) vào ví
            walletService.addAvailableBalance(userId, baseAsset, netReceivedCoin);

        } else {
            // -- LỆNH BÁN --
            // Với lệnh bán, giải phóng chính xác lượng coin cơ sở (BTC) đã khớp
            BigDecimal lockedBtcValue = matchedQuantity;
            walletService.deductLockedBalance(userId, baseAsset, lockedBtcValue);

            // Khấu trừ phí giao dịch Spot (0.1% tổng số tiền USDT thu về)
            BigDecimal fee = actualUsdtValue.multiply(FEE_RATE);
            BigDecimal netReceivedUsdt = actualUsdtValue.subtract(fee);

            // Cộng USDT thực nhận (đã trừ phí 0.1%) vào ví
            walletService.addAvailableBalance(userId, targetAsset, netReceivedUsdt);
        }

        // --- BƯỚC QUAN TRỌNG: GHI LẠI LỊCH SỬ TRADE ---
        // Vì ở đây lấy giá từ Binance Cache, nên ta ghi nhận đây là External Match
        // Mã externalId ta có thể tạm tạo tự động bằng UUID hoặc nối chuỗi để làm mã đối soát
        String simulatedExternalId = "SYS-BINANCE-" + UUID.randomUUID().toString().substring(0, 8);
        tradeService.recordExternalMatch(order, fillPrice, matchedQuantity, "BINANCE", simulatedExternalId);


        // Cập nhật Database cho Order
        order.setRemainingQuantity(BigDecimal.ZERO);
        order.setStatus(OrderStatus.FILLED);
        order.setAvgPrice(fillPrice); // Lưu lại giá khớp thực tế

        orderRepository.save(order);

        log.info("Khớp lệnh {} thành công. Giá khớp: {}, Số tiền hoàn trả (nếu có): {}",
                order.getOrderType(), fillPrice,
                (order.getSide() == OrderSide.BUY ? "Có hoàn trả" : "Không"));
    }
}