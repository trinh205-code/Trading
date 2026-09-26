package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.FuturesOrderStatus;
import com.slayer.binacet.Enums.FuturesOrderType;
import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.dto.event.OrderEvent;
import com.slayer.binacet.dto.response.FillResult;
import com.slayer.binacet.entity.*;
import com.slayer.binacet.repository.*;
import com.slayer.binacet.service.FuturesMatchingService;
import com.slayer.binacet.service.FuturesPnLService;
import com.slayer.binacet.service.FuturesWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
@Service
@RequiredArgsConstructor
@Slf4j
public class FuturesMatchingServiceImpl  {

    private final FuturesOrderRepository orderRepository;
    private final FuturesPositionRepository positionRepository;
    private final FuturesTradeRepository tradeRepository;
    private final FuturesTransactionRepository transactionRepository;
    private final FuturesWalletServiceImpl futuresWalletService;
    private final MarketPriceCache marketPriceCache;


    @Transactional
    public void matchFuturesOrder(String orderId) {
        FuturesOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Futures Order: " + orderId));

        if (order.getStatus() != FuturesOrderStatus.OPEN && order.getStatus() != FuturesOrderStatus.PARTIALLY_FILLED) {
            return;
        }

        String symbol = order.getInstrument().getSymbol();
        BigDecimal markPrice = marketPriceCache.getMarkPrice(symbol);
        if (markPrice == null) {
            throw new RuntimeException("Chưa có giá thị trường cho " + symbol + ", tạm hoãn khớp lệnh " + orderId);
        }

        boolean shouldFill = order.getOrderType() == FuturesOrderType.MARKET
                || (order.getSide() == OrderSide.BUY && order.getPrice().compareTo(markPrice) >= 0)
                || (order.getSide() == OrderSide.SELL && order.getPrice().compareTo(markPrice) <= 0);

        if (!shouldFill) return;

        BigDecimal fillQty = order.getRemainingQuantity();
        BigDecimal fillPrice = markPrice;
        String userId = order.getUser().getId();
        String currency = order.getMarginCurrencyShortName();

        FuturesPosition position = positionRepository.findForUpdate(userId, symbol)
                .orElseGet(() -> positionRepository.save(FuturesPosition.builder()
                        .user(order.getUser())
                        .marginCurrencyShortName(currency)
                        .leverage(order.getLeverage() != null ? order.getLeverage() : BigDecimal.TEN)
                        .instrument(order.getInstrument())
                        .activePos(BigDecimal.ZERO)
                        .avgPrice(BigDecimal.ZERO)
                        .lockedUserMargin(BigDecimal.ZERO)
                        .build()));

        FillResult fillResult = applyFillToPosition(position, order.getSide(), fillQty, fillPrice, order.getLeverage());
        settleFill(userId, currency, position, symbol, fillResult, "FuturesOrder", orderId);

        BigDecimal fee = fillQty.multiply(fillPrice).multiply(order.getInstrument().getTakerFee());
        futuresWalletService.deductFee(userId, currency, fee);

        positionRepository.save(position);

        order.setRemainingQuantity(BigDecimal.ZERO);
        order.setExecutedQuantity(fillQty);
        order.setAvgPrice(fillPrice);
        order.setStatus(FuturesOrderStatus.FILLED);
        orderRepository.save(order);

        tradeRepository.save(FuturesTrade.builder()
                .userId(userId).order(order).symbol(symbol)
                .price(fillPrice).quantity(fillQty).feeAmount(fee)
                .side(order.getSide()).isMaker(false).timestamp(Instant.now())
                .build());

        log.info("Khớp Futures order {}: {} {} {} @ {} | margin trả về: {} | PnL: {}",
                orderId, order.getSide(), fillQty, symbol, fillPrice,
                fillResult.marginReleased(), fillResult.realizedPnl());
    }

