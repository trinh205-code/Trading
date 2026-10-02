package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.Role;
import com.slayer.binacet.entity.FuturesPosition;
import com.slayer.binacet.entity.FuturesWallet;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.repository.FuturesPositionRepository;
import com.slayer.binacet.repository.FuturesWalletRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FuturesPositionServiceImplTest {

    @Mock
    private FuturesPositionRepository futuresPositionRepository;

    @Mock
    private FuturesWalletRepository futuresWalletRepository;

    @InjectMocks
    private FuturesPositionServiceImpl futuresPositionService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user-123")
                .email("test@example.com")
                .role(Role.USER)
                .build();

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(testUser, null, testUser.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Đòn bẩy không hợp lệ (< 1x hoặc > 200x) -> Ném ngoại lệ IllegalArgumentException")
    void testUpdateLeverage_InvalidLeverage() {
        assertThrows(IllegalArgumentException.class, () ->
                futuresPositionService.updateLeverage("BTCUSDT", BigDecimal.ZERO));

        assertThrows(IllegalArgumentException.class, () ->
                futuresPositionService.updateLeverage("BTCUSDT", new BigDecimal("201")));
    }

    @Test
    @DisplayName("Không tìm thấy vị thế -> Ném ngoại lệ RuntimeException")
    void testUpdateLeverage_PositionNotFound() {
        when(futuresPositionRepository.findByUser_IdAndInstrument_Symbol("user-123", "BTCUSDT"))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                futuresPositionService.updateLeverage("BTCUSDT", new BigDecimal("10")));
    }

    @Test
    @DisplayName("Vị thế chưa có khối lượng mở (activePos = 0) -> Chỉ cập nhật đòn bẩy, không can thiệp ví")
    void testUpdateLeverage_NoActivePosition() {
        FuturesPosition position = FuturesPosition.builder()
                .activePos(BigDecimal.ZERO)
                .avgPrice(BigDecimal.ZERO)
                .marginCurrencyShortName("USDT")
                .leverage(new BigDecimal("10"))
                .build();

        FuturesWallet wallet = FuturesWallet.builder()
                .balance(new BigDecimal("1000"))
                .lockedBalance(BigDecimal.ZERO)
                .build();

        when(futuresPositionRepository.findByUser_IdAndInstrument_Symbol("user-123", "BTCUSDT"))
                .thenReturn(Optional.of(position));
        when(futuresWalletRepository.findForUpdate("user-123", "USDT"))
                .thenReturn(Optional.of(wallet));

        futuresPositionService.updateLeverage("BTCUSDT", new BigDecimal("20"));

        assertEquals(new BigDecimal("20"), position.getLeverage());
        verify(futuresPositionRepository, times(1)).save(position);
        verify(futuresWalletRepository, never()).save(any());
    }

    @Test
    @DisplayName("Hạ đòn bẩy khi đang có vị thế mở: Số dư khả dụng đủ -> Khóa thêm margin, trừ balance ví")
    void testUpdateLeverage_DecreaseLeverage_Success() {
        // Vị thế 1 BTC @ 50,000, đang đòn bẩy 20x -> margin cũ = 2,500
        // Hạ đòn bẩy về 10x -> margin mới = 5,000 -> cần thêm 2,500
        FuturesPosition position = FuturesPosition.builder()
                .activePos(new BigDecimal("1.0"))
                .avgPrice(new BigDecimal("50000.0"))
                .lockedUserMargin(new BigDecimal("2500.0"))
                .marginCurrencyShortName("USDT")
                .leverage(new BigDecimal("20"))
                .build();

        FuturesWallet wallet = FuturesWallet.builder()
                .balance(new BigDecimal("5000.0")) // khả dụng 5,000 >= 2,500 cần thêm
                .lockedBalance(new BigDecimal("2500.0"))
                .build();

        when(futuresPositionRepository.findByUser_IdAndInstrument_Symbol("user-123", "BTCUSDT"))
                .thenReturn(Optional.of(position));
        when(futuresWalletRepository.findForUpdate("user-123", "USDT"))
                .thenReturn(Optional.of(wallet));

        futuresPositionService.updateLeverage("BTCUSDT", new BigDecimal("10"));

        // Kiểm tra margin vị thế
        assertEquals(0, new BigDecimal("5000.0").compareTo(position.getLockedUserMargin()));
        assertEquals(new BigDecimal("10"), position.getLeverage());

        // Kiểm tra ví: balance giảm 2,500 (còn 2,500), lockedBalance tăng 2,500 (thành 5,000)
        assertEquals(0, new BigDecimal("2500.0").compareTo(wallet.getBalance()));
        assertEquals(0, new BigDecimal("5000.0").compareTo(wallet.getLockedBalance()));

        verify(futuresWalletRepository, times(1)).save(wallet);
        verify(futuresPositionRepository, times(1)).save(position);
    }

    @Test
    @DisplayName("Hạ đòn bẩy khi số dư khả dụng KHÔNG đủ -> Ném RuntimeException, không lưu")
    void testUpdateLeverage_DecreaseLeverage_InsufficientBalance() {
        // Cần thêm 2,500 nhưng khả dụng chỉ còn 1,000
        FuturesPosition position = FuturesPosition.builder()
                .activePos(new BigDecimal("1.0"))
                .avgPrice(new BigDecimal("50000.0"))
                .lockedUserMargin(new BigDecimal("2500.0"))
                .marginCurrencyShortName("USDT")
                .leverage(new BigDecimal("20"))
                .build();

        FuturesWallet wallet = FuturesWallet.builder()
                .balance(new BigDecimal("1000.0")) // không đủ 2,500
                .lockedBalance(new BigDecimal("2500.0"))
                .build();

        when(futuresPositionRepository.findByUser_IdAndInstrument_Symbol("user-123", "BTCUSDT"))
                .thenReturn(Optional.of(position));
        when(futuresWalletRepository.findForUpdate("user-123", "USDT"))
                .thenReturn(Optional.of(wallet));

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                futuresPositionService.updateLeverage("BTCUSDT", new BigDecimal("10")));

        assertTrue(exception.getMessage().contains("Số dư khả dụng không đủ để hạ đòn bẩy"));
        verify(futuresPositionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tăng đòn bẩy khi đang có vị thế mở -> Hoàn trả margin thừa về balance ví")
    void testUpdateLeverage_IncreaseLeverage_Success() {
        // Vị thế 1 BTC @ 50,000, đang đòn bẩy 10x -> margin cũ = 5,000
        // Tăng đòn bẩy lên 25x -> margin mới = 2,000 -> hoàn trả 3,000
        FuturesPosition position = FuturesPosition.builder()
                .activePos(new BigDecimal("1.0"))
                .avgPrice(new BigDecimal("50000.0"))
                .lockedUserMargin(new BigDecimal("5000.0"))
                .marginCurrencyShortName("USDT")
                .leverage(new BigDecimal("10"))
                .build();

        FuturesWallet wallet = FuturesWallet.builder()
                .balance(new BigDecimal("1000.0"))
                .lockedBalance(new BigDecimal("5000.0"))
                .build();

        when(futuresPositionRepository.findByUser_IdAndInstrument_Symbol("user-123", "BTCUSDT"))
                .thenReturn(Optional.of(position));
        when(futuresWalletRepository.findForUpdate("user-123", "USDT"))
                .thenReturn(Optional.of(wallet));

        futuresPositionService.updateLeverage("BTCUSDT", new BigDecimal("25"));

        // Kiểm tra margin vị thế
        assertEquals(0, new BigDecimal("2000.0").compareTo(position.getLockedUserMargin()));
        assertEquals(new BigDecimal("25"), position.getLeverage());

        // Kiểm tra ví: balance tăng 3,000 (thành 4,000), lockedBalance giảm 3,000 (còn 2,000)
        assertEquals(0, new BigDecimal("4000.0").compareTo(wallet.getBalance()));
        assertEquals(0, new BigDecimal("2000.0").compareTo(wallet.getLockedBalance()));

        verify(futuresWalletRepository, times(1)).save(wallet);
        verify(futuresPositionRepository, times(1)).save(position);
    }
}
