package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.Enums.OrderStatus;
import com.slayer.binacet.Enums.OrderType;
import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.dto.event.OrderEvent;
import com.slayer.binacet.dto.request.CreateOrderRequest;
import com.slayer.binacet.dto.response.OrderResponse;
import com.slayer.binacet.entity.Market;
import com.slayer.binacet.entity.Order;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.event.OrderProducer;
import com.slayer.binacet.mapper.OrderMapper;
import com.slayer.binacet.repository.MarketRepository;
import com.slayer.binacet.repository.OrderRepository;
import com.slayer.binacet.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {
    private final OrderRepository orderRepository;
    private final MarketRepository marketRepository;
    private final OrderMapper orderMapper;
    private final WalletServiceImpl walletServiceImpl;
    private final MarketPriceCache marketPriceCache;
    private final OrderProducer orderProducer;
    private final MarketServiceImpl marketService;


    @Override
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        User currentUser = getCurrentUser();
        String symbol = request.getSymbol().toUpperCase();

        Market market = marketRepository.findById(symbol).orElseThrow(
                () -> new IllegalArgumentException("Hệ thống không hỗ trợ cặp giao dịch: " + symbol));

        if (!"TRADING".equalsIgnoreCase(market.getStatus())) {
            throw new RuntimeException("Cặp giao dịch này đang tạm ngưng, không thể đặt lệnh!");
        }

        if (request.getQuantity().compareTo(market.getMinQuantity()) < 0) {
            throw new IllegalArgumentException("Số lượng mua quá nhỏ. Tối thiểu là: " + market.getMinQuantity());
        }

        OrderType type = request.getOrderType();
        BigDecimal orderPrice = request.getPrice();
        BigDecimal amountToLock = BigDecimal.ZERO;




        if (type.equals(OrderType.LIMIT)) {
            if (orderPrice == null || orderPrice.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Lệnh LIMIT bắt buộc phải nhập mức giá lớn hơn 0");
            }
            amountToLock = orderPrice.multiply(request.getQuantity()).setScale(8, java.math.RoundingMode.HALF_UP);
        } else if (type.equals(OrderType.MARKET)) {
            BigDecimal currentMarketPrice = marketPriceCache.getMarkPrice(symbol);

            if (currentMarketPrice == null || currentMarketPrice.compareTo(BigDecimal.ZERO) <= 0) {
                currentMarketPrice = marketService.getCurrentPrice(symbol);
            }

            log.info("Mức giá chốt để tính khóa ví: {}", currentMarketPrice);
            if (currentMarketPrice == null || currentMarketPrice.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("Hệ thống đang cập nhật giá, vui lòng thử lại sau.");
            }

            // Với lệnh MARKET, tạm gán giá thực tế vào để tránh lỗi check price > 0
            orderPrice = currentMarketPrice;

            if (request.getSide() == OrderSide.BUY) {
                BigDecimal bufferRate = new BigDecimal("1.05"); // 5% trượt giá
                BigDecimal estimatedPrice = currentMarketPrice.multiply(bufferRate);
                amountToLock = estimatedPrice.multiply(request.getQuantity()).setScale(8, java.math.RoundingMode.HALF_UP);
            }
        }

        String baseAsset = market.getBaseCurrencyShortName();   // Ví dụ: BTC
        String targetAsset = market.getTargetCurrencyShortName(); // Ví dụ: USDT

        // Khóa số dư
        if (request.getSide() == OrderSide.BUY) {
            walletServiceImpl.lockBalance(currentUser.getId(), targetAsset, amountToLock);
        } else {
            amountToLock = request.getQuantity();
            walletServiceImpl.lockBalance(currentUser.getId(), baseAsset, request.getQuantity());
        }

        String clientOrderId = request.getClientOrderId() != null ? request.getClientOrderId() : UUID.randomUUID().toString();
        Order order = Order.builder()
                .clientOrderId(clientOrderId)
                .user(currentUser)
                .market(market)
                .side(request.getSide())
                .orderType(type)
                .status(OrderStatus.NEW)
                .pricePerUnit(orderPrice)
                .totalQuantity(request.getQuantity())
                .remainingQuantity(request.getQuantity())
                .lockedAmount(amountToLock)
                .build();

        Order savedOrder = orderRepository.save(order);
        log.info("User {} đặt lệnh {} {} thành công. OrderId: {}",
                currentUser.getEmail(), order.getSide(), symbol, savedOrder.getId());

        try {
            OrderEvent event = OrderEvent.builder()
                    .orderId(order.getId())
                    .symbol(order.getMarket().getSymbol())
                    .side(order.getSide())
                    .price(order.getPricePerUnit())
                    .quantity(order.getTotalQuantity())
                    .remainingQuantity(order.getRemainingQuantity())
                    .timestamp(order.getCreatedAt() != null ? order.getCreatedAt() : Instant.now())
                    .action("CREATE")
                    .build();

            orderProducer.sendOrderToQueue(event);
        } catch (Exception e) {
            log.error("Lỗi khi đẩy lệnh {} vào Kafka: {}", savedOrder.getId(), e.getMessage());
        }

        return orderMapper.toResponse(savedOrder);
    }

    @Override
    public OrderResponse cancelOrder(String id) {
        User currentUser = getCurrentUser();

        Order order = orderRepository.findById(id).orElseThrow(
                () -> new IllegalArgumentException("Không tìm thấy lệnh với ID: " + id));
        if(!order.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền hủy lệnh của người khác!");
        }

        if(order.getStatus()==OrderStatus.FILLED || order.getStatus()==OrderStatus.CANCELED) {
            throw new RuntimeException("Lệnh đã hoàn thành hoặc đã bị hủy từ trước, không thể hủy tiếp!");
        }

        String baseAsset = order.getMarket().getBaseCurrencyShortName();   // VD: BTC
        String targetAsset = order.getMarket().getTargetCurrencyShortName(); // VD: USDT

        if (order.getSide() == OrderSide.BUY) {
            BigDecimal amountToUnlock = order.getRemainingQuantity().multiply(order.getPricePerUnit());
            walletServiceImpl.unlockBalance(currentUser.getId(), targetAsset, amountToUnlock);
        } else {
            walletServiceImpl.unlockBalance(currentUser.getId(), baseAsset, order.getRemainingQuantity());
        }

        order.setStatus(OrderStatus.CANCELED);

        Order updatedOrder = orderRepository.save(order);

        return orderMapper.toResponse(updatedOrder);
    }

    @Override
    public OrderResponse getOrderById(String id) {
        User currentUser = getCurrentUser();

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lệnh!"));

        // Không cho phép người dùng xem lệnh của người khác
        if (!order.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Truy cập bị từ chối!");
        }

        return orderMapper.toResponse(order);
    }

    @Override
    public Page<OrderResponse> getMyOrders(String marketSymbol, Pageable pageable) {
        User currentUser = getCurrentUser();

        Page<Order> orders;
        if (marketSymbol != null && !marketSymbol.isBlank()) {
            // Lọc theo cặp coin cụ thể
            orders = orderRepository.findByUserIdAndMarket_Symbol(currentUser.getId(), marketSymbol.toUpperCase(), pageable);
        } else {
            // Lấy tất cả
            orders = orderRepository.findByUserId(currentUser.getId(), pageable);
        }

        return orders.map(orderMapper::toResponse);
    }




    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }

        return (User) authentication.getPrincipal();
    }

}
