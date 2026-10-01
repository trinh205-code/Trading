package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.request.CreatePaymentRequest;
import com.slayer.binacet.dto.response.PaymentResponse;
import com.slayer.binacet.entity.Payment;
import com.slayer.binacet.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;
import java.util.List;

@Mapper(componentModel = "spring")
public interface PaymentMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", source = "user")
    @Mapping(target = "paymentGateway", constant = "VNPAY")
    @Mapping(target = "paymentStatus", constant = "PENDING")
    @Mapping(target = "amountVnd", source = "request.amountVnd")
    @Mapping(target = "usdtAmount", source = "request.usdtAmount")
    @Mapping(target = "bankCode", source = "request.bankCode")
    @Mapping(target = "exchangeRate", source = "exchangeRate")
    @Mapping(target = "transactionId", source = "transactionId")
    @Mapping(target = "orderInfo", expression = "java(\"Mua \" + request.getUsdtAmount().stripTrailingZeros().toPlainString() + \" USDT ma GD \" + transactionId)")
    @Mapping(target = "gatewayPaymentId", ignore = true)
    @Mapping(target = "responseCode", ignore = true)
    @Mapping(target = "initiatedAt", ignore = true)
    @Mapping(target = "completedAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Payment toEntity(CreatePaymentRequest request, User user, BigDecimal exchangeRate, String transactionId);

    @Mapping(target = "paymentUrl", source = "paymentUrl")
    PaymentResponse toResponse(Payment payment, String paymentUrl);

    @Mapping(target = "paymentUrl", ignore = true)
    PaymentResponse toResponse(Payment payment);

    List<PaymentResponse> toResponseList(List<Payment> payments);
}