    @Transactional
    public void executeMatchedLimitOrders(OrderEvent bestBid, OrderEvent bestAsk, BigDecimal matchQuantity, BigDecimal matchPrice) {
        FuturesOrder buyOrder = orderRepository.findById(bestBid.getOrderId()).orElse(null);
        FuturesOrder sellOrder = orderRepository.findById(bestAsk.getOrderId()).orElse(null);

        if (buyOrder == null || sellOrder == null) return;

        boolean isBuyMaker = bestBid.getTimestamp().isBefore(bestAsk.getTimestamp());

        processLimitFill(buyOrder, matchQuantity, matchPrice, isBuyMaker);
        processLimitFill(sellOrder, matchQuantity, matchPrice, !isBuyMaker);
    }

    /**
     * Điểm DUY NHẤT thao tác vào ví sau mỗi lần fill — tách riêng để đảm bảo mọi nơi gọi
     * (MARKET lẫn LIMIT) xử lý margin/PnL theo đúng 1 quy trình, tránh lệch nhau như bug trước.
     *
     * QUAN TRỌNG: marginReleased và realizedPnl là 2 khoản tiền ĐỘC LẬP, không được gộp/thay thế
     * cho nhau:
     *   - marginReleased: trả lại vốn ký quỹ gốc, luôn >= 0, không phụ thuộc lệnh lãi hay lỗ
     *   - realizedPnl: phần lãi (+) hoặc lỗ (-) phát sinh, cộng/trừ riêng
     */
    private void settleFill(String userId, String currency, FuturesPosition position, String symbol,
                            FillResult fillResult, String parentType, String parentId) {
        BigDecimal marginReleased = fillResult.marginReleased();
        BigDecimal realizedPnl = fillResult.realizedPnl();
        BigDecimal marginToLock = fillResult.marginToLock();

        if (marginReleased.compareTo(BigDecimal.ZERO) > 0) {
            futuresWalletService.releaseMargin(userId, currency, marginReleased);
        }

        if (marginToLock.compareTo(BigDecimal.ZERO) > 0) {
            futuresWalletService.lockMargin(userId, currency, marginToLock); // mới thêm
        }

        if (realizedPnl.compareTo(BigDecimal.ZERO) != 0) {
            futuresWalletService.applyRealizedPnl(userId, currency, realizedPnl);
            recordTransaction(position, symbol, "default", realizedPnl, "user", parentType, parentId,
                    fillResult.entryPrice(), fillResult.leverage());
        }
    }

