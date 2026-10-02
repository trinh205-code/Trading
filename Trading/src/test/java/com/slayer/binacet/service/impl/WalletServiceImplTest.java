package com.slayer.binacet.service.impl;

import com.slayer.binacet.dto.request.DepositRequest;
import com.slayer.binacet.dto.request.TransferRequest;
import com.slayer.binacet.dto.request.WithdrawRequest;
import com.slayer.binacet.dto.response.DepositResponse;
import com.slayer.binacet.dto.response.WalletResponse;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.entity.WalletBalance;
import com.slayer.binacet.mapper.WalletMapper;
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
class WalletServiceImplTest {

    @Mock
    private WalletBalanceRepository walletBalanceRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WalletMapper walletMapper;

    @InjectMocks
    private WalletServiceImpl walletService;

    private User testUser;
    private User receiverUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user-101")
                .email("user101@example.com")
                .build();

        receiverUser = User.builder()
                .id("user-202")
                .email("receiver@example.com")
                .build();

        // Cài đặt SecurityContext mock
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
    @DisplayName("claimTestFunds: Nhận 1000 USDT test funds thành công khi đã có ví")
    void testClaimTestFunds_ExistingWallet() {
        WalletBalance wallet = WalletBalance.builder()
                .id("w-1")
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("500.00"))
                .lockedBalance(BigDecimal.ZERO)
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "USDT"))
                .thenReturn(Optional.of(wallet));
        when(walletBalanceRepository.save(any(WalletBalance.class))).thenAnswer(i -> i.getArgument(0));
        when(walletMapper.toResponse(any(WalletBalance.class))).thenAnswer(i -> {
            WalletBalance wb = i.getArgument(0);
            return WalletResponse.builder()
                    .id(wb.getId())
                    .currency(wb.getCurrency())
                    .balance(wb.getBalance())
                    .lockedBalance(wb.getLockedBalance())
                    .build();
        });

        WalletResponse response = walletService.claimTestFunds();

        assertNotNull(response);
        assertEquals(0, new BigDecimal("1500.00").compareTo(response.getBalance()));
        verify(walletBalanceRepository).save(argThat(wb -> wb.getBalance().compareTo(new BigDecimal("1500.00")) == 0));
    }

    @Test
    @DisplayName("getMyWallets: Lấy danh sách ví của người dùng hiện tại")
    void testGetMyWallets() {
        WalletBalance w1 = WalletBalance.builder().id("w-1").currency("USDT").balance(new BigDecimal("1000")).build();
        WalletBalance w2 = WalletBalance.builder().id("w-2").currency("BTC").balance(new BigDecimal("1.5")).build();

        when(walletBalanceRepository.findByUserId("user-101")).thenReturn(List.of(w1, w2));
        when(walletMapper.toResponse(w1)).thenReturn(WalletResponse.builder().id("w-1").currency("USDT").balance(w1.getBalance()).build());
        when(walletMapper.toResponse(w2)).thenReturn(WalletResponse.builder().id("w-2").currency("BTC").balance(w2.getBalance()).build());

        List<WalletResponse> result = walletService.getMyWallets();

        assertEquals(2, result.size());
        assertEquals("USDT", result.get(0).getCurrency());
        assertEquals("BTC", result.get(1).getCurrency());
    }

    @Test
    @DisplayName("deposit: Tạo mã thanh toán VietQR thành công")
    void testDeposit_Success() {
        DepositRequest request = new DepositRequest();
        request.setAmount(new BigDecimal("500000"));
        request.setCurrency("VND");
        request.setPaymentMethod("BANK_TRANSFER");

        DepositResponse response = walletService.deposit(request);

        assertNotNull(response);
        assertTrue(response.getTransactionId().startsWith("DEP_"));
        assertEquals(new BigDecimal("500000"), response.getAmount());
        assertEquals("Vietcombank", response.getBankName());
        assertNotNull(response.getPaymentUrl());
    }

    @Test
    @DisplayName("withdraw: Báo lỗi khi chưa sở hữu tài sản")
    void testWithdraw_WalletNotFound() {
        WithdrawRequest request = new WithdrawRequest();
        request.setCurrency("USDT");
        request.setAmount(new BigDecimal("100"));

        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "USDT"))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> walletService.withdraw(request));
    }

    @Test
    @DisplayName("withdraw: Báo lỗi khi số dư không đủ để rút")
    void testWithdraw_InsufficientBalance() {
        WithdrawRequest request = new WithdrawRequest();
        request.setCurrency("USDT");
        request.setAmount(new BigDecimal("500"));

        WalletBalance wallet = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("200"))
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "USDT"))
                .thenReturn(Optional.of(wallet));

        assertThrows(RuntimeException.class, () -> walletService.withdraw(request));
    }

    @Test
    @DisplayName("withdraw: Rút tiền thành công, trừ số dư khả dụng")
    void testWithdraw_Success() {
        WithdrawRequest request = new WithdrawRequest();
        request.setCurrency("USDT");
        request.setAmount(new BigDecimal("100"));

        WalletBalance wallet = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("500"))
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "USDT"))
                .thenReturn(Optional.of(wallet));
        when(walletBalanceRepository.save(wallet)).thenReturn(wallet);
        when(walletMapper.toResponse(wallet)).thenReturn(WalletResponse.builder()
                .currency("USDT")
                .balance(new BigDecimal("400"))
                .build());

        WalletResponse response = walletService.withdraw(request);

        assertNotNull(response);
        assertEquals(0, new BigDecimal("400").compareTo(wallet.getBalance()));
        verify(walletBalanceRepository).save(wallet);
    }

    @Test
    @DisplayName("transfer: Báo lỗi khi tự chuyển tiền cho chính mình")
    void testTransfer_SelfTransfer() {
        TransferRequest request = new TransferRequest();
        request.setReceiverId("user-101");
        request.setCurrency("USDT");
        request.setAmount(new BigDecimal("50"));

        assertThrows(RuntimeException.class, () -> walletService.transfer(request));
    }

    @Test
    @DisplayName("transfer: Báo lỗi khi không tìm thấy người nhận")
    void testTransfer_ReceiverNotFound() {
        TransferRequest request = new TransferRequest();
        request.setReceiverId("unknown-user");
        request.setCurrency("USDT");
        request.setAmount(new BigDecimal("50"));

        when(userRepository.findById("unknown-user")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> walletService.transfer(request));
    }

    @Test
    @DisplayName("transfer: Báo lỗi khi số dư người gửi không đủ")
    void testTransfer_InsufficientBalance() {
        TransferRequest request = new TransferRequest();
        request.setReceiverId("user-202");
        request.setCurrency("USDT");
        request.setAmount(new BigDecimal("500"));

        WalletBalance senderWallet = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("100"))
                .build();

        when(userRepository.findById("user-202")).thenReturn(Optional.of(receiverUser));
        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "USDT"))
                .thenReturn(Optional.of(senderWallet));

        assertThrows(RuntimeException.class, () -> walletService.transfer(request));
    }

    @Test
    @DisplayName("transfer: Chuyển tiền thành công giữa 2 người dùng")
    void testTransfer_Success() {
        TransferRequest request = new TransferRequest();
        request.setReceiverId("user-202");
        request.setCurrency("USDT");
        request.setAmount(new BigDecimal("100"));

        WalletBalance senderWallet = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("500"))
                .build();

        WalletBalance receiverWallet = WalletBalance.builder()
                .user(receiverUser)
                .currency("USDT")
                .balance(new BigDecimal("200"))
                .build();

        when(userRepository.findById("user-202")).thenReturn(Optional.of(receiverUser));
        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "USDT"))
                .thenReturn(Optional.of(senderWallet));
        when(walletBalanceRepository.findByUserIdAndCurrency("user-202", "USDT"))
                .thenReturn(Optional.of(receiverWallet));

        walletService.transfer(request);

        assertEquals(0, new BigDecimal("400").compareTo(senderWallet.getBalance()));
        assertEquals(0, new BigDecimal("300").compareTo(receiverWallet.getBalance()));
        verify(walletBalanceRepository).save(senderWallet);
        verify(walletBalanceRepository).save(receiverWallet);
    }

    @Test
    @DisplayName("lockBalance: Khóa số dư khả dụng khi đặt lệnh thành công")
    void testLockBalance_Success() {
        WalletBalance wallet = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("1000"))
                .lockedBalance(new BigDecimal("100"))
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "USDT"))
                .thenReturn(Optional.of(wallet));

        walletService.lockBalance("user-101", "USDT", new BigDecimal("300"));

        assertEquals(0, new BigDecimal("700").compareTo(wallet.getBalance()));
        assertEquals(0, new BigDecimal("400").compareTo(wallet.getLockedBalance()));
        verify(walletBalanceRepository).save(wallet);
    }

    @Test
    @DisplayName("lockBalance: Báo lỗi khi số dư khả dụng không đủ để khóa")
    void testLockBalance_InsufficientBalance() {
        WalletBalance wallet = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("200"))
                .lockedBalance(BigDecimal.ZERO)
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "USDT"))
                .thenReturn(Optional.of(wallet));

        assertThrows(RuntimeException.class, () ->
                walletService.lockBalance("user-101", "USDT", new BigDecimal("500")));
    }

    @Test
    @DisplayName("unlockBalance: Mở khóa số dư hoàn trả lại số dư khả dụng")
    void testUnlockBalance_Success() {
        WalletBalance wallet = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("500"))
                .lockedBalance(new BigDecimal("300"))
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "USDT"))
                .thenReturn(Optional.of(wallet));

        walletService.unlockBalance("user-101", "USDT", new BigDecimal("200"));

        assertEquals(0, new BigDecimal("700").compareTo(wallet.getBalance()));
        assertEquals(0, new BigDecimal("100").compareTo(wallet.getLockedBalance()));
        verify(walletBalanceRepository).save(wallet);
    }

    @Test
    @DisplayName("unlockBalance: Báo lỗi khi số tiền mở khóa lớn hơn số đang bị khóa")
    void testUnlockBalance_ExceedsLockedBalance() {
        WalletBalance wallet = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("500"))
                .lockedBalance(new BigDecimal("100"))
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "USDT"))
                .thenReturn(Optional.of(wallet));

        assertThrows(RuntimeException.class, () ->
                walletService.unlockBalance("user-101", "USDT", new BigDecimal("200")));
    }

    @Test
    @DisplayName("deductLockedBalance: Khấu trừ số dư bị khóa khi lệnh khớp")
    void testDeductLockedBalance_Success() {
        WalletBalance wallet = WalletBalance.builder()
                .user(testUser)
                .currency("BTC")
                .balance(BigDecimal.ZERO)
                .lockedBalance(new BigDecimal("2.5"))
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "BTC"))
                .thenReturn(Optional.of(wallet));

        walletService.deductLockedBalance("user-101", "BTC", new BigDecimal("1.0"));

        assertEquals(0, new BigDecimal("1.5").compareTo(wallet.getLockedBalance()));
        verify(walletBalanceRepository).save(wallet);
    }

    @Test
    @DisplayName("addAvailableBalance: Tăng số dư khả dụng (cộng tiền vào ví đã có)")
    void testAddAvailableBalance_ExistingWallet() {
        WalletBalance wallet = WalletBalance.builder()
                .user(testUser)
                .currency("USDT")
                .balance(new BigDecimal("1000"))
                .lockedBalance(BigDecimal.ZERO)
                .build();

        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "USDT"))
                .thenReturn(Optional.of(wallet));

        walletService.addAvailableBalance("user-101", "USDT", new BigDecimal("250"));

        assertEquals(0, new BigDecimal("1250").compareTo(wallet.getBalance()));
        verify(walletBalanceRepository).save(wallet);
    }

    @Test
    @DisplayName("addAvailableBalance: Tự động khởi tạo ví mới nếu user chưa từng sở hữu loại tiền tệ đó")
    void testAddAvailableBalance_CreateNewWallet() {
        when(walletBalanceRepository.findByUserIdAndCurrency("user-101", "ETH"))
                .thenReturn(Optional.empty());
        when(userRepository.findById("user-101")).thenReturn(Optional.of(testUser));

        walletService.addAvailableBalance("user-101", "ETH", new BigDecimal("3.0"));

        verify(walletBalanceRepository).save(argThat(wb ->
                wb.getCurrency().equals("ETH") &&
                wb.getBalance().compareTo(new BigDecimal("3.0")) == 0 &&
                wb.getLockedBalance().compareTo(BigDecimal.ZERO) == 0));
    }
}
