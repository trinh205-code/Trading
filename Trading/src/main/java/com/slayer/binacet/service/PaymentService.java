package com.slayer.binacet.service;

import com.slayer.binacet.dto.request.CreatePaymentRequest;
import com.slayer.binacet.dto.response.PaymentResponse;
import com.slayer.binacet.entity.Payment;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;

public interface PaymentService {

    PaymentResponse createVnPayPayment(CreatePaymentRequest request, HttpServletRequest servletRequest);

    Payment processVnPayReturn(Map<String, String> params, HttpServletRequest request);

    List<PaymentResponse> getMyPaymentHistory();
}
