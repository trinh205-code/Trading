package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.PaymentGateway;
import com.slayer.binacet.Enums.PaymentStatus;
import com.slayer.binacet.dto.request.CreatePaymentRequest;
import com.slayer.binacet.dto.response.PaymentResponse;
import com.slayer.binacet.entity.Payment;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.entity.WalletBalance;
import com.slayer.binacet.repository.PaymentRepository;
import com.slayer.binacet.repository.WalletBalanceRepository;
import com.slayer.binacet.service.PaymentService;
import com.slayer.binacet.service.gateway.VnPayService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final WalletBalanceRepository walletBalanceRepository;
    private final VnPayService vnPayService;
    private final com.slayer.binacet.service.ExchangeRateService exchangeRateService;

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof User user)) {
            throw new RuntimeException("Vui lòng đăng nhập để thực hiện giao dịch");
        }
        return user;
    }

    @Override
    @Transactional
    public PaymentResponse createVnPayPayment(CreatePaymentRequest request, HttpServletRequest servletRequest) {
        User user = getCurrentUser();

        BigDecimal amountVnd = request.getAmountVnd();
        BigDecimal usdtAmount = request.getUsdtAmount();
        BigDecimal exchangeRate = exchangeRateService.getUsdtToVndRate();

        // Tính toán số tiền nếu chỉ truyền một trong hai
        if (amountVnd != null && amountVnd.compareTo(BigDecimal.ZERO) > 0) {
            if (usdtAmount == null || usdtAmount.compareTo(BigDecimal.ZERO) <= 0) {
                usdtAmount = amountVnd.divide(exchangeRate, 4, RoundingMode.HALF_UP);
            }
        } else if (usdtAmount != null && usdtAmount.compareTo(BigDecimal.ZERO) > 0) {
            amountVnd = usdtAmount.multiply(exchangeRate).setScale(0, RoundingMode.HALF_UP);
        } else {
            throw new RuntimeException("Vui lòng nhập số tiền VNĐ hoặc số lượng USDT muốn mua");
        }

        // Tạo mã giao dịch duy nhất
        String transactionId = "PAY_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        Payment payment = Payment.builder()
                .user(user)
                .paymentGateway(PaymentGateway.VNPAY)
                .paymentStatus(PaymentStatus.PENDING)
                .amountVnd(amountVnd)
                .usdtAmount(usdtAmount)
                .exchangeRate(exchangeRate)
                .transactionId(transactionId)
                .bankCode(request.getBankCode())
                .orderInfo("Mua " + usdtAmount.stripTrailingZeros().toPlainString() + " USDT ma GD " + transactionId)
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        String paymentUrl = vnPayService.createPaymentUrl(savedPayment, servletRequest);

        log.info("Tạo yêu cầu thanh toán VNPay thành công: txnId={}, amountVnd={}, usdtAmount={}, paymentUrl={}",
                transactionId, amountVnd, usdtAmount, paymentUrl);

        return mapToPaymentResponse(savedPayment, paymentUrl);
    }

    @Override
    @Transactional
    public Payment processVnPayReturn(Map<String, String> params, HttpServletRequest request) {
        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            throw new RuntimeException("Mã giao dịch không hợp lệ trong phản hồi VNPay");
        }

        Payment payment = paymentRepository.findByTransactionId(txnRef)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giao dịch với mã: " + txnRef));

        // Nếu giao dịch đã hoàn tất trước đó thì không xử lý cộng ví lại (tránh replay attack)
        if (payment.getPaymentStatus() == PaymentStatus.SUCCESS) {
            log.info("Giao dịch {} đã được xử lý thành công trước đó", txnRef);
            return payment;
        }

        boolean isValid = vnPayService.isValidPayment(request);
        String responseCode = params.get("vnp_ResponseCode");
        String transactionNo = params.get("vnp_TransactionNo");
        String bankCode = params.get("vnp_BankCode");

        payment.setGatewayPaymentId(transactionNo);
        payment.setBankCode(bankCode);
        payment.setResponseCode(responseCode);
        payment.setCompletedAt(LocalDateTime.now());

        if (isValid && "00".equals(responseCode)) {
            payment.setPaymentStatus(PaymentStatus.SUCCESS);

            // Nạp USDT vào ví của User
            User user = payment.getUser();
            WalletBalance wallet = walletBalanceRepository.findByUserIdAndCurrency(user.getId(), "USDT")
                    .orElseGet(() -> {
                        WalletBalance newWallet = new WalletBalance();
                        newWallet.setUser(user);
                        newWallet.setCurrency("USDT");
                        newWallet.setBalance(BigDecimal.ZERO);
                        newWallet.setLockedBalance(BigDecimal.ZERO);
                        return newWallet;
                    });

            wallet.setBalance(wallet.getBalance().add(payment.getUsdtAmount()));
            walletBalanceRepository.save(wallet);

            log.info("Nạp {} USDT thành công cho user {} từ giao dịch {}", payment.getUsdtAmount(), user.getId(), txnRef);
        } else {
            payment.setPaymentStatus(PaymentStatus.FAILED);
            log.warn("Giao dịch {} thất bại hoặc chữ ký không hợp lệ! ResponseCode={}, isValid={}", txnRef, responseCode, isValid);
        }

        return paymentRepository.save(payment);
    }


    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getMyPaymentHistory() {
        User user = getCurrentUser();
        List<Payment> payments = paymentRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        return payments.stream()
                .map(p -> mapToPaymentResponse(p, null))
                .collect(Collectors.toList());
    }

    private PaymentResponse mapToPaymentResponse(Payment payment, String paymentUrl) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .transactionId(payment.getTransactionId())
                .amountVnd(payment.getAmountVnd())
                .usdtAmount(payment.getUsdtAmount())
                .exchangeRate(payment.getExchangeRate())
                .paymentStatus(payment.getPaymentStatus())
                .paymentGateway(payment.getPaymentGateway())
                .paymentUrl(paymentUrl)
                .bankCode(payment.getBankCode())
                .createdAt(payment.getCreatedAt())
                .completedAt(payment.getCompletedAt())
                .build();
    }
}
