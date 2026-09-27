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

        // 1. Tính toán giá ký quỹ
        BigDecimal priceToCalculate;
        BigDecimal markPrice = futuresMarketSyncService.getMarkPrice(request.getSymbol());

        if (request.getOrderType() == FuturesOrderType.MARKET) {
            priceToCalculate = markPrice;
            if (priceToCalculate == null || priceToCalculate.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("Chưa có giá thị trường hợp lệ cho " + request.getSymbol());
            }
        } else {
            priceToCalculate = request.getPrice();
            if (priceToCalculate == null || priceToCalculate.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("Lệnh LIMIT bắt buộc phải có giá hợp lệ");
            }

            // Kiểm tra chống đặt giá quá xa (PERCENT_PRICE Filter - tối đa lệch 10% để chống fat-finger hoặc gian lận đòn bẩy)
            if (markPrice != null && markPrice.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal maxBuyPrice = markPrice.multiply(new BigDecimal("1.10"));
                BigDecimal minSellPrice = markPrice.multiply(new BigDecimal("0.90"));

                if (request.getSide() == OrderSide.BUY && priceToCalculate.compareTo(maxBuyPrice) > 0) {
                    throw new RuntimeException("Giá đặt mua (" + priceToCalculate.stripTrailingZeros().toPlainString()
                            + ") không được cao hơn 10% so với giá thị trường (" + markPrice.stripTrailingZeros().toPlainString() + ")");
                }
                if (request.getSide() == OrderSide.SELL && priceToCalculate.compareTo(minSellPrice) < 0) {
                    throw new RuntimeException("Giá đặt bán (" + priceToCalculate.stripTrailingZeros().toPlainString()
                            + ") không được thấp hơn 10% so với giá thị trường (" + markPrice.stripTrailingZeros().toPlainString() + ")");
                }
            }

            // Kiểm tra không cho đặt lệnh LIMIT vượt qua giá thanh lý của vị thế đang mở
            FuturesPosition existingPosition = futuresPositionRepository
                    .findByUser_IdAndInstrument_Symbol(user.getId(), instrument.getSymbol())
                    .orElse(null);

            if (existingPosition != null && existingPosition.getActivePos() != null
                    && existingPosition.getActivePos().compareTo(BigDecimal.ZERO) != 0) {

                BigDecimal mmr = instrument.getMaintenanceMarginRate() != null
                        ? instrument.getMaintenanceMarginRate()
                        : new BigDecimal("0.005");
                BigDecimal liqPrice = existingPosition.getLiquidationPrice() != null
                        ? existingPosition.getLiquidationPrice()
                        : futuresPnLService.calculateLiquidationPrice(existingPosition, mmr);

                if (liqPrice != null && liqPrice.compareTo(BigDecimal.ZERO) > 0) {
                    boolean isLong = existingPosition.getActivePos().signum() > 0;
                    if (isLong && request.getSide() == OrderSide.SELL && priceToCalculate.compareTo(liqPrice) <= 0) {
                        throw new RuntimeException("Giá đặt lệnh không thể thấp hơn hoặc bằng giá thanh lý ("
                                + liqPrice.setScale(2, RoundingMode.HALF_UP) + ") của vị thế Long");
                    }
                    if (!isLong && request.getSide() == OrderSide.BUY && priceToCalculate.compareTo(liqPrice) >= 0) {
                        throw new RuntimeException("Giá đặt lệnh không thể cao hơn hoặc bằng giá thanh lý ("
                                + liqPrice.setScale(2, RoundingMode.HALF_UP) + ") của vị thế Short");
                    }
                }
            }
        }

        // Tính ký quỹ cần khóa: Luôn dùng mức giá cao nhất có thể khớp để không bao giờ bị thiếu ký quỹ thực tế
        BigDecimal effectivePriceForMargin = priceToCalculate;
        if (markPrice != null && markPrice.compareTo(BigDecimal.ZERO) > 0) {
            effectivePriceForMargin = effectivePriceForMargin.max(markPrice);
        }

        BigDecimal notionalValue = request.getQuantity().multiply(effectivePriceForMargin);
        BigDecimal requiredMargin = notionalValue.divide(request.getLeverage(), 18, RoundingMode.HALF_UP);

        // 2. Khóa Margin trong Ví
        FuturesWallet wallet = futuresWalletRepository.findForUpdate(user.getId(), instrument.getMarginCurrencyShortName())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ví Futures"));

        if (!request.isReduceOnly()) {
            // Chỉ kiểm tra và khóa ví nếu đây là lệnh MỞ vị thế thông thường
            if (wallet.getAvailableMargin().compareTo(requiredMargin) < 0) {
                throw new RuntimeException("Số dư khả dụng không đủ để đặt lệnh");
            }
            futuresWalletService.lockMargin(user.getId(), instrument.getMarginCurrencyShortName(), requiredMargin);
        }

        FuturesOrder order = futuresOrderMapper.toEntity(request);
        order.setUser(user);
        order.setInstrument(instrument);
        order.setStatus(FuturesOrderStatus.OPEN);
        order.setMarginCurrencyShortName(instrument.getMarginCurrencyShortName());
        order.setCreatedAt(Instant.now());
        order.setUpdatedAt(Instant.now());

        order.setTotalQuantity(request.getQuantity());
        order.setRemainingQuantity(request.getQuantity());
        order.setExecutedQuantity(BigDecimal.ZERO);

        order.setPrice(priceToCalculate);


        FuturesOrder savedOrder = futuresOrderRepository.save(order);

        // 4. PHÂN LUỒNG XỬ LÝ
        if (request.getOrderType() == FuturesOrderType.MARKET) {
            matchingEngineService.matchFuturesOrder(savedOrder.getId());

        } else if (request.getOrderType() == FuturesOrderType.LIMIT) {
            // Treo lên Sổ lệnh bằng cách đẩy vào
            // Kafka
            OrderEvent event = OrderEvent.builder()
                    .orderId(savedOrder.getId())
                    .symbol(savedOrder.getInstrument().getSymbol())
                    .side(savedOrder.getSide())
                    .orderType(savedOrder.getOrderType())
                    .price(savedOrder.getPrice())
                    .quantity(savedOrder.getTotalQuantity())
                    .remainingQuantity(savedOrder.getRemainingQuantity())
                    .timestamp(savedOrder.getCreatedAt())
                    .action("CREATE")
                    .build();

            futuresOrderProducer.sendOrderToQueue(event);
        }

        // 5. Trả về kết quả cho API
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

    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }

        return (User) authentication.getPrincipal();
    }

}