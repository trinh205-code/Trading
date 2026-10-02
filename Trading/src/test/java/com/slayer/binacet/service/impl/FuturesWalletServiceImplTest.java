package com.slayer.binacet.service.impl;

import com.slayer.binacet.dto.response.FuturesWalletResponse;
import com.slayer.binacet.entity.FuturesWallet;
import com.slayer.binacet.entity.FuturesWalletTransaction;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.entity.WalletBalance;
import com.slayer.binacet.mapper.FuturesWalletMapper;
import com.slayer.binacet.repository.FuturesWalletRepository;
import com.slayer.binacet.repository.FuturesWalletTransactionRepository;
import com.slayer.binacet.repository.MarketRepository;
import com.slayer.binacet.repository.UserRepository;
import com.slayer.binacet.repository.WalletBalanceRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FuturesWalletServiceImplTest {

    @Mock
    private FuturesWalletRepository futuresWalletRepository;

    @Mock
    private FuturesWalletTransactionRepository futuresWalletTransactionRepository;

    @Mock
    private WalletBalanceRepository walletBalanceRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FuturesWalletMapper futuresWalletMapper;

    @Mock
    private MarketRepository marketRepository;

    @InjectMocks
    private FuturesWalletServiceImpl futuresWalletService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user-futures-1")
                .email("futures@example.com")
                .build();

        // Cài đặt SecurityContext mock cho các hàm gọi getCurrentUser()
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
    @DisplayName("getMyFuturesWallet: Lấy danh sách ví Futures của người dùng hiện tại")
    void testGetMyFuturesWallet() {
        FuturesWallet fw = FuturesWallet.builder()
                .id("fw-1")
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("1000"))
                .lockedBalance(new BigDecimal("200"))
                .build();

        when(futuresWalletRepository.findByUserId("user-futures-1")).thenReturn(List.of(fw));
        when(futuresWalletMapper.toResponse(fw)).thenReturn(FuturesWalletResponse.builder()
                .id("fw-1")
                .currencyShortName("USDT")
                .balance(new BigDecimal("1000"))
                .lockedBalance(new BigDecimal("200"))
                .build());

        List<FuturesWalletResponse> response = futuresWalletService.getMyFuturesWallet();

        assertEquals(1, response.size());
        assertEquals("USDT", response.get(0).getCurrencyShortName());
        assertEquals(0, new BigDecimal("1000").compareTo(response.get(0).getBalance()));
    }

    @Test
    @DisplayName("transferToFutures: Báo lỗi khi số tiền chuyển <= 0")
    void testTransferToFutures_InvalidAmount() {
        assertThrows(IllegalArgumentException.class, () ->
                futuresWalletService.transferToFutures("USDT", BigDecimal.ZERO));

        assertThrows(IllegalArgumentException.class, () ->
                futuresWalletService.transferToFutures("USDT", new BigDecimal("-10")));
    }

    @Test
    @DisplayName("transferToFutures: Báo lỗi khi ví Spot không tồn tại")
    void testTransferToFutures_SpotWalletNotFound() {
        when(walletBalanceRepository.findByUserIdAndCurrencyForUpdate("user-futures-1", "USDT"))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                futuresWalletService.transferToFutures("USDT", new BigDecimal("100")));
    }

    @Test
    @DisplayName("transferToFutures: Báo lỗi khi số dư ví Spot không đủ")
    void testTransferToFutures_InsufficientSpotBalance() {
        WalletBalance spot = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("50"))
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrencyForUpdate("user-futures-1", "USDT"))
                .thenReturn(Optional.of(spot));

        assertThrows(RuntimeException.class, () ->
                futuresWalletService.transferToFutures("USDT", new BigDecimal("100")));
    }

    @Test
    @DisplayName("transferToFutures: Chuyển tiền từ Spot sang Futures thành công")
    void testTransferToFutures_Success() {
        WalletBalance spot = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("500"))
                .build();

        FuturesWallet futuresWallet = FuturesWallet.builder()
                .id("fw-1")
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("100"))
                .lockedBalance(BigDecimal.ZERO)
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrencyForUpdate("user-futures-1", "USDT"))
                .thenReturn(Optional.of(spot));
        when(userRepository.findById("user-futures-1")).thenReturn(Optional.of(testUser));
        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT"))
                .thenReturn(Optional.of(futuresWallet));
        when(futuresWalletMapper.toResponse(any(FuturesWallet.class))).thenAnswer(i -> {
            FuturesWallet w = i.getArgument(0);
            return FuturesWalletResponse.builder()
                    .id(w.getId())
                    .currencyShortName(w.getCurrencyShortName())
                    .balance(w.getBalance())
                    .build();
        });

        FuturesWalletResponse response = futuresWalletService.transferToFutures("USDT", new BigDecimal("200"));

        assertNotNull(response);
        // Spot: 500 - 200 = 300
        assertEquals(0, new BigDecimal("300").compareTo(spot.getBalance()));
        // Futures: 100 + 200 = 300
        assertEquals(0, new BigDecimal("300").compareTo(futuresWallet.getBalance()));

        verify(walletBalanceRepository).save(spot);
        verify(futuresWalletRepository).save(futuresWallet);
        verify(futuresWalletTransactionRepository).save(argThat(tx ->
                tx.getTransactionType().equals("credit") &&
                tx.getReason().equals("SPOT_TO_FUTURES") &&
                tx.getAmount().compareTo(new BigDecimal("200")) == 0));
    }

    @Test
    @DisplayName("transferToSpot: Báo lỗi khi số dư ví Futures không đủ")
    void testTransferToSpot_InsufficientFuturesBalance() {
        WalletBalance spot = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("100"))
                .build();

        FuturesWallet futuresWallet = FuturesWallet.builder()
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("50"))
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrencyForUpdate("user-futures-1", "USDT"))
                .thenReturn(Optional.of(spot));
        when(userRepository.findById("user-futures-1")).thenReturn(Optional.of(testUser));
        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT"))
                .thenReturn(Optional.of(futuresWallet));

        assertThrows(RuntimeException.class, () ->
                futuresWalletService.transferToSpot("USDT", new BigDecimal("100")));
    }

    @Test
    @DisplayName("transferToSpot: Chuyển tiền từ Futures sang Spot thành công")
    void testTransferToSpot_Success() {
        WalletBalance spot = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("100"))
                .build();

        FuturesWallet futuresWallet = FuturesWallet.builder()
                .id("fw-1")
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("500"))
                .lockedBalance(BigDecimal.ZERO)
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrencyForUpdate("user-futures-1", "USDT"))
                .thenReturn(Optional.of(spot));
        when(userRepository.findById("user-futures-1")).thenReturn(Optional.of(testUser));
        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT"))
                .thenReturn(Optional.of(futuresWallet));
        when(futuresWalletMapper.toResponse(any(FuturesWallet.class))).thenAnswer(i -> {
            FuturesWallet w = i.getArgument(0);
            return FuturesWalletResponse.builder()
                    .id(w.getId())
                    .currencyShortName(w.getCurrencyShortName())
                    .balance(w.getBalance())
                    .build();
        });

        FuturesWalletResponse response = futuresWalletService.transferToSpot("USDT", new BigDecimal("150"));

        assertNotNull(response);
        // Futures: 500 - 150 = 350
        assertEquals(0, new BigDecimal("350").compareTo(futuresWallet.getBalance()));
        // Spot: 100 + 150 = 250
        assertEquals(0, new BigDecimal("250").compareTo(spot.getBalance()));

        verify(futuresWalletRepository).save(futuresWallet);
        verify(walletBalanceRepository).save(spot);
        verify(futuresWalletTransactionRepository).save(argThat(tx ->
                tx.getTransactionType().equals("debit") &&
                tx.getReason().equals("FUTURES_TO_SPOT") &&
                tx.getAmount().compareTo(new BigDecimal("150")) == 0));
    }

    @Test
    @DisplayName("applyRealizedPnl: Cộng lãi vào số dư ví Futures")
    void testApplyRealizedPnl_Positive() {
        FuturesWallet wallet = FuturesWallet.builder()
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("1000"))
                .build();

        when(userRepository.findById("user-futures-1")).thenReturn(Optional.of(testUser));
        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT")).thenReturn(Optional.of(wallet));

        futuresWalletService.applyRealizedPnl("user-futures-1", "USDT", new BigDecimal("250"));

        assertEquals(0, new BigDecimal("1250").compareTo(wallet.getBalance()));
        verify(futuresWalletRepository).save(wallet);
    }

    @Test
    @DisplayName("applyRealizedPnl: Trừ lỗ vào số dư ví Futures")
    void testApplyRealizedPnl_Negative() {
        FuturesWallet wallet = FuturesWallet.builder()
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("1000"))
                .build();

        when(userRepository.findById("user-futures-1")).thenReturn(Optional.of(testUser));
        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT")).thenReturn(Optional.of(wallet));

        futuresWalletService.applyRealizedPnl("user-futures-1", "USDT", new BigDecimal("-300"));

        assertEquals(0, new BigDecimal("700").compareTo(wallet.getBalance()));
        verify(futuresWalletRepository).save(wallet);
    }

    @Test
    @DisplayName("deductFee: Khấu trừ phí giao dịch Futures")
    void testDeductFee_Success() {
        FuturesWallet wallet = FuturesWallet.builder()
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("1000"))
                .build();

        when(userRepository.findById("user-futures-1")).thenReturn(Optional.of(testUser));
        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT")).thenReturn(Optional.of(wallet));

        futuresWalletService.deductFee("user-futures-1", "USDT", new BigDecimal("25"));

        assertEquals(0, new BigDecimal("975").compareTo(wallet.getBalance()));
        verify(futuresWalletRepository).save(wallet);
    }

    @Test
    @DisplayName("lockMargin: Khóa ký quỹ thành công (giảm balance, tăng lockedBalance)")
    void testLockMargin_Success() {
        FuturesWallet wallet = FuturesWallet.builder()
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("1000"))
                .lockedBalance(new BigDecimal("100"))
                .build();

        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT")).thenReturn(Optional.of(wallet));

        futuresWalletService.lockMargin("user-futures-1", "USDT", new BigDecimal("400"));

        assertEquals(0, new BigDecimal("600").compareTo(wallet.getBalance()));
        assertEquals(0, new BigDecimal("500").compareTo(wallet.getLockedBalance()));
        verify(futuresWalletRepository).save(wallet);
    }

    @Test
    @DisplayName("lockMargin: Bỏ qua khi amount <= 0")
    void testLockMargin_ZeroOrNegativeAmount() {
        futuresWalletService.lockMargin("user-futures-1", "USDT", BigDecimal.ZERO);
        futuresWalletService.lockMargin("user-futures-1", "USDT", new BigDecimal("-50"));

        verifyNoInteractions(futuresWalletRepository);
    }

    @Test
    @DisplayName("releaseMargin: Giải phóng ký quỹ thành công (tăng balance, giảm lockedBalance)")
    void testReleaseMargin_Success() {
        FuturesWallet wallet = FuturesWallet.builder()
                .user(testUser)
                .currencyShortName("USDT")
                .balance(new BigDecimal("600"))
                .lockedBalance(new BigDecimal("500"))
                .build();

        when(futuresWalletRepository.findForUpdate("user-futures-1", "USDT")).thenReturn(Optional.of(wallet));

        futuresWalletService.releaseMargin("user-futures-1", "USDT", new BigDecimal("300"));

        assertEquals(0, new BigDecimal("900").compareTo(wallet.getBalance()));
        assertEquals(0, new BigDecimal("200").compareTo(wallet.getLockedBalance()));
        verify(futuresWalletRepository).save(wallet);
    }

    @Test
    @DisplayName("releaseMargin: Bỏ qua khi amount <= 0")
    void testReleaseMargin_ZeroOrNegativeAmount() {
        futuresWalletService.releaseMargin("user-futures-1", "USDT", BigDecimal.ZERO);
        futuresWalletService.releaseMargin("user-futures-1", "USDT", new BigDecimal("-50"));

        verifyNoInteractions(futuresWalletRepository);
    }
}
