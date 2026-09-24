package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.FuturesOrderStatus;
import com.slayer.binacet.entity.FuturesOrder;
import com.slayer.binacet.entity.FuturesPosition;
import com.slayer.binacet.entity.FuturesTransaction;
import com.slayer.binacet.repository.FuturesOrderRepository;
import com.slayer.binacet.repository.FuturesPositionRepository;
import com.slayer.binacet.repository.FuturesTransactionRepository;
import com.slayer.binacet.service.FuturesPnLService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FuturesLiquidationService {

    private static final BigDecimal MAINTENANCE_MARGIN_RATE = new BigDecimal("0.005"); // 0.5%

    private static final List<FuturesOrderStatus> CANCELLABLE_STATUSES =
            List.of(FuturesOrderStatus.OPEN, FuturesOrderStatus.PARTIALLY_FILLED);

    private final FuturesPositionRepository positionRepository;
    private final FuturesOrderRepository orderRepository;
    private final FuturesTransactionRepository transactionRepository;
    private final FuturesWalletServiceImpl futuresWalletService;
    private final FuturesPnLService pnlService;

    @Transactional
    public void checkAndLiquidateIfNeeded(String userId, String symbol, BigDecimal markPrice) {
        FuturesPosition position = positionRepository.findForUpdate(userId, symbol).orElse(null);
        if (position == null) return;

        BigDecimal activePos = position.getActivePos();
        if (activePos == null || activePos.compareTo(BigDecimal.ZERO) == 0) return;

        position.setMarkPrice(markPrice);
        BigDecimal mmr = position.getInstrument() != null && position.getInstrument().getMaintenanceMarginRate() != null
                ? position.getInstrument().getMaintenanceMarginRate()
                : MAINTENANCE_MARGIN_RATE;

        BigDecimal liquidationPrice = pnlService.calculateLiquidationPrice(position, mmr);
        position.setLiquidationPrice(liquidationPrice);

        if (liquidationPrice == null) {
            positionRepository.save(position);
            return;
        }

        boolean isLong = activePos.signum() > 0;
        boolean hitLiquidation = isLong
                ? markPrice.compareTo(liquidationPrice) <= 0
                : markPrice.compareTo(liquidationPrice) >= 0;

        if (hitLiquidation) {
            forceLiquidate(position, markPrice);
        } else {
            positionRepository.save(position);
        }
    }

    private void forceLiquidate(FuturesPosition position, BigDecimal liquidationExecutionPrice) {
        String userId = position.getUser().getId();
        String currency = position.getMarginCurrencyShortName();
        String symbol = position.getInstrument().getSymbol();

        BigDecimal realizedPnl = pnlService.calculateUnrealizedPnl(position, liquidationExecutionPrice);
        BigDecimal marginToRelease = position.getLockedUserMargin() != null
                ? position.getLockedUserMargin()
                : BigDecimal.ZERO;

        if (marginToRelease.compareTo(BigDecimal.ZERO) > 0) {
            futuresWalletService.releaseMargin(userId, currency, marginToRelease);
        }
        if (realizedPnl.compareTo(BigDecimal.ZERO) != 0) {
            futuresWalletService.applyRealizedPnl(userId, currency, realizedPnl);
        }

        recordLiquidationTransaction(position, symbol, realizedPnl);

        position.setActivePos(BigDecimal.ZERO);
        position.setAvgPrice(BigDecimal.ZERO);
        position.setLockedUserMargin(BigDecimal.ZERO);
        position.setLiquidationPrice(null);
        position.setUpdatedAt(Instant.now());
        positionRepository.save(position);

        cancelOrphanedOrders(userId, symbol, currency);

        log.warn("💥 THANH LÝ vị thế {} (user={}, symbol={}) tại giá {}. PnL thực nhận: {}",
                position.getId(), userId, symbol, liquidationExecutionPrice, realizedPnl);
    }

    /**
     * Hủy mọi lệnh (LIMIT thường lẫn TP/SL) đang treo của user cho symbol vừa bị thanh lý,
     * và hoàn trả margin đã khóa riêng cho từng lệnh đó — nếu bỏ qua bước hoàn margin,
     * tiền sẽ kẹt vĩnh viễn trong lockedBalance dù lệnh đã bị hủy (tái diễn bug đã sửa trước đây).
     */
    private void cancelOrphanedOrders(String userId, String symbol, String currency) {
        List<FuturesOrder> orphanedOrders = orderRepository
                .findByUser_IdAndInstrument_SymbolAndStatusIn(userId, symbol, CANCELLABLE_STATUSES);

        if (orphanedOrders.isEmpty()) return;

        for (FuturesOrder order : orphanedOrders) {
            // Lệnh TP/SL (stage=tpsl_exit) thường không tự khóa margin riêng — chỉ theo dõi giá
            // để đóng vị thế gốc. Chỉ lệnh LIMIT thường (stage=default) mới thực sự có margin
            // bị khóa lúc tạo lệnh, cần hoàn trả. Kiểm tra trước khi gọi releaseMargin để tránh
            // hoàn nhầm 1 khoản tiền chưa từng bị khóa.
            if (!"tpsl_exit".equals(order.getStage()) && order.getPrice() != null && order.getLeverage() != null) {
                BigDecimal marginToRelease = order.getRemainingQuantity()
                        .multiply(order.getPrice())
                        .divide(order.getLeverage(), 18, RoundingMode.HALF_UP);

                if (marginToRelease.compareTo(BigDecimal.ZERO) > 0) {
                    futuresWalletService.releaseMargin(userId, currency, marginToRelease);
                }
            }

            order.setCancelledQuantity(order.getRemainingQuantity());
            order.setRemainingQuantity(BigDecimal.ZERO);
            order.setStatus(FuturesOrderStatus.CANCELLED);
            order.setUpdatedAt(Instant.now());
            orderRepository.save(order);

            log.info("🗑️ Hủy lệnh {} (stage={}) do vị thế {} đã bị thanh lý", order.getId(), order.getStage(), symbol);
        }

        log.warn("Đã hủy {} lệnh treo của user {} cho symbol {} sau khi thanh lý", orphanedOrders.size(), userId, symbol);
    }

    private void recordLiquidationTransaction(FuturesPosition position, String symbol, BigDecimal amount) {
        transactionRepository.save(FuturesTransaction.builder()
                .position(position)
                .symbol(symbol)
                .stage("liquidation")
                .amount(amount)
                .source("system")
                .parentType("Liquidation")
                .parentId(position.getId().toString())
                .createdAt(Instant.now())
                .build());
    }
}