package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.WalletType;
import com.slayer.binacet.dto.request.TransferRequest;
import com.slayer.binacet.dto.request.TransferWalletRequest;
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
import com.slayer.binacet.service.FuturesWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FuturesWalletServiceImpl implements FuturesWalletService {
    private final FuturesWalletRepository futuresWalletRepository;
    private final FuturesWalletTransactionRepository futuresWalletTransactionRepository;
    private final WalletBalanceRepository walletBalanceRepository;
    private final UserRepository userRepository;

    private final FuturesWalletMapper futuresWalletMapper;

    @Override
    public List<FuturesWalletResponse> getMyFuturesWallet() {
        String userId = getCurrentUser().getId();

        List<FuturesWallet> futuresWallets = futuresWalletRepository.findByUserId(userId);
        return futuresWallets.stream()
                .map(futuresWalletMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public FuturesWalletResponse transferToFutures(String currency, BigDecimal amount) {

        User currentUser = getCurrentUser();

        validateAmount(amount);

        WalletBalance spot = walletBalanceRepository.findByUserIdAndCurrencyForUpdate(currentUser.getId(),currency)
                .orElseThrow(() -> new RuntimeException("Ví Spot " + currency + " không tồn tại"));

        if(spot.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Số dư Spot không đủ để chuyển sang Futures");
        }

        FuturesWallet futuresWallet = getOrCreateWalletForUpdate(currentUser.getId(), currency);

        BigDecimal subtractSpot = spot.getBalance().subtract(amount);
        BigDecimal addFuture = futuresWallet.getBalance().add(amount);

        spot.setBalance(subtractSpot);
        futuresWallet.setBalance(addFuture);

        walletBalanceRepository.save(spot);
        futuresWalletRepository.save(futuresWallet);

        FuturesWalletTransaction tx = FuturesWalletTransaction.builder()
                .walletId(futuresWallet.getId())
                .userId(currentUser.getId())
                .transactionType("credit")
                .amount(amount)
                .currencyShortName(currency)
                .reason("SPOT_TO_FUTURES")
                .build();
        futuresWalletTransactionRepository.save(tx);

        return futuresWalletMapper.toResponse(futuresWallet);
    }

    @Override
    @Transactional
    public FuturesWalletResponse transferToSpot(String currency, BigDecimal amount) {
        String userId = getCurrentUser().getId();
        WalletBalance spot = walletBalanceRepository.findByUserIdAndCurrencyForUpdate(userId, currency)
                .orElseThrow(() -> new RuntimeException("Ví Spot " + currency + " không tồn tại"));

        FuturesWallet futuresWallet = getOrCreateWalletForUpdate(userId, currency);

        if(futuresWallet.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Số dư khả dụng trên Futures không đủ (đang bị khóa ký quỹ cho vị thế mở)");

        }

        BigDecimal subtractFutures = futuresWallet.getBalance().subtract(amount);
        BigDecimal addSpot = spot.getBalance().add(amount);

        futuresWallet.setBalance(subtractFutures);
        spot.setBalance(addSpot);
        walletBalanceRepository.save(spot);
        futuresWalletRepository.save(futuresWallet);

        FuturesWalletTransaction tx = FuturesWalletTransaction.builder()
                .walletId(futuresWallet.getId())
                .userId(userId)
                .transactionType("debit")
                .amount(amount)
                .currencyShortName(currency)
                .reason("FUTURES_TO_SPOT")
                .build();
        futuresWalletTransactionRepository.save(tx);

        return futuresWalletMapper.toResponse(futuresWallet);
    }

    @Override
    @Transactional
    public FuturesWallet getOrCreateWallet(String currency) {
        User currenUser = getCurrentUser();
        return getOrCreateWalletForUpdate(currenUser.getId(),currency);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY) // phải nằm trong transaction của MatchingEngine gọi nó
    public void applyRealizedPnl(String userId, String currency, BigDecimal pnl) {

        FuturesWallet wallet = getOrCreateWalletForUpdate(userId, currency);
        wallet.setBalance(wallet.getBalance().add(pnl)); // pnl âm thì tự trừ
        futuresWalletRepository.save(wallet);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void deductFee(String userId, String currency, BigDecimal fee) {
        FuturesWallet wallet = getOrCreateWalletForUpdate(userId, currency);
        wallet.setBalance(wallet.getBalance().subtract(fee));
        futuresWalletRepository.save(wallet);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void releaseMargin(String userId, String currency, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;

        FuturesWallet wallet = futuresWalletRepository.findForUpdate(userId, currency)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ví Futures"));

        BigDecimal newLocked = wallet.getLockedBalance().subtract(amount);
        wallet.setLockedBalance(newLocked.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : newLocked);
        wallet.setBalance(wallet.getBalance().add(amount));
        futuresWalletRepository.save(wallet);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void lockMargin(String userId, String currency, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;

        FuturesWallet wallet = futuresWalletRepository.findForUpdate(userId, currency)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ví Futures"));

        wallet.setLockedBalance(wallet.getLockedBalance().add(amount));
        wallet.setBalance(wallet.getBalance().subtract(amount));
        futuresWalletRepository.save(wallet);
    }


    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền chuyển phải lớn hơn 0");
        }
    }



    private FuturesWallet getOrCreateWalletForUpdate(String userId, String currency) {
        User currenUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user: " + userId));
        return futuresWalletRepository.findForUpdate(userId, currency)
                .orElseGet(() -> futuresWalletRepository.save(FuturesWallet.builder()
                        .user(currenUser)
                        .currencyShortName(currency)
                        .balance(BigDecimal.ZERO)
                        .lockedBalance(BigDecimal.ZERO)
                        .build()));
    }


    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }

        return (User) authentication.getPrincipal();
    }


}
