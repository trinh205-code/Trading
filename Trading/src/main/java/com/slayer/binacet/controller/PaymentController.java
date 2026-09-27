package com.slayer.binacet.controller;

import com.slayer.binacet.dto.request.CreatePaymentRequest;
import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.PaymentResponse;
import com.slayer.binacet.entity.Payment;
import com.slayer.binacet.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/payment", "/api/v1/payment"})
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @PostMapping("/vnpay/create")
    public ResponseEntity<ApiResponse<PaymentResponse>> createVnPayPayment(
            @RequestBody CreatePaymentRequest request,
            HttpServletRequest servletRequest) {
        PaymentResponse response = paymentService.createVnPayPayment(request, servletRequest);
        return ResponseEntity.ok(ApiResponse.success(response, "Khởi tạo thanh toán VNPay thành công"));
    }

    @GetMapping("/vnpay-return")
    public void handleVnPayReturn(
            @RequestParam Map<String, String> params,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        log.info("Nhận callback từ VNPay: {}", params);
        try {
            Payment payment = paymentService.processVnPayReturn(params, request);

            String redirectUrl = frontendUrl + "/buy-crypto?"
                    + "paymentStatus=" + payment.getPaymentStatus().name()
                    + "&txnId=" + payment.getTransactionId()
                    + "&amountVnd=" + payment.getAmountVnd()
                    + "&usdtAmount=" + payment.getUsdtAmount()
                    + "&responseCode=" + payment.getResponseCode();

            response.sendRedirect(redirectUrl);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý callback từ VNPay: ", e);
            String errorUrl = frontendUrl + "/buy-crypto?"
                    + "paymentStatus=FAILED"
                    + "&error=" + URLEncoder.encode(e.getMessage() != null ? e.getMessage() : "Unknown error", StandardCharsets.UTF_8);
            response.sendRedirect(errorUrl);
        }
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getMyPaymentHistory() {
        List<PaymentResponse> history = paymentService.getMyPaymentHistory();
        return ResponseEntity.ok(ApiResponse.success(history, "Lấy lịch sử thanh toán thành công"));
    }
}
