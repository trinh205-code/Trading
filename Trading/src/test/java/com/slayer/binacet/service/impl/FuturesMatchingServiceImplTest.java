package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.FuturesOrderStatus;
import com.slayer.binacet.Enums.FuturesOrderType;
import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.entity.*;
import com.slayer.binacet.mapper.FuturesPositionMapper;
import com.slayer.binacet.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FuturesMatchingServiceImplTest {

    @Mock
    private FuturesOrderRepository orderRepository;

    @Mock
    private FuturesPositionRepository positionRepository;

    @Mock
    private FuturesTradeRepository tradeRepository;

    @Mock
    private FuturesTransactionRepository transactionRepository;

    @Mock
    private FuturesWalletServiceImpl futuresWalletService;

    @Mock
    private MarketPriceCache marketPriceCache;

    @Mock
    private FuturesPositionMapper futuresPositionMapper;

    @InjectMocks
    private FuturesMatchingServiceImpl matchingService;

    private User testUser;
    private FuturesInstrument btcInstrument;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user-123")
                .email("test@example.com")
                .build();

        btcInstrument = FuturesInstrument.builder()
                .symbol("BTCUSDT")
                .takerFee(new BigDecimal("0.0005"))
                .makerFee(new BigDecimal("0.0002"))
                .build();
    }

    @Test
    @DisplayName("Lệnh không tồn tại -> Ném ngoại lệ RuntimeException")
    void testMatchFuturesOrder_OrderNotFound() {
        when(orderRepository.findById("order-999")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                matchingService.matchFuturesOrder("order-999"));
    }

    @Test
    @DisplayName("Lệnh đã hoàn thành hoặc đã hủy -> Bỏ qua, không khớp")
    void testMatchFuturesOrder_AlreadyFilledOrCancelled() {
        FuturesOrder filledOrder = FuturesOrder.builder()
                .id("order-1")
                .status(FuturesOrderStatus.FILLED)
                .build();

        when(orderRepository.findById("order-1")).thenReturn(Optional.of(filledOrder));

        matchingService.matchFuturesOrder("order-1");

        verifyNoInteractions(marketPriceCache);
        verifyNoInteractions(positionRepository);
    }

    @Test
    @DisplayName("Lệnh LIMIT BUY giá đặt thấp hơn giá thị trường -> Không khớp")
    void testMatchFuturesOrder_LimitBuy_NotFillable() {
        FuturesOrder order = FuturesOrder.builder()
                .id("order-buy-1")
                .status(FuturesOrderStatus.OPEN)
                .orderType(FuturesOrderType.LIMIT)
                .side(OrderSide.BUY)
                .price(new BigDecimal("49000")) // Muốn mua 49k
                .remainingQuantity(new BigDecimal("1.0"))
                .instrument(btcInstrument)
                .build();

        when(orderRepository.findById("order-buy-1")).thenReturn(Optional.of(order));
        when(marketPriceCache.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000")); // Thị trường 50k

        matchingService.matchFuturesOrder("order-buy-1");

        // Không tiến hành khớp vị thế
        verify(positionRepository, never()).findForUpdate(any(), any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Khớp lệnh Mở vị thế mới LONG thành công: Tính đúng margin, trừ fee, chuyển status FILLED")
    void testMatchFuturesOrder_OpenNewLongPosition_Success() {
        // Lệnh MARKET BUY 1 BTC @ 50,000, đòn bẩy 10x
        FuturesOrder order = FuturesOrder.builder()
                .id("order-open-long")
                .user(testUser)
                .instrument(btcInstrument)
                .marginCurrencyShortName("USDT")
                .status(FuturesOrderStatus.OPEN)
                .orderType(FuturesOrderType.MARKET)
                .side(OrderSide.BUY)
                .price(new BigDecimal("50000"))
                .remainingQuantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .build();

        // Ban đầu chưa có vị thế -> mapper tạo mới vị thế trống
        FuturesPosition initialEmptyPosition = FuturesPosition.builder()
                .user(testUser)
                .instrument(btcInstrument)
                .marginCurrencyShortName("USDT")
                .activePos(BigDecimal.ZERO)
                .avgPrice(BigDecimal.ZERO)
                .lockedUserMargin(BigDecimal.ZERO)
                .leverage(new BigDecimal("10"))
                .build();

        when(orderRepository.findById("order-open-long")).thenReturn(Optional.of(order));
        when(marketPriceCache.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000"));
        when(positionRepository.findForUpdate("user-123", "BTCUSDT")).thenReturn(Optional.empty());
        when(futuresPositionMapper.toEntity(order)).thenReturn(initialEmptyPosition);
        when(positionRepository.save(any(FuturesPosition.class))).thenAnswer(i -> i.getArgument(0));

        matchingService.matchFuturesOrder("order-open-long");

        // 1. Kiểm tra vị thế sau khi khớp: LONG 1 BTC @ 50,000, Margin = 5,000 (10x)
        assertEquals(0, new BigDecimal("1.0").compareTo(initialEmptyPosition.getActivePos()));
        assertEquals(0, new BigDecimal("50000").compareTo(initialEmptyPosition.getAvgPrice()));
        assertEquals(0, new BigDecimal("5000.0").compareTo(initialEmptyPosition.getLockedUserMargin()));

        // 2. Phí giao dịch = 1 * 50,000 * 0.0005 = 25 USDT
        verify(futuresWalletService, times(1)).deductFee(eq("user-123"), eq("USDT"), eq(new BigDecimal("25.00000")));

        // 3. Trạng thái lệnh chuyển thành FILLED
        assertEquals(FuturesOrderStatus.FILLED, order.getStatus());
        assertEquals(BigDecimal.ZERO, order.getRemainingQuantity());
        assertEquals(new BigDecimal("1.0"), order.getExecutedQuantity());

        // 4. Lưu trade lịch sử
        verify(tradeRepository, times(1)).save(any(FuturesTrade.class));
    }

    @Test
    @DisplayName("Khớp lệnh Đóng một phần (Partial Close) có LÃI: Hoàn trả 50% margin, cộng realized PnL vào ví")
    void testMatchFuturesOrder_PartialClose_WithProfit() {
        // Đang LONG 2 BTC @ 50,000, margin = 10,000
        FuturesPosition position = FuturesPosition.builder()
                .user(testUser)
                .instrument(btcInstrument)
                .marginCurrencyShortName("USDT")
                .activePos(new BigDecimal("2.0"))
                .avgPrice(new BigDecimal("50000"))
                .lockedUserMargin(new BigDecimal("10000"))
                .leverage(new BigDecimal("10"))
                .build();

        // Lệnh BÁN 1 BTC @ 60,000 (chốt lời 1 nửa)
        FuturesOrder order = FuturesOrder.builder()
                .id("order-close-half")
                .user(testUser)
                .instrument(btcInstrument)
                .marginCurrencyShortName("USDT")
                .status(FuturesOrderStatus.OPEN)
                .orderType(FuturesOrderType.MARKET)
                .side(OrderSide.SELL)
                .price(new BigDecimal("60000"))
                .remainingQuantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .build();

        when(orderRepository.findById("order-close-half")).thenReturn(Optional.of(order));
        when(marketPriceCache.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("60000"));
        when(positionRepository.findForUpdate("user-123", "BTCUSDT")).thenReturn(Optional.of(position));

        matchingService.matchFuturesOrder("order-close-half");

        // 1. Lãi thực nhận = (60,000 - 50,000) * 1 = +10,000 USDT -> cộng vào ví
        verify(futuresWalletService, times(1)).applyRealizedPnl(eq("user-123"), eq("USDT"), eq(new BigDecimal("10000.0")));

        // 2. Margin giải phóng 50% = 5,000 USDT -> hoàn trả margin ví
        verify(futuresWalletService, times(1)).releaseMargin(eq("user-123"), eq("USDT"), eq(new BigDecimal("5000.000000000000000000")));

        // 3. Vị thế còn lại: LONG 1 BTC @ 50,000, margin còn 5,000
        assertEquals(0, new BigDecimal("1.0").compareTo(position.getActivePos()));
        assertEquals(0, new BigDecimal("50000").compareTo(position.getAvgPrice())); // Giá vốn không đổi khi đóng bớt
        assertEquals(0, new BigDecimal("5000.0").compareTo(position.getLockedUserMargin()));

        // 4. Ghi nhận giao dịch lịch sử PnL
        verify(transactionRepository, times(1)).save(any(FuturesTransaction.class));
    }

    @Test
    @DisplayName("Khớp lệnh Đóng toàn bộ (Full Close) bị LỖ: Trả toàn bộ margin, trừ realized PnL trong ví")
    void testMatchFuturesOrder_FullClose_WithLoss() {
        // Đang LONG 1 BTC @ 50,000, margin = 5,000
        FuturesPosition position = FuturesPosition.builder()
                .user(testUser)
                .instrument(btcInstrument)
                .marginCurrencyShortName("USDT")
                .activePos(new BigDecimal("1.0"))
                .avgPrice(new BigDecimal("50000"))
                .lockedUserMargin(new BigDecimal("5000"))
                .leverage(new BigDecimal("10"))
                .build();

        // Lệnh BÁN cắt lỗ 1 BTC @ 45,000
        FuturesOrder order = FuturesOrder.builder()
                .id("order-stop-loss")
                .user(testUser)
                .instrument(btcInstrument)
                .marginCurrencyShortName("USDT")
                .status(FuturesOrderStatus.OPEN)
                .orderType(FuturesOrderType.MARKET)
                .side(OrderSide.SELL)
                .price(new BigDecimal("45000"))
                .remainingQuantity(new BigDecimal("1.0"))
                .leverage(new BigDecimal("10"))
                .build();

        when(orderRepository.findById("order-stop-loss")).thenReturn(Optional.of(order));
        when(marketPriceCache.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("45000"));
        when(positionRepository.findForUpdate("user-123", "BTCUSDT")).thenReturn(Optional.of(position));

        matchingService.matchFuturesOrder("order-stop-loss");

        // 1. Lỗ thực nhận = (45,000 - 50,000) * 1 = -5,000 USDT
        verify(futuresWalletService, times(1)).applyRealizedPnl(eq("user-123"), eq("USDT"), eq(new BigDecimal("-5000.0")));

        // 2. Margin giải phóng toàn bộ = 5,000 USDT
        verify(futuresWalletService, times(1)).releaseMargin(eq("user-123"), eq("USDT"), eq(new BigDecimal("5000")));

        // 3. Vị thế được reset về ZERO
        assertEquals(0, BigDecimal.ZERO.compareTo(position.getActivePos()));
        assertEquals(0, BigDecimal.ZERO.compareTo(position.getAvgPrice()));
        assertEquals(0, BigDecimal.ZERO.compareTo(position.getLockedUserMargin()));
    }

    @Test
    @DisplayName("Khớp lệnh Đảo chiều vị thế (Reverse): Đang LONG 1 BTC -> Bán 2 BTC -> Chuyển thành SHORT 1 BTC")
    void testMatchFuturesOrder_ReversePosition_LongToShort() {
        // Đang LONG 1 BTC @ 50,000, margin = 5,000 (10x)
        FuturesPosition position = FuturesPosition.builder()
                .user(testUser)
                .instrument(btcInstrument)
                .marginCurrencyShortName("USDT")
                .activePos(new BigDecimal("1.0"))
                .avgPrice(new BigDecimal("50000"))
                .lockedUserMargin(new BigDecimal("5000"))
                .leverage(new BigDecimal("10"))
                .build();

        // Lệnh BÁN 2 BTC @ 55,000 (đóng 1 BTC cũ + mở mới 1 BTC SHORT)
        FuturesOrder order = FuturesOrder.builder()
                .id("order-reverse")
                .user(testUser)
                .instrument(btcInstrument)
                .marginCurrencyShortName("USDT")
                .status(FuturesOrderStatus.OPEN)
                .orderType(FuturesOrderType.MARKET)
                .side(OrderSide.SELL)
                .price(new BigDecimal("55000"))
                .remainingQuantity(new BigDecimal("2.0"))
                .leverage(new BigDecimal("10"))
                .build();

        when(orderRepository.findById("order-reverse")).thenReturn(Optional.of(order));
        when(marketPriceCache.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("55000"));
        when(positionRepository.findForUpdate("user-123", "BTCUSDT")).thenReturn(Optional.of(position));

        matchingService.matchFuturesOrder("order-reverse");

        // 1. PnL cho phần đóng 1 BTC cũ: (55,000 - 50,000) * 1 = +5,000
        verify(futuresWalletService, times(1)).applyRealizedPnl(eq("user-123"), eq("USDT"), eq(new BigDecimal("5000.0")));

        // 2. Margin cũ được giải phóng toàn bộ = 5,000
        verify(futuresWalletService, times(1)).releaseMargin(eq("user-123"), eq("USDT"), eq(new BigDecimal("5000")));

        // 3. Margin mới cho 1 BTC SHORT @ 55,000 (10x) = 5,500 USDT -> cần khóa thêm
        verify(futuresWalletService, times(1)).lockMargin(eq("user-123"), eq("USDT"), eq(new BigDecimal("5500.000000000000000000")));

        // 4. Vị thế mới là SHORT -1 BTC @ 55,000
        assertEquals(0, new BigDecimal("-1.0").compareTo(position.getActivePos()));
        assertEquals(0, new BigDecimal("55000").compareTo(position.getAvgPrice()));
        assertEquals(0, new BigDecimal("5500.0").compareTo(position.getLockedUserMargin()));
    }
}