    /**
     * Áp dụng 1 lần khớp lệnh vào vị thế hiện có. Hàm này CHỈ tính toán thuần túy, KHÔNG
     * đụng vào ví (không side-effect ra FuturesWallet) — mọi thao tác ví được gọi ở settleFill()
     * bên ngoài, nơi đã có sẵn đúng userId từ order.getUser().getId().
     *
     * Quy ước: activePos dương = LONG, âm = SHORT.
     *
     * FillResult trả về 3 trường ĐỘC LẬP, không được gộp/thay thế cho nhau:
     *   - realizedPnl:     lãi (+) / lỗ (-) phát sinh khi đóng bớt/đóng hết/đảo chiều. = 0 nếu chỉ mở/cộng thêm.
     *   - marginReleased:  vốn ký quỹ GỐC được giải phóng khi đóng bớt/đóng hết. Luôn >= 0.
     *   - marginToLock:    vốn ký quỹ MỚI cần khóa thêm khi đảo chiều (phần dư mở vị thế ngược hướng).
     *                       = 0 trong mọi trường hợp khác.
     */
    private FillResult applyFillToPosition(FuturesPosition position, OrderSide side,
                                           BigDecimal fillQty, BigDecimal fillPrice, BigDecimal orderLeverage) {

        BigDecimal existingQty = position.getActivePos() != null ? position.getActivePos() : BigDecimal.ZERO;
        BigDecimal signedDelta = side == OrderSide.BUY ? fillQty : fillQty.negate();

        BigDecimal effectiveLeverage = orderLeverage != null ? orderLeverage : position.getLeverage();
        if (effectiveLeverage == null || effectiveLeverage.compareTo(BigDecimal.ZERO) <= 0) {
            effectiveLeverage = BigDecimal.TEN;
        }

        boolean sameDirection = existingQty.signum() == 0 || existingQty.signum() == signedDelta.signum();

        // ============================================================
        // TRƯỜNG HỢP 1: Mở mới hoặc cộng thêm cùng chiều
        // Không giải phóng margin, không có PnL thực nhận, không khóa thêm ở đây
        // (việc khóa margin ban đầu cho case này đã xảy ra ở FuturesOrderServiceImpl.createFuturesOrder,
        //  không phải ở đây — hàm này chỉ tính lại avgPrice/margin MỚI của position để lưu, không lock ví).
        // ============================================================
        if (sameDirection) {
            BigDecimal newQty = existingQty.add(signedDelta);

            BigDecimal oldNotional = position.getAvgPrice() != null
                    ? position.getAvgPrice().multiply(existingQty.abs())
                    : BigDecimal.ZERO;
            BigDecimal newNotional = fillPrice.multiply(fillQty);
            BigDecimal newAvgPrice = oldNotional.add(newNotional).divide(newQty.abs(), 18, RoundingMode.HALF_UP);

            BigDecimal totalNotional = newQty.abs().multiply(newAvgPrice);
            BigDecimal newTotalMargin = totalNotional.divide(effectiveLeverage, 18, RoundingMode.HALF_UP);

            position.setActivePos(newQty);
            position.setAvgPrice(newAvgPrice);
            position.setLeverage(effectiveLeverage);
            position.setLockedUserMargin(newTotalMargin);

            return new FillResult(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        // ============================================================
        // TRƯỜNG HỢP 2: Đóng bớt / Đóng hết / Đảo chiều (lệnh ngược hướng với vị thế đang có)
        // ============================================================
        BigDecimal closingQty = fillQty.min(existingQty.abs());
        BigDecimal remainder = fillQty.subtract(closingQty);
        BigDecimal remainingQty = existingQty.signum() > 0
                ? existingQty.subtract(closingQty)
                : existingQty.add(closingQty);

        BigDecimal entryPriceBeforeClose = position.getAvgPrice();
        BigDecimal leverageBeforeClose = position.getLeverage() != null ? position.getLeverage() : effectiveLeverage;

        // PnL thực nhận trên phần ĐÓNG (không liên quan gì tới phần mở mới nếu có đảo chiều)
        BigDecimal realizedPnl = existingQty.signum() > 0
                ? fillPrice.subtract(position.getAvgPrice()).multiply(closingQty)
                : position.getAvgPrice().subtract(fillPrice).multiply(closingQty);

        BigDecimal totalPositionMargin = position.getLockedUserMargin() != null
                ? position.getLockedUserMargin()
                : BigDecimal.ZERO;

        // Margin giải phóng: đóng hết/đảo chiều -> giải phóng TOÀN BỘ margin cũ.
        // Đóng bớt một phần -> giải phóng theo đúng tỷ lệ % khối lượng đã đóng.
        boolean closingEntirePosition = remainingQty.compareTo(BigDecimal.ZERO) == 0 || remainder.compareTo(BigDecimal.ZERO) > 0;
        BigDecimal marginReleased = closingEntirePosition
                ? totalPositionMargin
                : totalPositionMargin.multiply(closingQty).divide(existingQty.abs(), 18, RoundingMode.HALF_UP);

        BigDecimal marginToLock = BigDecimal.ZERO;

        if (remainder.compareTo(BigDecimal.ZERO) > 0) {
            // 2a. ĐẢO CHIỀU: phần dư (remainder) mở vị thế MỚI theo hướng ngược lại.
            // Margin của vị thế mới này CHƯA từng được khóa ở đâu cả -> phải báo ra ngoài để settleFill lock thêm.
            BigDecimal newSignedQty = side == OrderSide.BUY ? remainder : remainder.negate();
            BigDecimal newMargin = fillPrice.multiply(remainder).divide(effectiveLeverage, 18, RoundingMode.HALF_UP);

            position.setActivePos(newSignedQty);
            position.setAvgPrice(fillPrice);
            position.setLeverage(effectiveLeverage);
            position.setLockedUserMargin(newMargin);

            marginToLock = newMargin;

        } else if (remainingQty.compareTo(BigDecimal.ZERO) == 0) {
            // 2b. ĐÓNG HẾT: không còn vị thế nào, reset sạch.
            position.setActivePos(BigDecimal.ZERO);
            position.setAvgPrice(BigDecimal.ZERO);
            position.setLockedUserMargin(BigDecimal.ZERO);

        } else {
            // 2c. ĐÓNG BỚT MỘT PHẦN: vị thế cũ vẫn còn, chỉ giảm khối lượng và margin tương ứng.
            // avgPrice giữ nguyên — KHÔNG đổi khi chỉ đóng bớt (chỉ đổi khi mở mới/cộng thêm cùng chiều).
            position.setActivePos(remainingQty);
            position.setLockedUserMargin(totalPositionMargin.subtract(marginReleased).max(BigDecimal.ZERO));
        }

        return new FillResult(realizedPnl, marginReleased, marginToLock, entryPriceBeforeClose, leverageBeforeClose);
    }

    private void processLimitFill(FuturesOrder order, BigDecimal fillQty, BigDecimal fillPrice, boolean isMaker) {
        String userId = order.getUser().getId();
        String symbol = order.getInstrument().getSymbol();
        String currency = order.getMarginCurrencyShortName();

        FuturesPosition position = positionRepository.findForUpdate(userId, symbol)
                .orElseGet(() -> positionRepository.save(FuturesPosition.builder()
                        .user(order.getUser())
                        .instrument(order.getInstrument())
                        .activePos(BigDecimal.ZERO)
                        .avgPrice(BigDecimal.ZERO)
                        .lockedUserMargin(BigDecimal.ZERO)
                        .leverage(order.getLeverage())
                        .marginCurrencyShortName(currency)
                        .build()));

        FillResult fillResult = applyFillToPosition(position, order.getSide(), fillQty, fillPrice, order.getLeverage());
        settleFill(userId, currency, position, symbol, fillResult, "FuturesOrder", order.getId());

        BigDecimal feeRate = isMaker ? new BigDecimal("0.0002") : new BigDecimal("0.0004");
        BigDecimal fee = fillQty.multiply(fillPrice).multiply(feeRate);
        futuresWalletService.deductFee(userId, currency, fee);

        positionRepository.save(position);

        BigDecimal remaining = order.getRemainingQuantity().subtract(fillQty);
        order.setRemainingQuantity(remaining);
        order.setExecutedQuantity(order.getTotalQuantity().subtract(remaining));
        order.setStatus(remaining.compareTo(BigDecimal.ZERO) == 0 ? FuturesOrderStatus.FILLED : FuturesOrderStatus.PARTIALLY_FILLED);
        order.setAvgPrice(fillPrice);
        orderRepository.save(order);

        tradeRepository.save(FuturesTrade.builder()
                .userId(userId).order(order).symbol(symbol)
                .price(fillPrice).quantity(fillQty).feeAmount(fee)
                .side(order.getSide()).isMaker(isMaker).timestamp(Instant.now())
                .build());
    }

    private void recordTransaction(FuturesPosition position, String symbol, String stage,
                                   BigDecimal amount, String source, String parentType, String parentId,
                                   BigDecimal entryPrice, BigDecimal leverage) {
        transactionRepository.save(FuturesTransaction.builder()
                .position(position)
                .symbol(symbol)
                .stage(stage)
                .amount(amount)
                .entryPrice(entryPrice)
                .leverage(leverage)
                .source(source)
                .parentType(parentType)
                .parentId(parentId)
                .createdAt(Instant.now())
                .build());
    }

    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }

        return (User) authentication.getPrincipal();
    }

}