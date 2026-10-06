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
import com.slayer.binacet.service.WalletBalanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.catalina.security.SecurityUtil;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletServiceImpl implements WalletBalanceService {

    private final WalletBalanceRepository walletBalanceRepository;
    private final UserRepository userRepository;
    private final WalletMapper walletMapper;
    private SecurityUtil securityUtil;


    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }

        return (User) authentication.getPrincipal();
    }

    @Transactional
    public WalletResponse claimTestFunds() {
        User user = getCurrentUser();
        String targetCurrency = "USDT";
        BigDecimal rewardAmount = new BigDecimal("1000.00");

        WalletBalance wallet = walletBalanceRepository.findByUserIdAndCurrency(user.getId(), targetCurrency)
                .orElseGet(() -> {
                    WalletBalance newWallet = new WalletBalance();
                    newWallet.setUser(user);
                    newWallet.setCurrency(targetCurrency);
                    newWallet.setBalance(java.math.BigDecimal.ZERO);
                    newWallet.setLockedBalance(java.math.BigDecimal.ZERO);
                    return newWallet;
                });


        wallet.setBalance(wallet.getBalance().add(rewardAmount));

        WalletBalance savedWallet = walletBalanceRepository.save(wallet);

        return walletMapper.toResponse(savedWallet);
    }

    @Override
    public List<WalletResponse> getMyWallets() {
        User user = getCurrentUser();

        List<WalletBalance> wallets = walletBalanceRepository.findByUserId(user.getId());

        return wallets.stream()
                .map(walletMapper::toResponse)
                .toList();
    }



    @Override
    @Transactional
    public DepositResponse deposit(DepositRequest request) {
        // Đối với nạp tiền Fiat (VNĐ), chúng ta không cộng tiền ngay mà tạo mã QR.
        // Tiền chỉ được cộng khi Webhook của ngân hàng báo về hoặc Admin duyệt.

        String txId = "DEP_" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Thông tin tài khoản nhận tiền của Admin/Sàn
        String bankId = "Vietcombank";
        String accountNo = "0123456789";
        String accountName = "CONG TY BINACET";
        String content = "NAP " + txId;

        String qrUrl = String.format("https://img.vietqr.io/image/%s-%s-compact.png?amount=%s&addInfo=%s&accountName=%s",
                bankId, accountNo, request.getAmount(), content.replace(" ", "%20"), accountName.replace(" ", "%20"));

        return DepositResponse.builder()
                .transactionId(txId)
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .paymentMethod(request.getPaymentMethod())
                .bankName(bankId)
                .bankAccountNumber(accountNo)
                .accountName(accountName)
                .transferContent(content)
                .paymentUrl(qrUrl)
                .build();
    }

    @Override
    @Transactional
    public WalletResponse withdraw(WithdrawRequest request) {
        User user = getCurrentUser();

        WalletBalance wallet = walletBalanceRepository.findByUserIdAndCurrency(user.getId(), request.getCurrency())
                .orElseThrow(() -> new RuntimeException("Bạn chưa sở hữu tài sản " + request.getCurrency() + " để thực hiện rút tiền."));

        if(wallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw new RuntimeException("Số dư không đủ để thực hiện lệnh rút.");
        }
        wallet.setBalance(wallet.getBalance().subtract(request.getAmount()));
        // và request.getNetwork() vào bảng TransactionHistory để chờ gửi lên Blockchain.

        WalletBalance save = walletBalanceRepository.save(wallet);
        return walletMapper.toResponse(save);
    }

    @Override
    @Transactional
    public void transfer(TransferRequest request) {
        User sender = getCurrentUser();

        String currentPin = sender.getTransferPin();
        if (currentPin == null || currentPin.isBlank()) {
            throw new RuntimeException("Bạn chưa thiết lập mã OTP chuyển tiền. Vui lòng tạo mã OTP trước khi giao dịch!");
        }

        if (!currentPin.equals(request.getOtp())) {
            throw new RuntimeException("Mã OTP xác thực không chính xác");
        }

        if(sender.getId().equals(request.getReceiverId())) {
            throw new RuntimeException("Không thể tự chuyển tiền cho chính mình");
        }

        User receiver =   userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người nhận với UID này"));

        WalletBalance senderWallet = walletBalanceRepository.findByUserIdAndCurrency(sender.getId(), request.getCurrency())
                .orElseThrow(() -> new RuntimeException("Bạn chưa sở hữu tài sản " + request.getCurrency()));

        if(senderWallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw new RuntimeException("Số dư không đủ để chuyển");
        }

        senderWallet.setBalance(senderWallet.getBalance().subtract(request.getAmount()));

        WalletBalance receiverWallet = walletBalanceRepository.findByUserIdAndCurrency(receiver.getId(), request.getCurrency())
                .orElseGet(() -> {
                    WalletBalance newWallet = new WalletBalance();
                    newWallet.setUser(receiver);
                    newWallet.setCurrency(request.getCurrency());
                    newWallet.setBalance(java.math.BigDecimal.ZERO);
                    newWallet.setLockedBalance(java.math.BigDecimal.ZERO);
                    return newWallet;
                });
        receiverWallet.setBalance(receiverWallet.getBalance().add(request.getAmount()));

        walletBalanceRepository.save(senderWallet);
        walletBalanceRepository.save(receiverWallet);
    }

    @Override
    public Map<String, String> getReceiverInfo(String receiverId) {
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người nhận với UID này"));

        String email = receiver.getEmail();
        String maskedEmail = email;
        if (email != null && email.contains("@")) {
            int at = email.indexOf("@");
            if (at > 2) {
                maskedEmail = email.substring(0, 2) + "***" + email.substring(at);
            } else {
                maskedEmail = "***" + email.substring(at);
            }
        }

        String name = receiver.getFullName();
        if (name == null || name.isBlank()) {
            name = "Người dùng Binance";
        }

        return Map.of(
                "receiverId", receiver.getId(),
                "fullName", name,
                "maskedEmail", maskedEmail
        );
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY) // Ràng buộc bắt buộc phải nằm trong @Transactional của createOrder
    public void lockBalance(String userId, String currency, BigDecimal amount) {

        WalletBalance wallet = walletBalanceRepository.findByUserIdAndCurrency(userId, currency)
                .orElseThrow(() -> new RuntimeException("Ví " + currency + " không tồn tại. Vui lòng nạp tiền trước!"));

        if (wallet.getBalance().compareTo(amount) < 0) {
            log.info("so du: {}", wallet.getBalance());
            throw new RuntimeException("Số dư " + currency + " không đủ để thực hiện lệnh này!");
        }

        wallet.setBalance(wallet.getBalance().subtract(amount));
        wallet.setLockedBalance(wallet.getLockedBalance().add(amount));

        walletBalanceRepository.save(wallet);
    }

    @Override
    @Transactional
    public void unlockBalance(String userId, String currency, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số lượng cần mở khóa phải lớn hơn 0");
        }

        WalletBalance wallet = walletBalanceRepository.findByUserIdAndCurrency(userId, currency)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ví " + currency + " của người dùng."));


        if (wallet.getLockedBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Lỗi hệ thống: Số dư đang bị khóa (" + wallet.getLockedBalance() +
                    ") nhỏ hơn số tiền yêu cầu mở khóa (" + amount + ")");
        }

        BigDecimal newLockedBalance = wallet.getLockedBalance().subtract(amount);
        wallet.setLockedBalance(newLockedBalance);

        BigDecimal newAvailableBalance = wallet.getBalance().add(amount);
        wallet.setBalance(newAvailableBalance);

        walletBalanceRepository.save(wallet);
    }

    @Transactional
    public void deductLockedBalance(String userId, String currency, BigDecimal amount) {
        WalletBalance wallet = walletBalanceRepository.findByUserIdAndCurrency(userId, currency)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ví " + currency));

        wallet.setLockedBalance(wallet.getLockedBalance().subtract(amount));
        walletBalanceRepository.save(wallet);
    }
    @Transactional
    public void addAvailableBalance(String userId, String currency, BigDecimal amount) {
        // Tìm ví hiện tại, nếu không có thì khởi tạo ví mới
        WalletBalance wallet = walletBalanceRepository.findByUserIdAndCurrency(userId, currency)
                .orElseGet(() -> {
                    log.info("Người dùng {} chưa có ví {}, tiến hành tạo ví mới...", userId, currency);

                    return WalletBalance.builder()
                            .user(userRepository.findById(userId)
                                    .orElseThrow(() -> new RuntimeException("Không tìm thấy user: " + userId)))
                            .currency(currency)
                            .balance(BigDecimal.ZERO)
                            .lockedBalance(BigDecimal.ZERO)
                            .build();
                });

        wallet.setBalance(wallet.getBalance().add(amount));

        walletBalanceRepository.save(wallet);
    }
}
