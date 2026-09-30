package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.FuturesOrderStatus;
import com.slayer.binacet.Enums.FuturesOrderType;
import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.dto.event.OrderEvent;
import com.slayer.binacet.dto.request.CreateFuturesOrderRequest;
import com.slayer.binacet.dto.response.FuturesOrderResponse;
import com.slayer.binacet.entity.*;
import com.slayer.binacet.event.FuturesOrderProducer;
import com.slayer.binacet.mapper.FuturesOrderMapper;
import com.slayer.binacet.mapper.OrderEventMapper;
import com.slayer.binacet.repository.*;
import com.slayer.binacet.service.FuturesOrderService;
import com.slayer.binacet.service.FuturesPnLService;
import com.slayer.binacet.service.FuturesWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FuturesOrderServiceImpl implements FuturesOrderService {

    private final FuturesOrderRepository futuresOrderRepository;
    private final FuturesInstrumentRepository instrumentRepository;
    private final FuturesWalletRepository futuresWalletRepository;
    private final FuturesPositionRepository futuresPositionRepository;
    private final FuturesPnLService futuresPnLService;
    private final FuturesOrderMapper futuresOrderMapper;
    private final OrderEventMapper orderEventMapper;
    private final FuturesMatchingServiceImpl matchingEngineService;
    private final FuturesMarketSyncService futuresMarketSyncService;

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final FuturesWalletService futuresWalletService;
    private final FuturesOrderProducer futuresOrderProducer;

    @Override
    @Transactional
    public FuturesOrderResponse createFuturesOrder(CreateFuturesOrderRequest request) {
        User user = getCurrentUser();

        FuturesInstrument instrument = instrumentRepository.findById(request.getSymbol().toUpperCase())
                .orElseThrow(() -> new RuntimeException("Cặp giao dịch không hợp lệ"));

        if (!"active".equals(instrument.getStatus())) {
            throw new RuntimeException("Cặp giao dịch này hiện không khả dụng để giao dịch");
        }

        BigDecimal priceToCalculate = validateAndCalculateOrderPrice(request, instrument, user);
        validateAndProcessMargin(request, instrument, user, priceToCalculate);

        FuturesOrder order = futuresOrderMapper.toEntity(request, user, instrument, priceToCalculate);
        FuturesOrder savedOrder = futuresOrderRepository.save(order);

        dispatchOrder(savedOrder);

        return futuresOrderMapper.toResponse(savedOrder);
    }



    @Override
    @Transactional
    public FuturesOrderResponse cancelFuturesOrder(String orderId) {
        User user = getCurrentUser();
        FuturesOrder order = futuresOrderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh"));

        if (!order.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Bạn không có quyền hủy lệnh này");
        }

        if (order.getStatus() != FuturesOrderStatus.OPEN && order.getStatus() != FuturesOrderStatus.PARTIALLY_FILLED) {
            throw new RuntimeException("Chỉ có thể hủy lệnh đang chờ khớp");
        }

        // 1. Tính toán lượng Ký quỹ cần hoàn trả dựa trên số lượng chưa khớp
        BigDecimal marginToRelease = order.getRemainingQuantity()
                .multiply(order.getPrice())
                .divide(order.getLeverage(), 18, RoundingMode.HALF_UP);

        // 2. Mở khóa Ký quỹ trả về Ví Futures
        FuturesWallet wallet = futuresWalletRepository.findForUpdate(
                        user.getId(), order.getMarginCurrencyShortName())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ví Futures"));

        wallet.setLockedBalance(wallet.getLockedBalance().subtract(marginToRelease).max(BigDecimal.ZERO));
        wallet.setBalance(wallet.getBalance().add(marginToRelease));
        futuresWalletRepository.save(wallet);

        order.setCancelledQuantity(order.getRemainingQuantity());
        order.setRemainingQuantity(BigDecimal.ZERO);
        order.setStatus(FuturesOrderStatus.CANCELLED);
        order.setUpdatedAt(Instant.now());

        FuturesOrder savedOrder = futuresOrderRepository.save(order);

        return futuresOrderMapper.toResponse(savedOrder);
    }

    @Override
    public Page<FuturesOrderResponse> getMyFuturesOrders(String symbol, String status, Pageable pageable) {
        Page<FuturesOrder> orders;
        String userId = getCurrentUser().getId();

        // Xử lý truy vấn linh hoạt dựa trên các bộ lọc tùy chọn
        if (symbol != null && !symbol.isEmpty() && status != null && !status.isEmpty()) {
            orders = futuresOrderRepository.findByUserIdAndInstrument_SymbolAndStatus(
                    userId, symbol.toUpperCase(), FuturesOrderStatus.valueOf(status.toUpperCase()), pageable);
        } else if (symbol != null && !symbol.isEmpty()) {
            orders = futuresOrderRepository.findByUserIdAndInstrument_Symbol(
                    userId, symbol.toUpperCase(), pageable);
        } else if (status != null && !status.isEmpty()) {
            orders = futuresOrderRepository.findByUserIdAndStatus(
                    userId, FuturesOrderStatus.valueOf(status.toUpperCase()), pageable);
        } else {
            orders = futuresOrderRepository.findByUserId(userId, pageable);
        }

        return orders.map(futuresOrderMapper::toResponse);
    }


    private BigDecimal validateAndCalculateOrderPrice(CreateFuturesOrderRequest request, FuturesInstrument instrument, User user) {
        BigDecimal markPrice = futuresMarketSyncService.getMarkPrice(request.getSymbol());

        if (request.getOrderType() == FuturesOrderType.MARKET) {
            if (markPrice == null || markPrice.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("Chưa có giá thị trường hợp lệ cho " + request.getSymbol());
            }
            return markPrice;
        }

        BigDecimal limitPrice = request.getPrice();
        if (limitPrice == null || limitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Lệnh LIMIT bắt buộc phải có giá hợp lệ");
        }

        validatePriceBand(request, limitPrice, markPrice);
        validateAgainstLiquidationPrice(request, instrument, user, limitPrice);

        return limitPrice;
    }

    private void validatePriceBand(CreateFuturesOrderRequest request, BigDecimal price, BigDecimal markPrice) {
        if (markPrice == null || markPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        BigDecimal maxBuyPrice = markPrice.multiply(new BigDecimal("1.10"));
        BigDecimal minSellPrice = markPrice.multiply(new BigDecimal("0.90"));

        if (request.getSide() == OrderSide.BUY && price.compareTo(maxBuyPrice) > 0) {
            throw new RuntimeException("Giá đặt mua (" + price.stripTrailingZeros().toPlainString()
                    + ") không được cao hơn 10% so với giá thị trường (" + markPrice.stripTrailingZeros().toPlainString() + ")");
        }
        if (request.getSide() == OrderSide.SELL && price.compareTo(minSellPrice) < 0) {
            throw new RuntimeException("Giá đặt bán (" + price.stripTrailingZeros().toPlainString()
                    + ") không được thấp hơn 10% so với giá thị trường (" + markPrice.stripTrailingZeros().toPlainString() + ")");
        }
    }

    private void validateAgainstLiquidationPrice(CreateFuturesOrderRequest request, FuturesInstrument instrument, User user, BigDecimal price) {
        FuturesPosition existingPosition = futuresPositionRepository
                .findByUser_IdAndInstrument_Symbol(user.getId(), instrument.getSymbol())
                .orElse(null);

        if (existingPosition == null || existingPosition.getActivePos() == null
                || existingPosition.getActivePos().compareTo(BigDecimal.ZERO) == 0) {
            return;
        }

        BigDecimal mmr = instrument.getMaintenanceMarginRate() != null
                ? instrument.getMaintenanceMarginRate()
                : new BigDecimal("0.005");
        BigDecimal liqPrice = existingPosition.getLiquidationPrice() != null
                ? existingPosition.getLiquidationPrice()
                : futuresPnLService.calculateLiquidationPrice(existingPosition, mmr);

        if (liqPrice != null && liqPrice.compareTo(BigDecimal.ZERO) > 0) {
            boolean isLong = existingPosition.getActivePos().signum() > 0;
            if (isLong && request.getSide() == OrderSide.SELL && price.compareTo(liqPrice) <= 0) {
                throw new RuntimeException("Giá đặt lệnh không thể thấp hơn hoặc bằng giá thanh lý ("
                        + liqPrice.setScale(2, RoundingMode.HALF_UP) + ") của vị thế Long");
            }
            if (!isLong && request.getSide() == OrderSide.BUY && price.compareTo(liqPrice) >= 0) {
                throw new RuntimeException("Giá đặt lệnh không thể cao hơn hoặc bằng giá thanh lý ("
                        + liqPrice.setScale(2, RoundingMode.HALF_UP) + ") của vị thế Short");
            }
        }
    }

    private void validateAndProcessMargin(CreateFuturesOrderRequest request, FuturesInstrument instrument, User user, BigDecimal priceToCalculate) {
        if (!request.isReduceOnly()) {
            BigDecimal markPrice = futuresMarketSyncService.getMarkPrice(request.getSymbol());
            BigDecimal effectivePrice = priceToCalculate;
            if (markPrice != null && markPrice.compareTo(BigDecimal.ZERO) > 0) {
                effectivePrice = effectivePrice.max(markPrice);
            }
            BigDecimal notionalValue = request.getQuantity().multiply(effectivePrice);
            BigDecimal requiredMargin = notionalValue.divide(request.getLeverage(), 18, RoundingMode.HALF_UP);

            FuturesWallet wallet = futuresWalletRepository.findForUpdate(user.getId(), instrument.getMarginCurrencyShortName())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy ví Futures"));

            if (wallet.getAvailableMargin().compareTo(requiredMargin) < 0) {
                throw new RuntimeException("Số dư khả dụng không đủ để đặt lệnh");
            }
            futuresWalletService.lockMargin(user.getId(), instrument.getMarginCurrencyShortName(), requiredMargin);
        } else {
            validateReduceOnlyOrder(request, instrument, user);
        }
    }

    private void validateReduceOnlyOrder(CreateFuturesOrderRequest request, FuturesInstrument instrument, User user) {
        FuturesPosition position = futuresPositionRepository
                .findByUser_IdAndInstrument_Symbol(user.getId(), instrument.getSymbol())
                .orElse(null);

        if (position == null || position.getActivePos() == null || position.getActivePos().compareTo(BigDecimal.ZERO) == 0) {
            throw new RuntimeException("Bạn không có vị thế mở nào cho " + instrument.getSymbol() + " để đóng");
        }

        BigDecimal activePosAbs = position.getActivePos().abs();
        boolean isLong = position.getActivePos().signum() > 0;

        if ((isLong && request.getSide() != OrderSide.SELL) || (!isLong && request.getSide() != OrderSide.BUY)) {
            throw new RuntimeException("Chiều đóng vị thế không hợp lệ. Vị thế hiện tại là "
                    + (isLong ? "LONG (Bán để đóng)" : "SHORT (Mua để đóng)"));
        }

        List<FuturesOrderStatus> activeStatuses = List.of(FuturesOrderStatus.OPEN, FuturesOrderStatus.PARTIALLY_FILLED);
        List<FuturesOrder> existingActiveOrders = futuresOrderRepository
                .findByUser_IdAndInstrument_SymbolAndStatusIn(user.getId(), instrument.getSymbol(), activeStatuses);

        BigDecimal pendingClosingQty = existingActiveOrders.stream()
                .filter(o -> ("exit".equalsIgnoreCase(o.getStage()) || "tpsl_exit".equalsIgnoreCase(o.getStage()))
                        && o.getSide() == request.getSide())
                .map(o -> o.getRemainingQuantity() != null ? o.getRemainingQuantity() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal availablePosToClose = activePosAbs.subtract(pendingClosingQty);
        if (availablePosToClose.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Toàn bộ vị thế (" + activePosAbs.stripTrailingZeros().toPlainString()
                    + " " + (instrument.getBaseAsset() != null ? instrument.getBaseAsset() : "") + ") đã được đặt trong các lệnh đóng chờ khớp. Không thể đặt thêm lệnh đóng.");
        }

        if (request.getQuantity().compareTo(availablePosToClose) > 0) {
            throw new RuntimeException("Khối lượng đóng (" + request.getQuantity().stripTrailingZeros().toPlainString()
                    + ") vượt quá vị thế khả dụng để đóng (" + availablePosToClose.stripTrailingZeros().toPlainString()
                    + " " + (instrument.getBaseAsset() != null ? instrument.getBaseAsset() : "") + "). Vị thế: " + activePosAbs.stripTrailingZeros().toPlainString()
                    + ", Đang chờ khớp: " + pendingClosingQty.stripTrailingZeros().toPlainString());
        }
    }

    private void dispatchOrder(FuturesOrder order) {
        if (order.getOrderType() == FuturesOrderType.MARKET) {
            matchingEngineService.matchFuturesOrder(order.getId());
        } else if (order.getOrderType() == FuturesOrderType.LIMIT) {
            OrderEvent event = orderEventMapper.toFuturesOrderEvent(order, "CREATE");
            futuresOrderProducer.sendOrderToQueue(event);
        }
    }


    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }

        return (User) authentication.getPrincipal();
    }

}