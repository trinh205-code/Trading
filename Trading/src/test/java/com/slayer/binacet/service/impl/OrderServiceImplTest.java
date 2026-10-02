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
import com.slayer.binacet.mapper.OrderEventMapper;
import com.slayer.binacet.mapper.OrderMapper;
import com.slayer.binacet.repository.MarketRepository;
import com.slayer.binacet.repository.OrderRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private MarketRepository marketRepository;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private OrderEventMapper orderEventMapper;

    @Mock
    private WalletServiceImpl walletServiceImpl;

    @Mock
    private MarketPriceCache marketPriceCache;

    @Mock
    private OrderProducer orderProducer;

    @Mock
    private MarketServiceImpl marketService;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User testUser;
    private Market btcUsdtMarket;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user-spot-1")
                .email("spotuser@example.com")
                .build();

        btcUsdtMarket = Market.builder()
                .symbol("BTCUSDT")
                .status("TRADING")
                .minQuantity(new BigDecimal("0.0001"))
                .baseCurrencyShortName("BTC")
                .targetCurrencyShortName("USDT")
                .build();

        Authentication authentication = mock(Authentication.class);
        lenient().when(authentication.isAuthenticated()).thenReturn(true);
        lenient().when(authentication.getPrincipal()).thenReturn(testUser);

        SecurityContext securityContext = mock(SecurityContext.class);
        lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("createOrder: Báo lỗi khi cặp giao dịch không tồn tại")
    void testCreateOrder_MarketNotFound() {
        CreateOrderRequest request = CreateOrderRequest.builder()
                .symbol("UNKNOWNUSDT")
                .quantity(new BigDecimal("1.0"))
                .build();

        when(marketRepository.findById("UNKNOWNUSDT")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> orderService.createOrder(request));
    }

    @Test
    @DisplayName("createOrder: Báo lỗi khi cặp giao dịch đang tạm ngưng")
    void testCreateOrder_MarketNotTrading() {
        Market suspendedMarket = Market.builder()
                .symbol("BTCUSDT")
                .status("SUSPENDED")
                .build();

        CreateOrderRequest request = CreateOrderRequest.builder()
                .symbol("BTCUSDT")
                .quantity(new BigDecimal("1.0"))
                .build();

        when(marketRepository.findById("BTCUSDT")).thenReturn(Optional.of(suspendedMarket));

        assertThrows(RuntimeException.class, () -> orderService.createOrder(request));
    }

    @Test
    @DisplayName("createOrder: Báo lỗi khi số lượng đặt lệnh nhỏ hơn minQuantity")
    void testCreateOrder_QuantityLessThanMin() {
        CreateOrderRequest request = CreateOrderRequest.builder()
                .symbol("BTCUSDT")
                .quantity(new BigDecimal("0.00001"))
                .build();

        when(marketRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcUsdtMarket));

        assertThrows(IllegalArgumentException.class, () -> orderService.createOrder(request));
    }

    @Test
    @DisplayName("createOrder: Lệnh LIMIT yêu cầu giá phải > 0")
    void testCreateOrder_LimitPriceInvalid() {
        CreateOrderRequest requestNoPrice = CreateOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(OrderType.LIMIT)
                .side(OrderSide.BUY)
                .quantity(new BigDecimal("1.0"))
                .price(BigDecimal.ZERO)
                .build();

        when(marketRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcUsdtMarket));

        assertThrows(IllegalArgumentException.class, () -> orderService.createOrder(requestNoPrice));
    }

    @Test
    @DisplayName("createOrder: Đặt lệnh LIMIT BUY thành công, khóa số dư USDT và bắn Kafka event")
    void testCreateOrder_LimitBuy_Success() {
        CreateOrderRequest request = CreateOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(OrderType.LIMIT)
                .side(OrderSide.BUY)
                .price(new BigDecimal("50000"))
                .quantity(new BigDecimal("0.5"))
                .build();

        Order orderEntity = Order.builder()
                .id("order-1")
                .user(testUser)
                .market(btcUsdtMarket)
                .side(OrderSide.BUY)
                .orderType(OrderType.LIMIT)
                .status(OrderStatus.NEW)
                .pricePerUnit(new BigDecimal("50000"))
                .totalQuantity(new BigDecimal("0.5"))
                .remainingQuantity(new BigDecimal("0.5"))
                .lockedAmount(new BigDecimal("25000"))
                .build();

        when(marketRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcUsdtMarket));
        when(orderMapper.toEntity(eq(request), eq(testUser), eq(btcUsdtMarket), any(), eq(new BigDecimal("50000")), any()))
                .thenReturn(orderEntity);
        when(orderRepository.save(orderEntity)).thenReturn(orderEntity);
        when(orderMapper.toResponse(orderEntity)).thenReturn(OrderResponse.builder()
                .id("order-1")
                .symbol("BTCUSDT")
                .status(OrderStatus.NEW)
                .build());

        OrderResponse response = orderService.createOrder(request);

        assertNotNull(response);
        // Khóa tiền: 50,000 * 0.5 = 25,000 USDT
        verify(walletServiceImpl).lockBalance(eq("user-spot-1"), eq("USDT"), argThat(amt -> amt.compareTo(new BigDecimal("25000")) == 0));
        verify(orderRepository).save(orderEntity);
        verify(orderProducer).sendOrderToQueue(any());
    }

    @Test
    @DisplayName("createOrder: Đặt lệnh LIMIT SELL thành công, khóa Coin (BTC)")
    void testCreateOrder_LimitSell_Success() {
        CreateOrderRequest request = CreateOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(OrderType.LIMIT)
                .side(OrderSide.SELL)
                .price(new BigDecimal("52000"))
                .quantity(new BigDecimal("1.5"))
                .build();

        Order orderEntity = Order.builder()
                .id("order-2")
                .user(testUser)
                .market(btcUsdtMarket)
                .side(OrderSide.SELL)
                .orderType(OrderType.LIMIT)
                .status(OrderStatus.NEW)
                .pricePerUnit(new BigDecimal("52000"))
                .totalQuantity(new BigDecimal("1.5"))
                .build();

        when(marketRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcUsdtMarket));
        when(orderMapper.toEntity(eq(request), eq(testUser), eq(btcUsdtMarket), any(), eq(new BigDecimal("52000")), any()))
                .thenReturn(orderEntity);
        when(orderRepository.save(orderEntity)).thenReturn(orderEntity);
        when(orderMapper.toResponse(orderEntity)).thenReturn(OrderResponse.builder().id("order-2").build());

        orderService.createOrder(request);

        // Khóa 1.5 BTC
        verify(walletServiceImpl).lockBalance(eq("user-spot-1"), eq("BTC"), argThat(amt -> amt.compareTo(new BigDecimal("1.5")) == 0));
        verify(orderRepository).save(orderEntity);
    }

    @Test
    @DisplayName("createOrder: Lệnh MARKET BUY tính thêm buffer 5% trượt giá khi khóa tiền")
    void testCreateOrder_MarketBuy_WithBuffer() {
        CreateOrderRequest request = CreateOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(OrderType.MARKET)
                .side(OrderSide.BUY)
                .quantity(new BigDecimal("1.0"))
                .build();

        Order orderEntity = Order.builder()
                .id("order-3")
                .user(testUser)
                .market(btcUsdtMarket)
                .side(OrderSide.BUY)
                .orderType(OrderType.MARKET)
                .status(OrderStatus.NEW)
                .build();

        when(marketRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcUsdtMarket));
        when(marketPriceCache.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000"));
        when(orderMapper.toEntity(any(), any(), any(), any(), any(), any())).thenReturn(orderEntity);
        when(orderRepository.save(any())).thenReturn(orderEntity);
        when(orderMapper.toResponse(any())).thenReturn(OrderResponse.builder().id("order-3").build());

        orderService.createOrder(request);

        // Giá thị trường 50,000 * 1.05 = 52,500 USDT khóa cho 1 BTC
        verify(walletServiceImpl).lockBalance(eq("user-spot-1"), eq("USDT"), argThat(amt -> amt.compareTo(new BigDecimal("52500")) == 0));
    }

    @Test
    @DisplayName("cancelOrder: Báo lỗi khi đơn không tồn tại")
    void testCancelOrder_NotFound() {
        when(orderRepository.findById("order-999")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> orderService.cancelOrder("order-999"));
    }

    @Test
    @DisplayName("cancelOrder: Báo lỗi khi người dùng không sở hữu đơn")
    void testCancelOrder_Forbidden() {
        User otherUser = User.builder().id("other-user").build();
        Order order = Order.builder()
                .id("order-other")
                .user(otherUser)
                .build();

        when(orderRepository.findById("order-other")).thenReturn(Optional.of(order));

        assertThrows(RuntimeException.class, () -> orderService.cancelOrder("order-other"));
    }

    @Test
    @DisplayName("cancelOrder: Báo lỗi khi đơn đã FILLED hoặc CANCELED")
    void testCancelOrder_AlreadyClosed() {
        Order order = Order.builder()
                .id("order-filled")
                .user(testUser)
                .status(OrderStatus.FILLED)
                .build();

        when(orderRepository.findById("order-filled")).thenReturn(Optional.of(order));

        assertThrows(RuntimeException.class, () -> orderService.cancelOrder("order-filled"));
    }

    @Test
    @DisplayName("cancelOrder: Hủy lệnh BUY thành công, hoàn trả số tiền USDT chưa khớp")
    void testCancelOrder_BuyOrder_Success() {
        Order order = Order.builder()
                .id("order-buy")
                .user(testUser)
                .market(btcUsdtMarket)
                .side(OrderSide.BUY)
                .status(OrderStatus.NEW)
                .pricePerUnit(new BigDecimal("50000"))
                .remainingQuantity(new BigDecimal("0.5"))
                .build();

        when(orderRepository.findById("order-buy")).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);
        when(orderMapper.toResponse(order)).thenReturn(OrderResponse.builder().id("order-buy").status(OrderStatus.CANCELED).build());

        OrderResponse response = orderService.cancelOrder("order-buy");

        assertNotNull(response);
        assertEquals(OrderStatus.CANCELED, order.getStatus());
        // Hoàn trả: 0.5 * 50,000 = 25,000 USDT
        verify(walletServiceImpl).unlockBalance(eq("user-spot-1"), eq("USDT"), argThat(amt -> amt.compareTo(new BigDecimal("25000")) == 0));
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("cancelOrder: Hủy lệnh SELL thành công, hoàn trả số Coin chưa khớp")
    void testCancelOrder_SellOrder_Success() {
        Order order = Order.builder()
                .id("order-sell")
                .user(testUser)
                .market(btcUsdtMarket)
                .side(OrderSide.SELL)
                .status(OrderStatus.NEW)
                .remainingQuantity(new BigDecimal("2.0"))
                .build();

        when(orderRepository.findById("order-sell")).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);
        when(orderMapper.toResponse(order)).thenReturn(OrderResponse.builder().id("order-sell").status(OrderStatus.CANCELED).build());

        OrderResponse response = orderService.cancelOrder("order-sell");

        assertNotNull(response);
        assertEquals(OrderStatus.CANCELED, order.getStatus());
        // Hoàn trả: 2.0 BTC
        verify(walletServiceImpl).unlockBalance(eq("user-spot-1"), eq("BTC"), argThat(amt -> amt.compareTo(new BigDecimal("2.0")) == 0));
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("getOrderById: Lấy chi tiết lệnh thành công")
    void testGetOrderById_Success() {
        Order order = Order.builder()
                .id("order-1")
                .user(testUser)
                .build();

        when(orderRepository.findById("order-1")).thenReturn(Optional.of(order));
        when(orderMapper.toResponse(order)).thenReturn(OrderResponse.builder().id("order-1").build());

        OrderResponse response = orderService.getOrderById("order-1");

        assertNotNull(response);
        assertEquals("order-1", response.getId());
    }

    @Test
    @DisplayName("getMyOrders: Lọc theo mã symbol")
    void testGetMyOrders_WithSymbol() {
        Pageable pageable = PageRequest.of(0, 10);
        Order order = Order.builder().id("order-1").user(testUser).build();
        Page<Order> orderPage = new PageImpl<>(List.of(order));

        when(orderRepository.findByUserIdAndMarket_Symbol("user-spot-1", "BTCUSDT", pageable))
                .thenReturn(orderPage);
        when(orderMapper.toResponse(order)).thenReturn(OrderResponse.builder().id("order-1").build());

        Page<OrderResponse> result = orderService.getMyOrders("BTCUSDT", pageable);

        assertEquals(1, result.getTotalElements());
        verify(orderRepository).findByUserIdAndMarket_Symbol("user-spot-1", "BTCUSDT", pageable);
    }
}
