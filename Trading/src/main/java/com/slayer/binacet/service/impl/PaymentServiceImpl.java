package com.slayer.binacet.service.impl;

import com.slayer.binacet.Enums.PaymentGateway;
import com.slayer.binacet.Enums.PaymentStatus;
import com.slayer.binacet.dto.request.CreatePaymentRequest;
import com.slayer.binacet.dto.response.PaymentResponse;
import com.slayer.binacet.entity.Payment;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.entity.WalletBalance;
import com.slayer.binacet.mapper.PaymentMapper;
import com.slayer.binacet.mapper.WalletMapper;
import com.slayer.binacet.repository.PaymentRepository;
import com.slayer.binacet.repository.WalletBalanceRepository;
import com.slayer.binacet.service.PaymentService;
import com.slayer.binacet.service.gateway.VnPayService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
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
    private final PaymentMapper paymentMapper;
    private final WalletMapper walletMapper;

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

        BigDecimal exchangeRate = exchangeRateService.getUsdtToVndRate();

        if (request.getAmountVnd() != null && request.getAmountVnd().compareTo(BigDecimal.ZERO) > 0) {
            if (request.getUsdtAmount() == null || request.getUsdtAmount().compareTo(BigDecimal.ZERO) <= 0) {
                request.setUsdtAmount(request.getAmountVnd().divide(exchangeRate, 4, RoundingMode.HALF_UP));
            }
        } else if (request.getUsdtAmount() != null && request.getUsdtAmount().compareTo(BigDecimal.ZERO) > 0) {
            request.setAmountVnd(request.getUsdtAmount().multiply(exchangeRate).setScale(0, RoundingMode.HALF_UP));
        } else {
            throw new RuntimeException("Vui lòng nhập số tiền VNĐ hoặc số lượng USDT muốn mua");
        }

        // Tạo mã giao dịch duy nhất
        String transactionId = "PAY_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        Payment payment = paymentMapper.toEntity(request, user, exchangeRate, transactionId);

        Payment savedPayment = paymentRepository.save(payment);

        String paymentUrl = vnPayService.createPaymentUrl(savedPayment, servletRequest);

        log.info("Tạo yêu cầu thanh toán VNPay thành công: txnId={}, amountVnd={}, usdtAmount={}, paymentUrl={}",
                transactionId, request.getAmountVnd(), request.getUsdtAmount(), paymentUrl);

        return paymentMapper.toResponse(savedPayment, paymentUrl);
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
                    .orElseGet(() -> walletMapper.toEntity(user, "USDT"));

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
    @Transactional
    public List<PaymentResponse> getMyPaymentHistory() {
        User user = getCurrentUser();
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(15);
        List<Payment> payments = paymentRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        boolean hasExpired = false;

        for (Payment payment : payments) {
            if (payment.getPaymentStatus() == PaymentStatus.PENDING) {
                LocalDateTime refTime = payment.getCreatedAt() != null ? payment.getCreatedAt() : payment.getInitiatedAt();
                if (refTime != null && refTime.isBefore(cutoff)) {
                    payment.setPaymentStatus(PaymentStatus.EXPIRED);
                    if (payment.getCompletedAt() == null) {
                        payment.setCompletedAt(refTime.plusMinutes(15));
                    }
                    hasExpired = true;
                    log.info("Cập nhật giao dịch {} sang EXPIRED (quá hạn 15 phút)", payment.getTransactionId());
                }
            }
        }

        if (hasExpired) {
            paymentRepository.saveAll(payments);
        }

        return paymentMapper.toResponseList(payments);
    }

    /**
     * Tự động quét và cập nhật các đơn hàng VNPay còn PENDING quá 15 phút thành EXPIRED
     * Chạy định kỳ mỗi 120 giây
     * 
     */
    @Scheduled(fixedDelay = 120000)
    @Transactional
    public void autoExpirePendingPayments() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(15);
        List<Payment> pendingList = paymentRepository.findPendingPaymentsOlderThan(PaymentStatus.PENDING, cutoff);
        if (!pendingList.isEmpty()) {
            for (Payment p : pendingList) {
                p.setPaymentStatus(PaymentStatus.EXPIRED);
                LocalDateTime refTime = p.getCreatedAt() != null ? p.getCreatedAt() : p.getInitiatedAt();
                p.setCompletedAt(refTime != null ? refTime.plusMinutes(15) : LocalDateTime.now());
                log.info("CronJob: Đã cập nhật giao dịch {} sang EXPIRED do không hoàn tất sau 15 phút", p.getTransactionId());
            }
            paymentRepository.saveAll(pendingList);
            log.info("CronJob: Hoàn tất cập nhật {} giao dịch VNPay quá hạn 15 phút sang EXPIRED", pendingList.size());
        }
    }
}
