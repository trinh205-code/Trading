package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.Enums.OrderStatus;
import com.slayer.binacet.Enums.OrderType;
import com.slayer.binacet.cache.MarketPriceCache;
import com.slayer.binacet.entity.Market;
import com.slayer.binacet.entity.Order;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.repository.OrderRepository;
import com.slayer.binacet.service.TradeService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LiveMatchingEngineTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private WalletServiceImpl walletService;

    @Mock
    private MarketPriceCache marketPriceCache;

    @Mock
    private MarketServiceImpl marketService;

    @Mock
    private TradeService tradeService;

    @InjectMocks
    private LiveMatchingEngine liveMatchingEngine;

    private User testUser;
    private Market btcUsdtMarket;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user-spot-1")
                .email("spot@example.com")
                .build();

        btcUsdtMarket = Market.builder()
                .symbol("BTCUSDT")
                .baseCurrencyShortName("BTC")
                .targetCurrencyShortName("USDT")
                .build();
    }

    @Test
    @DisplayName("Lệnh không tồn tại -> Báo lỗi RuntimeException")
    void testMatchSingleOrder_OrderNotFound() {
        when(orderRepository.findById("order-404")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                liveMatchingEngine.matchSingleOrder("order-404"));
    }

    @Test
    @DisplayName("Lệnh đã hoàn thành (FILLED) hoặc đã hủy -> Bỏ qua không xử lý")
    void testMatchSingleOrder_AlreadyFilledOrCancelled() {
        Order filledOrder = Order.builder()
                .id("order-filled")
                .status(OrderStatus.FILLED)
                .build();

        when(orderRepository.findById("order-filled")).thenReturn(Optional.of(filledOrder));

        liveMatchingEngine.matchSingleOrder("order-filled");

        verifyNoInteractions(marketPriceCache);
        verifyNoInteractions(walletService);
    }

    @Test
    @DisplayName("Không lấy được giá thị trường từ Cache và MarketService -> Báo lỗi RuntimeException")
    void testMatchSingleOrder_PriceNotAvailable() {
        Order order = Order.builder()
                .id("order-noprice")
                .status(OrderStatus.NEW)
                .market(btcUsdtMarket)
                .build();

        when(orderRepository.findById("order-noprice")).thenReturn(Optional.of(order));
        when(marketPriceCache.getMarkPrice("BTCUSDT")).thenReturn(null);
        when(marketService.getCurrentPrice("BTCUSDT")).thenReturn(null);

        assertThrows(RuntimeException.class, () ->
                liveMatchingEngine.matchSingleOrder("order-noprice"));
    }

    @Test
    @DisplayName("Lệnh LIMIT BUY giá đặt < giá thị trường -> Không khớp")
    void testMatchSingleOrder_LimitBuy_PriceNotMet() {
        Order order = Order.builder()
                .id("order-buy-unfilled")
                .status(OrderStatus.NEW)
                .orderType(OrderType.LIMIT)
                .side(OrderSide.BUY)
                .pricePerUnit(new BigDecimal("49000")) // Đặt mua 49k
                .market(btcUsdtMarket)
                .build();

        when(orderRepository.findById("order-buy-unfilled")).thenReturn(Optional.of(order));
        when(marketPriceCache.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000")); // Thị trường 50k

        liveMatchingEngine.matchSingleOrder("order-buy-unfilled");

        verifyNoInteractions(walletService);
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Lệnh LIMIT SELL giá đặt > giá thị trường -> Không khớp")
    void testMatchSingleOrder_LimitSell_PriceNotMet() {
        Order order = Order.builder()
                .id("order-sell-unfilled")
                .status(OrderStatus.NEW)
                .orderType(OrderType.LIMIT)
                .side(OrderSide.SELL)
                .pricePerUnit(new BigDecimal("52000")) // Đặt bán 52k
                .market(btcUsdtMarket)
                .build();

        when(orderRepository.findById("order-sell-unfilled")).thenReturn(Optional.of(order));
        when(marketPriceCache.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000")); // Thị trường 50k

        liveMatchingEngine.matchSingleOrder("order-sell-unfilled");

        verifyNoInteractions(walletService);
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Khớp lệnh MUA (BUY): Khấu trừ tiền khóa, hoàn trả tiền dư (Refund), trừ phí giao dịch và cộng Coin")
    void testMatchSingleOrder_Buy_FilledWithRefund() {
        // Đặt mua 1 BTC giá limit 52,000 USDT -> Đã khóa 52,000 USDT
        // Giá khớp thực tế tại thị trường là 50,000 USDT
        Order order = Order.builder()
                .id("order-buy-success")
                .user(testUser)
                .market(btcUsdtMarket)
                .status(OrderStatus.NEW)
                .orderType(OrderType.LIMIT)
                .side(OrderSide.BUY)
                .pricePerUnit(new BigDecimal("52000"))
                .lockedAmount(new BigDecimal("52000"))
                .remainingQuantity(new BigDecimal("1.0"))
                .build();

        when(orderRepository.findById("order-buy-success")).thenReturn(Optional.of(order));
        when(marketPriceCache.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000"));

        liveMatchingEngine.matchSingleOrder("order-buy-success");

        // 1. Trừ toàn bộ số USDT đã khóa (52,000)
        verify(walletService, times(1)).deductLockedBalance(eq("user-spot-1"), eq("USDT"), argThat(amt -> amt.compareTo(new BigDecimal("52000")) == 0));

        // 2. Hoàn trả tiền thừa: 52,000 - (1.0 * 50,000) = 2,000 USDT
        verify(walletService, times(1)).addAvailableBalance(eq("user-spot-1"), eq("USDT"), argThat(amt -> amt.compareTo(new BigDecimal("2000")) == 0));

        // 3. Phí giao dịch 0.1% của 1 BTC = 0.001 BTC. Nhận thực tế = 0.999 BTC
        verify(walletService, times(1)).addAvailableBalance(eq("user-spot-1"), eq("BTC"), argThat(amt -> amt.compareTo(new BigDecimal("0.999")) == 0));

        // 4. Ghi nhận giao dịch khớp lệnh với sàn ngoài
        verify(tradeService, times(1)).recordExternalMatch(eq(order), argThat(p -> p.compareTo(new BigDecimal("50000")) == 0), argThat(q -> q.compareTo(new BigDecimal("1.0")) == 0), eq("BINANCE"), any());

        // 5. Cập nhật trạng thái lệnh thành FILLED và avgPrice = 50000
        assertEquals(OrderStatus.FILLED, order.getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(order.getRemainingQuantity()));
        assertEquals(new BigDecimal("50000"), order.getAvgPrice());
        verify(orderRepository, times(1)).save(order);
    }

    @Test
    @DisplayName("Khớp lệnh BÁN (SELL): Khấu trừ Coin bị khóa, trừ phí giao dịch và cộng USDT vào ví")
    void testMatchSingleOrder_Sell_FilledSuccess() {
        // Bán 2 BTC giá MARKET tại giá 50,000 USDT
        Order order = Order.builder()
                .id("order-sell-success")
                .user(testUser)
                .market(btcUsdtMarket)
                .status(OrderStatus.NEW)
                .orderType(OrderType.MARKET)
                .side(OrderSide.SELL)
                .remainingQuantity(new BigDecimal("2.0"))
                .build();

        when(orderRepository.findById("order-sell-success")).thenReturn(Optional.of(order));
        when(marketPriceCache.getMarkPrice("BTCUSDT")).thenReturn(new BigDecimal("50000"));

        liveMatchingEngine.matchSingleOrder("order-sell-success");

        // 1. Khấu trừ 2.0 BTC đã khóa
        verify(walletService, times(1)).deductLockedBalance(eq("user-spot-1"), eq("BTC"), argThat(amt -> amt.compareTo(new BigDecimal("2.0")) == 0));

        // 2. Tổng giá trị bán = 2.0 * 50,000 = 100,000 USDT
        // Phí 0.1% = 100 USDT. Nhận thực tế = 99,900 USDT
        verify(walletService, times(1)).addAvailableBalance(eq("user-spot-1"), eq("USDT"), argThat(amt -> amt.compareTo(new BigDecimal("99900")) == 0));

        // 3. Ghi nhận Trade
        verify(tradeService, times(1)).recordExternalMatch(eq(order), argThat(p -> p.compareTo(new BigDecimal("50000")) == 0), argThat(q -> q.compareTo(new BigDecimal("2.0")) == 0), eq("BINANCE"), any());

        // 4. Trạng thái lệnh FILLED
        assertEquals(OrderStatus.FILLED, order.getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(order.getRemainingQuantity()));
        assertEquals(new BigDecimal("50000"), order.getAvgPrice());
        verify(orderRepository, times(1)).save(order);
    }
}
