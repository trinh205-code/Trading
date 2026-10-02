package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.FuturesOrderStatus;
import com.slayer.binacet.Enums.FuturesOrderType;
import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.dto.event.OrderEvent;
import com.slayer.binacet.dto.request.CreateFuturesOrderRequest;
import com.slayer.binacet.dto.response.FuturesOrderResponse;
import com.slayer.binacet.entity.FuturesInstrument;
import com.slayer.binacet.entity.FuturesOrder;
import com.slayer.binacet.entity.FuturesPosition;
import com.slayer.binacet.entity.FuturesWallet;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.event.FuturesOrderProducer;
import com.slayer.binacet.mapper.FuturesOrderMapper;
import com.slayer.binacet.mapper.OrderEventMapper;
import com.slayer.binacet.repository.FuturesInstrumentRepository;
import com.slayer.binacet.repository.FuturesOrderRepository;
import com.slayer.binacet.repository.FuturesPositionRepository;
import com.slayer.binacet.repository.FuturesWalletRepository;
import com.slayer.binacet.service.FuturesPnLService;
import com.slayer.binacet.service.FuturesWalletService;
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
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FuturesOrderServiceImplTest {

    @Mock
    private FuturesOrderRepository futuresOrderRepository;

    @Mock
    private FuturesInstrumentRepository instrumentRepository;

    @Mock
    private FuturesWalletRepository futuresWalletRepository;

    @Mock
    private FuturesPositionRepository futuresPositionRepository;

    @Mock
    private FuturesPnLService futuresPnLService;

    @Mock
    private FuturesOrderMapper futuresOrderMapper;

    @Mock
    private OrderEventMapper orderEventMapper;

    @Mock
    private FuturesMatchingServiceImpl matchingEngineService;

    @Mock
    private FuturesMarketSyncService futuresMarketSyncService;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Mock
    private FuturesWalletService futuresWalletService;

    @Mock
    private FuturesOrderProducer futuresOrderProducer;

    @InjectMocks
    private FuturesOrderServiceImpl futuresOrderService;

    private User testUser;
    private FuturesInstrument btcInstrument;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user-futures-1")
                .email("futuresuser@example.com")
                .build();

        btcInstrument = FuturesInstrument.builder()
                .symbol("BTCUSDT")
                .baseAsset("BTC")
                .quoteAsset("USDT")
                .marginCurrencyShortName("USDT")
                .status("active")
                .maintenanceMarginRate(new BigDecimal("0.005"))
                .takerFee(new BigDecimal("0.0005"))
                .makerFee(new BigDecimal("0.0002"))
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
    @DisplayName("createFuturesOrder: Báo lỗi khi cặp giao dịch không tồn tại")
    void testCreateFuturesOrder_InstrumentNotFound() {
        CreateFuturesOrderRequest request = CreateFuturesOrderRequest.builder()
                .symbol("ETHUSDT")
                .build();

        when(instrumentRepository.findById("ETHUSDT")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                futuresOrderService.createFuturesOrder(request));
    }

    @Test
    @DisplayName("createFuturesOrder: Báo lỗi khi cặp giao dịch không active")
    void testCreateFuturesOrder_InstrumentNotActive() {
        FuturesInstrument inactiveInst = FuturesInstrument.builder()
                .symbol("BTCUSDT")
                .status("inactive")
                .build();

        CreateFuturesOrderRequest request = CreateFuturesOrderRequest.builder()
                .symbol("BTCUSDT")
                .build();

        when(instrumentRepository.findById("BTCUSDT")).thenReturn(Optional.of(inactiveInst));

        assertThrows(RuntimeException.class, () ->
                futuresOrderService.createFuturesOrder(request));
    }

    @Test
    @DisplayName("createFuturesOrder: Lệnh LIMIT yêu cầu giá > 0")
    void testCreateFuturesOrder_LimitNoPrice() {
        CreateFuturesOrderRequest request = CreateFuturesOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(FuturesOrderType.LIMIT)
                .side(OrderSide.BUY)
                .price(BigDecimal.ZERO)
                .quantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .build();

        when(instrumentRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcInstrument));

        assertThrows(RuntimeException.class, () ->
                futuresOrderService.createFuturesOrder(request));
    }

    @Test
    @DisplayName("createFuturesOrder: Báo lỗi khi giá đặt BUY cao hơn 10% giá thị trường")
    void testCreateFuturesOrder_PriceBand_BuyTooHigh() {
        CreateFuturesOrderRequest request = CreateFuturesOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(FuturesOrderType.LIMIT)
                .side(OrderSide.BUY)
                .price(new BigDecimal("56000")) // > 50,000 * 1.10 = 55,000
                .quantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .build();

        when(instrumentRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcInstrument));
        when(futuresMarketSyncService.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000"));

        assertThrows(RuntimeException.class, () ->
                futuresOrderService.createFuturesOrder(request));
    }

    @Test
    @DisplayName("createFuturesOrder: Báo lỗi khi giá đặt SELL thấp hơn 10% giá thị trường")
    void testCreateFuturesOrder_PriceBand_SellTooLow() {
        CreateFuturesOrderRequest request = CreateFuturesOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(FuturesOrderType.LIMIT)
                .side(OrderSide.SELL)
                .price(new BigDecimal("44000")) // < 50,000 * 0.90 = 45,000
                .quantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .build();

        when(instrumentRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcInstrument));
        when(futuresMarketSyncService.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000"));

        assertThrows(RuntimeException.class, () ->
                futuresOrderService.createFuturesOrder(request));
    }

    @Test
    @DisplayName("createFuturesOrder: Báo lỗi khi số dư khả dụng ký quỹ không đủ")
    void testCreateFuturesOrder_InsufficientMargin() {
        CreateFuturesOrderRequest request = CreateFuturesOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(FuturesOrderType.LIMIT)
                .side(OrderSide.BUY)
                .price(new BigDecimal("50000"))
                .quantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10")) // Cần 50,000 * 1 / 10 = 5,000 USDT
                .build();

        FuturesWallet wallet = FuturesWallet.builder()
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("1000")) // Chỉ có 1,000 khả dụng
                .lockedBalance(BigDecimal.ZERO)
                .build();

        when(instrumentRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcInstrument));
        when(futuresMarketSyncService.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000"));
        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT")).thenReturn(Optional.of(wallet));

        assertThrows(RuntimeException.class, () ->
                futuresOrderService.createFuturesOrder(request));
    }

    @Test
    @DisplayName("createFuturesOrder: Đặt lệnh LIMIT BUY thành công, khóa ký quỹ và gửi vào Queue")
    void testCreateFuturesOrder_LimitBuy_Success() {
        CreateFuturesOrderRequest request = CreateFuturesOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(FuturesOrderType.LIMIT)
                .side(OrderSide.BUY)
                .price(new BigDecimal("50000"))
                .quantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .build();

        FuturesWallet wallet = FuturesWallet.builder()
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("10000"))
                .lockedBalance(BigDecimal.ZERO)
                .build();

        FuturesOrder order = FuturesOrder.builder()
                .id("fo-1")
                .user(testUser)
                .instrument(btcInstrument)
                .orderType(FuturesOrderType.LIMIT)
                .side(OrderSide.BUY)
                .price(new BigDecimal("50000"))
                .totalQuantity(new BigDecimal("1.0"))
                .remainingQuantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .status(FuturesOrderStatus.OPEN)
                .build();

        when(instrumentRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcInstrument));
        when(futuresMarketSyncService.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000"));
        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT")).thenReturn(Optional.of(wallet));
        when(futuresOrderMapper.toEntity(eq(request), eq(testUser), eq(btcInstrument), any())).thenReturn(order);
        when(futuresOrderRepository.save(order)).thenReturn(order);
        when(futuresOrderMapper.toResponse(order)).thenReturn(FuturesOrderResponse.builder().id("fo-1").build());

        FuturesOrderResponse response = futuresOrderService.createFuturesOrder(request);

        assertNotNull(response);
        // Khóa Margin = 50,000 * 1 / 10 = 5,000 USDT
        verify(futuresWalletService).lockMargin(eq("user-futures-1"), eq("USDT"), argThat(amt -> amt.compareTo(new BigDecimal("5000")) == 0));
        verify(futuresOrderRepository).save(order);
        verify(futuresOrderProducer).sendOrderToQueue(any());
    }

    @Test
    @DisplayName("createFuturesOrder: Đặt lệnh MARKET gọi trực tiếp Matching Engine")
    void testCreateFuturesOrder_MarketOrder_CallsMatchingEngine() {
        CreateFuturesOrderRequest request = CreateFuturesOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(FuturesOrderType.MARKET)
                .side(OrderSide.BUY)
                .quantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .build();

        FuturesWallet wallet = FuturesWallet.builder()
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("10000"))
                .lockedBalance(BigDecimal.ZERO)
                .build();

        FuturesOrder order = FuturesOrder.builder()
                .id("fo-market-1")
                .user(testUser)
                .instrument(btcInstrument)
                .orderType(FuturesOrderType.MARKET)
                .side(OrderSide.BUY)
                .status(FuturesOrderStatus.OPEN)
                .build();

        when(instrumentRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcInstrument));
        when(futuresMarketSyncService.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000"));
        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT")).thenReturn(Optional.of(wallet));
        when(futuresOrderMapper.toEntity(eq(request), eq(testUser), eq(btcInstrument), any())).thenReturn(order);
        when(futuresOrderRepository.save(order)).thenReturn(order);
        when(futuresOrderMapper.toResponse(order)).thenReturn(FuturesOrderResponse.builder().id("fo-market-1").build());

        futuresOrderService.createFuturesOrder(request);

        // Khớp lệnh Market ngay lập tức
        verify(matchingEngineService).matchFuturesOrder("fo-market-1");
        verifyNoInteractions(futuresOrderProducer);
    }

    @Test
    @DisplayName("createFuturesOrder: Lệnh Reduce-Only báo lỗi khi không có vị thế mở")
    void testCreateFuturesOrder_ReduceOnly_NoPosition() {
        CreateFuturesOrderRequest request = CreateFuturesOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(FuturesOrderType.LIMIT)
                .side(OrderSide.SELL)
                .price(new BigDecimal("51000"))
                .quantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .reduceOnly(true)
                .build();

        when(instrumentRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcInstrument));
        when(futuresMarketSyncService.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000"));
        when(futuresPositionRepository.findByUser_IdAndInstrument_Symbol("user-futures-1", "BTCUSDT"))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                futuresOrderService.createFuturesOrder(request));
    }
    
    @Test
    @DisplayName("createFuturesOrder: Lệnh Reduce-Only thành công không khóa thêm margin")
    void testCreateFuturesOrder_ReduceOnly_Success() {
        CreateFuturesOrderRequest request = CreateFuturesOrderRequest.builder()
                .symbol("BTCUSDT")
                .orderType(FuturesOrderType.LIMIT)
                .side(OrderSide.SELL)
                .price(new BigDecimal("51000"))
                .quantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .reduceOnly(true)
                .build();

        FuturesPosition position = FuturesPosition.builder()
                .user(testUser)
                .instrument(btcInstrument)
                .activePos(new BigDecimal("2.0")) // Đang LONG 2 BTC
                .build();

        FuturesOrder order = FuturesOrder.builder()
                .id("fo-reduce-1")
                .user(testUser)
                .instrument(btcInstrument)
                .orderType(FuturesOrderType.LIMIT)
                .side(OrderSide.SELL)
                .status(FuturesOrderStatus.OPEN)
                .build();

        when(instrumentRepository.findById("BTCUSDT")).thenReturn(Optional.of(btcInstrument));
        when(futuresMarketSyncService.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000"));
        when(futuresPositionRepository.findByUser_IdAndInstrument_Symbol("user-futures-1", "BTCUSDT"))
                .thenReturn(Optional.of(position));
        when(futuresOrderRepository.findByUser_IdAndInstrument_SymbolAndStatusIn(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(futuresOrderMapper.toEntity(any(), any(), any(), any())).thenReturn(order);
        when(futuresOrderRepository.save(order)).thenReturn(order);
        when(futuresOrderMapper.toResponse(order)).thenReturn(FuturesOrderResponse.builder().id("fo-reduce-1").build());

        futuresOrderService.createFuturesOrder(request);

        // Reduce Only không khóa thêm margin
        verify(futuresWalletService, never()).lockMargin(any(), any(), any());
        verify(futuresOrderRepository).save(order);
    }

    @Test
    @DisplayName("cancelFuturesOrder: Báo lỗi khi đơn không tồn tại hoặc không phải chủ sở hữu")
    void testCancelFuturesOrder_NotFoundOrForbidden() {
        when(futuresOrderRepository.findById("fo-404")).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () ->
                futuresOrderService.cancelFuturesOrder("fo-404"));

        User other = User.builder().id("other-user").build();
        FuturesOrder orderOther = FuturesOrder.builder().id("fo-other").user(other).build();
        when(futuresOrderRepository.findById("fo-other")).thenReturn(Optional.of(orderOther));

        assertThrows(RuntimeException.class, () ->
                futuresOrderService.cancelFuturesOrder("fo-other"));
    }

    @Test
    @DisplayName("cancelFuturesOrder: Hủy lệnh thành công, giải phóng margin chưa khớp về ví")
    void testCancelFuturesOrder_Success() {
        FuturesOrder order = FuturesOrder.builder()
                .id("fo-cancel")
                .user(testUser)
                .marginCurrencyShortName("USDT")
                .price(new BigDecimal("50000"))
                .remainingQuantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .status(FuturesOrderStatus.OPEN)
                .build();

        FuturesWallet wallet = FuturesWallet.builder()
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("5000"))
                .lockedBalance(new BigDecimal("5000"))
                .build();

        when(futuresOrderRepository.findById("fo-cancel")).thenReturn(Optional.of(order));
        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT")).thenReturn(Optional.of(wallet));
        when(futuresOrderRepository.save(order)).thenReturn(order);
        when(futuresOrderMapper.toResponse(order)).thenReturn(FuturesOrderResponse.builder().id("fo-cancel").status("CANCELLED").build());

        FuturesOrderResponse response = futuresOrderService.cancelFuturesOrder("fo-cancel");

        assertNotNull(response);
        assertEquals(FuturesOrderStatus.CANCELLED, order.getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(order.getRemainingQuantity()));

        // Margin giải phóng: 1.0 * 50,000 / 10 = 5,000 USDT
        assertEquals(0, new BigDecimal("10000").compareTo(wallet.getBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(wallet.getLockedBalance()));
        verify(futuresWalletRepository).save(wallet);
        verify(futuresOrderRepository).save(order);
    }

    @Test
    @DisplayName("getMyFuturesOrders: Phân trang danh sách lệnh Futures")
    void testGetMyFuturesOrders() {
        Pageable pageable = PageRequest.of(0, 10);
        FuturesOrder order = FuturesOrder.builder().id("fo-1").build();
        Page<FuturesOrder> page = new PageImpl<>(List.of(order));

        when(futuresOrderRepository.findByUserId("user-futures-1", pageable)).thenReturn(page);
        when(futuresOrderMapper.toResponse(order)).thenReturn(FuturesOrderResponse.builder().id("fo-1").build());

        Page<FuturesOrderResponse> result = futuresOrderService.getMyFuturesOrders(null, null, pageable);

        assertEquals(1, result.getTotalElements());
        verify(futuresOrderRepository).findByUserId("user-futures-1", pageable);
    }
}
